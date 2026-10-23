import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
const fromEmail = Deno.env.get("MFA_FROM_EMAIL")!;
const appOrigin = Deno.env.get("MFA_APP_ORIGIN")!;
const codeSecret = Deno.env.get("MFA_CODE_SECRET")!;
const codeLifetimeMs = 10 * 60 * 1000;
const verifiedSessionLifetimeMs = 8 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Purpose = "enroll" | "login";

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getSessionId(token: string): string {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Invalid access token.");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const claims = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
  if (typeof claims.session_id !== "string") throw new Error("Missing session identifier.");
  return claims.session_id;
}

function validateEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter a valid email address.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  return email;
}

function generateCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0] % 1_000_000).padStart(6, "0");
}

async function hashCode(userId: string, purpose: Purpose, code: string): Promise<string> {
  if (codeSecret.length < 32) {
    throw new Error("The server-side MFA code secret is not configured.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(codeSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${userId}:${purpose}:${code}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sendCode(email: string, code: string, purpose: Purpose) {
  const subject = purpose === "enroll"
    ? "Bekræft din e-mail til Hverdagens app"
    : "Din login-kode til Hverdagens app";
  const description = purpose === "enroll"
    ? "Brug koden herunder for at slå tofaktorbekræftelse til."
    : "Brug koden herunder for at færdiggøre dit login.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject,
      text: `${description}\n\n${code}\n\nKoden udløber om 10 minutter. Hvis du ikke bad om denne kode, kan du ignorere e-mailen.`,
    }),
  });
  if (!response.ok) {
    console.error("Email delivery failed", response.status, await response.text());
    throw new Error("E-mailen kunne ikke sendes. Kontrollér e-mailopsætningen, og prøv igen.");
  }
}

async function createChallenge(userId: string, purpose: Purpose, email: string) {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + codeLifetimeMs).toISOString();
  const codeHash = await hashCode(userId, purpose, code);
  const { data: challengeId, error: insertError } = await service.rpc("create_email_mfa_challenge", {
    requested_user_id: userId,
    requested_purpose: purpose,
    requested_email: email,
    requested_code_hash: codeHash,
    requested_expires_at: expiresAt,
  });
  if (insertError) throw insertError;

  try {
    await sendCode(email, code, purpose);
  } catch (error) {
    await service.from("email_mfa_challenges").delete().eq("id", challengeId);
    throw error;
  }
}

async function recordVerifiedSession(userId: string, sessionId: string) {
  const { error } = await service.from("email_mfa_sessions").upsert({
    session_id: sessionId,
    user_id: userId,
    verified_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + verifiedSessionLifetimeMs).toISOString(),
  });
  if (error) throw error;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  if (request.headers.get("origin") !== appOrigin) return respond({ error: "Origin not allowed." }, 403);

  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return respond({ error: "You must be signed in." }, 401);
    const token = authorization.slice("Bearer ".length);
    const caller = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await caller.auth.getUser(token);
    if (userError || !user) return respond({ error: "Your session is invalid. Please log in again." }, 401);
    const sessionId = getSessionId(token);
    const body = await request.json();
    const action = body.action as string;
    const db = service;

    if (action === "status") {
      const { error: cleanupError } = await db.from("email_mfa_sessions")
        .delete()
        .eq("user_id", user.id)
        .lt("expires_at", new Date().toISOString());
      if (cleanupError) throw cleanupError;
      const { data: settings, error } = await db.from("email_mfa_settings")
        .select("email, enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!settings?.enabled) return respond({ enabled: false });
      const { data: verified, error: sessionError } = await db.from("email_mfa_sessions")
        .select("session_id")
        .eq("user_id", user.id)
        .eq("session_id", sessionId)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (sessionError) throw sessionError;
      return respond({ enabled: true, verified: Boolean(verified), emailHint: maskEmail(settings.email) });
    }

    if (action === "start-enrollment") {
      const email = validateEmail(body.email);
      await createChallenge(user.id, "enroll", email);
      return respond({ sent: true });
    }

    if (action === "start-login") {
      const { data: settings, error } = await db.from("email_mfa_settings")
        .select("email, enabled")
        .eq("user_id", user.id)
        .eq("enabled", true)
        .maybeSingle();
      if (error) throw error;
      if (!settings) return respond({ enabled: false });
      await createChallenge(user.id, "login", settings.email);
      return respond({ sent: true, emailHint: maskEmail(settings.email) });
    }

    if (action === "verify-enrollment" || action === "verify-login") {
      const purpose: Purpose = action === "verify-enrollment" ? "enroll" : "login";
      if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) {
        return respond({ error: "Skriv den sekscifrede kode fra e-mailen." }, 400);
      }
      const { data: challenge, error } = await db.from("email_mfa_challenges")
        .select("id, email, code_hash, attempts, expires_at")
        .eq("user_id", user.id)
        .eq("purpose", purpose)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!challenge || Date.parse(challenge.expires_at) <= Date.now()) {
        return respond({ error: "Koden er udløbet. Bed om en ny kode." }, 400);
      }
      if (challenge.attempts >= 5) {
        return respond({ error: "For mange forsøg. Bed om en ny kode." }, 429);
      }
          const { data: attempt, error: attemptError } = await db.from("email_mfa_challenges")
        .update({ attempts: challenge.attempts + 1 })
        .eq("id", challenge.id)
            .eq("attempts", challenge.attempts)
            .select("attempts")
            .maybeSingle();
      if (attemptError) throw attemptError;
          if (!attempt) return respond({ error: "Koden er allerede brugt eller udløbet. Bed om en ny kode." }, 429);
      const submittedHash = await hashCode(user.id, purpose, body.code);
      if (!safeEqual(submittedHash, challenge.code_hash)) {
        return respond({ error: "Koden passer ikke. Prøv igen." }, 400);
      }

      if (purpose === "enroll") {
        const { error: saveError } = await db.from("email_mfa_settings").upsert({
          user_id: user.id,
          email: challenge.email,
          enabled: true,
        });
        if (saveError) throw saveError;
      }
      const { error: consumeError } = await db.from("email_mfa_challenges")
        .update({ attempts: 5 })
        .eq("id", challenge.id);
      if (consumeError) throw consumeError;
      await recordVerifiedSession(user.id, sessionId);
      return respond({ verified: true });
    }

    return respond({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("Email MFA request failed", error);
    return respond({
      error: error instanceof Error ? error.message : "Der opstod en uventet fejl.",
    }, 400);
  }
});

function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}${"*".repeat(Math.max(name.length - 1, 2))}@${domain}`;
}

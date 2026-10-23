import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appOrigin = "https://valde3713.github.io";

const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function readAllRows<T>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await loadPage(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405);
  if (request.headers.get("origin") !== appOrigin) return respond({ error: "Origin not allowed." }, 403);
  if (Deno.env.get("SB_REGION") !== "eu-central-1") {
    return respond({ error: "Adminoversigten er kun konfigureret til behandling i EU." }, 503);
  }

  try {
    const adminUserId = Deno.env.get("ADMIN_USER_ID");
    if (!adminUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(adminUserId)) {
      console.error("Admin dashboard is unavailable: ADMIN_USER_ID is not configured.");
      return respond({ error: "Admin-adgang er ikke sat op endnu." }, 503);
    }

    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return respond({ error: "Log ind for at fortsætte." }, 401);
    const token = authorization.slice("Bearer ".length);
    const caller = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await caller.auth.getUser(token);
    if (userError || !user) return respond({ error: "Din session er ugyldig. Log ind igen." }, 401);
    if (user.id !== adminUserId) return respond({ error: "Denne konto har ikke admin-adgang." }, 403);

    const [profiles, privateProfiles, activities] = await Promise.all([
      readAllRows((from, to) => service.from("profiles")
        .select("id, nickname, display_name_mode, bio, created_at")
        .order("created_at", { ascending: false })
        .range(from, to)),
      readAllRows((from, to) => service.from("profile_private")
        .select("user_id, real_name, public_profile_enabled, public_profile_enabled_at, terms_accepted_at, privacy_accepted_at")
        .range(from, to)),
      readAllRows((from, to) => service.from("activities")
        .select("id, user_id, description, created_at")
        .order("created_at", { ascending: false })
        .range(from, to)),
    ]);

    const privateByUserId = new Map(privateProfiles.map((profile) => [profile.user_id, profile]));
    const activityCounts = new Map<string, number>();
    const nicknameByUserId = new Map(profiles.map((profile) => [profile.id, profile.nickname]));
    for (const activity of activities) {
      activityCounts.set(activity.user_id, (activityCounts.get(activity.user_id) ?? 0) + 1);
    }

    return respond({
      generated_at: new Date().toISOString(),
      profiles: profiles.map((profile) => {
        const privateProfile = privateByUserId.get(profile.id);
        return {
          nickname: profile.nickname,
          display_name: profile.display_name_mode === "real_name" && privateProfile?.real_name
            ? privateProfile.real_name
            : profile.nickname,
          bio: profile.bio,
          created_at: profile.created_at,
          public_profile_enabled: privateProfile?.public_profile_enabled ?? false,
          public_profile_enabled_at: privateProfile?.public_profile_enabled_at ?? null,
          terms_accepted_at: privateProfile?.terms_accepted_at ?? null,
          privacy_accepted_at: privateProfile?.privacy_accepted_at ?? null,
          activity_count: activityCounts.get(profile.id) ?? 0,
        };
      }),
      activities: activities.map((activity) => ({
        nickname: nicknameByUserId.get(activity.user_id) ?? "Ukendt bruger",
        description: activity.description,
        created_at: activity.created_at,
      })),
    });
  } catch (error) {
    console.error("Admin dashboard request failed.", error);
    return respond({ error: "Dashboard-data kunne ikke hentes lige nu." }, 500);
  }
});

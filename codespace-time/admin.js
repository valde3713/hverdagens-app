const config = window.APP_CONFIG;
const loginForm = document.querySelector("#admin-login-form");
const loginMessage = document.querySelector("#admin-login-message");
const dashboardMessage = document.querySelector("#admin-dashboard-message");
const loginScreen = document.querySelector("#admin-login");
const dashboard = document.querySelector("#admin-dashboard");
const actions = document.querySelector("#admin-actions");
const client = config?.supabaseUrl && config?.supabaseAnonKey
  ? window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey)
  : undefined;

function showError(target, message) {
  target.textContent = message;
  target.dataset.state = "error";
}

function showSuccess(target, message) {
  target.textContent = message;
  target.dataset.state = "success";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "";
  row.append(cell);
}

function renderRows(container, rows, emptyMessage, renderRow) {
  container.replaceChildren();
  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "admin-muted";
    cell.colSpan = container.id === "admin-profiles" ? 7 : 3;
    cell.textContent = emptyMessage;
    row.append(cell);
    container.append(row);
    return;
  }
  for (const item of rows) {
    const row = document.createElement("tr");
    renderRow(row, item);
    container.append(row);
  }
}

function renderDashboard(data) {
  document.querySelector("#admin-profile-count").textContent = String(data.profiles.length);
  document.querySelector("#admin-activity-count").textContent = String(data.activities.length);
  document.querySelector("#admin-public-count").textContent = String(
    data.profiles.filter((profile) => profile.public_profile_enabled).length,
  );
  document.querySelector("#admin-updated").textContent = `Opdateret ${formatDate(data.generated_at)}.`;

  renderRows(
    document.querySelector("#admin-profiles"),
    data.profiles,
    "Der er ingen profiler.",
    (row, profile) => {
      addCell(row, profile.nickname);
      addCell(row, profile.display_name);
      addCell(row, profile.bio || "—");
      addCell(row, profile.public_profile_enabled
        ? `Offentlig siden ${formatDate(profile.public_profile_enabled_at)}`
        : "Skjult");
      addCell(row, formatDate(profile.created_at));
      addCell(row, `Vilkår: ${formatDate(profile.terms_accepted_at)} · Privatliv: ${formatDate(profile.privacy_accepted_at)}`);
      addCell(row, String(profile.activity_count));
    },
  );
  renderRows(
    document.querySelector("#admin-activities"),
    data.activities,
    "Der er ingen aktiviteter.",
    (row, activity) => {
      addCell(row, activity.nickname);
      addCell(row, activity.description);
      addCell(row, formatDate(activity.created_at));
    },
  );
}

async function loadDashboard() {
  if (!client) throw new Error("Supabase er ikke konfigureret på denne side.");
  const { data, error } = await client.rpc("get_admin_dashboard");
  if (error) throw error;
  if (!Array.isArray(data?.profiles) || !Array.isArray(data?.activities)) {
    throw new Error("Serveren returnerede et ugyldigt dashboard-svar.");
  }
  renderDashboard(data);
  dashboard.hidden = false;
  loginScreen.hidden = true;
  actions.hidden = false;
  document.querySelector("#admin-identity").textContent = "Admin";
}

async function signOut() {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw error;
  loginScreen.hidden = false;
  dashboard.hidden = true;
  actions.hidden = true;
}

if (client) {
  client.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      loginScreen.hidden = false;
      dashboard.hidden = true;
      actions.hidden = true;
    }
  });
} else {
  showError(loginMessage, "Supabase er ikke konfigureret på denne side.");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) return;
  const button = loginForm.querySelector("button[type='submit']");
  button.disabled = true;
  loginMessage.textContent = "";
  try {
    const nickname = document.querySelector("#admin-nickname").value.trim();
    const password = document.querySelector("#admin-password").value;
    const { data: loginEmail, error: emailError } = await client.rpc("get_login_email", {
      requested_nickname: nickname,
    });
    if (emailError) throw emailError;
    if (typeof loginEmail !== "string") throw new Error("Kaldenavnet kunne ikke bruges til login.");
    const { error: signInError } = await client.auth.signInWithPassword({
      email: loginEmail,
      password,
    });
    if (signInError) throw new Error("Login mislykkedes. Kontrollér kaldenavn og personlig kode.");
    await loadDashboard();
  } catch (error) {
    showError(loginMessage, error.message || "Login kunne ikke gennemføres.");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#admin-signout").addEventListener("click", async () => {
  const button = document.querySelector("#admin-signout");
  button.disabled = true;
  try {
    await signOut();
    loginForm.reset();
    showSuccess(loginMessage, "Du er logget ud.");
  } catch (error) {
    showError(dashboardMessage, error.message || "Du kunne ikke logges ud.");
  } finally {
    button.disabled = false;
  }
});

const config = window.APP_CONFIG;
const loginForm = document.querySelector("#admin-login-form");
const loginMessage = document.querySelector("#admin-login-message");
const dashboardMessage = document.querySelector("#admin-dashboard-message");
const loginScreen = document.querySelector("#admin-login");
const dashboard = document.querySelector("#admin-dashboard");
const actions = document.querySelector("#admin-actions");
let lastDashboard;
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
    cell.colSpan = container.id === "admin-profiles" ? 8 : 4;
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

function addActionButton(row, label, action, attributes = {}, className = "button button-secondary") {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.dataset.action = action;
  button.textContent = label;
  for (const [key, value] of Object.entries(attributes)) {
    button.dataset[key] = value;
  }
  cell.append(button);
  row.append(cell);
}

function renderDashboard(data, currentUserId) {
  lastDashboard = data;
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
      const actionCell = document.createElement("td");
      const actionGroup = document.createElement("div");
      actionGroup.className = "admin-row-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "button button-secondary";
      editButton.dataset.action = "edit-profile";
      editButton.dataset.nickname = profile.nickname;
      editButton.textContent = "Rediger";
      actionGroup.append(editButton);
      if (profile.user_id !== currentUserId && !profile.is_admin) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "button button-danger";
        deleteButton.dataset.action = "delete-profile";
        deleteButton.dataset.nickname = profile.nickname;
        deleteButton.textContent = "Slet";
        actionGroup.append(deleteButton);
      }
      actionCell.append(actionGroup);
      row.append(actionCell);
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
      addActionButton(
        row,
        "Slet",
        "delete-activity",
        { activityId: activity.id },
        "button button-danger",
      );
    },
  );
}

async function loadDashboard() {
  if (!client) throw new Error("Supabase er ikke konfigureret på denne side.");
  const accessCode = document.querySelector("#admin-access-code").value;
  const { data, error } = await client.rpc("get_admin_dashboard", {
    requested_code: accessCode,
  });
  if (error) throw error;
  if (typeof data?.error === "string") throw new Error(data.error);
  if (!Array.isArray(data?.profiles) || !Array.isArray(data?.activities)) {
    throw new Error("Serveren returnerede et ugyldigt dashboard-svar.");
  }
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  renderDashboard(data, user.id);
  dashboard.hidden = false;
  loginScreen.hidden = true;
  actions.hidden = false;
  document.querySelector("#admin-identity").textContent = "Admin";
}

async function runAdminAction(functionName, parameters, successMessage) {
  const accessCode = document.querySelector("#admin-access-code").value;
  const { data, error } = await client.rpc(functionName, {
    requested_code: accessCode,
    ...parameters,
  });
  if (error) throw error;
  if (typeof data?.error === "string") throw new Error(data.error);
  await loadDashboard();
  showSuccess(dashboardMessage, successMessage);
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

document.querySelector("#admin-add-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const nickname = document.querySelector("#admin-new-nickname").value.trim();
  button.disabled = true;
  try {
    await runAdminAction(
      "admin_add_user",
      { requested_nickname: nickname },
      `Kontoen "${nickname}" har nu admin-adgang.`,
    );
    form.reset();
  } catch (error) {
    showError(dashboardMessage, error.message || "Admin-adgang kunne ikke tilføjes.");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#admin-profiles").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const nickname = button.dataset.nickname;
  if (button.dataset.action === "delete-profile") {
    if (!window.confirm(`Slet profilen "${nickname}" og alle dens gerninger? Dette kan ikke fortrydes.`)) return;
    button.disabled = true;
    try {
      await runAdminAction(
        "admin_delete_profile",
        { requested_nickname: nickname },
        `Profilen "${nickname}" og dens data er slettet.`,
      );
    } catch (error) {
      showError(dashboardMessage, error.message || "Profilen kunne ikke slettes.");
    } finally {
      button.disabled = false;
    }
    return;
  }

  if (button.dataset.action === "edit-profile") {
    const profile = lastDashboard?.profiles.find((item) => item.nickname === nickname);
    if (!profile) return;
    const displayNameMode = window.prompt(
      "Skriv nickname eller real_name for det offentlige navn:",
      profile.display_name_mode,
    );
    if (displayNameMode === null) return;
    const realName = window.prompt(
      "Eget navn (bruges hvis real_name vælges; lad være tomt for at bevare et privat navn):",
      profile.display_name_mode === "real_name" ? profile.display_name : "",
    );
    if (realName === null) return;
    const bio = window.prompt("Profiltekst (maks. 240 tegn):", profile.bio || "");
    if (bio === null) return;
    const publicChoice = window.prompt(
      "Skal profilen være offentlig? Skriv ja eller nej:",
      profile.public_profile_enabled ? "ja" : "nej",
    );
    if (publicChoice === null) return;
    if (!["ja", "nej"].includes(publicChoice.trim().toLowerCase())) {
      showError(dashboardMessage, "Skriv ja eller nej for offentlig profil.");
      return;
    }
    button.disabled = true;
    try {
      await runAdminAction(
        "admin_update_profile",
        {
          requested_nickname: nickname,
          requested_display_name_mode: displayNameMode.trim(),
          requested_real_name: realName,
          requested_bio: bio,
          requested_public_profile_enabled: publicChoice.trim().toLowerCase() === "ja",
        },
        `Profilen "${nickname}" er opdateret.`,
      );
    } catch (error) {
      showError(dashboardMessage, error.message || "Profilen kunne ikke opdateres.");
    } finally {
      button.disabled = false;
    }
  }
});

document.querySelector("#admin-activities").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action='delete-activity']");
  if (!button || !window.confirm("Slet denne aktivitet? Dette kan ikke fortrydes.")) return;
  button.disabled = true;
  try {
    await runAdminAction(
      "admin_delete_activity",
      { requested_activity_id: button.dataset.activityId },
      "Aktiviteten er slettet.",
    );
  } catch (error) {
    showError(dashboardMessage, error.message || "Aktiviteten kunne ikke slettes.");
  } finally {
    button.disabled = false;
  }
});

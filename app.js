import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.APP_CONFIG;
const authScreen = document.querySelector("#auth-screen");
const appShell = document.querySelector("#app-shell");
const authForm = document.querySelector("#auth-form");
const authSubmit = document.querySelector("#auth-submit");
const notice = document.querySelector("#notice");
const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");
const confirmField = document.querySelector("#confirm-field");
const confirmPasscode = document.querySelector("#confirm-passcode");
const nicknameInput = document.querySelector("#nickname");
const passcodeInput = document.querySelector("#passcode");
const activityForm = document.querySelector("#activity-form");
const descriptionInput = document.querySelector("#activity-description");
const leaderboardList = document.querySelector("#leaderboard-list");
const recentList = document.querySelector("#recent-list");
let supabase;
let currentUser;
let isSignup = false;
let noticeTimeout;

function showNotice(message, isError = false) {
  clearTimeout(noticeTimeout);
  notice.textContent = message;
  notice.classList.toggle("error", isError);
  notice.hidden = false;
  noticeTimeout = setTimeout(() => { notice.hidden = true; }, 4500);
}

function displayError(error) {
  const message = error?.message || "Der opstod en uventet fejl. Prøv igen.";
  showNotice(message, true);
}

function setAuthMode(signup) {
  isSignup = signup;
  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);
  loginTab.setAttribute("aria-selected", String(!signup));
  signupTab.setAttribute("aria-selected", String(signup));
  confirmField.hidden = !signup;
  confirmPasscode.required = signup;
  passcodeInput.autocomplete = signup ? "new-password" : "current-password";
  authSubmit.innerHTML = signup
    ? 'Opret min profil <span aria-hidden="true">→</span>'
    : 'Log ind <span aria-hidden="true">→</span>';
}

function showSignedOut() {
  currentUser = undefined;
  appShell.hidden = true;
  authScreen.hidden = false;
}

function showSignedIn(user) {
  currentUser = user;
  const nickname = user.user_metadata?.nickname;
  if (!nickname) {
    showNotice("Profilen mangler et kaldenavn. Log ud og opret profilen igen.", true);
    return;
  }
  authScreen.hidden = true;
  appShell.hidden = false;
  for (const id of ["welcome-nickname", "topbar-nickname", "profile-nickname"]) {
    document.getElementById(id).textContent = nickname;
  }
  for (const id of ["avatar-initial", "profile-avatar"]) {
    document.getElementById(id).textContent = nickname.charAt(0).toUpperCase();
  }
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("da-DK", {
    weekday: "long", day: "numeric", month: "long"
  }).format(new Date());
  loadDashboard();
}

async function loadDashboard() {
  if (!currentUser) return;
  try {
    const [leaderboardResult, activityResult] = await Promise.all([
      supabase.rpc("get_leaderboard"),
      supabase.from("activities")
        .select("id, description, created_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(8)
    ]);
    if (leaderboardResult.error) throw leaderboardResult.error;
    if (activityResult.error) throw activityResult.error;
    renderLeaderboard(leaderboardResult.data || []);
    renderActivities(activityResult.data || []);
  } catch (error) {
    displayError(error);
  }
}

function renderLeaderboard(rows) {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname, "da"));
  const rank = sorted.findIndex((row) => row.user_id === currentUser.id);
  const myRow = sorted[rank];
  const score = myRow ? Number(myRow.points) : 0;
  document.querySelector("#my-score").textContent = String(score);
  document.querySelector("#profile-score").textContent = String(score);
  document.querySelector("#my-rank").textContent = rank < 0 ? "–" : `#${rank + 1}`;

  leaderboardList.replaceChildren();
  if (sorted.length === 0) {
    leaderboardList.append(emptyState("Ingen har delt en gerning endnu. Vær den første!"));
    return;
  }
  sorted.slice(0, 50).forEach((row, index) => {
    const item = document.createElement("div");
    item.className = `leaderboard-row${row.user_id === currentUser.id ? " leader-me" : ""}`;
    const position = document.createElement("span");
    position.className = `leader-rank${index < 3 ? " top" : ""}`;
    position.textContent = ["🥇", "🥈", "🥉"][index] || `#${index + 1}`;
    const identity = document.createElement("span");
    identity.className = "leader-name";
    const avatar = document.createElement("span");
    avatar.className = "leader-avatar";
    avatar.textContent = String(row.nickname).charAt(0).toUpperCase();
    const name = document.createElement("span");
    name.textContent = row.nickname;
    identity.append(avatar, name);
    const points = document.createElement("span");
    points.className = "leader-score";
    points.textContent = `${row.points} ${Number(row.points) === 1 ? "gerning" : "gerninger"}`;
    item.append(position, identity, points);
    leaderboardList.append(item);
  });
}

function emptyState(text) {
  const item = document.createElement("p");
  item.className = "empty-state";
  item.textContent = text;
  return item;
}

function renderActivities(activities) {
  recentList.replaceChildren();
  document.querySelector("#recent-count").textContent = `${activities.length} DELT`;
  if (!activities.length) {
    recentList.append(emptyState("Din første gode gerning venter! Skriv en lille ting, du har gjort for naturen i dag."));
    return;
  }
  for (const activity of activities) {
    const item = document.createElement("article");
    item.className = "recent-item";
    const icon = document.createElement("span");
    icon.className = "activity-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✳";
    const copy = document.createElement("div");
    copy.className = "activity-copy";
    const description = document.createElement("div");
    description.className = "activity-description";
    description.textContent = activity.description;
    const time = document.createElement("div");
    time.className = "activity-time";
    time.textContent = formatDate(activity.created_at);
    copy.append(description, time);
    const points = document.createElement("span");
    points.className = "activity-points";
    points.textContent = "+1 point";
    item.append(icon, copy, points);
    recentList.append(item);
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  }).format(new Date(value));
}

function navigate(page) {
  document.querySelectorAll(".page").forEach((element) => { element.hidden = element.id !== `${page}-page`; });
  document.querySelectorAll(".nav-item").forEach((element) => {
    const active = element.dataset.page === page;
    element.classList.toggle("active", active);
    if (active) element.setAttribute("aria-current", "page");
    else element.removeAttribute("aria-current");
  });
  if (page === "leaderboard" && currentUser) loadDashboard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

loginTab.addEventListener("click", () => setAuthMode(false));
signupTab.addEventListener("click", () => setAuthMode(true));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const nickname = nicknameInput.value.trim();
  const normalizedNickname = nickname.toLowerCase();
  const password = passcodeInput.value;
  if (isSignup && password !== confirmPasscode.value) {
    showNotice("Koderne er ikke ens. Prøv igen.", true);
    return;
  }
  authSubmit.disabled = true;
  try {
    const email = `${normalizedNickname}@users.hverdagens.invalid`;
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname } }
      });
      if (error) throw error;
      if (!data.session) {
        showNotice("Profilen er oprettet, men Supabase kræver stadig e-mailbekræftelse. Slå e-mailbekræftelse fra i Supabase Auth, og log ind.");
        setAuthMode(false);
        return;
      }
      showNotice("Din profil er klar — velkommen!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (error) {
    displayError(error);
  } finally {
    authSubmit.disabled = false;
  }
});

activityForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const description = descriptionInput.value.trim();
  if (!description || !currentUser) return;
  const submit = activityForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const { error } = await supabase.from("activities").insert({
      user_id: currentUser.id,
      description
    });
    if (error) throw error;
    descriptionInput.value = "";
    document.querySelector("#character-count").textContent = "0 / 240";
    showNotice("Din gode gerning er delt. Tak fordi du gør en forskel!");
    await loadDashboard();
  } catch (error) {
    displayError(error);
  } finally {
    submit.disabled = false;
  }
});

descriptionInput.addEventListener("input", () => {
  document.querySelector("#character-count").textContent = `${descriptionInput.value.length} / 240`;
});

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => navigate(button.dataset.page));
});

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) displayError(error);
}

document.querySelector("#signout-button").addEventListener("click", signOut);
document.querySelector("#profile-signout").addEventListener("click", signOut);

if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
  document.querySelector("#setup-message").hidden = false;
  showSignedOut();
  authSubmit.disabled = true;
} else {
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) showSignedIn(session.user);
    else showSignedOut();
  });
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.APP_CONFIG;
const authScreen = document.querySelector("#auth-screen");
const appShell = document.querySelector("#app-shell");
const authForm = document.querySelector("#auth-form");
const authSubmit = document.querySelector("#auth-submit");
const notice = document.querySelector("#notice");
const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");
const authTitle = document.querySelector("#auth-title");
const authIntro = document.querySelector(".auth-intro");
const confirmField = document.querySelector("#confirm-field");
const confirmPasscode = document.querySelector("#confirm-passcode");
const nicknameInput = document.querySelector("#nickname");
const passcodeInput = document.querySelector("#passcode");
const activityForm = document.querySelector("#activity-form");
const descriptionInput = document.querySelector("#activity-description");
const leaderboardList = document.querySelector("#leaderboard-list");
const recentList = document.querySelector("#recent-list");
const themeSetting = document.querySelector("#theme-setting");
const languageSetting = document.querySelector("#language-setting");
let supabase;
let currentUser;
let isSignup = false;
let noticeTimeout;
const translations = {
  da: {
    ".nav-item[data-page='home']": "Min hverdag",
    ".nav-item[data-page='leaderboard']": "Pointtavle",
    ".nav-item[data-page='profile']": "Min profil",
    ".nav-label": "MENU",
    ".sidebar-note p": "Små skridt tæller.",
    ".sidebar-note strong": "Bliv ved med at gøre en forskel.",
    "#signout-button span": "Log ud",
    "#home-page .welcome-row .eyebrow": "DIN GRØNNE HVERDAG",
    "#home-page .welcome-row h1": "Hej, ",
    "#home-page .welcome-row .page-subtitle": "Hver lille handling gør en forskel.",
    ".streak-badge": "Gør dagen grønnere",
    ".hero-tag": "DAGENS REFLEKSION",
    ".hero-copy h2": "Hvad har du gjort godt for naturen i dag?",
    ".hero-copy p": "Ingen handling er for lille. Del den med fællesskabet.",
    ".entry-panel .panel-heading .eyebrow": "DIN DAGBOG",
    ".entry-panel .panel-heading h2": "Tilføj en god gerning",
    ".entry-panel label": "Hvad gjorde du?",
    "#activity-description": "Fx Jeg cyklede på arbejde i stedet for at tage bilen…",
    ".entry-panel .form-bottom .button": "Del min gerning",
    ".score-panel > .eyebrow": "DIT BIDRAG",
    ".score-label": "gode gerninger i alt",
    ".score-bottom span": "Din placering",
    ".text-button": "Se pointtavlen",
    ".recent-panel .panel-heading .eyebrow": "SMÅ SKRIDT, STOR FORSKEL",
    ".recent-panel .panel-heading h2": "Dine seneste gerninger",
    "#leaderboard-page .page-heading .eyebrow": "VI GØR DET SAMMEN",
    "#leaderboard-page .page-heading h1": "Pointtavlen",
    "#leaderboard-page .page-subtitle": "Hver delt gerning giver ét point. Alle kan være med!",
    ".leaderboard-panel .panel-heading .eyebrow": "FÆLLESSKABET",
    ".leaderboard-panel .panel-heading h2": "Grønne hverdagshelte",
    ".leaderboard-head": "PLACERING GRØN HVERDAGSHELT GERNINGER",
    "#profile-page .page-heading .eyebrow": "DET ER DIG, DER GØR EN FORSKEL",
    "#profile-page .page-heading h1": "Min profil",
    "#profile-page .page-heading .page-subtitle": "Dit kaldenavn og dine grønne gerninger.",
    ".profile-panel .eyebrow": "DIT KALDENAVN",
    ".profile-panel .page-subtitle": "En del af fællesskabet for grønnere hverdage.",
    ".profile-stats > .eyebrow": "DIT BIDRAG TIL NATUREN",
    ".profile-stats p:not(.eyebrow)": "delte gode gerninger",
    "#profile-signout": "Log ud",
    ".settings-panel .panel-heading .eyebrow": "GØR APPEN TIL DIN",
    ".settings-panel .panel-heading h2": "Indstillinger",
    ".setting-control label[for='theme-setting']": "Tema",
    ".setting-control label[for='language-setting']": "Sprog",
    "#theme-setting option[value='light']": "Lyst",
    "#theme-setting option[value='dark']": "Mørkt",
    "#language-setting option[value='da']": "Dansk",
    "#language-setting option[value='en']": "English",
    "#password-form h3": "Skift personlig kode",
    "label[for='new-passcode']": "Ny kode",
    "#new-passcode": "Mindst 8 tegn",
    "label[for='confirm-new-passcode']": "Gentag ny kode",
    "#confirm-new-passcode": "Skriv koden igen",
    "#password-form button": "Gem ny kode",
    "#nickname-form h3": "Skift kaldenavn",
    "label[for='new-nickname']": "Nyt kaldenavn",
    "#new-nickname": "3–20 bogstaver, tal eller _",
    "#nickname-submit": "Gem kaldenavn",
    ".footer > span:first-child": "En god gerning ad gangen.",
    ".footer > span:last-child": "Hverdagens app"
  },
  en: {
    ".nav-item[data-page='home']": "My day",
    ".nav-item[data-page='leaderboard']": "Leaderboard",
    ".nav-item[data-page='profile']": "My profile",
    ".nav-label": "MENU",
    ".sidebar-note p": "Small steps matter.",
    ".sidebar-note strong": "Keep making a difference.",
    "#signout-button span": "Log out",
    ".user-chevron": "⌄",
    "#home-page .welcome-row .eyebrow": "YOUR GREEN EVERYDAY",
    "#home-page .welcome-row h1": "Hi, ",
    "#home-page .welcome-row .page-subtitle": "Every little action makes a difference.",
    ".streak-badge": "Make today greener",
    ".hero-tag": "TODAY'S REFLECTION",
    ".hero-copy h2": "What have you done for nature today?",
    ".hero-copy p": "No action is too small. Share it with the community.",
    ".entry-panel .panel-heading .eyebrow": "YOUR JOURNAL",
    ".entry-panel .panel-heading h2": "Add a good deed",
    ".entry-panel label": "What did you do?",
    "#activity-description": "E.g. I cycled to work instead of driving…",
    ".entry-panel .form-bottom .button": "Share my deed",
    ".score-panel > .eyebrow": "YOUR CONTRIBUTION",
    ".score-label": "good deeds in total",
    ".score-bottom span": "Your place",
    ".text-button": "See leaderboard",
    ".recent-panel .panel-heading .eyebrow": "SMALL STEPS, BIG DIFFERENCE",
    ".recent-panel .panel-heading h2": "Your recent deeds",
    "#leaderboard-page .page-heading .eyebrow": "WE MAKE A DIFFERENCE TOGETHER",
    "#leaderboard-page .page-heading h1": "Leaderboard",
    "#leaderboard-page .page-subtitle": "Every shared deed earns one point. Everyone can join!",
    ".leaderboard-panel .panel-heading .eyebrow": "THE COMMUNITY",
    ".leaderboard-panel .panel-heading h2": "Everyday green heroes",
    ".leaderboard-head": "PLACE GREEN HERO DEEDS",
    "#profile-page .page-heading .eyebrow": "YOU ARE MAKING A DIFFERENCE",
    "#profile-page .page-heading h1": "My profile",
    "#profile-page .page-heading .page-subtitle": "Your nickname and green deeds.",
    ".profile-panel .eyebrow": "YOUR NICKNAME",
    ".profile-panel .page-subtitle": "Part of the community for greener everyday living.",
    ".profile-stats > .eyebrow": "YOUR CONTRIBUTION TO NATURE",
    ".profile-stats p:not(.eyebrow)": "good deeds shared",
    "#profile-signout": "Log out",
    ".settings-panel .panel-heading .eyebrow": "MAKE THE APP YOURS",
    ".settings-panel .panel-heading h2": "Settings",
    ".setting-control label[for='theme-setting']": "Theme",
    ".setting-control label[for='language-setting']": "Language",
    "#theme-setting option[value='light']": "Light",
    "#theme-setting option[value='dark']": "Dark",
    "#language-setting option[value='da']": "Danish",
    "#password-form h3": "Change personal passcode",
    "label[for='new-passcode']": "New passcode",
    "#new-passcode": "At least 8 characters",
    "label[for='confirm-new-passcode']": "Repeat new passcode",
    "#confirm-new-passcode": "Type the passcode again",
    "#password-form button": "Save new passcode",
    "#nickname-form h3": "Change nickname",
    "label[for='new-nickname']": "New nickname",
    "#new-nickname": "3–20 letters, numbers or _",
    "#nickname-submit": "Save nickname",
    ".footer > span:first-child": "One good deed at a time.",
    ".footer > span:last-child": "Hverdagens app"
  }
};

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
  const english = languageSetting.value === "en";
  authSubmit.innerHTML = signup
    ? `${english ? "Create my profile" : "Opret min profil"} <span aria-hidden="true">→</span>`
    : `${english ? "Log in" : "Log ind"} <span aria-hidden="true">→</span>`;
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
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(
    languageSetting.value === "en" ? "en" : "da-DK", {
    weekday: "long", day: "numeric", month: "long"
    }
  ).format(new Date());
  document.querySelector("#new-nickname").value = nickname;
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
        .limit(1000)
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
  updateNicknameAvailability(score);

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
    points.textContent = languageSetting.value === "en"
      ? `${row.points} ${Number(row.points) === 1 ? "deed" : "deeds"}`
      : `${row.points} ${Number(row.points) === 1 ? "gerning" : "gerninger"}`;
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
  document.querySelector("#recent-count").textContent = languageSetting.value === "en"
    ? `${activities.length} SHARED`
    : `${activities.length} DELT`;
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
    const deleteButton = document.createElement("button");
    deleteButton.className = "activity-delete";
    deleteButton.type = "button";
    deleteButton.textContent = languageSetting.value === "en" ? "Delete" : "Slet";
    deleteButton.setAttribute("aria-label", `${languageSetting.value === "en" ? "Delete deed" : "Slet gerning"}: ${activity.description}`);
    deleteButton.addEventListener("click", () => deleteActivity(activity.id));
    item.append(icon, copy, points, deleteButton);
    recentList.append(item);
  }
}

async function deleteActivity(activityId) {
  const message = languageSetting.value === "en"
    ? "Delete this deed? The point will be removed from your score."
    : "Slet denne gerning? Pointet bliver trukket fra din score.";
  if (!window.confirm(message)) return;
  try {
    const { error } = await supabase.from("activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", currentUser.id);
    if (error) throw error;
    showNotice(languageSetting.value === "en" ? "Deed deleted." : "Gerningen er slettet.");
    await loadDashboard();
  } catch (error) {
    displayError(error);
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat(languageSetting.value === "en" ? "en" : "da-DK", {
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
      const { data: loginEmail, error: lookupError } = await supabase.rpc("get_login_email", {
        requested_nickname: normalizedNickname
      });
      if (lookupError) throw lookupError;
      if (!loginEmail) {
        throw new Error(languageSetting.value === "en"
          ? "No profile was found with that nickname."
          : "Der findes ingen profil med det kaldenavn.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
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

function applyPreferences() {
  const preferences = {
    theme: themeSetting.value,
    language: languageSetting.value
  };
  localStorage.setItem("hverdagens-app-preferences", JSON.stringify(preferences));
  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.lang = preferences.language;
  for (const [selector, text] of Object.entries(translations[preferences.language])) {
    const element = document.querySelector(selector);
    if (!element) continue;
    if (selector === ".leaderboard-head") {
      const labels = preferences.language === "en"
        ? ["PLACE", "GREEN HERO", "DEEDS"]
        : ["PLACERING", "GRØN HVERDAGSHELT", "GERNINGER"];
      element.replaceChildren(...labels.map((label) => {
        const span = document.createElement("span");
        span.textContent = label;
        return span;
      }));
    } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.placeholder = text;
    } else {
      const textNode = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = element.children.length ? `${text} ` : text;
      else element.textContent = text;
    }
  }
  const english = preferences.language === "en";
  authTitle.innerHTML = english ? "Make a little good<br>for nature." : "Gør lidt godt<br>for naturen.";
  authIntro.textContent = english
    ? "Write down today's green deeds and inspire each other."
    : "Skriv dagens grønne gerninger ned, og inspirér hinanden til flere.";
  document.querySelector("#auth-form label[for='nickname']").textContent = english ? "Nickname" : "Kaldenavn";
  document.querySelector("#auth-form label[for='passcode']").textContent = english ? "Personal passcode" : "Personlig kode";
  document.querySelector("#auth-form .field-hint").textContent = english ? "3–20 letters, numbers or _" : "3–20 bogstaver, tal eller _";
  document.querySelector("#confirm-field label").textContent = english ? "Repeat passcode" : "Gentag koden";
  loginTab.textContent = english ? "Log in" : "Log ind";
  signupTab.textContent = english ? "Create profile" : "Opret profil";
  authSubmit.innerHTML = isSignup
    ? `${english ? "Create my profile" : "Opret min profil"} <span aria-hidden="true">→</span>`
    : `${english ? "Log in" : "Log ind"} <span aria-hidden="true">→</span>`;
  document.querySelector(".auth-footnote").textContent = english
    ? "No email needed. Remember your personal passcode — it cannot be reset."
    : "Ingen e-mail nødvendig. Husk din personlige kode — den kan ikke nulstilles.";
  updateNicknameAvailability(Number(document.querySelector("#profile-score").textContent));
  if (currentUser) loadDashboard();
}

function updateNicknameAvailability(score) {
  const locked = score <= 35;
  document.querySelector("#new-nickname").disabled = locked;
  document.querySelector("#nickname-submit").disabled = locked;
  document.querySelector("#nickname-lock-message").textContent = locked
    ? (languageSetting.value === "en"
      ? `You can change your nickname after sharing 36 good deeds. You have ${score}.`
      : `Du kan skifte kaldenavn, når du har delt 36 gode gerninger. Du har delt ${score}.`)
    : (languageSetting.value === "en"
      ? "You have earned the right to change your nickname."
      : "Du har optjent retten til at skifte kaldenavn.");
}

function loadPreferences() {
  const saved = localStorage.getItem("hverdagens-app-preferences");
  if (saved) {
    let preferences;
    try {
      preferences = JSON.parse(saved);
    } catch (error) {
      localStorage.removeItem("hverdagens-app-preferences");
      showNotice("Saved app settings could not be read and were reset.", true);
    }
    if (!preferences) {
      applyPreferences();
      return;
    }
    if (preferences.theme === "light" || preferences.theme === "dark") themeSetting.value = preferences.theme;
    if (preferences.language === "da" || preferences.language === "en") languageSetting.value = preferences.language;
  }
  applyPreferences();
}

themeSetting.addEventListener("change", applyPreferences);
languageSetting.addEventListener("change", applyPreferences);

document.querySelector("#password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#new-passcode").value;
  const confirmation = document.querySelector("#confirm-new-passcode").value;
  if (password !== confirmation) {
    showNotice(languageSetting.value === "en" ? "The passcodes do not match." : "Koderne er ikke ens.", true);
    return;
  }
  const submit = event.currentTarget.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    event.currentTarget.reset();
    showNotice(languageSetting.value === "en" ? "Your passcode has been changed." : "Din kode er ændret.");
  } catch (error) {
    displayError(error);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#nickname-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const nickname = document.querySelector("#new-nickname").value.trim();
  const submit = document.querySelector("#nickname-submit");
  submit.disabled = true;
  try {
    const { error } = await supabase.rpc("change_profile_nickname", { new_nickname: nickname });
    if (error) throw error;
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;
    if (!data.user) throw new Error("Could not refresh your profile. Please log in again.");
    showNotice(languageSetting.value === "en" ? "Your nickname has been changed." : "Dit kaldenavn er ændret.");
    showSignedIn(data.user);
  } catch (error) {
    displayError(error);
  } finally {
    submit.disabled = false;
    applyPreferences();
  }
});

loadPreferences();

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

const config = window.APP_CONFIG;
const { createClient } = window.supabase;
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
const signupDetails = document.querySelector("#signup-details");
const contactEmailInput = document.querySelector("#contact-email");
const displayNameModeInput = document.querySelector("#display-name-mode");
const realNameInput = document.querySelector("#real-name");
const termsAcceptedInput = document.querySelector("#terms-accepted");
const privacyAcceptedInput = document.querySelector("#privacy-accepted");
const activityForm = document.querySelector("#activity-form");
const descriptionInput = document.querySelector("#activity-description");
const leaderboardList = document.querySelector("#leaderboard-list");
const recentList = document.querySelector("#recent-list");
const themeSetting = document.querySelector("#theme-setting");
const languageSetting = document.querySelector("#language-setting");
let supabase;
let currentUser;
let currentProfile;
let authFlow = 0;
let isSignup = false;
let noticeTimeout;
let profileSearchTimer;
let profileSearchFlow = 0;
const translations = {
  da: {
    ".nav-item[data-page='home']": "Min hverdag",
    ".nav-item[data-page='leaderboard']": "Pointtavle",
    ".nav-item[data-page='profile']": "Min profil",
    ".nav-label": "MENU",
    ".sidebar-note p": "Små skridt tæller.",
    ".sidebar-note strong": "Bliv ved med at gøre en forskel.",
    "#signout-button span": "Log ud",
    ".topbar-settings": "Indstillinger",
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
    ".privacy-reminder": "Skriv ikke private eller følsomme oplysninger.",
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
    "#profile-search-form label": "Find en profil",
    "#profile-search": "Søg efter visningsnavn",
    "#profile-search-results .setting-hint": "Skriv mindst to tegn for at søge.",
    "#public-profile-page .page-heading .eyebrow": "FÆLLESSKABET",
    "#back-to-leaderboard": "← Tilbage til pointtavlen",
    "#public-profile-page .profile-panel .eyebrow": "PROFILTEKST",
    "#public-profile-page .profile-stats > .eyebrow": "GODE GERNINGER",
    "#public-profile-score-label": "delte gode gerninger",
    "#profile-page .page-heading .eyebrow": "DET ER DIG, DER GØR EN FORSKEL",
    "#profile-page .page-heading h1": "Min profil",
    "#profile-page .page-heading .page-subtitle": "Dit offentlige navn og dine grønne gerninger.",
    "#profile-page .profile-panel .eyebrow": "OFFENTLIGT NAVN",
    ".profile-stats > .eyebrow": "DIT BIDRAG TIL NATUREN",
    ".profile-stats p:not(.eyebrow)": "delte gode gerninger",
    "#profile-signout": "Log ud",
    "#open-settings": "Indstillinger",
    "#back-to-profile": "← Tilbage til profil",
    "#settings-page .page-heading .eyebrow": "GØR APPEN TIL DIN",
    "#settings-page .page-heading h1": "Indstillinger",
    "#settings-page .page-heading .page-subtitle": "Vælg, hvordan Hverdagens app passer bedst til dig.",
    ".settings-panel .panel-heading .eyebrow": "GØR APPEN TIL DIN",
    ".settings-panel .panel-heading h2": "Indstillinger",
    ".data-rights-panel > .eyebrow": "DINE DATA",
    ".data-rights-panel h2": "Privatliv og konto",
    ".data-rights-panel .setting-hint": "Du kan hente en kopi af dine profildata og gerninger eller slette din konto og dens data.",
    ".data-rights-panel .privacy-link": "Læs privatlivsinformation",
    "#export-data": "Hent mine data",
    "#delete-account": "Slet min konto",
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
    "#signup-details label[for='contact-email']": "E-mailadresse (privat)",
    "#signup-details label[for='display-name-mode']": "Navn andre kan se",
    "#display-name-mode option[value='nickname']": "Mit kaldenavn",
    "#display-name-mode option[value='real_name']": "Mit eget navn",
    "#signup-real-name-field label": "Dit eget navn",
    "#terms-accepted + span": "Jeg accepterer vilkårene.",
    "#privacy-accepted + span": "Jeg har læst privatlivsinformationen og forstår, at mit valgte visningsnavn, min profiltekst og mine gerninger kan ses af andre indloggede brugere, hvis min profil er offentlig.",
    "#signup-terms-link": "Læs vilkårene",
    "#signup-privacy-link": "Læs privatlivsinformationen",
    "#privacy-page-link": "Læs om privatliv og data",
    "#signup-details .field-hint": "E-mailen gemmes privat, er ikke bekræftet og bruges ikke til login. Den kan eventuelt bruges til 2FA senere.",
    ".auth-footnote": "E-mailen gemmes privat og bruges ikke til login. Husk din personlige kode — den kan ikke nulstilles.",
    "#public-profile-form h3": "Offentlig profil",
    "#public-profile-form .setting-hint": "Andre indloggede brugere kan se dit valgte navn, din profiltekst og dine gerninger. Din e-mail forbliver privat og er ikke bekræftet.",
    "label[for='profile-display-name-mode']": "Navn, andre kan se",
    "#profile-display-name-mode option[value='nickname']": "Mit kaldenavn",
    "#profile-display-name-mode option[value='real_name']": "Mit eget navn",
    "label[for='profile-real-name']": "Dit eget navn (privat, hvis kaldenavn vises)",
    "label[for='profile-bio']": "Profiltekst (offentlig)",
    "#profile-bio": "Fortæl lidt om dig selv",
    "label[for='profile-email']": "E-mailadresse (privat)",
    "#public-profile-form button": "Gem profil",
    "#public-profile-form .profile-public-consent span": "Jeg giver lov til, at mit visningsnavn, min profiltekst og mine gerninger kan ses af andre indloggede brugere.",
    "#public-profile-form .profile-public-consent + .setting-hint": "Hvis du fjerner markeringen, skjules profilen, og den kan ikke findes i søgning eller pointtavle. Din e-mail vises aldrig offentligt.",
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
    ".topbar-settings": "Settings",
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
    ".privacy-reminder": "Do not include private or sensitive information.",
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
    "#profile-search-form label": "Find a profile",
    "#profile-search": "Search display names",
    "#profile-search-results .setting-hint": "Enter at least two characters to search.",
    "#public-profile-page .page-heading .eyebrow": "THE COMMUNITY",
    "#back-to-leaderboard": "← Back to leaderboard",
    "#public-profile-page .profile-panel .eyebrow": "PROFILE",
    "#public-profile-page .profile-stats > .eyebrow": "GOOD DEEDS",
    "#public-profile-score-label": "good deeds shared",
    "#profile-page .page-heading .eyebrow": "YOU ARE MAKING A DIFFERENCE",
    "#profile-page .page-heading h1": "My profile",
    "#profile-page .page-heading .page-subtitle": "Your public name and green deeds.",
    "#profile-page .profile-panel .eyebrow": "PUBLIC NAME",
    ".profile-stats > .eyebrow": "YOUR CONTRIBUTION TO NATURE",
    ".profile-stats p:not(.eyebrow)": "good deeds shared",
    "#profile-signout": "Log out",
    "#open-settings": "Settings",
    "#back-to-profile": "← Back to profile",
    "#settings-page .page-heading .eyebrow": "MAKE THE APP YOURS",
    "#settings-page .page-heading h1": "Settings",
    "#settings-page .page-heading .page-subtitle": "Choose how Hverdagens app works best for you.",
    ".settings-panel .panel-heading .eyebrow": "MAKE THE APP YOURS",
    ".settings-panel .panel-heading h2": "Settings",
    ".data-rights-panel > .eyebrow": "YOUR DATA",
    ".data-rights-panel h2": "Privacy and account",
    ".data-rights-panel .setting-hint": "Download a copy of your profile and deeds, or delete your account and its data.",
    ".data-rights-panel .privacy-link": "Read the privacy notice",
    "#export-data": "Download my data",
    "#delete-account": "Delete my account",
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
    "#signup-details label[for='contact-email']": "Email address (private)",
    "#signup-details label[for='display-name-mode']": "Name others can see",
    "#display-name-mode option[value='nickname']": "My nickname",
    "#display-name-mode option[value='real_name']": "My real name",
    "#signup-real-name-field label": "Your real name",
    "#terms-accepted + span": "I accept the terms.",
    "#privacy-accepted + span": "I have read the privacy notice and understand that my selected display name, profile text, and deeds can be seen by other signed-in users if my profile is public.",
    "#signup-terms-link": "Read the terms",
    "#signup-privacy-link": "Read the privacy notice",
    "#privacy-page-link": "Read about privacy and data",
    "#signup-details .field-hint": "Your email is stored privately, is not verified, and is not used to sign in. It may be used for 2FA later.",
    ".auth-footnote": "Your email is stored privately and is not used to sign in. Remember your passcode — it cannot be reset.",
    "#public-profile-form h3": "Public profile",
    "#public-profile-form .setting-hint": "Other signed-in users can see your chosen name, profile text, and deeds. Your email stays private and is not verified.",
    "label[for='profile-display-name-mode']": "Name others can see",
    "#profile-display-name-mode option[value='nickname']": "My nickname",
    "#profile-display-name-mode option[value='real_name']": "My real name",
    "label[for='profile-real-name']": "Your real name (private when nickname is shown)",
    "label[for='profile-bio']": "Profile text (public)",
    "#profile-bio": "Tell others a little about yourself",
    "label[for='profile-email']": "Email address (private)",
    "#public-profile-form button": "Save profile",
    "#public-profile-form .profile-public-consent span": "I allow my display name, profile text, and deeds to be seen by other signed-in users.",
    "#public-profile-form .profile-public-consent + .setting-hint": "When unchecked, your profile is hidden from search and the leaderboard. Your email is never public.",
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
  signupDetails.hidden = !signup;
  contactEmailInput.required = signup;
  displayNameModeInput.required = signup;
  termsAcceptedInput.required = signup;
  privacyAcceptedInput.required = signup;
  updateSignupNameField();
  const english = languageSetting.value === "en";
  authSubmit.innerHTML = signup
    ? `${english ? "Create my profile" : "Opret min profil"} <span aria-hidden="true">→</span>`
    : `${english ? "Log in" : "Log ind"} <span aria-hidden="true">→</span>`;
}

function showSignedOut() {
  currentUser = undefined;
  currentProfile = undefined;
  appShell.hidden = true;
  authScreen.hidden = false;
}

function routeSignedInSession(session, flow) {
  if (flow !== authFlow) return;
  showSignedIn(session.user);
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
    const [leaderboardResult, activityResult, profileResult] = await Promise.all([
      supabase.rpc("get_leaderboard"),
      supabase.from("activities")
        .select("id, description, created_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.rpc("get_my_profile")
    ]);
    if (leaderboardResult.error) throw leaderboardResult.error;
    if (activityResult.error) throw activityResult.error;
    if (profileResult.error) throw profileResult.error;
    currentProfile = profileResult.data;
    renderMyProfile(currentProfile);
    renderLeaderboard(leaderboardResult.data || []);
    renderActivities(activityResult.data || []);
  } catch (error) {
    displayError(error);
  }
}

function renderMyProfile(profile) {
  if (!profile) return;
  const displayName = profile.display_name || profile.nickname;
  for (const id of ["welcome-nickname", "topbar-nickname", "profile-nickname"]) {
    document.getElementById(id).textContent = displayName;
  }
  for (const id of ["avatar-initial", "profile-avatar"]) {
    document.getElementById(id).textContent = displayName.charAt(0).toUpperCase();
  }
  document.querySelector("#profile-display-name-mode").value = profile.display_name_mode;
  document.querySelector("#profile-real-name").value = profile.real_name || "";
  document.querySelector("#profile-bio").value = profile.bio || "";
  document.querySelector("#profile-email").value = profile.email || "";
  document.querySelector("#profile-public-enabled").checked = Boolean(profile.public_profile_enabled);
  document.querySelector("#my-profile-bio").textContent = profile.bio || (
    languageSetting.value === "en" ? "No profile text yet." : "Ingen profiltekst endnu."
  );
  updateProfileNameField();
  document.querySelector("#profile-page .profile-panel .eyebrow").textContent =
    languageSetting.value === "en" ? "PUBLIC NAME" : "OFFENTLIGT NAVN";
}

function renderLeaderboard(rows) {
  const sorted = [...rows].sort((a, b) => b.points - a.points || a.display_name.localeCompare(b.display_name, "da"));
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
    avatar.textContent = String(row.display_name).charAt(0).toUpperCase();
    const name = document.createElement("button");
    name.className = "leader-profile-link";
    name.type = "button";
    name.textContent = row.display_name;
    name.addEventListener("click", () => openPublicProfile(row.user_id));
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

async function openPublicProfile(userId) {
  try {
    const { data, error } = await supabase.rpc("get_public_profile", {
      requested_user_id: userId
    });
    if (error) throw error;
    if (!data) throw new Error(languageSetting.value === "en" ? "Profile not found." : "Profilen blev ikke fundet.");
    document.querySelectorAll(".page").forEach((element) => { element.hidden = element.id !== "public-profile-page"; });
    document.querySelector("#public-profile-name").textContent = data.display_name;
    document.querySelector("#public-profile-avatar").textContent = data.display_name.charAt(0).toUpperCase();
    document.querySelector("#public-profile-bio").textContent = data.bio || (
      languageSetting.value === "en" ? "No profile text yet." : "Ingen profiltekst endnu."
    );
    document.querySelector("#public-profile-score").textContent = String(data.points);
    const activities = document.querySelector("#public-profile-activities");
    activities.replaceChildren();
    if (!data.activities.length) {
      activities.append(emptyState(languageSetting.value === "en" ? "No deeds shared yet." : "Ingen gerninger delt endnu."));
    } else {
      for (const activity of data.activities) {
        const item = document.createElement("article");
        item.className = "recent-item";
        const copy = document.createElement("div");
        copy.className = "activity-copy";
        const description = document.createElement("div");
        description.className = "activity-description";
        description.textContent = activity.description;
        const time = document.createElement("div");
        time.className = "activity-time";
        time.textContent = formatDate(activity.created_at);
        copy.append(description, time);
        item.append(copy);
        activities.append(item);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    displayError(error);
  }
}

async function searchProfiles() {
  const query = document.querySelector("#profile-search").value.trim();
  const results = document.querySelector("#profile-search-results");
  const flow = ++profileSearchFlow;
  if (query.length < 2) {
    const hint = emptyState(languageSetting.value === "en"
      ? "Enter at least two characters to search."
      : "Skriv mindst to tegn for at søge.");
    results.replaceChildren(hint);
    return;
  }
  try {
    const { data, error } = await supabase.rpc("search_public_profiles", { search_text: query });
    if (error) throw error;
    if (flow !== profileSearchFlow) return;
    results.replaceChildren();
    if (!data?.length) {
      results.append(emptyState(languageSetting.value === "en" ? "No profiles found." : "Ingen profiler fundet."));
      return;
    }
    for (const profile of data) {
      const button = document.createElement("button");
      button.className = "profile-search-result";
      button.type = "button";
      button.textContent = `${profile.display_name} · ${profile.points}`;
      button.addEventListener("click", () => openPublicProfile(profile.user_id));
      results.append(button);
    }
  } catch (error) {
    if (flow === profileSearchFlow) displayError(error);
  }
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
    const active = element.dataset.page === page
      || (page === "settings" && element.dataset.page === "profile");
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
      if (!termsAcceptedInput.checked || !privacyAcceptedInput.checked) {
        throw new Error(languageSetting.value === "en"
          ? "Accept the terms and privacy notice to create an account."
          : "Accepter vilkårene og privatlivsinformationen for at oprette en konto.");
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nickname,
            contact_email: contactEmailInput.value.trim().toLowerCase(),
            display_name_mode: displayNameModeInput.value,
            real_name: realNameInput.value.trim(),
            terms_accepted: termsAcceptedInput.checked,
            privacy_accepted: privacyAcceptedInput.checked,
            terms_version: "2026-10-23",
            privacy_version: "2026-10-23"
          }
        }
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
document.querySelector("#back-to-leaderboard").addEventListener("click", () => navigate("leaderboard"));
document.querySelector("#profile-search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(profileSearchTimer);
  searchProfiles();
});
document.querySelector("#profile-search").addEventListener("input", () => {
  clearTimeout(profileSearchTimer);
  profileSearchTimer = setTimeout(searchProfiles, 250);
});

function updateSignupNameField() {
  const needsRealName = displayNameModeInput.value === "real_name";
  document.querySelector("#signup-real-name-field").hidden = !needsRealName;
  realNameInput.required = isSignup && needsRealName;
}

function updateProfileNameField() {
  const mode = document.querySelector("#profile-display-name-mode").value;
  const nameInput = document.querySelector("#profile-real-name");
  nameInput.required = mode === "real_name";
  nameInput.placeholder = mode === "real_name"
    ? (languageSetting.value === "en" ? "Your public name" : "Dit offentlige navn")
    : "";
}

displayNameModeInput.addEventListener("change", updateSignupNameField);
document.querySelector("#profile-display-name-mode").addEventListener("change", updateProfileNameField);

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) displayError(error);
}

document.querySelector("#signout-button").addEventListener("click", signOut);
document.querySelector("#profile-signout").addEventListener("click", signOut);
document.querySelector("#back-to-profile").addEventListener("click", () => navigate("profile"));

document.querySelector("#export-data").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { data: exported, error } = await supabase.rpc("export_my_data");
    if (error) throw error;
    if (!exported) throw new Error(languageSetting.value === "en" ? "Your data could not be exported." : "Dine data kunne ikke eksporteres.");
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `hverdagens-app-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    showNotice(languageSetting.value === "en" ? "Your data export has been downloaded." : "Dine data er hentet.");
  } catch (error) {
    displayError(error);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#delete-account").addEventListener("click", async (event) => {
  const confirmation = languageSetting.value === "en"
    ? window.prompt("This permanently deletes your profile and deeds. Type DELETE to continue.")
    : window.prompt("Dette sletter din profil og dine gerninger permanent. Skriv SLET for at fortsætte.");
  if (confirmation !== (languageSetting.value === "en" ? "DELETE" : "SLET")) return;

  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { error } = await supabase.rpc("delete_my_account");
    if (error) throw error;
    await supabase.auth.signOut({ scope: "local" });
    showSignedOut();
    showNotice(languageSetting.value === "en" ? "Your account and app data have been deleted." : "Din konto og dine appdata er slettet.");
  } catch (error) {
    displayError(error);
  } finally {
    button.disabled = false;
  }
});

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
    } else if (selector === ".topbar-settings") {
      element.querySelector("span").textContent = text;
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
  document.querySelector("#privacy-page-link").textContent = english
    ? "Read about privacy and data"
    : "Læs om privatliv og data";
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
    ? "Your email is stored privately and is not used to sign in. Remember your passcode — it cannot be reset."
    : "E-mailen gemmes privat og bruges ikke til login. Husk din personlige kode — den kan ikke nulstilles.";
  if (currentProfile) {
    document.querySelector("#my-profile-bio").textContent = currentProfile.bio || (
      english ? "No profile text yet." : "Ingen profiltekst endnu."
    );
  }
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

document.querySelector("#public-profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const { error } = await supabase.rpc("update_my_public_profile", {
      requested_display_name_mode: document.querySelector("#profile-display-name-mode").value,
      requested_real_name: document.querySelector("#profile-real-name").value.trim(),
      requested_bio: document.querySelector("#profile-bio").value.trim(),
      requested_email: document.querySelector("#profile-email").value.trim(),
      requested_public_profile_enabled: document.querySelector("#profile-public-enabled").checked
    });
    if (error) throw error;
    showNotice(languageSetting.value === "en" ? "Your profile has been updated." : "Din profil er opdateret.");
    await loadDashboard();
  } catch (error) {
    displayError(error);
  } finally {
    submit.disabled = false;
  }
});

loadPreferences();

if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
  document.querySelector("#setup-message").hidden = false;
  showSignedOut();
  authSubmit.disabled = true;
} else {
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
supabase.auth.onAuthStateChange((event, session) => {
  if (!session?.user) {
    authFlow++;
    showSignedOut();
    return;
  }
  if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
    const flow = ++authFlow;
    setTimeout(() => { routeSignedInSession(session, flow); }, 0);
  }
});
}

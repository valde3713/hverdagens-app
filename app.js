import { validateNatureAction } from "./nature-check.js";

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
const aiModelStatus = document.querySelector("#ai-model-status");
const activityImageInput = document.querySelector("#activity-image");
const activityCameraInput = document.querySelector("#activity-camera-input");
const activityImagePreview = document.querySelector("#activity-image-preview");
const nativeCamera = window.Capacitor?.Plugins?.Camera || null;
let selectedActivityImage;
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
    ".hero-copy h2": "Hvad har du gjort for naturen i dag?",
    ".hero-copy p": "Del en god handling, eller indberet en skadelig handling.",
    ".entry-panel .panel-heading .eyebrow": "DIN DAGBOG",
    ".entry-panel .panel-heading h2": "Indberet en handling",
    ".entry-panel label": "Hvad gjorde du?",
    ".photo-upload-label": "Tilføj et billede (valgfrit)",
    "#activity-camera-button": "Tag et billede",
    "#activity-gallery-button": "Vælg fra billeder",
    ".photo-upload-hint": "JPEG, PNG eller WebP · maks. 5 MB",
    "#activity-description": "Fx Jeg cyklede på arbejde i stedet for at tage bilen…",
    ".privacy-reminder": "Skriv ikke private eller følsomme oplysninger.",
    "#ai-model-status": "Lokal AI vurderer, om din handling gavner eller skader naturen, og tildeler 1–5 point eller trækker 1 point fra. Teksten sendes ikke til en ekstern AI-tjeneste. Første brug kræver internet og download af modellen (ca. 125 MB).",
    ".entry-panel .form-bottom .button": "Del min gerning",
    ".score-panel > .eyebrow": "DIT BIDRAG",
    ".score-label": "point i alt",
    ".score-bottom span": "Din placering",
    ".text-button": "Se pointtavlen",
    ".recent-panel .panel-heading .eyebrow": "SMÅ SKRIDT, STOR FORSKEL",
    ".recent-panel .panel-heading h2": "Dine seneste gerninger",
    "#leaderboard-page .page-heading .eyebrow": "VI GØR DET SAMMEN",
    "#leaderboard-page .page-heading h1": "Pointtavlen",
    "#leaderboard-page .page-subtitle": "Gode gerninger giver 1–5 point. Skadelige handlinger giver −1 pr. indberetning. Du og admins kan også rette point.",
    ".leaderboard-panel .panel-heading .eyebrow": "FÆLLESSKABET",
    ".leaderboard-panel .panel-heading h2": "Grønne hverdagshelte",
    ".leaderboard-head": "PLACERING GRØN HVERDAGSHELT POINT",
    "#profile-search-form label": "Find en profil",
    "#profile-search": "Søg efter visningsnavn",
    "#profile-search-results .setting-hint": "Skriv mindst to tegn for at søge.",
    "#public-profile-page .page-heading .eyebrow": "FÆLLESSKABET",
    "#back-to-leaderboard": "← Tilbage til pointtavlen",
    "#public-profile-page .profile-panel .eyebrow": "PROFILTEKST",
    "#public-profile-page .profile-stats > .eyebrow": "POINT",
    "#public-profile-score-label": "point",
    "#home-page .recent-panel:last-child .panel-heading .eyebrow": "ÅBEN POINTHISTORIK",
    "#home-page .recent-panel:last-child .panel-heading h2": "Dine point",
    "#home-page .recent-panel:last-child .recent-count": "KAN IKKE SLETTES",
    "#profile-page .page-heading .eyebrow": "DET ER DIG, DER GØR EN FORSKEL",
    "#profile-page .page-heading h1": "Min profil",
    "#profile-page .page-heading .page-subtitle": "Dit offentlige navn og dine grønne gerninger.",
    "#profile-page .profile-panel .eyebrow": "OFFENTLIGT NAVN",
    "#nickname-lock-message": "Du kan ændre kaldenavn, når du har delt mindst 35 gerninger.",
    ".profile-stats > .eyebrow": "DIT BIDRAG TIL NATUREN",
    "#profile-score-label": "point",
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
    "#nickname-lock-message": "Du kan skifte kaldenavn når som helst.",
    "label[for='new-nickname']": "Nyt kaldenavn",
    "#new-nickname": "3–20 bogstaver, tal eller _",
    "#nickname-submit": "Gem kaldenavn",
    "#signup-details label[for='contact-email']": "E-mailadresse (privat)",
    "#signup-details label[for='display-name-mode']": "Navn andre kan se",
    "#display-name-mode option[value='nickname']": "Mit kaldenavn",
    "#display-name-mode option[value='real_name']": "Mit eget navn",
    "#signup-real-name-field label": "Dit eget navn",
    "#terms-accepted + span": "Jeg accepterer vilkårene.",
    "#privacy-accepted + span": "Jeg har læst privatlivsinformationen og forstår, at mit visningsnavn, min profiltekst, mine gerninger og billeder ved gerninger kan ses af andre indloggede brugere, hvis min profil er offentlig.",
    "#signup-terms-link": "Læs vilkårene",
    "#signup-privacy-link": "Læs privatlivsinformationen",
    "#privacy-page-link": "Læs om privatliv og data",
    "#signup-details .field-hint": "E-mailen gemmes privat, er ikke bekræftet og bruges ikke til login. Den kan eventuelt bruges til 2FA senere.",
    ".auth-footnote": "E-mailen gemmes privat og bruges ikke til login. Husk din personlige kode — den kan ikke nulstilles.",
    "#public-profile-form h3": "Offentlig profil",
    "#public-profile-form .setting-hint": "Andre indloggede brugere kan se dit valgte navn, din profiltekst, dine gerninger og billeder ved gerninger. Din e-mail forbliver privat og er ikke bekræftet.",
    "label[for='profile-display-name-mode']": "Navn, andre kan se",
    "#profile-display-name-mode option[value='nickname']": "Mit kaldenavn",
    "#profile-display-name-mode option[value='real_name']": "Mit eget navn",
    "label[for='profile-real-name']": "Dit eget navn (privat, hvis kaldenavn vises)",
    "label[for='profile-bio']": "Profiltekst (offentlig)",
    "#profile-bio": "Fortæl lidt om dig selv",
    "label[for='profile-email']": "E-mailadresse (privat)",
    "#public-profile-form button": "Gem profil",
    "#public-profile-form .profile-public-consent span": "Jeg giver lov til, at mit visningsnavn, min profiltekst, mine gerninger og billeder ved gerninger kan ses af andre indloggede brugere.",
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
    ".hero-copy p": "Share a helpful action or report a harmful one.",
    ".entry-panel .panel-heading .eyebrow": "YOUR JOURNAL",
    ".entry-panel .panel-heading h2": "Report an action",
    ".entry-panel label": "What did you do?",
    ".photo-upload-label": "Add a photo (optional)",
    "#activity-camera-button": "Take a photo",
    "#activity-gallery-button": "Choose a photo",
    ".photo-upload-hint": "JPEG, PNG, or WebP · max 5 MB",
    "#activity-description": "E.g. I cycled to work instead of driving…",
    ".privacy-reminder": "Do not include private or sensitive information.",
    "#ai-model-status": "Local AI estimates whether your action helps or harms nature and awards 1–5 points or deducts 1 point. Your text is not sent to an external AI service. The model requires an internet connection and a download (about 125 MB) on first use.",
    ".entry-panel .form-bottom .button": "Share my deed",
    ".score-panel > .eyebrow": "YOUR CONTRIBUTION",
    ".score-label": "points in total",
    ".score-bottom span": "Your place",
    ".text-button": "See leaderboard",
    ".recent-panel .panel-heading .eyebrow": "SMALL STEPS, BIG DIFFERENCE",
    ".recent-panel .panel-heading h2": "Your recent deeds",
    "#leaderboard-page .page-heading .eyebrow": "WE MAKE A DIFFERENCE TOGETHER",
    "#leaderboard-page .page-heading h1": "Leaderboard",
    "#leaderboard-page .page-subtitle": "Helpful deeds earn 1–5 points. Harmful actions deduct 1 point per report. You and admins can also adjust points.",
    ".leaderboard-panel .panel-heading .eyebrow": "THE COMMUNITY",
    ".leaderboard-panel .panel-heading h2": "Everyday green heroes",
    ".leaderboard-head": "PLACE GREEN HERO POINTS",
    "#profile-search-form label": "Find a profile",
    "#profile-search": "Search display names",
    "#profile-search-results .setting-hint": "Enter at least two characters to search.",
    "#public-profile-page .page-heading .eyebrow": "THE COMMUNITY",
    "#back-to-leaderboard": "← Back to leaderboard",
    "#public-profile-page .profile-panel .eyebrow": "PROFILE",
    "#public-profile-page .profile-stats > .eyebrow": "POINTS",
    "#public-profile-score-label": "points",
    "#home-page .recent-panel:last-child .panel-heading .eyebrow": "TRANSPARENT POINT HISTORY",
    "#home-page .recent-panel:last-child .panel-heading h2": "Your points",
    "#home-page .recent-panel:last-child .recent-count": "CANNOT BE DELETED",
    "#profile-page .page-heading .eyebrow": "YOU ARE MAKING A DIFFERENCE",
    "#profile-page .page-heading h1": "My profile",
    "#profile-page .page-heading .page-subtitle": "Your public name and green deeds.",
    "#profile-page .profile-panel .eyebrow": "PUBLIC NAME",
    "#nickname-lock-message": "You can change your nickname after sharing at least 35 deeds.",
    ".profile-stats > .eyebrow": "YOUR CONTRIBUTION TO NATURE",
    "#profile-score-label": "points",
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
    "#nickname-lock-message": "You can change your nickname at any time.",
    "label[for='new-nickname']": "New nickname",
    "#new-nickname": "3–20 letters, numbers or _",
    "#nickname-submit": "Save nickname",
    "#signup-details label[for='contact-email']": "Email address (private)",
    "#signup-details label[for='display-name-mode']": "Name others can see",
    "#display-name-mode option[value='nickname']": "My nickname",
    "#display-name-mode option[value='real_name']": "My real name",
    "#signup-real-name-field label": "Your real name",
    "#terms-accepted + span": "I accept the terms.",
    "#privacy-accepted + span": "I have read the privacy notice and understand that my display name, profile text, deeds, and photos attached to deeds can be seen by other signed-in users if my profile is public.",
    "#signup-terms-link": "Read the terms",
    "#signup-privacy-link": "Read the privacy notice",
    "#privacy-page-link": "Read about privacy and data",
    "#signup-details .field-hint": "Your email is stored privately, is not verified, and is not used to sign in. It may be used for 2FA later.",
    ".auth-footnote": "Your email is stored privately and is not used to sign in. Remember your passcode — it cannot be reset.",
    "#public-profile-form h3": "Public profile",
    "#public-profile-form .setting-hint": "Other signed-in users can see your chosen name, profile text, deeds, and photos attached to deeds. Your email stays private and is not verified.",
    "label[for='profile-display-name-mode']": "Name others can see",
    "#profile-display-name-mode option[value='nickname']": "My nickname",
    "#profile-display-name-mode option[value='real_name']": "My real name",
    "label[for='profile-real-name']": "Your real name (private when nickname is shown)",
    "label[for='profile-bio']": "Profile text (public)",
    "#profile-bio": "Tell others a little about yourself",
    "label[for='profile-email']": "Email address (private)",
    "#public-profile-form button": "Save profile",
    "#public-profile-form .profile-public-consent span": "I allow my display name, profile text, deeds, and photos attached to deeds to be seen by other signed-in users.",
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
    const [leaderboardResult, activityResult, profileResult, pointHistoryResult] = await Promise.all([
      supabase.rpc("get_leaderboard"),
      supabase.from("activities")
        .select("id, description, created_at, image_path")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.rpc("get_my_profile"),
      supabase.rpc("get_my_point_history")
    ]);
    if (leaderboardResult.error) throw leaderboardResult.error;
    if (activityResult.error) throw activityResult.error;
    if (profileResult.error) throw profileResult.error;
    if (pointHistoryResult.error) throw pointHistoryResult.error;
    currentProfile = profileResult.data;
    renderMyProfile(currentProfile);
    renderLeaderboard(leaderboardResult.data || []);
    const pointEntries = Array.isArray(pointHistoryResult.data) ? pointHistoryResult.data : [];
    renderActivities(await addSignedImageUrls(activityResult.data || []), pointEntries);
    renderPointHistory(pointEntries);
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
  const roleBadge = document.querySelector("#profile-admin-role");
  roleBadge.hidden = !profile.admin_role;
  roleBadge.textContent = profile.admin_role === "owner" ? "Owner" : profile.admin_role === "admin" ? "Admin" : "";
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
  updateNicknameAvailability(Number(currentProfile?.activity_count || 0));
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
      ? `${row.points} ${Number(row.points) === 1 ? "point" : "points"}`
      : `${row.points} ${Number(row.points) === 1 ? "point" : "point"}`;
    item.append(position, identity, points);
    leaderboardList.append(item);
  });
}

function updateNicknameAvailability(score) {
  const locked = score < 35;
  document.querySelector("#new-nickname").disabled = locked;
  document.querySelector("#nickname-submit").disabled = locked;
  document.querySelector("#nickname-lock-message").textContent = locked
    ? (languageSetting.value === "en"
      ? `You need 35 deeds to change your nickname. You have ${score}.`
      : `Du skal have delt 35 gerninger for at ændre kaldenavn. Du har delt ${score}.`)
    : (languageSetting.value === "en"
      ? "You can change your nickname."
      : "Du kan ændre dit kaldenavn.");
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
    const roleBadge = document.querySelector("#public-profile-admin-role");
    roleBadge.hidden = !data.admin_role;
    roleBadge.textContent = data.admin_role === "owner" ? "Owner" : data.admin_role === "admin" ? "Admin" : "";
    document.querySelector("#public-profile-bio").textContent = data.bio || (
      languageSetting.value === "en" ? "No profile text yet." : "Ingen profiltekst endnu."
    );
    document.querySelector("#public-profile-score").textContent = String(data.points);
    const activities = document.querySelector("#public-profile-activities");
    activities.replaceChildren();
    if (!data.activities.length) {
      activities.append(emptyState(languageSetting.value === "en" ? "No deeds shared yet." : "Ingen gerninger delt endnu."));
    } else {
      for (const activity of await addSignedImageUrls(data.activities)) {
        const item = document.createElement("article");
        item.className = "recent-item";
        const copy = document.createElement("div");
        copy.className = "activity-copy";
        const description = document.createElement("div");
        description.className = "activity-description";
        description.textContent = activity.description;
        if (activity.image_url) {
          const image = document.createElement("img");
          image.className = "activity-photo";
          image.src = activity.image_url;
          image.alt = languageSetting.value === "en" ? "Photo of shared deed" : "Billede af delt gerning";
          copy.append(description, image);
        } else {
          copy.append(description);
        }
        const time = document.createElement("div");
        time.className = "activity-time";
        time.textContent = formatDate(activity.created_at);
        copy.append(time);
        const points = document.createElement("span");
        points.className = "activity-points";
        const activityPoints = Number(activity.points || 0);
        points.textContent = `${activityPoints > 0 ? "+" : ""}${activityPoints} ${languageSetting.value === "en" ? "points" : "point"}`;
        item.append(copy, points);
        activities.append(item);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    displayError(error);
  }
}

async function addSignedImageUrls(activities) {
  const imagePaths = activities.map((activity) => activity.image_path).filter(Boolean);
  if (!imagePaths.length) return activities.map((activity) => ({ ...activity, image_url: null }));
  const { data, error } = await supabase.storage.from("deed-images").createSignedUrls(imagePaths, 3600);
  if (error) throw error;
  const failedSignature = data.find((signedImage) => signedImage.error);
  if (failedSignature) {
    throw new Error(failedSignature.error.message || String(failedSignature.error));
  }
  return activities.map((activity) => {
    const imageIndex = imagePaths.indexOf(activity.image_path);
    return { ...activity, image_url: imageIndex < 0 ? null : data[imageIndex]?.signedUrl ?? null };
  });
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

function renderActivities(activities, pointEntries) {
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
    if (activity.image_url) {
      const image = document.createElement("img");
      image.className = "activity-photo";
      image.src = activity.image_url;
      image.alt = languageSetting.value === "en" ? "Photo of shared deed" : "Billede af delt gerning";
      copy.append(description, image);
    } else {
      copy.append(description);
    }
    const time = document.createElement("div");
    time.className = "activity-time";
    time.textContent = formatDate(activity.created_at);
    copy.append(time);
    const points = document.createElement("span");
    points.className = "activity-points";
    const activityEntries = pointEntries.filter((entry) => entry.activity_id === activity.id);
    const score = activityEntries.reduce((total, entry) => total + Number(entry.points), 0);
    points.textContent = activityEntries.length
      ? `${score > 0 ? "+" : ""}${score} ${languageSetting.value === "en" ? "points" : "point"}`
      : (languageSetting.value === "en" ? "No points" : "Ingen point");
    const deleteButton = document.createElement("button");
    deleteButton.className = "activity-delete";
    deleteButton.type = "button";
    deleteButton.textContent = languageSetting.value === "en" ? "Delete" : "Slet";
    deleteButton.setAttribute("aria-label", `${languageSetting.value === "en" ? "Delete deed" : "Slet gerning"}: ${activity.description}`);
    deleteButton.addEventListener("click", () => deleteActivity(activity.id, activity.image_path));
    item.append(icon, copy, points, deleteButton);
    recentList.append(item);
  }
}

function renderPointHistory(entries) {
  const history = document.querySelector("#point-history-list");
  history.replaceChildren();
  if (!entries.length) {
    history.append(emptyState(languageSetting.value === "en" ? "No points have been awarded yet." : "Der er ikke tildelt point endnu."));
    return;
  }
  for (const entry of entries) {
    const item = document.createElement("article");
    item.className = "recent-item";
    const points = document.createElement("span");
    points.className = "activity-points";
    const value = Number(entry.points);
    points.textContent = `${value > 0 ? "+" : ""}${value} ${languageSetting.value === "en" ? "points" : "point"}`;
    const copy = document.createElement("div");
    copy.className = "activity-copy";
    const reason = document.createElement("div");
    reason.className = "activity-description";
    reason.textContent = entry.reason;
    const metadata = document.createElement("div");
    metadata.className = "activity-time";
    const source = entry.source === "local_ai" || entry.source === "ai"
      ? (languageSetting.value === "en" ? "Local AI" : "Lokal AI")
      : entry.source === "legacy"
        ? (languageSetting.value === "en" ? "Earlier deed" : "Tidligere gerning")
        : (languageSetting.value === "en" ? "Admin adjustment" : "Admin-justering");
    metadata.textContent = `${source} · ${formatDate(entry.created_at)}`;
    copy.append(reason, metadata);
    item.append(points, copy);
    history.append(item);
  }
}

async function deleteActivity(activityId, imagePath) {
  const message = languageSetting.value === "en"
    ? "Delete this deed? Its point history will remain in your score."
    : "Slet denne gerning? Dens pointhistorik bliver stående i din score.";
  if (!window.confirm(message)) return;
  try {
    const { error } = await supabase.from("activities")
      .delete()
      .eq("id", activityId)
      .eq("user_id", currentUser.id);
    if (error) throw error;
    let imageCleanupFailed = false;
    if (imagePath) {
      const { error: imageError } = await supabase.storage.from("deed-images").remove([imagePath]);
      if (imageError) {
        imageCleanupFailed = true;
      }
    }
    showNotice(imageCleanupFailed
      ? (languageSetting.value === "en"
        ? "Deed deleted, but its photo could not be removed."
        : "Gerningen blev slettet, men billedet kunne ikke fjernes.")
      : (languageSetting.value === "en" ? "Deed deleted." : "Gerningen er slettet."), imageCleanupFailed);
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
            terms_version: "2026-11-07",
            privacy_version: "2026-11-07"
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
  const imageFile = selectedActivityImage;
  if (!description || !currentUser) return;
  if (imageFile && (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type) || imageFile.size > 5 * 1024 * 1024)) {
    showNotice(languageSetting.value === "en"
      ? "Choose a JPEG, PNG, or WebP image smaller than 5 MB."
      : "Vælg et JPEG-, PNG- eller WebP-billede på under 5 MB.", true);
    return;
  }
  const submit = activityForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    aiModelStatus.textContent = languageSetting.value === "en"
      ? "Checking your deed locally. The first check may take a little while while the model downloads."
      : "Tjekker gerningen lokalt. Første tjek kan tage lidt tid, mens modellen hentes.";
    const validation = await validateNatureAction(description, (event) => {
      if (event.status === "progress" && Number.isFinite(event.progress)) {
        const progress = Math.round(event.progress);
        aiModelStatus.textContent = languageSetting.value === "en"
          ? `Downloading the local AI model: ${progress}%`
          : `Henter den lokale AI-model: ${progress}%`;
      }
    });
    if (validation.points === 0) {
      aiModelStatus.textContent = languageSetting.value === "en"
        ? "The local AI could not identify a clear helpful or harmful action. Try describing what happened."
        : "Den lokale AI kunne ikke genkende en tydelig god eller skadelig handling. Prøv at beskrive, hvad der skete.";
      showNotice(languageSetting.value === "en"
        ? "This report was not scored. Please describe a clear action that helps or harms nature or the environment."
        : "Indberetningen fik ikke point. Beskriv tydeligt en handling, der hjælper eller skader naturen eller miljøet.", true);
      return;
    }

    aiModelStatus.textContent = languageSetting.value === "en"
      ? validation.points > 0
        ? `Helpful action scored ${validation.points} points locally.`
        : "Harmful action recorded locally: 1 point deducted."
      : validation.points > 0
        ? `God handling vurderet lokalt til ${validation.points} point.`
        : "Skadelig handling registreret lokalt: 1 point trukket fra.";
    const { data: activity, error } = await supabase.from("activities").insert({
      user_id: currentUser.id,
      description
    }).select("id").single();
    if (error) throw error;
    if (imageFile) {
      const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[imageFile.type];
      const imagePath = `${currentUser.id}/${activity.id}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("deed-images").upload(imagePath, imageFile, {
        contentType: imageFile.type,
        upsert: false
      });
      if (uploadError) {
        const { error: rollbackError } = await supabase.from("activities").delete().eq("id", activity.id).eq("user_id", currentUser.id);
        if (rollbackError) throw new Error(`Billedet kunne ikke uploades, og gerningen kunne ikke rulles tilbage: ${rollbackError.message}`);
        throw uploadError;
      }
      const { error: attachError } = await supabase.rpc("set_activity_image", {
        requested_activity_id: activity.id,
        requested_image_path: imagePath
      });
      if (attachError) {
        const { error: cleanupError } = await supabase.storage.from("deed-images").remove([imagePath]);
        const { error: rollbackError } = await supabase.from("activities").delete().eq("id", activity.id).eq("user_id", currentUser.id);
        if (cleanupError || rollbackError) {
          throw new Error(`Billedet kunne ikke knyttes til gerningen${cleanupError ? `; oprydning af billedet fejlede: ${cleanupError.message}` : ""}${rollbackError ? `; sletning af gerningen fejlede: ${rollbackError.message}` : ""}`);
        }
        throw attachError;
      }
    }
    const { error: pointError } = await supabase.rpc("award_local_deed_point", {
      requested_activity_id: activity.id,
      requested_points: validation.points,
    });
    descriptionInput.value = "";
    activityImageInput.value = "";
    activityCameraInput.value = "";
    selectedActivityImage = undefined;
    if (activityImagePreview.dataset.objectUrl) URL.revokeObjectURL(activityImagePreview.dataset.objectUrl);
    activityImagePreview.removeAttribute("src");
    activityImagePreview.dataset.objectUrl = "";
    activityImagePreview.hidden = true;
    document.querySelector("#character-count").textContent = "0 / 240";
    showNotice(pointError
      ? (languageSetting.value === "en"
        ? `Your report was saved, but its points could not be recorded: ${pointError.message}`
        : `Din indberetning blev gemt, men pointene kunne ikke registreres: ${pointError.message}`)
      : (languageSetting.value === "en"
        ? validation.points > 0
          ? `Your helpful action was shared. You earned ${validation.points} points.`
          : "Your harmful action was recorded. 1 point was deducted."
        : validation.points > 0
          ? `Din gode handling blev delt. Du fik ${validation.points} point.`
          : "Din skadelige handling blev registreret. 1 point blev trukket fra."), Boolean(pointError));
    await loadDashboard();
  } catch (error) {
    aiModelStatus.textContent = languageSetting.value === "en"
      ? "The deed could not be checked or saved. Check your connection, then try again."
      : "Gerningen kunne ikke kontrolleres eller gemmes. Kontrollér forbindelsen, og prøv igen.";
    displayError(error);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#activity-camera-button").addEventListener("click", async () => {
  if (!nativeCamera) {
    activityCameraInput.click();
    return;
  }
  try {
    const photo = await nativeCamera.getPhoto({
      source: "CAMERA",
      resultType: "base64",
      quality: 75,
      width: 1600,
      height: 1600,
      allowEditing: false,
      saveToGallery: false,
      correctOrientation: true
    });
    const imageType = `image/${photo.format === "jpeg" ? "jpeg" : photo.format}`;
    const imageBytes = Uint8Array.from(atob(photo.base64String), (character) => character.charCodeAt(0));
    const imageFile = new File([imageBytes], `camera-${Date.now()}.${photo.format}`, { type: imageType });
    handleActivityImageFile(imageFile);
  } catch (error) {
    if (error?.message === "User cancelled photos app") return;
    displayError(error);
  }
});
document.querySelector("#activity-gallery-button").addEventListener("click", () => activityImageInput.click());

function handleActivityImageSelection(input) {
  const [file] = input.files;
  if (!file) return;
  input.value = "";
  handleActivityImageFile(file);
}

function handleActivityImageFile(file) {
  if (activityImagePreview.dataset.objectUrl) URL.revokeObjectURL(activityImagePreview.dataset.objectUrl);
  activityImagePreview.dataset.objectUrl = "";
  activityImagePreview.hidden = true;
  activityImagePreview.removeAttribute("src");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    selectedActivityImage = undefined;
    showNotice(languageSetting.value === "en"
      ? "Choose a JPEG, PNG, or WebP image smaller than 5 MB."
      : "Vælg et JPEG-, PNG- eller WebP-billede på under 5 MB.", true);
    return;
  }
  selectedActivityImage = file;
  const objectUrl = URL.createObjectURL(file);
  activityImagePreview.src = objectUrl;
  activityImagePreview.dataset.objectUrl = objectUrl;
  activityImagePreview.hidden = false;
}

activityImageInput.addEventListener("change", () => handleActivityImageSelection(activityImageInput));
activityCameraInput.addEventListener("change", () => handleActivityImageSelection(activityCameraInput));

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
    ? window.prompt("This permanently deletes your profile, deeds, and attached photos. Type DELETE to continue.")
    : window.prompt("Dette sletter din profil, dine gerninger og tilknyttede billeder permanent. Skriv SLET for at fortsætte.");
  if (confirmation !== (languageSetting.value === "en" ? "DELETE" : "SLET")) return;

  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { data: activities, error: activitiesError } = await supabase.from("activities")
      .select("image_path")
      .eq("user_id", currentUser.id)
      .not("image_path", "is", null);
    if (activitiesError) throw activitiesError;
    const imagePaths = activities.map((activity) => activity.image_path);
    if (imagePaths.length) {
      const { error: imageError } = await supabase.storage.from("deed-images").remove(imagePaths);
      if (imageError) throw imageError;
    }
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
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(
    preferences.language === "en" ? "en" : "da-DK",
    { weekday: "long", day: "numeric", month: "long" },
  ).format(new Date());
  activityImagePreview.alt = preferences.language === "en"
    ? "Selected photo preview"
    : "Forhåndsvisning af valgt billede";
  for (const [selector, text] of Object.entries(translations[preferences.language])) {
    const element = document.querySelector(selector);
    if (!element) continue;
    if (selector === ".leaderboard-head") {
      const labels = preferences.language === "en"
        ? ["PLACE", "GREEN HERO", "POINTS"]
        : ["PLACERING", "GRØN HVERDAGSHELT", "POINT"];
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
  updateNicknameAvailability(Number(currentProfile?.activity_count || 0));
  if (currentUser) loadDashboard();
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

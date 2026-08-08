/*
 * Cantarivo is intentionally a demo. The browser microphone adapter below
 * measures local sound level only. The Android pilot additionally has a local,
 * heuristic vocal-like-moment gate. It is not a singing, song, speaker, or lyric
 * recognizer; its result is deliberately narrow and can be affected by music,
 * music, background noise, or another person. The browser never uses web speech recognition.
 * The Android preview shell can expose a bounded, on-device-only
 * VoiceCommandAdapter. It never receives raw audio or transcript text in this
 * web layer and does not fall back to a cloud recognizer.
 */

const driveThemes = new Set(["original", "aurora", "sunset"]);
const storageNamespace = "cantarivo";
const legacyStorageNamespace = "driver-companion";

function storageKey(name) {
  return `${storageNamespace}-${name}`;
}

function legacyStorageKey(name) {
  return `${legacyStorageNamespace}-${name}`;
}

function savedDriveTheme() {
  try {
    const savedTheme = window.localStorage.getItem(storageKey("drive-theme"))
      ?? window.localStorage.getItem(legacyStorageKey("drive-theme"));
    return driveThemes.has(savedTheme) ? savedTheme : "original";
  } catch {
    return "original";
  }
}

function savedBooleanPreference(key, fallback = false) {
  try {
    const saved = window.localStorage.getItem(key)
      ?? window.localStorage.getItem(legacyStorageKey(key.replace(`${storageNamespace}-`, "")));
    return saved === null ? fallback : saved === "true";
  } catch {
    return fallback;
  }
}

const state = {
  driveActive: false,
  micActive: false,
  companionMode: "ask", // ask | drive | never
  companionJoined: false,
  stream: null,
  audioContext: null,
  analyser: null,
  meterFrame: null,
  demoTimer: null,
  startedAt: null,
  lastActivity: null,
  hasAskedThisMoment: false,
  nativeVoiceAvailable: false,
  nativeVoiceSupported: false,
  nativeVoiceListening: false,
  nativeVoiceUsed: false,
  nativeMeterActive: false,
  musicPlaytestApproved: false,
  pendingMusicTrackId: null,
  musicPlayer: null,
  playingMusicTrackId: null,
  driveTheme: savedDriveTheme(),
  autoListenAtDriveStart: savedBooleanPreference(storageKey("auto-listen")),
  harmonyEnabled: savedBooleanPreference(storageKey("wordless-harmony")),
  aiVocalCuesEnabled: savedBooleanPreference(storageKey("ai-vocal-cues")),
  resumeAfterInterruptions: savedBooleanPreference(storageKey("resume-after-interruptions"), true),
  backgroundServiceActive: false,
  driveInterrupted: false,
  interruptionReason: "none",
  companionAudioContext: null,
  companionVoices: [],
  companionPlayToken: 0,
  harmonyCooldownUntil: 0,
  settingsHistoryOpen: false,
};

const previewTracks = [
  { id: "fouler-l-horizon", title: "Fouler l'horizon", creator: "Komiku", source: "assets/music/cc0-playtest/fouler-l-horizon.mp3" },
  { id: "le-grand-village", title: "Le Grand Village", creator: "Komiku", source: "assets/music/cc0-playtest/le-grand-village.mp3" },
  { id: "barque-sur-le-lac", title: "Barque sur le lac", creator: "Komiku", source: "assets/music/cc0-playtest/barque-sur-le-lac.mp3" },
  { id: "la-citadelle", title: "La Citadelle", creator: "Komiku", source: "assets/music/cc0-playtest/la-citadelle.mp3" },
  { id: "la-ville-aux-ponts-suspendus", title: "La ville aux ponts suspendus", creator: "Komiku", source: "assets/music/cc0-playtest/la-ville-aux-ponts-suspendus.mp3" },
];

const supportFaqs = [
  { q: "What is Cantarivo?", a: "Cantarivo is a privacy-first singing companion preview. It helps you control local listening and optionally lets a demo companion respond with wordless cues.", tags: "overview cantarivo singing companion sing along preview" },
  { q: "Is this app ready for an official public launch?", a: "Not yet. The Android Studio project builds and runs, but release still needs layout polish, real-device testing, release signing, final privacy/support URLs, Google Play Data Safety review, and closed testing.", tags: "release launch google play" },
  { q: "Does the app record me singing?", a: "No. The current preview is designed not to record, store, transcribe, identify, sell, or upload microphone audio.", tags: "privacy microphone recording audio" },
  { q: "Why does Cantarivo ask for microphone access?", a: "The microphone is used for local sound-level and vocal-like moment checks so the companion can know when it may be appropriate to respond. On Android, that access is scoped to the active session and shown through an ongoing system notification.", tags: "microphone permission local listening" },
  { q: "Will the app keep asking me for the microphone?", a: "After Android permission is granted, the app should not ask again unless you revoke it, clear app data, or reinstall. You can choose automatic local listening for later sessions.", tags: "microphone permission auto listen" },
  { q: "Can I turn the microphone off quickly?", a: "Yes. Use the local listening control or the prominent Silence / Stop button. Silence / Stop is intended to stop listening and companion audio immediately.", tags: "microphone stop silence" },
  { q: "Does Cantarivo work in the background?", a: "Yes, during an active Android session. A foreground service keeps local listening available under other apps, with an ongoing notification that provides Pause or Resume and End session controls.", tags: "background foreground android notification" },
  { q: "Does the companion automatically sing with me?", a: "Not without permission. The current design requires you to allow the companion for the session before it can respond.", tags: "companion opt in singing consent" },
  { q: "What does Allow for this session mean?", a: "It means the demo companion can respond during the current singing session only. Ending the session or pressing Silence / Stop clears that active permission.", tags: "allow session consent companion" },
  { q: "What does Ask before joining mean?", a: "It keeps the companion quiet until you explicitly allow it. This is the default because companion output should always be your choice.", tags: "ask joining consent" },
  { q: "What does Keep demo companion quiet do?", a: "It blocks companion responses while still allowing the app to show status and privacy controls.", tags: "quiet companion mute" },
  { q: "What is wordless harmony?", a: "Wordless harmony is a short non-lyrical tone cue. It is not a real singer, not a cloned voice, and not an artist imitation.", tags: "harmony ai vocal wordless" },
  { q: "What are local AI vocal cues?", a: "They are on-device, voice-shaped, non-lyrical cues for the prototype. They do not use cloud audio, lyrics, artist imitation, or voice cloning.", tags: "ai singer vocal cues local" },
  { q: "Is there a real AI singer in the app now?", a: "Not yet. The app currently has a safe local cue prototype. A real AI singer requires provider review, licensing, privacy changes, safety testing, and explicit activation consent.", tags: "ai singer provider future" },
  { q: "Can the AI singer copy my favorite artist?", a: "No. The release plan should not imitate artists, clone voices, or use copyrighted vocals without documented written rights.", tags: "artist imitation copyright voice cloning" },
  { q: "Can I use copyrighted music in testing?", a: "Avoid uploading, packaging, or distributing copyrighted music unless you have the rights. The current app uses a controlled CC0 playtest list and licensing notes.", tags: "copyright music licensing" },
  { q: "Does Cantarivo identify songs?", a: "No. The current pilot does not identify songs, lyrics, artists, or speakers.", tags: "song recognition lyrics artist" },
  { q: "Does Cantarivo detect actual singing?", a: "The current pilot uses a narrow vocal-like moment gate and local sound behavior. It should not be marketed as true singing detection until a tested model proves that feature.", tags: "singing detection classifier" },
  { q: "Can the app show lyrics?", a: "Not in the current pilot. Lyric display and timing require licensed lyric data and separate copyright review.", tags: "lyrics timing copyright" },
  { q: "How is the app's target audience handled?", a: "The Play Store target audience and content rating must accurately match the released features and content. Cantarivo does not add an unnecessary in-app age gate.", tags: "age target audience content rating" },
  { q: "Is Cantarivo an emergency service?", a: "No. It is a singing companion, not an emergency, medical, navigation, or safety system.", tags: "safety emergency limitation" },
  { q: "Can I keep the controls hands-free?", a: "Yes. Start your session, choose your microphone and companion preferences, then use the persistent notification or the large stop control when needed.", tags: "hands free controls notification" },
  { q: "What should I do in an emergency?", a: "Use local emergency services. The support helper and companion features are not emergency tools.", tags: "emergency safety" },
  { q: "Why did the emulator need microphone permission through test tools?", a: "The emulator did not cleanly surface the Android permission dialog during the tap test, so permission was granted through emulator tools for the smoke test. Real devices still need normal permission testing.", tags: "emulator microphone permission" },
  { q: "Why might Android ask for microphone permission again?", a: "Android may ask again after permission is revoked, app data is cleared, the app is reinstalled, or the operating system resets an unused permission.", tags: "permission android reset reinstall" },
  { q: "Why is the Silence / Stop button so prominent?", a: "Because live microphone and companion audio features need an obvious, one-tap way to stop everything. The layout still needs polish so it does not cover other controls.", tags: "silence stop layout" },
  { q: "Why does Android Back matter?", a: "Back should close open panels before leaving the app. During an active Android session, the ongoing notification keeps the session visible and gives you a direct way to return, pause, or end it.", tags: "android back panel navigation background" },
  { q: "Where is the privacy policy?", a: "Open Settings, choose Privacy Policy, then select the full Privacy Policy link. The project also includes a privacy.html page for GitHub Pages or app listing use.", tags: "privacy policy settings" },
  { q: "Where is the Data Safety disclosure?", a: "Open Settings, choose Privacy Policy, then select the Data Safety review link. The Play Console answers must match the exact release build.", tags: "data safety google play" },
  { q: "What data does the app collect?", a: "The current pilot is designed around no account, no uploaded audio, no raw recordings, and no remote analytics. Any future support backend or AI provider would change the disclosure.", tags: "data collection privacy" },
  { q: "Does the support chatbot send my question anywhere?", a: "No. This first support helper is offline and answers from built-in FAQ text only. It does not submit support tickets by itself.", tags: "chatbot support privacy offline" },
  { q: "Can the support chatbot solve every issue?", a: "No. It is a quality-assurance helper for common questions. Bugs, privacy requests, release issues, and rights questions should go to the support email or GitHub issue route.", tags: "chatbot limitation support" },
  { q: "Can I send feedback from the Contact tab?", a: "The Contact tab gives an email link, GitHub issue link, and a copyable support summary. Automatic sending can be added later with explicit consent and a reviewed backend.", tags: "contact feedback email github" },
  { q: "What should I avoid sending in support messages?", a: "Do not send raw microphone audio, other people's audio, payment details, passwords, private IDs, exact home addresses, or other sensitive personal information.", tags: "support privacy sensitive data" },
  { q: "How can testers describe a bug?", a: "Include device model, Android version, app version, what you tapped, what you expected, what happened, and whether the app was foregrounded. Avoid private audio or personal details.", tags: "bug report qa testing" },
  { q: "Does the app need an account?", a: "No. The current pilot has no account requirement.", tags: "account login" },
  { q: "Does the app use cloud speech recognition?", a: "No. Browser speech recognition is intentionally avoided because its audio handling may not stay local. The Android pilot is designed around bounded local behavior.", tags: "speech recognition cloud local" },
  { q: "Can I use the app with Bluetooth speakers?", a: "That needs real-device testing. The preview should be checked with the phone speaker, Bluetooth audio routes, headphones, and different volume levels.", tags: "bluetooth speakers audio" },
  { q: "Will the companion interrupt my music?", a: "The target behavior is brief, optional, and easy to silence. More testing is needed to balance cue volume, timing, and distraction.", tags: "music interruption volume" },
  { q: "Can I make the app less overbearing?", a: "Yes. Keep companion mode on Ask before joining or Keep quiet, turn off automatic local listening, and use Silence / Stop whenever you want the app quiet.", tags: "overbearing quiet settings" },
  { q: "What happens when I end a session?", a: "The singing session ends, active session permission clears, microphone use stops, and the receipt reflects the ended state.", tags: "end session receipt" },
  { q: "What is the session receipt?", a: "It is a plain-language status note showing what was active during the current session, such as microphone, companion permission, harmony, and AI cues.", tags: "receipt transparency consent" },
  { q: "Can I clear session activity?", a: "Yes. The Settings privacy controls include Clear this session's activity. The current preview does not store audio.", tags: "clear activity receipt" },
  { q: "What needs to happen before adding a cloud AI singer?", a: "Choose a provider, review retention and data flows, update privacy and Data Safety, document user consent, confirm licensing, test latency and safety, and provide a deletion/support path.", tags: "cloud ai singer provider privacy" },
  { q: "What needs to happen before adding an on-device AI singer?", a: "Select a licensed model, benchmark Android performance, validate model size and battery impact, document the model card and SBOM, and test that it does not imitate protected voices.", tags: "on device ai singer model android" },
  { q: "What open-source audio pieces are being considered?", a: "The roadmap tracks options for voice activity detection, pitch tracking, beat/onset detection, and local inference. Each library or model still needs license, Android, and maintenance review before packaging.", tags: "open source vad pitch beat onset" },
  { q: "Can this app go on Google Play?", a: "Eventually, yes, if the build, policies, safety behavior, screenshots, support URL, privacy URL, release signing, Data Safety answers, and closed testing meet Google Play requirements.", tags: "google play release" },
  { q: "What is the next development priority?", a: "Fix the small-screen layout, fix Android Back behavior, verify AI cue audio in emulator and on real hardware, then prepare release signing and closed testing.", tags: "next tasks priority release" },
  { q: "How do I test the AI vocal cue?", a: "Start a singing session, enable local listening, choose Allow for this session, enable local AI vocal cues, then use the test cue control.", tags: "test ai vocal cue" },
  { q: "How do I report a privacy concern?", a: "Use the Contact tab email link and include only the minimum details needed. Do not attach audio or sensitive personal information.", tags: "privacy concern contact" },
  { q: "How will Forward improvement and Customer Quality Assurance use feedback?", a: "The first step is structured, user-approved feedback: issue summaries, device context, and reproducible steps. Automatic support collection should only be added after a privacy-reviewed backend and clear consent screen exist.", tags: "forward improvement customer quality assurance feedback" },
];

const $ = (selector) => document.querySelector(selector);
const elements = {
  driveStatus: $("#driveStatus"),
  modeBadge: $("#modeBadge"),
  listeningOrb: $("#listeningOrb"),
  consoleTitle: $("#consoleTitle"),
  consoleCopy: $("#consoleCopy"),
  meterDescription: $("#meterDescription"),
  meterBars: [...document.querySelectorAll("#meterBars span")],
  startDriveButton: $("#startDriveButton"),
  manualControls: $("#manualControls"),
  controlGuide: $("#controlGuide"),
  localListeningButton: $("#localListeningButton"),
  localListeningLabel: $("#localListeningLabel"),
  joinButton: $("#joinButton"),
  joinButtonLabel: $("#joinButtonLabel"),
  silenceButton: $("#silenceButton"),
  voiceControlButton: $("#voiceControlButton"),
  voiceControlLabel: $("#voiceControlLabel"),
  endDriveButton: $("#endDriveButton"),
  hearingTitle: $("#hearingTitle"),
  hearingCopy: $("#hearingCopy"),
  detectionLine: $("#detectionLine"),
  detectionText: $("#detectionText"),
  permissionTitle: $("#permissionTitle"),
  permissionCopy: $("#permissionCopy"),
  permissionButton: $("#permissionButton"),
  quickPermissionButtons: [...document.querySelectorAll("[data-quick-permission]")],
  privacyButton: $("#privacyButton"),
  settingsButton: $("#settingsButton"),
  settingsTabButtons: [...document.querySelectorAll("[data-settings-tab]")],
  settingsTabPanels: [...document.querySelectorAll("[data-settings-tab-panel]")],
  closeSettingsButton: $("#closeSettingsButton"),
  privacyPanel: $("#privacyPanel"),
  scrim: $("#scrim"),
  micAccessText: $("#micAccessText"),
  micControlButton: $("#micControlButton"),
  autoListenCheckbox: $("#autoListenCheckbox"),
  resumeAfterInterruptionsCheckbox: $("#resumeAfterInterruptionsCheckbox"),
  backgroundDriveStatusText: $("#backgroundDriveStatusText"),
  harmonyCheckbox: $("#harmonyCheckbox"),
  aiVocalCheckbox: $("#aiVocalCheckbox"),
  driveThemeButtons: [...document.querySelectorAll("[data-drive-theme]")],
  clearDriveButton: $("#clearDriveButton"),
  receiptText: $("#receiptText"),
  simulateButton: $("#simulateButton"),
  testHarmonyButton: $("#testHarmonyButton"),
  testAiVocalButton: $("#testAiVocalButton"),
  microphoneDialog: $("#microphoneDialog"),
  voiceConsentDialog: $("#voiceConsentDialog"),
  allowMicButton: $("#allowMicButton"),
  declineMicButton: $("#declineMicButton"),
  rememberMicCheckbox: $("#rememberMicCheckbox"),
  enableVoiceButton: $("#enableVoiceButton"),
  declineVoiceButton: $("#declineVoiceButton"),
  musicPlaytest: $("#musicPlaytest"),
  musicPlaytestStatus: $("#musicPlaytestStatus"),
  musicTrackButtons: [...document.querySelectorAll("[data-play-track]")],
  stopMusicButton: $("#stopMusicButton"),
  faqSearchInput: $("#faqSearchInput"),
  faqList: $("#faqList"),
  supportBotForm: $("#supportBotForm"),
  supportBotInput: $("#supportBotInput"),
  supportBotResponse: $("#supportBotResponse"),
  supportTopicButtons: [...document.querySelectorAll("[data-support-topic]")],
  copySupportSummaryButton: $("#copySupportSummaryButton"),
  musicPlaytestDialog: $("#musicPlaytestDialog"),
  allowMusicPlaytestButton: $("#allowMusicPlaytestButton"),
  declineMusicPlaytestButton: $("#declineMusicPlaytestButton"),
  emergencyStopButtons: [...document.querySelectorAll("[data-emergency-stop]")],
  toast: $("#toast"),
};

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function showToast(message) {
  window.clearTimeout(showToast.timer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  showToast.timer = window.setTimeout(() => { elements.toast.hidden = true; }, 3600);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function switchSettingsTab(tab) {
  elements.settingsTabButtons.forEach((button) => {
    const selected = button.dataset.settingsTab === tab;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  elements.settingsTabPanels.forEach((panel) => {
    panel.hidden = panel.dataset.settingsTabPanel !== tab;
  });
}

function renderFaqs(query = "") {
  const search = query.trim().toLowerCase();
  const matches = supportFaqs.filter((item) => {
    if (!search) return true;
    return `${item.q} ${item.a} ${item.tags}`.toLowerCase().includes(search);
  });
  const visible = matches.length ? matches : supportFaqs;
  elements.faqList.innerHTML = visible.map((item, index) => `
    <details class="faq-item"${index === 0 && search ? " open" : ""}>
      <summary>${escapeHtml(item.q)}</summary>
      <p>${escapeHtml(item.a)}</p>
    </details>
  `).join("");
  if (!matches.length && search) {
    elements.faqList.insertAdjacentHTML("afterbegin", `<p class="faq-empty">No exact FAQ match for “${escapeHtml(query)}”. Showing all built-in answers.</p>`);
  }
}

function scoreFaq(item, search) {
  const haystack = `${item.q} ${item.tags}`.toLowerCase();
  return search.split(/\s+/).reduce((score, token) => score + (token && haystack.includes(token) ? 1 : 0), 0);
}

function findBestFaq(question) {
  const search = question.trim().toLowerCase();
  if (!search) return null;
  return supportFaqs
    .map((item) => ({ item, score: scoreFaq(item, search) }))
    .sort((a, b) => b.score - a.score)[0]?.item;
}

function answerSupportQuestion(question) {
  const text = question.trim();
  if (!text) {
    elements.supportBotResponse.textContent = "Ask a question, or choose one of the quick support topics.";
    return;
  }
  const bestFaq = findBestFaq(text);
  const prefix = "Built-in support helper:";
  const emergencyNote = /\bemergency|crash|police|911|medical|hurt|injured\b/i.test(text)
    ? " If this is urgent or safety-critical, use local emergency services now; Cantarivo support is not emergency assistance."
    : "";
  if (!bestFaq || scoreFaq(bestFaq, text.toLowerCase()) === 0) {
    elements.supportBotResponse.textContent = `${prefix} I do not have a confident built-in answer yet. Try searching the FAQ, or contact support with your device model, Android version, what you tapped, what you expected, and what happened.${emergencyNote}`;
    return;
  }
  elements.supportBotResponse.textContent = `${prefix} ${bestFaq.a}${emergencyNote}`;
  elements.faqSearchInput.value = text;
  renderFaqs(text);
}

function buildSupportSummary() {
  const micStatus = state.micActive ? "microphone active for current session" : "microphone not active";
  const driveStatus = state.driveActive ? "session active" : "session not active";
  const companionStatus = `companion mode: ${state.companionMode}`;
  const aiStatus = state.aiVocalCuesEnabled ? "local AI vocal cues enabled" : "local AI vocal cues off";
  return [
    "Cantarivo support summary",
    `App state: ${driveStatus}; ${micStatus}; ${companionStatus}; ${aiStatus}.`,
    "Please add: device model, Android version, app build, steps to reproduce, expected result, actual result.",
    "Do not include raw microphone audio, other people's audio, payment details, passwords, or private identity documents.",
  ].join("\n");
}

function registerNativeBackButtonHandler() {
  const appPlugin = window.Capacitor?.Plugins?.App;
  if (!appPlugin?.addListener) return;
  appPlugin.addListener("backButton", ({ canGoBack } = {}) => {
    if (elements.privacyPanel.classList.contains("open")) {
      closeSettings({ fromHistory: true });
      return;
    }
    if (elements.microphoneDialog.open) {
      elements.microphoneDialog.close();
      return;
    }
    if (elements.voiceConsentDialog.open) {
      elements.voiceConsentDialog.close();
      return;
    }
    if (elements.musicPlaytestDialog.open) {
      elements.musicPlaytestDialog.close();
      return;
    }
    if (canGoBack) {
      window.history.back();
      return;
    }
    appPlugin.minimizeApp?.();
  });
}

function setDriveStatus(text, isLive = false) {
  elements.driveStatus.querySelector("span:last-child").textContent = text;
  elements.driveStatus.querySelector(".status-dot").classList.toggle("live", isLive);
}

function applyDriveTheme(theme, { announce = true } = {}) {
  if (!driveThemes.has(theme)) return;
  state.driveTheme = theme;
  document.body.dataset.driveTheme = theme;
  elements.driveThemeButtons.forEach((button) => {
    const selected = button.dataset.driveTheme === theme;
    button.setAttribute("aria-pressed", String(selected));
  });
  let savedOnDevice = false;
  try {
    window.localStorage.setItem(storageKey("drive-theme"), theme);
    savedOnDevice = true;
  } catch { /* Appearance remains active for this session. */ }
  if (announce) {
    const themeName = theme === "original" ? "Original" : theme === "aurora" ? "Aurora" : "Sunset";
    showToast(savedOnDevice
      ? `${themeName} background selected and saved on this device.`
      : `${themeName} background selected for this session.`);
  }
}

function saveBooleanPreference(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

function setAutoListenAtDriveStart(enabled, { announce = true } = {}) {
  state.autoListenAtDriveStart = Boolean(enabled);
  const saved = saveBooleanPreference(storageKey("auto-listen"), state.autoListenAtDriveStart);
  updateDashboard();
  updateReceipt();
  if (announce) {
    showToast(state.autoListenAtDriveStart
      ? saved
        ? "Local listening will start automatically with later sessions. Turn it off anytime in Settings."
        : "Local listening will start automatically for this browser session."
      : "Automatic local listening is off. Future sessions will ask before starting the microphone.");
  }
}

function nativeDriveOptions() {
  return {
    companionAllowed: state.companionMode === "drive",
    harmonyEnabled: state.harmonyEnabled,
    aiVocalEnabled: state.aiVocalCuesEnabled,
    autoResume: state.resumeAfterInterruptions,
  };
}

function syncNativeDriveOptions() {
  if (!state.backgroundServiceActive) return;
  getNativeVoicePlugin()?.updateBackgroundDrive(nativeDriveOptions()).catch(() => {});
}

function setResumeAfterInterruptions(enabled, { announce = true } = {}) {
  state.resumeAfterInterruptions = Boolean(enabled);
  const saved = saveBooleanPreference(storageKey("resume-after-interruptions"), state.resumeAfterInterruptions);
  syncNativeDriveOptions();
  updateDashboard();
  updateReceipt();
  if (announce) {
    showToast(state.resumeAfterInterruptions
      ? saved
        ? "Calls and competing microphone use will pause the session, then local listening will resume automatically."
        : "Automatic resume is on for this session."
      : "After an interruption, the session stays open and waits for you to resume listening.");
  }
}

function setHarmonyEnabled(enabled, { announce = true } = {}) {
  state.harmonyEnabled = Boolean(enabled);
  const saved = saveBooleanPreference(storageKey("wordless-harmony"), state.harmonyEnabled);
  if (!state.harmonyEnabled) stopSyntheticHarmony();
  if (state.harmonyEnabled) void ensureCompanionAudio();
  syncNativeDriveOptions();
  updateDashboard();
  updateReceipt();
  if (announce) {
    showToast(state.harmonyEnabled
      ? saved
        ? "Wordless harmony is enabled on this device. It plays only after Allow for this session."
        : "Wordless harmony is enabled for this browser session."
      : "Wordless harmony is off.");
  }
}

function setAiVocalCuesEnabled(enabled, { announce = true } = {}) {
  state.aiVocalCuesEnabled = Boolean(enabled);
  const saved = saveBooleanPreference(storageKey("ai-vocal-cues"), state.aiVocalCuesEnabled);
  if (!state.aiVocalCuesEnabled) stopSyntheticHarmony();
  if (state.aiVocalCuesEnabled) void ensureCompanionAudio();
  syncNativeDriveOptions();
  updateDashboard();
  updateReceipt();
  if (announce) {
    showToast(state.aiVocalCuesEnabled
      ? saved
        ? "Local AI vocal cues are enabled on this device. They play only after Allow for this session."
        : "Local AI vocal cues are enabled for this browser session."
      : "Local AI vocal cues are off.");
  }
}

async function ensureCompanionAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!state.companionAudioContext || state.companionAudioContext.state === "closed") {
    state.companionAudioContext = new AudioContextClass();
  }
  if (state.companionAudioContext.state === "suspended") {
    try {
      await state.companionAudioContext.resume();
    } catch {
      return null;
    }
  }
  return state.companionAudioContext;
}

function stopSyntheticHarmony() {
  state.companionPlayToken++;
  for (const voice of state.companionVoices) {
    try { voice.primary.stop(); } catch { /* Voice may have naturally ended. */ }
    try { voice.overtone.stop(); } catch { /* Voice may have naturally ended. */ }
    try { voice.vibrato.stop(); } catch { /* Voice may have naturally ended. */ }
    try { voice.primary.disconnect(); voice.overtone.disconnect(); voice.vibrato.disconnect(); } catch { /* Best-effort cleanup. */ }
  }
  state.companionVoices = [];
}

function playWordlessHarmony(inputPitchHz = 196, { announce = false } = {}) {
  if (!state.harmonyEnabled || state.companionMode !== "drive") return;
  const nowMs = Date.now();
  if (nowMs < state.harmonyCooldownUntil) return;
  state.harmonyCooldownUntil = nowMs + 2600;
  const playToken = ++state.companionPlayToken;
  const sourcePitch = Math.max(80, Math.min(300, Number(inputPitchHz) || 196));
  const harmonyPitch = sourcePitch * Math.pow(2, 4 / 12);

  void ensureCompanionAudio().then((context) => {
    if (!context || playToken !== state.companionPlayToken || !state.harmonyEnabled || state.companionMode !== "drive") return;
    const now = context.currentTime;
    const duration = 1.35;
    const primary = context.createOscillator();
    const overtone = context.createOscillator();
    const vibrato = context.createOscillator();
    const vibratoDepth = context.createGain();
    const toneMix = context.createGain();
    const formant = context.createBiquadFilter();
    const output = context.createGain();

    primary.type = "sine";
    overtone.type = "triangle";
    vibrato.type = "sine";
    primary.frequency.setValueAtTime(harmonyPitch, now);
    overtone.frequency.setValueAtTime(harmonyPitch * 2, now);
    vibrato.frequency.setValueAtTime(5.1, now);
    vibratoDepth.gain.setValueAtTime(4.2, now);
    toneMix.gain.setValueAtTime(0.48, now);
    formant.type = "bandpass";
    formant.frequency.setValueAtTime(900, now);
    formant.Q.setValueAtTime(0.72, now);
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.042, now + 0.08);
    output.gain.setValueAtTime(0.042, now + duration - 0.2);
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(primary.frequency);
    vibratoDepth.connect(overtone.frequency);
    primary.connect(toneMix);
    overtone.connect(toneMix);
    toneMix.connect(formant);
    formant.connect(output);
    output.connect(context.destination);
    primary.start(now);
    overtone.start(now);
    vibrato.start(now);
    primary.stop(now + duration + 0.03);
    overtone.stop(now + duration + 0.03);
    vibrato.stop(now + duration + 0.03);

    const voice = { primary, overtone, vibrato };
    state.companionVoices.push(voice);
    window.setTimeout(() => {
      state.companionVoices = state.companionVoices.filter((entry) => entry !== voice);
    }, (duration + 0.2) * 1000);
    if (announce) showToast("Playing a brief local wordless harmony tone.");
  });
}

function playLocalAiVocalCue(inputPitchHz = 196, { announce = false } = {}) {
  if (!state.aiVocalCuesEnabled || state.companionMode !== "drive") return;
  const nowMs = Date.now();
  if (nowMs < state.harmonyCooldownUntil) return;
  state.harmonyCooldownUntil = nowMs + 3200;
  const playToken = ++state.companionPlayToken;
  const sourcePitch = Math.max(90, Math.min(260, Number(inputPitchHz) || 174));
  const cuePitch = sourcePitch * Math.pow(2, 3 / 12);

  void ensureCompanionAudio().then((context) => {
    if (!context || playToken !== state.companionPlayToken || !state.aiVocalCuesEnabled || state.companionMode !== "drive") return;
    const now = context.currentTime;
    const duration = 1.8;
    const carrier = context.createOscillator();
    const breath = context.createOscillator();
    const vibrato = context.createOscillator();
    const vibratoDepth = context.createGain();
    const mix = context.createGain();
    const vowelLow = context.createBiquadFilter();
    const vowelMid = context.createBiquadFilter();
    const output = context.createGain();

    carrier.type = "triangle";
    breath.type = "sine";
    vibrato.type = "sine";
    carrier.frequency.setValueAtTime(cuePitch, now);
    carrier.frequency.linearRampToValueAtTime(cuePitch * 1.06, now + 0.55);
    carrier.frequency.linearRampToValueAtTime(cuePitch * 0.94, now + 1.25);
    breath.frequency.setValueAtTime(cuePitch * 2, now);
    vibrato.frequency.setValueAtTime(5.7, now);
    vibratoDepth.gain.setValueAtTime(5.8, now);
    mix.gain.setValueAtTime(0.38, now);
    vowelLow.type = "bandpass";
    vowelLow.frequency.setValueAtTime(640, now);
    vowelLow.Q.setValueAtTime(1.2, now);
    vowelMid.type = "bandpass";
    vowelMid.frequency.setValueAtTime(1180, now);
    vowelMid.Q.setValueAtTime(0.9, now);
    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(0.036, now + 0.12);
    output.gain.setValueAtTime(0.036, now + duration - 0.28);
    output.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(carrier.frequency);
    vibratoDepth.connect(breath.frequency);
    carrier.connect(mix);
    breath.connect(mix);
    mix.connect(vowelLow);
    vowelLow.connect(vowelMid);
    vowelMid.connect(output);
    output.connect(context.destination);
    carrier.start(now);
    breath.start(now);
    vibrato.start(now);
    carrier.stop(now + duration + 0.03);
    breath.stop(now + duration + 0.03);
    vibrato.stop(now + duration + 0.03);

    const voice = { primary: carrier, overtone: breath, vibrato };
    state.companionVoices.push(voice);
    window.setTimeout(() => {
      state.companionVoices = state.companionVoices.filter((entry) => entry !== voice);
    }, (duration + 0.2) * 1000);
    if (announce) showToast("Playing a brief local AI vocal cue.");
  });
}

function updateReceipt() {
  if (!state.driveActive || !state.startedAt) {
    elements.receiptText.textContent = "No current session. Nothing has been stored.";
    return;
  }
  const permission = state.companionMode === "drive"
    ? "demo companion allowed for this session"
    : state.companionMode === "never"
      ? "demo companion kept quiet"
      : "ask before demo companion joins";
  const activity = state.lastActivity ? ` Last demo activity ${formatTime(state.lastActivity)}.` : "";
  const voice = state.nativeVoiceUsed ? " - on-device voice command used" : "";
  const startMode = state.autoListenAtDriveStart ? " - automatic local start is on" : "";
  const harmony = state.harmonyEnabled ? " - wordless harmony is available" : "";
  const aiVocal = state.aiVocalCuesEnabled ? " - local AI vocal cues are available" : "";
  const background = state.backgroundServiceActive ? " - background session notification active" : "";
  const interruption = state.driveInterrupted
    ? ` - temporarily paused (${state.interruptionReason === "call_or_communication" ? "call or communication" : "another microphone is active"})`
    : "";
  const resume = state.resumeAfterInterruptions ? " - automatic interruption resume is on" : " - manual resume after interruptions";
  elements.receiptText.textContent = `Session started ${formatTime(state.startedAt)} - microphone ${state.micActive ? "active" : state.driveInterrupted ? "paused" : "off"}${background}${interruption}${resume}${voice}${startMode}${harmony}${aiVocal} - ${permission}.${activity} Nothing is stored.`;
}

function updatePermissionCopy() {
  const options = {
    ask: ["Ask before joining", "The demo companion stays quiet. Choose Allow for this session if you want it to respond automatically."],
    drive: [
      state.driveActive ? "Allowed for this session" : "Allow for your next session",
      state.driveActive
        ? "The demo companion may respond after a possible vocal-like moment until you end this session. Keep it quiet anytime."
        : "The demo companion can respond after a possible vocal-like moment in your next session. This choice expires when that session ends.",
    ],
    never: ["Demo companion stays quiet", "Activity may be shown, but the demo companion will not join or prompt you this session."],
  };
  const [title, copy] = options[state.companionMode];
  elements.permissionTitle.textContent = title;
  elements.permissionCopy.textContent = copy;
  document.querySelector(`input[name="companionPermission"][value="${state.companionMode}"]`).checked = true;
  elements.quickPermissionButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.quickPermission === state.companionMode));
  });
  updateReceipt();
}

function updateDashboard() {
  updateMusicPlaytest();
  const active = state.driveActive && state.micActive;
  elements.driveThemeButtons.forEach((button) => { button.disabled = state.driveActive; });
  elements.simulateButton.disabled = !active;
  elements.testHarmonyButton.disabled = !state.driveActive || !state.harmonyEnabled || state.companionMode !== "drive";
  elements.testAiVocalButton.disabled = !state.driveActive || !state.aiVocalCuesEnabled || state.companionMode !== "drive";
  elements.manualControls.hidden = !state.driveActive;
  elements.startDriveButton.hidden = state.driveActive;
  elements.localListeningButton.disabled = state.nativeVoiceListening;
  elements.localListeningLabel.textContent = state.nativeVoiceListening
    ? "Voice command is listening"
    : state.micActive
      ? "Turn off local listening"
      : "Turn on local listening";
  elements.localListeningButton.classList.toggle("listening", state.micActive);
  elements.joinButton.disabled = !state.micActive || state.companionJoined;
  elements.joinButtonLabel.textContent = state.companionJoined ? "Companion allowed" : "Allow companion for this session";
  elements.autoListenCheckbox.checked = state.autoListenAtDriveStart;
  elements.resumeAfterInterruptionsCheckbox.checked = state.resumeAfterInterruptions;
  elements.harmonyCheckbox.checked = state.harmonyEnabled;
  elements.aiVocalCheckbox.checked = state.aiVocalCuesEnabled;
  elements.backgroundDriveStatusText.textContent = state.backgroundServiceActive
    ? state.driveInterrupted
      ? state.resumeAfterInterruptions
        ? "Paused for an interruption; the same session will resume automatically"
        : "Paused after an interruption; use Resume listening when ready"
      : state.micActive
        ? "Active under other apps with notification controls"
        : "Singing session open; local listening paused"
    : "Off until you start Android local listening";
  elements.controlGuide.textContent = state.nativeVoiceListening
    ? "Voice command is active. Say Companion quiet or End session, or use Silence / Stop."
    : !state.micActive
      ? "Step 1: Turn on local listening. Set your companion permission."
      : state.companionJoined
        ? "Companion is allowed. Keep it quiet or use Silence / Stop at any time."
        : "Step 2: Allow the companion for this session if you want wordless harmony.";
  elements.voiceControlButton.hidden = !state.driveActive || !state.nativeVoiceAvailable;
  elements.voiceControlButton.disabled = !state.nativeVoiceSupported || state.nativeVoiceListening;
  elements.voiceControlLabel.textContent = state.nativeVoiceListening
    ? "Listening for one command"
    : state.nativeVoiceSupported
      ? "Listen for one voice command"
      : "On-device voice unavailable";
  elements.modeBadge.classList.toggle("ready", active && !state.companionJoined);
  elements.modeBadge.classList.toggle("joining", state.companionJoined);
  elements.listeningOrb.classList.toggle("listening", active && !state.companionJoined);
  elements.listeningOrb.classList.toggle("joining", state.companionJoined);

  if (!state.driveActive) {
    elements.modeBadge.textContent = "OFF";
    elements.consoleTitle.textContent = "Ready when you are.";
    elements.consoleCopy.textContent = "Start a singing session to choose local listening and what the demo companion may do.";
    elements.meterDescription.textContent = "Not listening. Nothing is recorded.";
    elements.hearingTitle.textContent = "Nothing yet";
    elements.hearingCopy.textContent = "Microphone access is off. Your space, your sound.";
    elements.detectionText.textContent = "Waiting for your choice";
    elements.detectionLine.querySelector(".detection-dot").classList.remove("live");
    return;
  }

  if (state.nativeVoiceListening) {
    elements.modeBadge.textContent = "VOICE";
    elements.consoleTitle.textContent = "Listening for one voice command.";
    elements.consoleCopy.textContent = "On-device only: say Companion join, Companion quiet, End session, or Help. The command listener ends automatically.";
    elements.meterDescription.textContent = "On-device command session. Nothing is recorded.";
    elements.hearingTitle.textContent = "On-device voice";
    elements.hearingCopy.textContent = "No audio or command text is saved or sent by Cantarivo.";
    elements.detectionText.textContent = "Listening for one approved command";
    elements.detectionLine.querySelector(".detection-dot").classList.add("live");
    return;
  }

  if (state.driveInterrupted) {
    elements.modeBadge.textContent = "PAUSED";
    elements.consoleTitle.textContent = "Singing session paused for an interruption.";
    elements.consoleCopy.textContent = state.resumeAfterInterruptions
      ? "The microphone and companion output are paused. The same session will resume automatically after the call or competing microphone ends."
      : "The microphone and companion output are paused. Use Resume listening when you are ready.";
    elements.meterDescription.textContent = "Temporarily paused. No audio is being analyzed.";
    elements.hearingTitle.textContent = "Call and app priority";
    elements.hearingCopy.textContent = "Cantarivo does not access call details. It only yields to Android's audio state.";
    elements.detectionText.textContent = "Microphone and companion audio paused";
    elements.detectionLine.querySelector(".detection-dot").classList.remove("live");
    return;
  }

  if (!state.micActive) {
    elements.modeBadge.textContent = "MIC OFF";
    elements.consoleTitle.textContent = "Singing session is active. Listening is off.";
    elements.consoleCopy.textContent = "Turn on local listening only if you want a private, limited vocal-like signal check for this session.";
    elements.meterDescription.textContent = "Listening off. Nothing is recorded.";
    elements.hearingTitle.textContent = "Still private";
    elements.hearingCopy.textContent = "No microphone is connected for this session.";
    elements.detectionText.textContent = "Microphone disabled";
    elements.detectionLine.querySelector(".detection-dot").classList.remove("live");
    return;
  }

  elements.modeBadge.textContent = state.companionJoined ? "DEMO ON" : "LISTENING";
  elements.consoleTitle.textContent = state.companionJoined ? "Demo companion is allowed." : "Listening for a possible vocal-like moment.";
  elements.consoleCopy.textContent = state.companionJoined
    ? "The demo companion is enabled for this session. Local wordless cues can join only if you turned them on."
    : "A local signal check is active for this session. It may mistake music or background noise for a voice, and the companion stays quiet until you allow it.";
  elements.meterDescription.textContent = "Listening locally. Nothing is recorded.";
  elements.hearingTitle.textContent = "Local sound signal";
  elements.hearingCopy.textContent = "A limited, on-device signal check can flag possible vocal-like moments. It does not identify a singer, song, or lyrics.";
  elements.detectionText.textContent = state.companionJoined
    ? "Demo companion allowed for this session"
    : "Listening locally. Nothing is recorded.";
  elements.detectionLine.querySelector(".detection-dot").classList.add("live");
}

function activeMusicTrack() {
  return previewTracks.find((track) => track.id === state.playingMusicTrackId);
}

function updateMusicPlaytest() {
  const track = activeMusicTrack();
  const selectingIsLocked = state.driveActive;
  elements.musicPlaytest.classList.toggle("drive-active", selectingIsLocked);
  elements.musicTrackButtons.forEach((button) => {
    const isPlaying = button.dataset.playTrack === state.playingMusicTrackId;
    button.classList.toggle("playing", isPlaying);
    button.disabled = selectingIsLocked;
    button.setAttribute("aria-pressed", String(isPlaying));
  });
  elements.stopMusicButton.disabled = !track;
  elements.musicPlaytestStatus.textContent = track
    ? `${state.driveActive ? "Playing hands-free" : "Playing"}: ${track.title}`
    : state.driveActive
      ? "No track selected for this session"
      : "No track playing";
}

function initializeMusicPlaytest() {
  state.musicPlayer = new Audio();
  state.musicPlayer.preload = "metadata";
  state.musicPlayer.addEventListener("ended", () => {
    state.playingMusicTrackId = null;
    updateMusicPlaytest();
  });
  state.musicPlayer.addEventListener("error", () => {
    const failedTrack = activeMusicTrack();
    state.playingMusicTrackId = null;
    updateMusicPlaytest();
    showToast(`${failedTrack?.title ?? "This track"} could not play on this device.`);
  });
}

function requestMusicPlaytest(trackId) {
  if (state.driveActive) {
    showToast("End the current session before changing tracks. The selected track can continue during a singing session.");
    return;
  }
  if (!previewTracks.some((track) => track.id === trackId)) return;
  if (!state.musicPlaytestApproved) {
    state.pendingMusicTrackId = trackId;
    elements.musicPlaytestDialog.showModal();
    elements.declineMusicPlaytestButton.focus();
    return;
  }
  playMusicTrack(trackId);
}

async function playMusicTrack(trackId) {
  const track = previewTracks.find((entry) => entry.id === trackId);
  if (!track || !state.musicPlayer) return;
  if (state.playingMusicTrackId === track.id && !state.musicPlayer.paused) {
    stopMusicPlaytest();
    return;
  }
  state.musicPlayer.pause();
  state.musicPlayer.currentTime = 0;
  state.musicPlayer.src = track.source;
  try {
    await state.musicPlayer.play();
    state.playingMusicTrackId = track.id;
    updateMusicPlaytest();
    showToast(`${track.title} is playing locally through your current audio output.`);
  } catch {
    state.playingMusicTrackId = null;
    updateMusicPlaytest();
    showToast("Playback could not start. Check your phone volume or audio connection.");
  }
}

function stopMusicPlaytest({ announce = true } = {}) {
  const track = activeMusicTrack();
  if (state.musicPlayer) {
    state.musicPlayer.pause();
    state.musicPlayer.currentTime = 0;
  }
  state.playingMusicTrackId = null;
  updateMusicPlaytest();
  if (announce && track) showToast("Music stopped.");
}

function updateMeter(level = 0) {
  const activeBars = Math.round(level * elements.meterBars.length);
  elements.meterBars.forEach((bar, index) => {
    const isActive = index < activeBars;
    const height = isActive ? 7 + ((index % 4) * 5) + level * 12 : 5;
    bar.style.height = `${Math.min(height, 28)}px`;
    bar.style.background = isActive ? (index > 9 ? "#f8d974" : "#8cf3c2") : "rgba(169,184,201,.25)";
  });
}

function openSettings(tab = "privacy", { pushHistory = true } = {}) {
  switchSettingsTab(tab);
  elements.privacyPanel.classList.add("open");
  elements.privacyPanel.setAttribute("aria-hidden", "false");
  elements.settingsButton.setAttribute("aria-expanded", "true");
  elements.scrim.hidden = false;
  if (pushHistory && !state.settingsHistoryOpen && window.history?.pushState) {
    window.history.pushState({ cantarivoSettings: true }, "", window.location.href);
    state.settingsHistoryOpen = true;
  }
  const activeTab = elements.settingsTabButtons.find((button) => button.dataset.settingsTab === tab);
  (activeTab || elements.closeSettingsButton).focus();
}

function closeSettings({ fromHistory = false } = {}) {
  elements.privacyPanel.classList.remove("open");
  elements.privacyPanel.setAttribute("aria-hidden", "true");
  elements.settingsButton.setAttribute("aria-expanded", "false");
  elements.scrim.hidden = true;
  if (state.settingsHistoryOpen && !fromHistory && window.history?.back) {
    window.history.back();
  }
  state.settingsHistoryOpen = false;
  elements.settingsButton.focus();
}

async function startMicrophone() {
  if (!state.driveActive) {
    showToast("Start a singing session first, then choose microphone access for that session.");
    return false;
  }
  const nativePlugin = getNativeVoicePlugin();
  if (nativePlugin) {
    if (state.nativeVoiceListening) stopNativeVoice();
    try {
      const resumingExistingSession = state.backgroundServiceActive;
      const result = resumingExistingSession
        ? await nativePlugin.resumeBackgroundDrive(nativeDriveOptions())
        : await nativePlugin.startBackgroundDrive(nativeDriveOptions());
      if (resumingExistingSession || result.active || result.sessionActive) {
        state.backgroundServiceActive = true;
        state.nativeMeterActive = true;
        state.micActive = true;
        state.driveInterrupted = false;
        state.interruptionReason = "none";
        elements.micAccessText.textContent = "Active for this session under other apps";
        elements.micControlButton.textContent = "Turn off";
        updateDashboard();
        updateReceipt();
        showToast("Local listening is active for this session and can continue under other apps. Use the Android notification to pause or end it.");
        return true;
      }
    } catch {
      // A browser fallback remains available for web previews.
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast("This browser cannot provide microphone access. Demo controls are unavailable.");
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    state.stream = stream;
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    source.connect(state.analyser);
    state.micActive = true;
    elements.micAccessText.textContent = "Active for this session only";
    elements.micControlButton.textContent = "Turn off";
    animateMeter();
    updateDashboard();
    updateReceipt();
    showToast("Microphone connected for this session. Audio stays local.");
    return true;
  } catch (error) {
    state.micActive = false;
    elements.micAccessText.textContent = "Permission not granted";
    elements.micControlButton.textContent = "Try again";
    updateDashboard();
    const reason = error?.name === "NotAllowedError" ? "Microphone permission was not granted." : "The microphone could not be connected.";
    showToast(`${reason} You can keep using the privacy controls without it.`);
    return false;
  }
}

function stopMicrophone() {
  stopSyntheticHarmony();
  if (state.meterFrame) cancelAnimationFrame(state.meterFrame);
  state.meterFrame = null;
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  if (state.audioContext && state.audioContext.state !== "closed") state.audioContext.close();
  state.stream = null;
  state.audioContext = null;
  state.analyser = null;
  if (state.backgroundServiceActive || state.nativeMeterActive) getNativeVoicePlugin()?.stopBackgroundDrive().catch(() => {});
  state.backgroundServiceActive = false;
  state.nativeMeterActive = false;
  state.micActive = false;
  state.driveInterrupted = false;
  state.interruptionReason = "none";
  state.companionJoined = false;
  updateMeter(0);
  elements.micAccessText.textContent = "Not connected";
  elements.micControlButton.textContent = "Enable mic";
}

function animateMeter() {
  if (!state.analyser || !state.micActive) return;
  const data = new Uint8Array(state.analyser.fftSize);
  state.analyser.getByteTimeDomainData(data);
  const rms = Math.sqrt(data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / data.length);
  updateMeter(Math.min(1, rms * 7.5));
  state.meterFrame = requestAnimationFrame(animateMeter);
}

function getNativeVoicePlugin() {
  return window.Capacitor?.Plugins?.DriverCompanionVoice;
}

function interruptionLabel(reason) {
  if (reason === "call_or_communication") return "a call or communication app";
  if (reason === "microphone_in_use") return "another app using the microphone";
  if (reason === "resume_required") return "an interruption that needs a manual resume";
  if (reason === "manual") return "your pause request";
  return "an Android audio interruption";
}

function resetDriveAfterNativeStop() {
  window.clearTimeout(state.demoTimer);
  state.demoTimer = null;
  stopSyntheticHarmony();
  stopMusicPlaytest({ announce: false });
  state.driveActive = false;
  state.micActive = false;
  state.nativeMeterActive = false;
  state.backgroundServiceActive = false;
  state.driveInterrupted = false;
  state.interruptionReason = "none";
  state.companionMode = "ask";
  state.companionJoined = false;
  state.startedAt = null;
  state.lastActivity = null;
  state.hasAskedThisMoment = false;
  state.nativeVoiceUsed = false;
  setDriveStatus("Ready - setup mode", false);
  updatePermissionCopy();
  updateDashboard();
  updateReceipt();
}

function handleDriveServiceStatus(serviceState) {
  const wasActive = state.backgroundServiceActive;
  const wasInterrupted = state.driveInterrupted;
  state.backgroundServiceActive = Boolean(serviceState.sessionActive);
  state.nativeMeterActive = Boolean(serviceState.sessionActive);
  state.micActive = Boolean(serviceState.microphoneActive);
  state.driveInterrupted = serviceState.state === "interrupted";
  state.interruptionReason = serviceState.reason || "none";

  if (state.driveInterrupted) {
    stopSyntheticHarmony();
    updateMeter(0);
    elements.micAccessText.textContent = `Paused for ${interruptionLabel(state.interruptionReason)}`;
    elements.micControlButton.textContent = state.resumeAfterInterruptions ? "Pause session" : "Resume";
    setDriveStatus("Session active - audio paused", true);
    if (!wasInterrupted) showToast(`Cantarivo paused the microphone and its own audio for ${interruptionLabel(state.interruptionReason)}.`);
  } else if (serviceState.state === "paused" && state.backgroundServiceActive) {
    stopSyntheticHarmony();
    updateMeter(0);
    elements.micAccessText.textContent = "Session open; listening paused";
    elements.micControlButton.textContent = "Resume";
    setDriveStatus("Session active - listening paused", true);
  } else if (serviceState.state === "active" || serviceState.state === "starting") {
    elements.micAccessText.textContent = "Active for this session under other apps";
    elements.micControlButton.textContent = "Turn off";
    setDriveStatus("Session active in background", true);
    if (wasInterrupted) showToast("The interruption ended. Local listening resumed for the same session.");
  } else if (!state.backgroundServiceActive && wasActive && state.driveActive) {
    resetDriveAfterNativeStop();
    showToast("The Android singing session ended. Listening and companion audio are off.");
    return;
  }
  updateDashboard();
  updateReceipt();
}

function handleNativeMeterLevel({ level }) {
  if (!state.nativeMeterActive || !state.micActive) return;
  updateMeter(Math.max(0, Math.min(1, Number(level) || 0)));
}

function handleNativeMeterStatus({ state: meterState }) {
  if (meterState === "active") return;
  if (!state.nativeMeterActive) return;
  if (["meter_unavailable", "meter_start_failed", "microphone_permission_denied", "foreground_service_start_failed"].includes(meterState)) {
    state.backgroundServiceActive = false;
    state.nativeMeterActive = false;
    state.micActive = false;
    state.companionJoined = false;
    updateMeter(0);
    elements.micAccessText.textContent = meterState === "microphone_permission_denied" ? "Permission not granted" : "Not connected";
    elements.micControlButton.textContent = meterState === "microphone_permission_denied" ? "Try again" : "Enable mic";
    updateDashboard();
    updateReceipt();
  }
}

function handleNativeVocalMoment({ kind, pitchHz, outputHandledByService = false }) {
  if (kind !== "possible_vocal_like_moment") return;
  handlePossibleVocalMoment({ source: "Local signal check", pitchHz, outputHandledByService });
}

function handleNativeVoiceStatus({ state: voiceState }) {
  if (voiceState === "listening") {
    state.nativeVoiceListening = true;
  } else if (["timed_out", "command_complete", "command_not_recognized", "stopped", "app_not_visible", "language_unavailable", "recognition_unavailable", "on_device_unavailable", "start_failed", "microphone_permission_denied"].includes(voiceState)) {
    state.nativeVoiceListening = false;
    if (state.driveActive && state.backgroundServiceActive && voiceState !== "app_not_visible") {
      getNativeVoicePlugin()?.resumeBackgroundDrive(nativeDriveOptions()).catch(() => {});
    }
  }
  updateDashboard();

  const messages = {
    timed_out: "No approved voice command was heard. Buttons remain available.",
    command_not_recognized: "That was not one of the four approved voice commands.",
    language_unavailable: "On-device voice is unavailable for this device language.",
    recognition_unavailable: "The on-device voice session could not continue. Buttons remain available.",
    on_device_unavailable: "This device does not provide the approved on-device voice path.",
    microphone_permission_denied: "Microphone permission was not granted. Buttons remain available.",
    start_failed: "Voice controls could not start on this device. Buttons remain available.",
  };
  if (messages[voiceState]) showToast(messages[voiceState]);
}

function allowDemoCompanionForDrive(source) {
  if (!state.driveActive) return;
  state.companionMode = "drive";
  state.companionJoined = true;
  state.hasAskedThisMoment = true;
  syncNativeDriveOptions();
  updatePermissionCopy();
  updateDashboard();
  showToast(`${source}: companion is enabled for this session. Wordless harmony plays only when you turn it on in Privacy & permission.`);
}

function handleNativeVoiceCommand({ command }) {
  state.nativeVoiceUsed = true;
  state.nativeVoiceListening = false;
  if (command === "companion_join") {
    allowDemoCompanionForDrive("Voice command");
    return;
  }
  if (command === "companion_quiet") {
    keepCompanionQuiet({ stopVoice: false });
    return;
  }
  if (command === "end_drive") {
    endDrive();
    return;
  }
  if (command === "help") {
    updateDashboard();
    showToast("Voice commands: Companion join, Companion quiet, End session, or Help. Use buttons anytime.");
  }
}

function initializeNativeVoice() {
  const plugin = getNativeVoicePlugin();
  if (!plugin) return;

  state.nativeVoiceAvailable = true;
  plugin.addListener("voiceStatus", handleNativeVoiceStatus);
  plugin.addListener("voiceCommand", handleNativeVoiceCommand);
  plugin.addListener("meterStatus", handleNativeMeterStatus);
  plugin.addListener("meterLevel", handleNativeMeterLevel);
  plugin.addListener("vocalMoment", handleNativeVocalMoment);
  plugin.addListener("driveServiceStatus", handleDriveServiceStatus);
  plugin.getBackgroundDriveState().then(handleDriveServiceStatus).catch(() => {});
  plugin.getAvailability().then((result) => {
    state.nativeVoiceSupported = Boolean(result.available);
    updateDashboard();
  }).catch(() => {
    state.nativeVoiceSupported = false;
    updateDashboard();
  });
}

function openVoiceConsent() {
  if (!state.nativeVoiceAvailable) {
    showToast("Voice controls are available only in the Android preview app.");
    return;
  }
  if (!state.nativeVoiceSupported) {
    showToast("This device does not provide the approved on-device voice path.");
    return;
  }
  elements.voiceConsentDialog.showModal();
  elements.declineVoiceButton.focus();
}

async function startNativeVoiceForDrive() {
  const plugin = getNativeVoicePlugin();
  if (!plugin) return;
  if (state.backgroundServiceActive) {
    await plugin.pauseBackgroundDrive(nativeDriveOptions()).catch(() => {});
  } else if (state.micActive) {
    stopMicrophone();
  }
  try {
    const result = await plugin.startForDrive();
    state.nativeVoiceSupported = Boolean(result.available);
    state.nativeVoiceListening = result.state === "listening";
    updateDashboard();
  } catch {
    state.nativeVoiceListening = false;
    updateDashboard();
    showToast("Voice controls could not start. Buttons remain available.");
  }
}

function stopNativeVoice() {
  const plugin = getNativeVoicePlugin();
  state.nativeVoiceListening = false;
  if (plugin) plugin.stopForDrive().catch(() => {});
}

function startDrive() {
  state.driveActive = true;
  state.startedAt = new Date();
  state.lastActivity = null;
  state.hasAskedThisMoment = false;
  setDriveStatus("Singing session active", true);
  updateDashboard();
  updateReceipt();
  if (state.autoListenAtDriveStart) {
    void startMicrophone();
  } else {
    requestMicrophoneForDrive();
  }
}

function requestMicrophoneForDrive() {
  if (!state.driveActive) {
    showToast("Start a singing session first, then choose local listening for that session.");
    return;
  }
  if (state.micActive) return;
  elements.rememberMicCheckbox.checked = state.autoListenAtDriveStart;
  elements.microphoneDialog.showModal();
  elements.declineMicButton.focus();
}

function endDrive() {
  window.clearTimeout(state.demoTimer);
  state.demoTimer = null;
  stopNativeVoice();
  stopMicrophone();
  stopMusicPlaytest({ announce: false });
  state.driveActive = false;
  state.companionMode = "ask";
  state.companionJoined = false;
  state.startedAt = null;
  state.lastActivity = null;
  state.hasAskedThisMoment = false;
  state.nativeVoiceUsed = false;
  setDriveStatus("Ready - setup mode", false);
  updatePermissionCopy();
  updateDashboard();
  updateReceipt();
  showToast("Session ended. Listening is off, activity is cleared, and companion permission has reset.");
}

function closeActiveControlDialogs() {
  [
    elements.microphoneDialog,
    elements.voiceConsentDialog,
    elements.musicPlaytestDialog,
  ].forEach((dialog) => {
    if (dialog.open) dialog.close();
  });
}

function silenceAndStopEverything() {
  const anythingActive = state.driveActive
    || state.micActive
    || state.nativeVoiceListening
    || Boolean(state.playingMusicTrackId)
    || state.companionJoined;

  closeActiveControlDialogs();

  if (state.driveActive) {
    endDrive();
    return;
  }

  stopNativeVoice();
  stopMicrophone();
  stopMusicPlaytest({ announce: false });
  state.companionMode = "ask";
  state.companionJoined = false;
  state.hasAskedThisMoment = false;
  updatePermissionCopy();
  updateDashboard();
  updateReceipt();
  showToast(anythingActive ? "Everything is stopped. You are back in setup mode." : "Nothing is active. You are in setup mode.");
}

function handlePossibleVocalMoment({ source, simulated = false, pitchHz = 196, outputHandledByService = false }) {
  if (!state.driveActive || !state.micActive) return;
  state.lastActivity = new Date();
  elements.detectionText.textContent = "Possible vocal-like moment noticed";
  if (simulated) {
    updateMeter(.92);
    window.clearTimeout(state.demoTimer);
    state.demoTimer = window.setTimeout(() => {
      if (state.micActive) animateMeter();
    }, 750);
  }
  updateReceipt();

  if (state.companionMode === "never") {
    showToast(`${source}: possible vocal-like moment noticed. The demo companion is set to stay quiet for this session.`);
    return;
  }
  if (state.companionMode === "drive") {
    state.companionJoined = true;
    if (!outputHandledByService) {
      if (state.aiVocalCuesEnabled) {
        playLocalAiVocalCue(pitchHz);
      } else {
        playWordlessHarmony(pitchHz);
      }
    }
    updateDashboard();
    showToast(state.aiVocalCuesEnabled
      ? `${source}: possible vocal-like moment noticed. Playing a brief local AI vocal cue.`
      : state.harmonyEnabled
        ? `${source}: possible vocal-like moment noticed. Playing a brief wordless harmony tone.`
        : `${source}: possible vocal-like moment noticed. The companion is allowed, but wordless output is off.`);
    return;
  }
  // Do not interrupt a singing session with a new decision dialog. The user must
  // explicitly choose Allow for this session before companion output may run.
  showToast(`${source}: possible vocal-like moment noticed. The companion stays quiet because it has not been allowed for this session.`);
}

function simulateVocalMoment() {
  handlePossibleVocalMoment({ source: "Simulation", simulated: true, pitchHz: 196 });
}

function setPermission(mode) {
  state.companionMode = mode;
  if (mode !== "drive") stopSyntheticHarmony();
  if (mode === "never") {
    state.companionJoined = false;
    state.hasAskedThisMoment = true;
  }
  if (mode === "drive") {
    state.companionJoined = false;
    state.hasAskedThisMoment = false;
  }
  if (mode === "ask") {
    state.companionJoined = false;
    state.hasAskedThisMoment = false;
  }
  updatePermissionCopy();
  syncNativeDriveOptions();
  updateDashboard();
  if (state.driveActive) {
    const message = mode === "ask"
      ? "The demo companion stays quiet until you allow it for this session."
      : mode === "drive"
        ? "The demo companion may respond after the next possible vocal-like moment."
        : "The demo companion is quiet for this session.";
    showToast(message);
  }
}

function toggleLocalListening() {
  if (state.nativeVoiceListening) {
    showToast("The one-command voice session is active. Say End session or use Silence / Stop to end it now.");
    return;
  }
  if (state.micActive) {
    if (state.backgroundServiceActive) {
      getNativeVoicePlugin()?.pauseBackgroundDrive(nativeDriveOptions()).catch(() => {});
      state.micActive = false;
    } else {
      stopMicrophone();
    }
    updateDashboard();
    updateReceipt();
    showToast("Local listening is off. The demo companion stays quiet until you turn listening on again.");
    return;
  }
  if (state.backgroundServiceActive) {
    void startMicrophone();
    return;
  }
  requestMicrophoneForDrive();
}

function keepCompanionQuiet({ stopVoice = true } = {}) {
  if (stopVoice) stopNativeVoice();
  stopSyntheticHarmony();
  stopMusicPlaytest({ announce: false });
  state.companionMode = "never";
  state.companionJoined = false;
  state.hasAskedThisMoment = true;
  syncNativeDriveOptions();
  updatePermissionCopy();
  updateDashboard();
  showToast("Demo companion is quiet for this session. You can change this in Privacy & permission.");
}

elements.startDriveButton.addEventListener("click", startDrive);
elements.endDriveButton.addEventListener("click", endDrive);
elements.silenceButton.addEventListener("click", keepCompanionQuiet);
elements.emergencyStopButtons.forEach((button) => button.addEventListener("click", silenceAndStopEverything));
elements.localListeningButton.addEventListener("click", toggleLocalListening);
elements.voiceControlButton.addEventListener("click", openVoiceConsent);
elements.simulateButton.addEventListener("click", simulateVocalMoment);
elements.testHarmonyButton.addEventListener("click", () => {
  if (!state.driveActive || state.companionMode !== "drive" || !state.harmonyEnabled) {
    showToast("Choose Allow for this session and enable wordless harmony first.");
    return;
  }
  state.companionJoined = true;
  updateDashboard();
  playWordlessHarmony(196, { announce: true });
});
elements.testAiVocalButton.addEventListener("click", () => {
  if (!state.driveActive || state.companionMode !== "drive" || !state.aiVocalCuesEnabled) {
    showToast("Choose Allow for this session and enable local AI vocal cues first.");
    return;
  }
  state.companionJoined = true;
  updateDashboard();
  playLocalAiVocalCue(174, { announce: true });
});
renderFaqs();
switchSettingsTab("privacy");
registerNativeBackButtonHandler();

elements.settingsTabButtons.forEach((button) => button.addEventListener("click", () => switchSettingsTab(button.dataset.settingsTab)));
elements.faqSearchInput.addEventListener("input", (event) => renderFaqs(event.target.value));
elements.supportBotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  answerSupportQuestion(elements.supportBotInput.value);
});
elements.supportTopicButtons.forEach((button) => button.addEventListener("click", () => {
  elements.supportBotInput.value = button.dataset.supportTopic;
  answerSupportQuestion(button.dataset.supportTopic);
}));
elements.copySupportSummaryButton.addEventListener("click", async () => {
  const summary = buildSupportSummary();
  try {
    await navigator.clipboard.writeText(summary);
    showToast("Support summary copied. Review it before sending.");
  } catch {
    elements.supportBotResponse.textContent = summary;
    showToast("Clipboard unavailable. The support summary is shown above.");
  }
});
window.addEventListener("popstate", () => {
  if (elements.privacyPanel.classList.contains("open")) {
    closeSettings({ fromHistory: true });
  }
});
elements.settingsButton.addEventListener("click", () => openSettings("privacy"));
elements.privacyButton.addEventListener("click", () => openSettings("privacy"));
elements.permissionButton.addEventListener("click", () => openSettings("privacy"));
elements.closeSettingsButton.addEventListener("click", () => closeSettings());
elements.scrim.addEventListener("click", () => closeSettings());
elements.micControlButton.addEventListener("click", toggleLocalListening);
elements.autoListenCheckbox.addEventListener("change", (event) => setAutoListenAtDriveStart(event.target.checked));
elements.resumeAfterInterruptionsCheckbox.addEventListener("change", (event) => setResumeAfterInterruptions(event.target.checked));
elements.harmonyCheckbox.addEventListener("change", (event) => setHarmonyEnabled(event.target.checked));
elements.aiVocalCheckbox.addEventListener("change", (event) => setAiVocalCuesEnabled(event.target.checked));
elements.driveThemeButtons.forEach((button) => button.addEventListener("click", () => {
  applyDriveTheme(button.dataset.driveTheme);
}));
elements.joinButton.addEventListener("click", () => {
  if (!state.micActive) {
    showToast("Turn on local listening before allowing the demo companion.");
    return;
  }
  state.companionJoined = true;
  allowDemoCompanionForDrive("Manual control");
});
elements.clearDriveButton.addEventListener("click", () => {
  state.lastActivity = null;
  state.hasAskedThisMoment = false;
  updateReceipt();
  showToast("Current session activity cleared. No audio was stored.");
});
document.querySelectorAll('input[name="companionPermission"]').forEach((input) => input.addEventListener("change", (event) => setPermission(event.target.value)));
elements.quickPermissionButtons.forEach((button) => button.addEventListener("click", () => setPermission(button.dataset.quickPermission)));

elements.allowMicButton.addEventListener("click", async () => {
  elements.microphoneDialog.close();
  setAutoListenAtDriveStart(elements.rememberMicCheckbox.checked, { announce: false });
  await startMicrophone();
});
elements.declineMicButton.addEventListener("click", () => {
  elements.microphoneDialog.close();
  updateDashboard();
  updateReceipt();
  showToast("No microphone access was granted. You can enable it later from Privacy & permission.");
});
elements.musicTrackButtons.forEach((button) => button.addEventListener("click", () => requestMusicPlaytest(button.dataset.playTrack)));
elements.stopMusicButton.addEventListener("click", () => stopMusicPlaytest());
elements.allowMusicPlaytestButton.addEventListener("click", async () => {
  const trackId = state.pendingMusicTrackId;
  state.pendingMusicTrackId = null;
  state.musicPlaytestApproved = true;
  elements.musicPlaytestDialog.close();
  await playMusicTrack(trackId);
});
elements.declineMusicPlaytestButton.addEventListener("click", () => {
  state.pendingMusicTrackId = null;
  elements.musicPlaytestDialog.close();
  showToast("Music playback remains off.");
});

elements.enableVoiceButton.addEventListener("click", async () => {
  elements.voiceConsentDialog.close();
  await startNativeVoiceForDrive();
});
elements.declineVoiceButton.addEventListener("click", () => {
  elements.voiceConsentDialog.close();
  showToast("Voice controls remain off. Buttons are always available.");
});
  [elements.microphoneDialog, elements.voiceConsentDialog, elements.musicPlaytestDialog].forEach((dialog) => dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  dialog.close();
  showToast("No permission change was made.");
}));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopSyntheticHarmony();
    if (!state.backgroundServiceActive) {
      stopMusicPlaytest({ announce: false });
      if (state.micActive) {
        stopMicrophone();
        updateDashboard();
        updateReceipt();
      }
    }
    return;
  }
  getNativeVoicePlugin()?.getBackgroundDriveState().then(handleDriveServiceStatus).catch(() => {});
});
applyDriveTheme(state.driveTheme, { announce: false });
setAutoListenAtDriveStart(state.autoListenAtDriveStart, { announce: false });
setResumeAfterInterruptions(state.resumeAfterInterruptions, { announce: false });
setHarmonyEnabled(state.harmonyEnabled, { announce: false });
setAiVocalCuesEnabled(state.aiVocalCuesEnabled, { announce: false });
updatePermissionCopy();
initializeMusicPlaytest();
updateDashboard();
updateReceipt();
initializeNativeVoice();

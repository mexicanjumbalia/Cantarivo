/*
 * Driver Companion is intentionally a demo. The browser microphone adapter below
 * measures local sound level only. Replace MockSingingDetector and MockVoiceOutput
 * with licensed, consented production services if real singing detection, music
 * recognition, lyric retrieval, or voice synthesis is ever added.
 */

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
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  driveStatus: $("#driveStatus"),
  modeBadge: $("#modeBadge"),
  listeningOrb: $("#listeningOrb"),
  consoleTitle: $("#consoleTitle"),
  consoleCopy: $("#consoleCopy"),
  meterBars: [...document.querySelectorAll("#meterBars span")],
  startDriveButton: $("#startDriveButton"),
  startButtonLabel: $("#startButtonLabel"),
  manualControls: $("#manualControls"),
  joinButton: $("#joinButton"),
  joinButtonLabel: $("#joinButtonLabel"),
  endDriveButton: $("#endDriveButton"),
  hearingTitle: $("#hearingTitle"),
  hearingCopy: $("#hearingCopy"),
  detectionLine: $("#detectionLine"),
  detectionText: $("#detectionText"),
  permissionTitle: $("#permissionTitle"),
  permissionCopy: $("#permissionCopy"),
  permissionButton: $("#permissionButton"),
  privacyButton: $("#privacyButton"),
  settingsButton: $("#settingsButton"),
  closeSettingsButton: $("#closeSettingsButton"),
  privacyPanel: $("#privacyPanel"),
  scrim: $("#scrim"),
  micAccessText: $("#micAccessText"),
  micControlButton: $("#micControlButton"),
  clearDriveButton: $("#clearDriveButton"),
  receiptText: $("#receiptText"),
  simulateButton: $("#simulateButton"),
  microphoneDialog: $("#microphoneDialog"),
  joinDialog: $("#joinDialog"),
  allowMicButton: $("#allowMicButton"),
  declineMicButton: $("#declineMicButton"),
  allowJoinDriveButton: $("#allowJoinDriveButton"),
  keepQuietButton: $("#keepQuietButton"),
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

function setDriveStatus(text, isLive = false) {
  elements.driveStatus.querySelector("span:last-child").textContent = text;
  elements.driveStatus.querySelector(".status-dot").classList.toggle("live", isLive);
}

function updateReceipt() {
  if (!state.driveActive || !state.startedAt) {
    elements.receiptText.textContent = "No current drive. Nothing has been stored.";
    return;
  }
  const permission = state.companionMode === "drive" ? "companion allowed for this drive" : state.companionMode === "never" ? "companion kept quiet" : "companion asks first";
  const activity = state.lastActivity ? ` Last demo activity ${formatTime(state.lastActivity)}.` : "";
  elements.receiptText.textContent = `Drive started ${formatTime(state.startedAt)} · microphone ${state.micActive ? "active" : "off"} · ${permission}.${activity} Nothing is stored.`;
}

function updatePermissionCopy() {
  const options = {
    ask: ["Always ask first", "If a vocal moment is noticed, you decide whether this companion joins."],
    drive: [state.driveActive ? "Allowed for this drive" : "Allowed for next drive", state.driveActive ? "The companion may join after a vocal moment until you end this drive. Revoke anytime." : "The companion can join after a vocal moment on your next drive. You can change this anytime."],
    never: ["Companion stays quiet", "Vocal activity may be shown, but this companion will not join or prompt you."],
  };
  const [title, copy] = options[state.companionMode];
  elements.permissionTitle.textContent = title;
  elements.permissionCopy.textContent = copy;
  document.querySelector(`input[name="companionPermission"][value="${state.companionMode}"]`).checked = true;
  updateReceipt();
}

function updateDashboard() {
  const active = state.driveActive && state.micActive;
  elements.simulateButton.disabled = !active;
  elements.manualControls.hidden = !state.driveActive;
  elements.startDriveButton.hidden = state.driveActive;
  elements.modeBadge.classList.toggle("ready", active && !state.companionJoined);
  elements.modeBadge.classList.toggle("joining", state.companionJoined);
  elements.listeningOrb.classList.toggle("listening", active && !state.companionJoined);
  elements.listeningOrb.classList.toggle("joining", state.companionJoined);

  if (!state.driveActive) {
    elements.modeBadge.textContent = "OFF";
    elements.consoleTitle.textContent = "Ready when you are.";
    elements.consoleCopy.textContent = "Start a drive to choose how your microphone and singing buddy work.";
    elements.hearingTitle.textContent = "Nothing yet";
    elements.hearingCopy.textContent = "Microphone access is off. Your car, your sound.";
    elements.detectionText.textContent = "Waiting for your choice";
    elements.detectionLine.querySelector(".detection-dot").classList.remove("live");
    return;
  }

  if (!state.micActive) {
    elements.modeBadge.textContent = "MIC OFF";
    elements.consoleTitle.textContent = "Drive started. Mic stays off.";
    elements.consoleCopy.textContent = "You can enable local voice-level analysis from Privacy & permission anytime.";
    elements.hearingTitle.textContent = "Still private";
    elements.hearingCopy.textContent = "No microphone is connected for this drive.";
    elements.detectionText.textContent = "Microphone disabled";
    elements.detectionLine.querySelector(".detection-dot").classList.remove("live");
    return;
  }

  elements.modeBadge.textContent = state.companionJoined ? "JOINING" : "LISTENING";
  elements.consoleTitle.textContent = state.companionJoined ? "Your harmony is on standby." : "Ready when you sing.";
  elements.consoleCopy.textContent = state.companionJoined ? "Demo voice output is enabled. Tap to keep it quiet at any moment." : "Local sound level is active. We’ll only ask about joining if you have chosen “ask first.”";
  elements.hearingTitle.textContent = "Local voice level";
  elements.hearingCopy.textContent = "Live level stays in this browser and disappears when your drive ends.";
  elements.detectionText.textContent = state.companionJoined ? "Companion allowed for this drive" : "Listening locally · not recording";
  elements.detectionLine.querySelector(".detection-dot").classList.add("live");
  elements.joinButton.setAttribute("aria-pressed", String(state.companionJoined));
  elements.joinButtonLabel.textContent = state.companionJoined ? "Keep companion quiet" : "Let companion join";
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

function openSettings() {
  elements.privacyPanel.classList.add("open");
  elements.privacyPanel.setAttribute("aria-hidden", "false");
  elements.settingsButton.setAttribute("aria-expanded", "true");
  elements.scrim.hidden = false;
  elements.closeSettingsButton.focus();
}

function closeSettings() {
  elements.privacyPanel.classList.remove("open");
  elements.privacyPanel.setAttribute("aria-hidden", "true");
  elements.settingsButton.setAttribute("aria-expanded", "false");
  elements.scrim.hidden = true;
  elements.settingsButton.focus();
}

async function startMicrophone() {
  if (!state.driveActive) {
    showToast("Start a drive first, then choose microphone access for that drive.");
    return false;
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
    elements.micAccessText.textContent = "Active · this drive only";
    elements.micControlButton.textContent = "Turn off";
    animateMeter();
    updateDashboard();
    updateReceipt();
    showToast("Microphone connected for this drive. Audio stays local.");
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
  if (state.meterFrame) cancelAnimationFrame(state.meterFrame);
  state.meterFrame = null;
  if (state.stream) state.stream.getTracks().forEach((track) => track.stop());
  if (state.audioContext && state.audioContext.state !== "closed") state.audioContext.close();
  state.stream = null;
  state.audioContext = null;
  state.analyser = null;
  state.micActive = false;
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

function startDrive() {
  state.driveActive = true;
  state.startedAt = new Date();
  state.lastActivity = null;
  state.hasAskedThisMoment = false;
  setDriveStatus("Drive active · hands-free ready", true);
  updateDashboard();
  updateReceipt();
  elements.microphoneDialog.showModal();
  elements.declineMicButton.focus();
}

function endDrive() {
  window.clearTimeout(state.demoTimer);
  state.demoTimer = null;
  stopMicrophone();
  state.driveActive = false;
  state.companionJoined = false;
  state.startedAt = null;
  state.lastActivity = null;
  state.hasAskedThisMoment = false;
  setDriveStatus("Parked · setup mode", false);
  updateDashboard();
  updateReceipt();
  showToast("Drive ended. Microphone access is off and activity was cleared.");
}

function simulateVocalMoment() {
  if (!state.driveActive || !state.micActive) return;
  state.lastActivity = new Date();
  elements.detectionText.textContent = "Demo vocal moment noticed";
  updateMeter(.92);
  window.clearTimeout(state.demoTimer);
  state.demoTimer = window.setTimeout(() => {
    if (state.micActive) animateMeter();
  }, 750);
  updateReceipt();

  if (state.companionMode === "never") {
    showToast("Demo vocal moment noticed. Your companion is set to stay quiet.");
    return;
  }
  if (state.companionMode === "drive") {
    state.companionJoined = true;
    updateDashboard();
    showToast("Demo companion is ready to join this drive. No real vocal audio is produced.");
    return;
  }
  if (!state.companionJoined && !state.hasAskedThisMoment) {
    state.hasAskedThisMoment = true;
    elements.joinDialog.showModal();
    elements.keepQuietButton.focus();
  } else if (state.companionJoined) {
    showToast("Demo companion remains enabled for this drive.");
  }
}

function setPermission(mode) {
  state.companionMode = mode;
  if (mode === "never") state.companionJoined = false;
  if (mode === "drive" && state.driveActive) state.companionJoined = true;
  if (mode === "ask") {
    state.companionJoined = false;
    state.hasAskedThisMoment = false;
  }
  updatePermissionCopy();
  updateDashboard();
  if (state.driveActive) showToast(mode === "ask" ? "Companion will ask before joining." : mode === "drive" ? "Companion is allowed for this drive. You can revoke it anytime." : "Companion is set to stay quiet.");
}

elements.startDriveButton.addEventListener("click", startDrive);
elements.endDriveButton.addEventListener("click", endDrive);
elements.simulateButton.addEventListener("click", simulateVocalMoment);
elements.settingsButton.addEventListener("click", openSettings);
elements.privacyButton.addEventListener("click", openSettings);
elements.permissionButton.addEventListener("click", openSettings);
elements.closeSettingsButton.addEventListener("click", closeSettings);
elements.scrim.addEventListener("click", closeSettings);
elements.micControlButton.addEventListener("click", async () => {
  if (state.micActive) {
    stopMicrophone();
    updateDashboard();
    updateReceipt();
    showToast("Microphone turned off. The companion is quiet until you enable it again.");
    return;
  }
  await startMicrophone();
});
elements.joinButton.addEventListener("click", () => {
  if (!state.micActive) { showToast("Turn on the microphone before inviting the companion."); return; }
  state.companionJoined = !state.companionJoined;
  if (state.companionJoined) state.companionMode = "drive";
  updatePermissionCopy();
  updateDashboard();
  showToast(state.companionJoined ? "Companion enabled for this drive. Tap again to keep it quiet." : "Companion is quiet again.");
});
elements.clearDriveButton.addEventListener("click", () => {
  state.lastActivity = null;
  state.hasAskedThisMoment = false;
  updateReceipt();
  showToast("Current drive activity cleared. No audio was stored.");
});
document.querySelectorAll('input[name="companionPermission"]').forEach((input) => input.addEventListener("change", (event) => setPermission(event.target.value)));

elements.allowMicButton.addEventListener("click", async () => {
  elements.microphoneDialog.close();
  await startMicrophone();
});
elements.declineMicButton.addEventListener("click", () => {
  elements.microphoneDialog.close();
  updateDashboard();
  updateReceipt();
  showToast("No microphone access was granted. You can enable it later from Privacy & permission.");
});
elements.allowJoinDriveButton.addEventListener("click", () => {
  elements.joinDialog.close();
  state.companionMode = "drive";
  state.companionJoined = true;
  updatePermissionCopy();
  updateDashboard();
  showToast("Companion is enabled for this drive. Tap “Keep companion quiet” to revoke it.");
});
elements.keepQuietButton.addEventListener("click", () => {
  elements.joinDialog.close();
  state.companionJoined = false;
  updateDashboard();
  showToast("Companion stays quiet. You can allow it later with the manual control.");
});

[elements.microphoneDialog, elements.joinDialog].forEach((dialog) => dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  dialog.close();
  showToast("No permission change was made.");
}));

updatePermissionCopy();
updateDashboard();
updateReceipt();

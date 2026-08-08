# Native Speech Privacy and Device Test Plan

**Status:** Android preview implementation in progress. The repository now contains a Capacitor Android app with an on-device, one-command speech adapter. iOS remains planning only.

**Decision for the controlled preview:** do not add a cloud speech fallback, an always-on wake word, or a microphone service that starts from the background. The app now includes a user-started active-session foreground service for local signal analysis; the separate one-command speech recognizer remains bounded and foreground-only. If a device cannot provide the approved on-device command path, Cantarivo keeps its button-first controls.

This is an engineering and release checklist, not legal advice. Before a public release, obtain a privacy review for every region where the app is offered, especially if any audio, transcript, diagnostic, account, analytics, or third-party SDK behavior changes.

## Why this boundary exists

- Apple documents `SpeechAnalyzer` and `SpeechTranscriber` as an on-device speech-to-text path in iOS 26. The legacy `SFSpeechRecognizer` can require a network when on-device recognition is not supported. It must be configured to require on-device recognition, or it is not an acceptable fallback for Cantarivo's local-only claim.
- Android documents that the general `SpeechRecognizer` implementation is likely to stream audio to remote servers and is not intended for continuous recognition. The Android preview may use only `createOnDeviceSpeechRecognizer()` after an availability and language-support check. It must never quietly use `createSpeechRecognizer()` as a fallback.
- A microphone foreground service is not permission to listen invisibly. Android requires visible, in-context permission and service startup rules; a microphone foreground service cannot be created from the background in the ordinary case.

## Shared product rules - complete before native code

- [ ] Keep the current buttons: **Let companion join**, **Keep companion quiet**, and **End session**. Voice is an additional input, not the only escape route.
- [ ] Make voice control opt-in for the current session. The default is off. End session, microphone revocation, application termination, and device permission revocation all stop recognition and reset the next session to **Ask before joining**.
- [ ] Show a controlled-test-first explanation immediately before the operating-system prompt: "Cantarivo will listen on this device for four short commands during this session: Companion join, Companion quiet, End session, and Help. It does not save audio or transcripts, and it does not send them to a server."
- [ ] Make the declined path safe: the app remains usable with buttons, does not repeatedly prompt, and shows where the person can enable voice later.
- [ ] Show a persistent, plain-language state while voice control is active: "Voice controls active for this session - on device - no recording." Include an immediate **Keep quiet** / **End session** control.
- [ ] Process the smallest possible command set. Do not store raw audio, transcripts, confidence scores, or an audio-derived profile. Do not send them to analytics, crash reporting, an LLM, or a music provider.
- [ ] Keep a local, non-content receipt only: whether voice mode was enabled, when it stopped, and why. Clear it at session end unless a later privacy policy and retention design explicitly permits otherwise.
- [ ] Do not make claims such as "hands-free safe," "always listening," or "works while you session" until distraction testing supports the precise claim. Test only in a stationary controlled test environment or with a passenger/tester in a controlled, lawful setting.
- [ ] Ship a privacy policy in the app and on the project website that precisely matches the chosen native path. Update Apple App Privacy and Google Play Data Safety disclosures before each release if any SDK or data behavior changes.

## iOS checklist

### Choose one privacy mode

**Preferred preview: iOS 26+ only, SpeechAnalyzer.** Use `SpeechAnalyzer` with the on-device `SpeechTranscriber`/`SpeechDetector` path. Check model and language asset availability before allowing voice mode. Treat unavailable assets or unsupported language as a clean "Voice controls are unavailable on this device" state; keep buttons available.

**Do not use as a silent fallback: SFSpeechRecognizer.** If a future compatibility build needs legacy `SFSpeechRecognizer`, first check `supportsOnDeviceRecognition`, set `requiresOnDeviceRecognition = true`, and fail closed when the device cannot honor that setting. Do not use a server-backed request while claiming local processing.

### Required implementation tasks

- [ ] Build a native `VoiceCommandAdapter` with a single `startForDrive()` and `stopImmediately()` authority boundary. It owns the audio engine, speech analyzer/recognizer, and command matcher.
- [ ] Add the following to the iOS app's `Info.plist` before microphone access:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Cantarivo uses the microphone only during a session you start to recognize four local voice commands. Audio is not recorded or saved.</string>
```

- [ ] Add this key **only if the shipping app calls `SFSpeechRecognizer.requestAuthorization`**. Apple requires it for that authorization call; omit the legacy recognizer entirely from a strict iOS 26 on-device-only preview if it is not used.

```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>Cantarivo uses speech recognition only when you turn on voice controls for a session, to recognize Companion join, Companion quiet, End session, and Help.</string>
```

- [ ] Request microphone authorization only after the in-app explanation and the user selects **Turn on voice controls for this session**. Check the result and offer buttons on denial, restriction, or later Settings revocation.
- [ ] If using legacy `SFSpeechRecognizer`, request speech authorization separately, handle `.denied` and `.restricted`, and never start recognition until both microphone and speech authorizations are granted.
- [ ] If using `SpeechAnalyzer`, verify its actual device/OS authorization behavior in the spike. Keep the microphone purpose string; do not assume that importing a framework, an asset download, or a future API revision has no privacy disclosure requirement.
- [ ] Use only the approved locale and assets. Present asset/model download as a separate choice if a download is needed; do not start a singing session in voice mode until the asset is ready.
- [ ] Stop audio input and cancel/finalize analysis on **Keep quiet**, **End session**, app deactivation, audio interruption, route change, and microphone permission change. Release the analyzer and audio engine when stopped.
- [ ] Match only complete, constrained commands. Ignore uncertain/partial text. A transcript that does not exactly map to one approved command must result in no action.
- [ ] Provide a no-cloud diagnostic build check: on-device mode is the only allowed configuration. Fail the test if an unavailable model attempts a network-backed recognizer.

### iOS legal and store-readiness tasks

- [ ] Keep `NSMicrophoneUsageDescription` truthful and specific. Apple requires it for microphone APIs; the purpose string is part of the consent prompt.
- [ ] Treat `NSSpeechRecognitionUsageDescription` as a material disclosure, not a boilerplate line. Apple's legacy documentation describes it as explaining why data is sent to Apple's speech-recognition servers. A local-only product should therefore avoid a legacy cloud path rather than rely on vague wording.
- [ ] Publish an easily accessible in-app privacy policy and accurate App Store Connect App Privacy details. Apple requires a privacy policy URL and requires disclosures to cover third-party code as well as first-party behavior.
- [ ] Verify every SDK's data use and privacy manifest. No analytics or crash SDK may receive audio, recognized text, or voice-mode events unless the policy, disclosures, and user choice explicitly cover it.

## Android checklist

### Current Android preview boundary

The current Android preview has no `INTERNET`, `READ_PHONE_STATE`, or `READ_CALL_LOG` permission. It requests microphone access at runtime only after the user chooses a current-session feature. A user-started `DriverCompanionDriveService` then runs as a foreground service with `microphone|mediaPlayback` types and an ongoing notification. Its native local sound-level meter sends the interface only a numeric level and a narrow vocal-like event; it does not retain or transmit audio. Android audio mode and capture-silencing callbacks pause or yield for calls and competing microphone use without exposing call metadata. Its optional voice-command path remains separate: Android 12+ `createOnDeviceSpeechRecognizer()` handles one command with a seven-second timeout, immediately destroys that recognizer, and passes only a mapped command key to the app.

### Implemented foreground-service requirements

- [x] Declare the required permissions and exact service types:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

<application ...>
    <service
        android:name=".DriverCompanionDriveService"
        android:foregroundServiceType="microphone|mediaPlayback"
        android:exported="false" />
</application>
```

- [x] Request `RECORD_AUDIO` dynamically only after the user selects **Listen on this device**, explain the exact four-command scope first, and keep buttons usable if it is denied.
- [x] Start the microphone foreground service only from a visible activity after `RECORD_AUDIO` is currently granted. Do not start it at boot, from a background receiver, or as a hidden restart mechanism.
- [x] Provide the required ongoing foreground-service notification whenever the service runs, with Pause/Resume and End session actions. Ask once for Android 13+ notification permission, but do not depend on that permission to start the service.
- [x] Pause or yield local capture and stop app-owned companion output for calls, communication mode, audio-focus loss, or a higher-priority microphone user. Do not request phone-state or call-log permissions.
- [ ] When `RECORD_AUDIO` is revoked or the service cannot start, stop safely, clear the active voice state, and show buttons. Do not retry in the background.

### On-device recognition tasks

- [x] Call `SpeechRecognizer.isOnDeviceRecognitionAvailable(context)` before offering Android voice mode.
- [x] Use `SpeechRecognizer.createOnDeviceSpeechRecognizer(context)`, never the default `createSpeechRecognizer(context)`, in the local-only preview.
- [ ] Call `checkRecognitionSupport()` for the exact locale and recognition intent. If needed, request model download only through the operating-system flow and wait for confirmed success. A scheduled or failed download means voice mode remains unavailable.
- [ ] Do not build indefinite listening around Android's standard recognizer. Android states it is not intended for continuous recognition and can consume significant battery and bandwidth. The preview must use bounded sessions, explicit lifecycle cleanup, and a separate technical review before any wake-word design.
- [x] Call `destroy()` on every recognizer instance when a command completes, the session times out, a permission error occurs, the app pauses, or the session ends.
- [x] Match only the four approved commands. No transcript, audio, model diagnostic, or command history leaves the device.

### Android legal and Play-readiness tasks

- [ ] Request microphone access only for a current, clearly described, user-benefiting feature that is promoted in the Play listing. Do not declare a microphone capability before it exists.
- [ ] Publish a valid privacy policy both in the app and in Play Console. Complete the Data Safety form accurately, including the behavior of every third-party SDK.
- [ ] If any audio or transcript reaches a third party, revisit the entire privacy design and provide the required prominent in-app disclosure and affirmative consent. Do not rely on the operating-system permission prompt alone.
- [ ] Do not describe the app as local-only if the device/OEM recognition service can send audio remotely. Disable voice mode instead.

## Personal-device test plan

### Prepare the test matrix

- [ ] Use at least one current iPhone on iOS 26+ and at least two physical Android phones: one expected to support on-device recognition and one expected not to support it or the selected language. Record OS version, locale, model, and recognition-asset state.
- [ ] Use a fresh install for each permission-path test. Do not test on a real session. Park safely or use a bench environment.
- [ ] Test the same four phrases only: **Companion join**, **Companion quiet**, **End session**, and **Help**. Document the expected action before testing.
- [ ] Test a small, repeatable sample: 20 deliberate repetitions of each command in each environment (quiet indoor, stationary test car with engine off, stationary test car with typical road-like noise, and Bluetooth connected). Record only aggregate pass/fail counts, not voice recordings or transcripts.

### iOS acceptance tests

- [ ] Fresh install: verify the pre-permission explanation, then grant microphone and (if legacy code is present) speech permission. Confirm the active indicator and the immediate quiet/end controls.
- [ ] Deny microphone, deny speech, restrict speech, and revoke microphone later in Settings. In each case verify no crash, no repeated nagging, no hidden listening, and full button usability.
- [ ] In airplane mode after assets are installed, verify the approved offline route either recognizes commands or explicitly reports unavailable. It must not silently fall back to a network recognizer.
- [ ] Test a device/language with absent assets. Verify the asset download is optional, clearly named, and voice mode stays off until it completes.
- [ ] Interrupt with a phone call, Siri, Bluetooth connect/disconnect, app backgrounding, screen lock, and a second start/stop cycle. Confirm audio input stops immediately and no recognition task survives End session.
- [ ] Measure command action latency with a stopwatch from phrase end to visible state change. Establish a preview threshold before recruiting anyone; reject a build with delayed, ambiguous, or unintended actions.

### Android acceptance tests

- [ ] Fresh install: verify the rationale screen, dynamic `RECORD_AUDIO` prompt, optional Android 13+ notification prompt, visible in-app listening state, ongoing active-session notification, and immediate Pause/Resume and End session controls.
- [ ] Deny, choose one-time permission where the system offers it, revoke in Settings, and attempt to start local listening while the app is not visible. Confirm safe failure, no crash, no background retry, and no hidden service restart.
- [ ] Confirm the foreground service starts only from the visible app after permission is granted. Check Logcat for microphone/permission errors and ensure no `SecurityException` is ignored.
- [ ] Test on-device availability, unsupported locale, model download success, scheduled download, and download failure. Each unavailable case must leave voice mode disabled and buttons active.
- [ ] Put the app under Maps or another app after a valid visible start. Verify the session notification and microphone indicator remain visible and local analysis continues. Verify notification Pause releases the microphone and Resume restores it without reopening stationary test setup.
- [ ] Test incoming, active, and ended calls plus a foreground app that records audio. Confirm Cantarivo pauses or yields its microphone and companion cue, exposes no caller metadata, and follows the configured automatic/manual resume behavior.
- [ ] Verify End session, Silence / Stop, permission revocation, and notification End session release the microphone, remove the ongoing notification, stop companion output, and reset per-session companion permission.
- [ ] Repeat the shared 20-per-command matrix and test Bluetooth connect/disconnect, screen lock, low battery, process pressure, and a second start/stop cycle. Verify the bounded recognizer `destroy()` leaves no stray recognizer while the separately authorized session service follows its own notification state.

### Privacy and network acceptance tests

- [ ] Test with airplane mode and ordinary network access. In the approved local-only configuration, no feature behavior should depend on a remote recognizer.
- [ ] Inspect the app's dependency list and network log during a voice-control session. There must be no request containing audio, transcript text, or command content.
- [ ] Review crash-reporting and analytics configurations. Disable automatic capture of recognized text, breadcrumbs containing command names, and microphone-related diagnostics unless specifically approved and disclosed.
- [ ] Review the App Privacy and Data Safety answers line by line against the final dependency list and test findings. Do not submit until the privacy policy, in-app wording, store metadata, and actual behavior agree.

## Release gate

Do not invite external preview testers until all of these are true:

- [ ] Each supported platform passes the permission, denial, revocation, and lifecycle tests above on physical devices.
- [ ] The "on-device only, no cloud fallback" assertion has a reproducible test result for every supported device/locale combination.
- [ ] There is no continuous-listening/wake-word feature built on Android's standard `SpeechRecognizer`.
- [ ] The privacy policy and store disclosures have been reviewed against the shipped binary and its SDKs.
- [ ] A qualified privacy lawyer has assessed the intended markets if voice data, transcripts, accounts, ads, analytics, recordings, or any third-party speech service are introduced. Audio captured around passengers or bystanders can create additional consent and recording-law risk that varies by jurisdiction.

## No-subscription alternatives

1. **Best first choice:** iOS 26+ `SpeechAnalyzer` on-device path plus Android's on-device recognizer only where the device confirms support. Both are platform capabilities rather than paid speech subscriptions, but support varies by device, language, and installed model.
2. **Safest universal fallback:** retain the button-first experience. It has no speech-provider account, subscription, or remote-audio risk.
3. **Later research, not a preview shortcut:** a self-hosted/on-device wake-word or speech model. This can avoid a subscription, but it introduces model-license, distribution, battery, thermal, accessibility, and device-compatibility obligations. It needs a separate legal and technical evaluation before use.

## Primary references (verified 2026-07-27)

- Apple: [SpeechAnalyzer](https://developer.apple.com/documentation/speech/speechanalyzer), [SpeechDetector](https://developer.apple.com/documentation/speech/speechdetector), [SFSpeechRecognizer authorization](https://developer.apple.com/documentation/speech/sfspeechrecognizer/requestauthorization(_:)), [on-device legacy recognition](https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition), [microphone usage description](https://developer.apple.com/documentation/BundleResources/Information-Property-List/NSMicrophoneUsageDescription), and [App Review privacy rules](https://developer.apple.com/app-store/review/guidelines/).
- Android: [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer), [runtime permissions](https://developer.android.com/training/permissions/requesting), [microphone foreground-service type](https://developer.android.com/develop/background-work/services/fgs/service-types), and [background-start restrictions](https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start).
- Stores: [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/), [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311), [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469), and [Google Play sensitive permissions policy](https://support.google.com/googleplay/android-developer/answer/17105854).

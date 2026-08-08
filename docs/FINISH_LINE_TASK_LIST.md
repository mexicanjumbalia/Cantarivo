# Cantarivo finish-line task list

Status: working task list, 2026-08-02.

## Completed in the current preview

- Android Studio project exists under `android/`.
- Capacitor sync path exists.
- Microphone permission is limited to `RECORD_AUDIO`.
- No `INTERNET` permission is present in the Android manifest.
- Local vocal-like moment gate exists in native Android code.
- One-command on-device Android speech path exists for supported devices.
- Large controls exist: Start singing session, Turn on local listening, Allow companion, Keep quiet, End session, and Silence / Stop.
- Privacy policy, Data Safety review sheet, AI vocal activation form, and GitHub support plan exist.
- Local AI vocal cue prototype is now wired behind per-session companion permission.
- A user-started Android foreground service keeps an active singing session available under other apps.
- Ongoing notification controls provide Pause/Resume and End session.
- Call/communication and competing-microphone interruptions pause local analysis and companion output without phone-state or call-log access.

## Next implementation tasks

- Build and run the latest debug APK in an Android Studio emulator.
- Test microphone and notification grant, denial, revocation, app backgrounding, and Silence / Stop.
- Check that local AI vocal cues stop for calls, audio-focus loss, End session, and Silence / Stop, then verify configured resume behavior.
- Add a bundled AI vocal cue-pack manifest and loader.
- Create a signed source-rights packet for any real cue asset before bundling it.
- Add real-device Bluetooth, headphone, and speaker tests.
- Add Android instrumentation tests for foreground-service lifecycle, notification actions, interruption pause, and automatic/manual resume.
- Add accessibility tests for the consent dialogs and large session controls.

## Release tasks

- Choose final package name, app name, versionCode, and versionName.
- Create release signing key outside the repository.
- Build Android App Bundle.
- Run Play pre-launch report.
- Complete Google Play Data Safety form from the exact release binary.
- Publish a public, non-PDF privacy policy URL.
- Publish a public support URL or support email.
- Prepare screenshots, short description, full description, app category, and content rating.
- Verify all bundled music and vocal assets have documented rights.
- Decide whether GitHub Pages is the official privacy/support host, then push only after explicit approval.

## Blocked until approval

- Pushing commits or a pull request to GitHub.
- Enabling GitHub Pages or publishing site changes.
- Adding any cloud AI provider.
- Adding analytics, accounts, ads, payments, or remote logging.
- Changing the implemented background microphone scope, service types, interruption policy, or notification controls.
- Claiming "AI singer", "singing detection", "voice clone", "song recognition", or "lyric sync" in public store copy.

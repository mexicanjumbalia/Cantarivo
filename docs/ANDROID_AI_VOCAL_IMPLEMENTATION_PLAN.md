# Android AI vocal implementation plan

Status: private-pilot implementation plan, 2026-08-01.

## Current implementation

The app now has three local companion output levels:

1. Quiet by default.
2. Wordless synthetic harmony, generated locally with Web Audio.
3. Local AI vocal cues, generated locally as a short voice-shaped, non-lyrical cue.

The AI vocal cue path is intentionally narrow. It does not use a cloud model, voice clone, artist voice, lyric generator, commercial music recognizer, or uploaded microphone audio. It plays only after the driver has started a drive, enabled listening, chosen "Allow for this drive", and enabled local AI vocal cues in Privacy & permission.

The current implementation is a prototype cue engine, not a production singing model. It gives the app an audible "someone is joining me" behavior while preserving the local-first privacy and release-review boundary.

## Android Studio tools to use

Use Android Studio's native workflow around the existing `android/` project:

- Device Manager and AVD: create a Pixel-class emulator, then test the app's foreground drive flow, permission grant, permission denial, and permission revocation.
- Run configuration: open the `android` directory, select the `app` configuration, and run it against the emulator or an owner-controlled Android phone.
- Logcat: filter by `DriverCompanion` and `com.drivercompanion.pilot` while testing `DriverCompanionVoicePlugin`, microphone availability, local meter status, and on-device command status.
- Debugger: set breakpoints in `DriverCompanionVoicePlugin.java` and `LocalVocalMomentAnalyzer.java` when validating microphone start/stop behavior.
- Android Profiler: check CPU, memory, and energy while a drive is active, while music is playing, and while local AI vocal cues fire.
- App Inspection and APK Analyzer: inspect the final debug/release build for unwanted permissions, network libraries, large bundled assets, and release-size impact.
- Layout Inspector: verify the large driver controls remain visible and usable on the emulator sizes targeted for the private pilot.

## Microphone activation path

Android owns the first runtime microphone permission dialog. The app cannot and should not bypass it. The Cantarivo path should be:

1. In-app disclosure while parked.
2. Android `RECORD_AUDIO` permission request.
3. Once granted, local listening can start automatically for later drives if the user enabled that setting.
4. A visible drive session stays active, with Silence / Stop and End drive always reachable.
5. If the OS permission is revoked, the app fails closed and returns to button controls.

The private pilot now uses a user-started Android foreground service for active-drive local analysis. It starts only from the visible app after `RECORD_AUDIO` is granted, shows an ongoing notification, pauses microphone analysis and companion output for calls or competing microphone use, and supports automatic or manual resume. It declares exact microphone and media-playback service types, requests no phone-state or call-log permission, and remains subject to physical-device, battery, distraction, Play policy, and foreground-service declaration testing before release.

## AI vocal progression

Phase 1 is now implemented: local wordless AI vocal cues generated on-device.

Phase 2 should add a bundled cue-pack adapter:

- `assets/ai-vocal-cues/manifest.json`
- original non-lyrical cue files, such as short `.ogg` or `.m4a` assets
- SHA-256 checksums
- rights records for source voice, model, output asset, composition/master ownership, and commercial permission
- app-side loader that picks a cue by pitch range, mood, and cooldown

Phase 3 can research on-device inference only after a model is selected with a model card, Android benchmark, license, weights provenance, and commercial-use rights. ONNX Runtime Mobile is a possible host, but not a model or rights solution by itself.

Phase 4, cloud AI singing, remains blocked until a provider, data flow, retention policy, subprocessors, security controls, deletion process, privacy policy, Data Safety answers, billing risk, and rights chain are approved.

## Finish-line rule

No release build should include a claim that the app detects singing, recognizes a singer, identifies music, displays lyrics, clones a voice, or imitates an artist unless that exact feature exists, is tested, and has the rights/privacy review to prove it.

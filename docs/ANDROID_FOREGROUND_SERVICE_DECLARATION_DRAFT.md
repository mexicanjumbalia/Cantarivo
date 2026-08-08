# Android foreground-service declaration draft

**Prepared:** 2026-08-02
**Status:** review aid only; not submitted to Google Play

This draft matches the current local Android build. Re-check the final Android App Bundle, manifest, screenshots, and behavior immediately before completing Play Console's **App content > Foreground service permissions** form.

## Types used

### Microphone — Background Audio Access

**Feature description**

Cantarivo is a user-started singing companion with an optional drive mode. After the user starts a drive while the activity is visible, reads the in-app microphone/background explanation, and grants `RECORD_AUDIO`, the app performs ephemeral local sound-level and possible-vocal-like signal analysis. The foreground service lets that current drive continue while navigation or another app is visible. Audio is not recorded, saved, transcribed, identified, uploaded, or shared.

**Why immediate, uninterrupted execution matters**

Deferring or stopping the service would make the explicitly started drive session lose its local sound context and require the driver to reopen parked setup. The app nevertheless yields to Android for calls and higher-priority microphone users. It either restores the same drive after the interruption or waits for manual resume, based on the visible setting.

**How the user starts and stops it**

The user starts it from the visible **Start a drive > Turn on local listening** flow. The ongoing notification shows **Pause/Resume listening** and **End drive**. The app also provides **End drive** and **Silence / Stop** controls. It is not started at boot, from a background receiver, or by a hidden retry.

### Media playback — Media Playback

**Feature description**

When the user separately chooses **Allow for this drive** and enables wordless harmony or local AI vocal cues, the same foreground service can play a short, non-lyrical, on-device synthetic cue after a limited possible-vocal-like event. It does not stream music, clone a voice, imitate an artist, or use a cloud AI provider.

**Why immediate execution matters**

The cue is time-sensitive to the local event. If Android audio focus is unavailable or a call/communication interruption occurs, the app stops or skips its output rather than competing with the call or another app.

**How the user controls it**

Companion output requires a separate per-drive choice and can be disabled through **Keep companion quiet**, the Settings toggles, **Silence / Stop**, **End drive**, or the notification's **End drive** action.

## Demonstration-video checklist

Record a fresh-install video on a physical Android device while parked or on a bench. Do not include private calls, voices, notifications, addresses, or account data.

1. Show the app closed with no microphone indicator and no Cantarivo notification.
2. Open the app, confirm adult private-pilot access, and tap **Start a drive**.
3. Show the in-app disclosure, including current-drive duration and background notification scope.
4. Grant microphone permission and, on Android 13+, choose a notification-permission outcome.
5. Show the ongoing notification and its **Pause/Resume listening** and **End drive** actions.
6. Put navigation or another non-recording app on top; show that the notification and microphone indicator remain visible.
7. Use notification **Pause**, show the microphone indicator clear, then **Resume** without repeating parked setup.
8. Demonstrate a controlled call/communication or competing-microphone interruption with no personal information visible; show Cantarivo pause and configured automatic or manual resume.
9. Return to the app and use **Silence / Stop** or notification **End drive**; show the microphone indicator and ongoing notification disappear.

## Pre-submission checks

- Confirm the final manifest declares only the foreground-service types actually used.
- Confirm there is no `INTERNET`, `READ_PHONE_STATE`, or `READ_CALL_LOG` permission unless a later approved feature materially changes the app.
- Confirm the Privacy Policy, Data Safety answers, store listing, and foreground-service declaration describe the exact final binary.
- Confirm a physical-device test covers Android notification denial, microphone denial/revocation, calls, competing microphone use, Bluetooth, screen lock, battery use, and process pressure.
- Confirm the Play Console video link is accessible to reviewers and contains no private information.

## Current official references

- Android foreground-service types: https://developer.android.com/develop/background-work/services/fgs/service-types
- Starting foreground services with while-in-use permissions: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- Android audio-focus behavior: https://developer.android.com/media/optimize/audio-focus
- Android audio-input sharing and client silencing: https://developer.android.com/media/platform/sharing-audio-input
- Google Play foreground-service declaration requirements: https://support.google.com/googleplay/android-developer/answer/13392821

This document is an engineering draft, not legal advice or a Play approval guarantee.

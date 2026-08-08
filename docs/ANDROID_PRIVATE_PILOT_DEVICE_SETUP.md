# Android Private-Pilot Device Setup

This guide installs the **private-pilot** Cantarivo build on an owner-controlled Android phone. It is not a public release and should be tested only while parked or in a bench setting.

## What this build does

- It is limited to U.S. adults 18 and older.
- The driver starts a drive, then may choose a one-time on-device command session.
- The only command phrases are **Companion join**, **Companion quiet**, **End drive**, and **Help**.
- Each listening session ends after one recognized command or seven seconds. It also stops if the app is backgrounded, paused, or the driver ends the drive.
- It stores no audio, transcript, command history, account, or voiceprint. Raw speech and transcript text are never passed into the web interface.

## Before connecting a phone

1. Use Android 12 or later, with the phone language set to a language the device supports for offline/on-device recognition.
2. On the phone, open **Settings**, search for **Build number**, and tap it seven times to enable Developer options. Confirm the device lock-screen prompt if asked.
3. In **Developer options**, turn on **USB debugging**. Connect the phone with a data-capable USB cable.
4. When the phone asks whether to allow USB debugging from this computer, check the computer fingerprint carefully and approve it only if it is your computer.
5. Keep the phone unlocked for the first install. No device identifier needs to be placed in the repository or shared publicly.

## Install and test

1. From the project folder, run `powershell -ExecutionPolicy Bypass -File .\scripts\build-android-debug.ps1`. The output is `android/app/build/outputs/apk/debug/app-debug.apk`.
2. With only the owner-controlled test phone connected, run `powershell -ExecutionPolicy Bypass -File .\scripts\install-android-debug.ps1`. It lists no serial numbers, refuses to choose between multiple phones, and requires you to type `INSTALL` before changing a device. Android may show a standard developer-install warning because this is not a Play Store build.
3. Open **Cantarivo**, confirm the U.S./18+ gate, and start a drive while parked.
4. Tap **Listen for one voice command**. Read the in-app explanation, then choose **Listen on this device**.
5. Grant the system microphone permission only if the wording matches the intended local-only test. If the phone reports that on-device recognition is unavailable, leave it unavailable and use the buttons; do not substitute a cloud recognizer.
6. Try each of the four command phrases once. Confirm the visible result, then tap **End drive**. The Android microphone indicator must disappear after the session stops.

## Required acceptance checks

- Deny the microphone permission: buttons still work; the app does not keep prompting or crash.
- Revoke microphone access in Android Settings during or between sessions: voice control stops; buttons remain available.
- Press Home or lock the phone during a voice session: the session stops; no microphone indicator remains.
- Enable airplane mode: the on-device feature either works or reports unavailable. It must not silently change to a network recognizer.
- Check the phone's Privacy Dashboard after testing: Cantarivo should appear only for the brief session you knowingly started.

Do not test while driving. Do not enable the test around passengers unless they know and agree. Record only aggregate pass/fail notes, not recordings or transcribed speech.

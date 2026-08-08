# Android private-pilot shell

This directory is the generated-web output location for the Capacitor Android app. Do not edit `www/` directly; run `pnpm mobile:build` to copy the approved static interface from the repository root.

The Android project is added after Capacitor dependencies are installed. Its bounded voice-command adapter uses only Android's on-device `SpeechRecognizer` path and fails closed to buttons when unavailable. Separately, the user-started `DriverCompanionDriveService` provides local sound analysis under other apps through an ongoing foreground-service notification. It pauses for calls and competing microphone use, never starts at boot, never receives raw audio in JavaScript, and is not an always-on speech recognizer or wake word.

# Android Studio handoff

This repository is already a transferable **Capacitor 8 Android project**, not a web-only mock-up. The Android Studio project is the [`android`](../android) directory; its source web interface remains at repository root and is copied to the native app by the sync command.

## What to transfer

Transfer the whole repository, including `android/`, `assets/`, `content/`, `docs/`, `scripts/`, `package.json`, and `pnpm-lock.yaml`. Do **not** transfer generated or machine-specific locations:

- `node_modules/`
- `mobile/www-theme-picker/` (generated web bundle)
- `android/.gradle/`, `android/build/`, and `android/app/build/`
- `android/local.properties` (local SDK location)
- signing keys, keystores, private license records, or test-device files

The repository's `.gitignore` already excludes those locations. `android/local.properties` will be recreated by Android Studio or can point to the receiving computer's Android SDK.

## Open and run it

1. Install a JDK compatible with the project (the generated Capacitor module uses Java 21), Android Studio, and Android SDK Platform 36. The current Gradle wrapper is checked in, so do not replace it during transfer.
2. In the repository root, restore the locked JavaScript dependencies with `pnpm install --frozen-lockfile`.
3. Build the web bundle and sync it into Capacitor: `pnpm android:sync`.
4. In Android Studio, select **Open** and choose the repository's `android` directory. Accept the Gradle sync, choose an emulator or an owner-controlled Android phone, and run the `app` configuration.
5. Test while parked only. The app requests the microphone only after an in-app explanation and explicit current-drive choice. If local Android recognition is unavailable, button controls remain available.

For a command-line debug build, use the repository's `scripts/build-android-debug.ps1`; it expects the project-specific SDK/JDK setup described in `docs/ANDROID_PRIVATE_PILOT_DEVICE_SETUP.md`.

## Source map

| Location | Purpose |
| --- | --- |
| `index.html`, `app.js`, `styles.css` | Driver-safe interface, consent state, and browser-preview fallback. |
| `capacitor.config.json` | Android app identifier and generated web bundle location. |
| `scripts/build-mobile.mjs` | Copies approved web assets into the generated mobile bundle. |
| `scripts/sync-android.mjs` | Runs the web bundle build, then Capacitor Android sync. |
| `android/app/src/main/java/com/drivercompanion/pilot/` | Native Android activity, short on-device command adapter, local vocal-moment gate, and active-drive foreground service. |
| `android/app/src/main/AndroidManifest.xml` | Microphone, notification, and exact microphone/media foreground-service declarations; no Internet, phone-state, or call-log permission. |
| `docs/OPEN_SOURCE_AUDIO_RESEARCH.md` | Integration decision record and future spike gate. |

## Release boundary

The current project builds a debug private-pilot APK only. Before an official store launch, create a new release signing key outside the repository, raise `versionCode`/`versionName`, create an Android App Bundle, and complete real-device, accessibility, privacy, rights, and distraction reviews. Do not commit a key, add remote analytics, allow a cloud recognizer fallback, or change microphone behavior without updating the privacy policy, Android Data Safety declaration, app listing, and test plan.

The project targets API 36 already, which satisfies the published Google Play requirement for new submissions after 2026-08-31. That is a compatibility requirement, not launch approval.

# Cantarivo AndroidX migration status

Status: **Complete and verified on August 2, 2026.**

Cantarivo is already an Android Studio Gradle project using AndroidX directly. No legacy Support Library source or dependency migration was required.

## Verified state

- `android.useAndroidX=true`
- `android.enableJetifier=false`
- AndroidX AppCompat, CoordinatorLayout, SplashScreen, test runner, JUnit extension, and Espresso dependencies
- AndroidX imports in the native foreground service and Capacitor plugin
- AndroidX `FileProvider`
- compile SDK 36, target SDK 36, Android Gradle Plugin 8.13.0, and Gradle 8.14.3
- successful debug build without Jetifier

Run `npm run check:androidx` after adding or upgrading any Android or Capacitor plugin. A future dependency that still requires `com.android.support` must be upgraded or replaced rather than hidden behind Jetifier.

The package/application ID and native class names are compatibility identifiers, not AndroidX migration markers. They remain unchanged for the current controlled preview.

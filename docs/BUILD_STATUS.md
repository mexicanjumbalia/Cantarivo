# Cantarivo build status

Updated August 7, 2026.

## Corrected product surface

- General singing-companion language is used in the visible app.
- The stationary test-use, active use, road, vehicle, and unnecessary adult-entry gate were removed from the released product surface.
- Microphone preference is remembered locally after the Android permission grant; the app does not repeatedly prompt unless the permission is revoked, cleared, or the app is reinstalled.
- A session-level companion choice and an immediate `Silence / Stop` control remain.
- Legacy Android package/action identifiers remain only for update compatibility and are not product copy.

## Verification

- `node --check app.js` passed.
- Mobile bundle generation passed.
- Android voice privacy check passed.
- AndroidX check passed.
- Audio catalog check passed.
- CC0 research catalog check passed.
- `assembleDebug` passed with Gradle 8.14.3.
- The debug APK was installed on the local `Medium_Phone` emulator after removing only the old mismatched-signature test package.

The APK is at `android/app/build/outputs/apk/debug/app-debug.apk`. The source preview and emulator screenshot are kept beside the workspace handoff by the local Codex session.

## Owner ledger

The `create_private_rights_ledger` migration is applied to Supabase. It creates the private `cantarivo_rights` schema, eleven RLS-protected tables, and the `owner_royalty_ledger` view. The `public`, `anon`, and `authenticated` roles have no schema usage or table/view select privileges. The template row is intentionally not a real clearance or payment record.

# Cantarivo 0.2.0

## Release theme

Version 0.2 moves the project from a driving/private-pilot presentation to a general singing companion and establishes the partner-ready foundation for future music recognition and artist-approved vocal experiences.

## Included

- Removed the unnecessary in-app adult gate and parked-use product flow.
- Updated visible language to “singing session,” “companion,” and local-first listening.
- Preserved explicit session consent, local microphone controls, interruption handling, and Silence / Stop behavior.
- Added a future recognition and artist-library integration contract under `integrations/recognition/`.
- Added rights-gated metadata templates for provider references, artist approval, territories, permitted uses, and synthetic-vocal restrictions.
- Added a welcoming, non-soliciting partnership letter to the repository front page.
- Added the owner-only Supabase rights and royalty ledger migration and documentation.
- Built and smoke-tested the Android debug APK on the local `Medium_Phone` emulator.

## Deliberate boundaries

Spotify, Apple Music, Speechify, labels, studios, and independent artist libraries are not connected automatically. Future integrations must use official APIs, authorized partner feeds, or user-provided exports permitted by their terms. A recognition result is only metadata; it is never proof of a license to play, imitate, train, clone, transform, or synthesize a voice.

## Validation

- JavaScript syntax check passed.
- Audio and CC0 catalog checks passed.
- AndroidX check passed.
- Android voice privacy check passed.
- `assembleDebug` passed with Gradle 8.14.3.

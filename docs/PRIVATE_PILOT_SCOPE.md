# Cantarivo Private-Pilot Scope

## What this pilot is for

This private pilot validates whether people can understand and control Cantarivo without adding a risky or misleading audio feature. It begins as a U.S.-only, 18+ private pilot. The web demo remains a browser demo; the companion Android build has a deliberately bounded on-device command session, not a general-purpose assistant. Its optional drive-mode meter also has a conservative signal gate that can flag a possible vocal-like moment after several periodic audio frames; it never identifies the user, singing, a song, or lyrics, and can be affected by other people, music, and background noise. A separate wordless-harmony control can use the gated, coarsely rounded pitch to play a brief local synthetic tone; it does not generate or imitate a human voice. The Android drive mode may continue through its visible foreground-service notification until the user pauses or ends it. The pilot also contains a five-track local CC0 audio playtest: people select a track intentionally, no track begins automatically, and playback stops when the active session ends or the companion is silenced.

The pilot keeps three actions easy to find during an active drive:

- **Let demo companion join**: grants demo-companion behavior for the current drive.
- **Keep demo companion quiet**: immediately revokes that behavior for the current drive.
- **End drive**: turns local listening off, clears the in-memory activity, and resets companion permission to **Ask before joining**.

The microphone request is separate. In the browser demo, it is local sound-level analysis only. In the Android pilot, it is requested only after the driver chooses a one-command on-device session. Both paths end with the drive and do not record, identify, retain, or upload audio.

## Explicit non-goals

The private pilot does not:

- recognize a song, artist, lyric, or real singing;
- align a backing track with a vocalist's raw vocal recording or stems;
- create, play, or imitate a singer's voice;
- provide navigation, driving instructions, or an overlay on a map application;
- use browser speech recognition, a cloud speech service, or indefinite wake-word listening;
- send microphone audio to a third party.

The “Simulate singing” action is synthetic test input for the consent flow. It is not evidence that the product can identify singing. The Android signal gate likewise is not singing detection; it is a narrow local event used only to exercise the consent path.

## Native voice-command gate

The Android pilot begins to implement this boundary without replacing the clear button controls. Voice commands remain a product priority, but they must not replace the clear button controls until a mobile build passes this gate:

1. The selected iOS and Android speech path can run on-device for the supported language and device, with no silent cloud fallback.
2. Each drive begins with a clear, parked setup choice for the listening mode and command scope.
3. The driver can immediately say or tap an unambiguous quiet/end command; the visible state changes at once.
4. Commands are limited to a small, testable set: **“Companion join,” “Companion quiet,” “End drive,”** and **“Help.”**
5. Device testing confirms that command listening does not degrade driving attention, battery life, thermal behavior, or other audio use.
6. The release includes accessibility, privacy, and platform-policy review before voice activation is presented as a driving feature.

Until those conditions are met, the browser demo stays button-first and does not use the Web Speech API.

## Deferred map companion

After public mobile launch, evaluate an optional map-adjacent companion only where platform and map-app policies allow it. It must never obstruct navigation instructions, require interaction while moving, imply support for every Android device or map app, or alter another app's route. This is a post-launch research item, not a private-pilot feature.

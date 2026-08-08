# Cantarivo Preview Scope

## What this preview is for

This controlled preview validates whether people can understand and control Cantarivo without adding a risky or misleading audio feature. It is a general singing-companion preview, subject only to the age, content, privacy, and permission disclosures required by the distribution platform and applicable law. The web demo remains a browser demo; the companion Android build has a deliberately bounded on-device command session, not a general-purpose assistant. Its optional session meter also has a conservative signal gate that can flag a possible vocal-like moment after several periodic audio frames; it never identifies the user, singing, a song, or lyrics, and can be affected by other people, music, and background noise. A separate wordless-harmony control can use the gated, coarsely rounded pitch to play a brief local synthetic tone; it does not generate or imitate a human voice. The Android session may continue through its visible foreground-service notification until the user pauses or ends it. The preview also contains a five-track local CC0 audio playtest: people select a track intentionally, no track begins automatically, and playback stops when the active session ends or the companion is silenced.

The preview keeps three actions easy to find during an active session:

- **Let demo companion join**: grants demo-companion behavior for the current session.
- **Keep demo companion quiet**: immediately revokes that behavior for the current session.
- **End session**: turns local listening off, clears the in-memory activity, and resets companion permission to **Ask before joining**.

The microphone request is separate. In the browser demo, it is local sound-level analysis only. In the Android preview, it is requested only after the user chooses a one-command on-device session. Both paths end with the session and do not record, identify, retain, or upload audio.

## Explicit non-goals

The controlled preview does not:

- recognize a song, artist, lyric, or real singing;
- align a backing track with a vocalist's raw vocal recording or stems;
- create, play, or imitate a singer's voice;
- provide navigation, active use instructions, or an overlay on a map application;
- use browser speech recognition, a cloud speech service, or indefinite wake-word listening;
- send microphone audio to a third party.

The “Simulate singing” action is synthetic test input for the consent flow. It is not evidence that the product can identify singing. The Android signal gate likewise is not singing detection; it is a narrow local event used only to exercise the consent path.

## Native voice-command gate

The Android preview begins to implement this boundary without replacing the clear button controls. Voice commands remain a product priority, but they must not replace the clear button controls until a mobile build passes this gate:

1. The selected iOS and Android speech path can run on-device for the supported language and device, with no silent cloud fallback.
2. Each session begins with a clear, stationary test setup choice for the listening mode and command scope.
3. The user can immediately say or tap an unambiguous quiet/end command; the visible state changes at once.
4. Commands are limited to a small, testable set: **“Companion join,” “Companion quiet,” “End session,”** and **“Help.”**
5. Device testing confirms that command listening does not degrade active use attention, battery life, thermal behavior, or other audio use.
6. The release includes accessibility, privacy, and platform-policy review before voice activation is presented as a active use feature.

Until those conditions are met, the browser demo stays button-first and does not use the Web Speech API.

## Deferred map companion

After public mobile launch, evaluate an optional map-adjacent companion only where platform and map-app policies allow it. It must never obstruct navigation instructions, require interaction while moving, imply support for every Android device or map app, or alter another app's route. This is a post-launch research item, not a preview feature.

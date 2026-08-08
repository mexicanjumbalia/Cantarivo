# Local audio research and integration decision record

**Reviewed:** 2026-07-31. This is an engineering decision record, not legal advice. Every dependency and every model/asset must be rechecked at the exact version and commit shipped.

## Current implementation

The Android private pilot now includes `LocalVocalMomentAnalyzer`, a small in-house, dependency-free signal gate. It reads a live 16 kHz microphone buffer only while the visible app has current-drive microphone consent, combines sound level with short-lag periodicity, and emits a single `possible_vocal_like_moment` event only after several sustained frames.

This is intentionally **not** represented as singing detection. It cannot reliably distinguish the driver from passengers, road noise, a vehicle speaker, or other music. It does not identify people, songs, lyrics, or keys; it does not separate vocals from music; and it does not retain samples. When the optional wordless-harmony setting is enabled, the native layer sends only the moment event plus a bounded, coarsely rounded pitch to the local interface to tune a short synthetic tone; neither value is stored or transmitted. The tone is not a human, artist, or cloned voice. A production feature must validate a replacement against representative parked and passenger-supervised scenarios before making any driver-facing claim.

The relevant boundary is [DriverCompanionVoicePlugin.java](../android/app/src/main/java/com/drivercompanion/pilot/DriverCompanionVoicePlugin.java): it owns `AudioRecord`, releases it on stop/pause/destroy, and exposes only an ephemeral level plus the narrow event. The web layer retains the explicit per-drive allow/quiet choice; it never starts a voice output itself.

## Vetted options

| Need | Candidate | License / Android path | Decision |
| --- | --- | --- | --- |
| Voice activity detection | [Silero VAD](https://github.com/snakers4/silero-vad) | MIT; ONNX models support streaming inference. | Preferred model candidate for a later, strictly local spike. Re-verify the specific model artifact and source before packaging. VAD means speech/voice activity, not singing or driver identity. |
| Offline Android VAD and local speech/TTS tools | [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | Apache-2.0; its project documents Android builds and VAD examples. | Preferred integration host if a vetted VAD model is selected. Do not add ASR/TTS just because the runtime supports it; each model needs its own license, security, size, privacy, and battery review. |
| Model runtime | [ONNX Runtime for Android](https://onnxruntime.ai/docs/build/android.html) | MIT; Android AAR and NNAPI options documented. | Use only if the VAD spike needs it. Release builds using ONNX Runtime and R8 need the documented keep rule. Pin the artifact and checksum; do not download models at run time without an explicit setup choice. |
| Pitch / onset / beat features | [audioFlux](https://github.com/libAudioFlux/audioFlux) | MIT; the project documents Android support and includes YIN-family pitch and onset features. | Candidate for an NDK/JNI feasibility spike. Its latest listed release is from 2024, so do not treat it as a drop-in maintained Android SDK. Pin a reviewed commit and benchmark APK size, battery, thermals, latency, and licenses before adoption. |
| Local time/pitch transformation of rights-cleared audio | [Sonic](https://github.com/waywardgeek/sonic) | Apache-2.0 Java/C implementation. | Suitable only for speeding/slowing or pitch-adjusting app-owned audio. It does not create a singing voice or clear any music rights. |
| Timed lyrics | No general-purpose third-party source selected | Lyrics are separately copyrighted content. | Ship timing only with app-owned/CC0 or otherwise expressly licensed content. Prefer a local package with beat/phrase offsets and no lyric text unless those text rights are documented. |
| Synthetic sing-along / harmonization | No production candidate selected | Tool code and model/voice rights are separate. | Do not add a synthetic singer or a voice-conversion system to the pilot. It would need a device-feasible engine, explicit performer/voice authorization, rights-cleared backing material, a separate output consent, and a safety study. |

## Explicitly not selected

- [TarsosDSP](https://github.com/JorenSix/TarsosDSP) has useful Java pitch-processing examples, but is GPL-3.0.
- [aubio](https://github.com/aubio/aubio) is GPL-3.0.
- [Essentia](https://github.com/MTG/essentia) and Essentia.js are AGPL-3.0.
- [RVC](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI) is MIT-licensed code, but is a Python/desktop-oriented voice-conversion project, not an Android deployment path. Its base models, training data, and every target voice still require independent review and affirmative performer authorization. It is out of scope.

These exclusions are intentional: the app is source-available under PolyForm Noncommercial, while the requested third-party candidates should avoid additional reciprocal obligations and must remain commercially reviewable for a future official launch.

## Recommended production architecture

```text
explicit parked setup + microphone consent
  -> visible, foreground AudioRecord session
  -> frame buffer (never stored)
  -> VAD (Silero/sherpa-onnx spike) + signal-quality gate
  -> optional local pitch/onset feature extractor
  -> conservative vocal-moment policy
  -> only if explicit per-drive output consent is already active
  -> rights-cleared, local CompanionOutput
```

The policy gate must fail closed: no output on uncertain input; no modal prompt while moving; and immediate stop on **Keep quiet**, **End drive**, activity pause, audio interruption, permission revocation, or route loss. It must emit only aggregated test telemetry if a future, separately disclosed research study obtains permission; the present pilot retains none.

For lyric timing, use a versioned local manifest such as:

```json
{
  "trackId": "rights-cleared-track-id",
  "audioSha256": "...",
  "startOffsetMs": 0,
  "beatsMs": [0, 500, 1000],
  "phrases": [{ "startMs": 500, "endMs": 1800, "cueId": "phrase-001" }]
}
```

`cueId` can select a pre-approved non-lyrical cue. Do not add lyric strings, commercial audio, karaoke tracks, stems, an artist imitation, a celebrity/performer voice, or streamed music without documented rights for the composition, master, performer, model, distribution, territory, term, edits, and derivative/AI use.

## Required spike gate before enabling a real companion

1. Pin source commit, dependency/model versions, SHA-256 values, SPDX identifiers, notices, and native ABI list in a software bill of materials.
2. Test offline after model installation, without `INTERNET` permission, and inspect network traffic. An unavailable local model must leave the feature unavailable rather than fall back to cloud processing.
3. Measure precision/recall separately for silence, road noise, passenger speech, Bluetooth calls, the app's own authorized playback, and driver singing. Report aggregated outcomes; do not keep recordings by default.
4. Measure battery, thermal, route-change, Bluetooth, interruption, process-death, and permission-revocation behavior on a representative device set.
5. Add an independently reviewable, pre-drive output-consent screen. **Ask first** must remain silent during the drive, not open a distracting prompt.
6. Run accessibility and distraction testing with legal/safety review. Do not market a feature as hands-free safe, always listening, or capable of detecting the driver singing unless evidence supports the exact wording.

## Source verification notes

- Android says ordinary `SpeechRecognizer` implementations may stream audio remotely and are not intended for continuous recognition; the pilot therefore uses only the explicit on-device factory for a short command session. See [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer.html).
- Android describes microphone access as sensitive and protected by runtime permission. See [Permissions on Android](https://developer.android.com/guide/topics/permissions/overview).
- For a new Google Play submission after 2026-08-31, Android 16 / API 36 is required; the current project already targets API 36. See [Google Play target API requirement](https://developer.android.com/google/play/requirements/target-sdk).

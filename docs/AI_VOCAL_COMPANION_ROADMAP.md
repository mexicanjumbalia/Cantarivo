# AI vocal companion roadmap

**Status:** local prototype active, 2026-08-01. The current Android controlled preview has local wordless AI vocal cue synthesis only. No voice clone, cloud audio provider, lyric generator, artist imitation, or singer model is in the current build.

## Product decision

The first viable AI-vocal experiment is **not real-time voice conversion**. The current app starts with a local, wordless, voice-shaped cue engine. The next upgrade is a small, local package of original, rights-cleared, pre-rendered wordless AI vocal cues. The app would choose only among those fixed cues after an explicit current-session activation. It would neither upload a user's microphone audio nor imitate a person.

This provides an audible vocal companion without needing to identify a song, capture lyrics, or ship an always-listening/cloud pipeline. It is a limited preview feature, not a claim that the app understands singing or can sing along with commercial music.

## Candidate paths

| Path | Privacy / Android fit | Rights and product risk | Decision |
| --- | --- | --- | --- |
| Current wordless synthetic tone | Fully local, already implemented | Not a singer | Keep as safety baseline |
| Current local AI vocal cue engine | Fully local, already implemented | Prototype only; no lyrics, human voice, or artist imitation | Use for preview testing |
| Original, pre-rendered AI vocal cue pack | Fully local at runtime; can reuse the present per-session permission gate and interruption-safe foreground service | Requires documented rights for the model, training/voice source, output assets, and any music/composition | **Recommended first prototype** |
| On-device real-time singing synthesis | Could be local, but no vetted mobile-ready singer/model exists for this project | Large model/latency/thermal risk; requires original voicebank and specialized ML engineering | Research spike only |
| Cloud AI singer | Sends data off-device unless it accepts no user audio; changes Data Safety and privacy commitments | Provider terms, retention, security, billing, network reliability, and music/voice rights must be reviewed | Not approved |
| RVC / voice conversion | The project is Python/desktop-oriented, not an Android deployment path | Code is MIT, but the target voice, base models, and training data still need authorization; high impersonation risk | Excluded |

## Research record

- [NNSVS](https://github.com/nnsvs/nnsvs) is an MIT-licensed singing-voice-synthesis research toolkit. Its own documentation describes it as research-oriented and its installation guidance assumes a training environment; it is a candidate for creating original cue assets off-device, not an Android SDK. It does not include a universally licensable production voice.
- [ONNX Runtime Mobile](https://onnxruntime.ai/docs/tutorials/mobile/) supports Android Java/C/C++ for models in ONNX format. It is a possible inference host only after a separately licensed, size-bounded, Android-tested model is selected.
- [RVC](https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI) uses an MIT license for its code, but its repository targets desktop/Python workflows. A permissive code license never grants rights to a target singer's voice, model weights, training data, or commercial music.

## Required gated plan

1. **Name the feature honestly.** Use “local AI vocal cues” or similar—not “celebrity voice,” “voice clone,” “AI artist,” or “sings your song.”
2. **Acquire original rights.** Use a consenting vocalist or synthetic dataset with written authorization. Document the model license, training-data rights, cue ownership, territory, term, derivative/AI-use authority, credit, takedown process, and all music rights. Do not train on scraped or recognizable voices.
3. **Produce a fixed preview pack.** Create a small set of original non-lyrical cues off-device. Record source/model version, output SHA-256, content description, age suitability, and license in a manifest. Review each cue for resemblance/impersonation risk.
4. **Integrate locally.** Bundle cues with the app; do not add `INTERNET`, cloud SDKs, analytics, accounts, or background microphone service. Require explicit current-session activation and immediate Quiet/Stop controls.
5. **Validate in a stationary controlled test environment.** Test audio focus, Bluetooth, phone calls, backgrounding, permission revocation, battery/thermal use, distraction, and false signal triggers. Use no retained recordings by default.
6. **Review disclosures.** Check the in-app activation screen, [privacy policy](../privacy.html), [Data Safety review](../data-safety.html), and `docs/GITHUB_PAGES_PRIVACY_SUPPORT_PLAN.md` against the exact release binary.
7. **Only then consider a model.** For real-time on-device inference, create a separate spike with a pinned model, ABI support, benchmark, model card, software bill of materials, full rights chain, and external safety review. Fail closed if the model is unavailable.

## Cloud non-negotiables

A cloud provider cannot be enabled until all of the following are true:

- the provider, endpoint, SDK, exact audio/text/identifier fields, model region, retention, subprocessors, security controls, and deletion process are documented;
- the feature displays a prominent, plain-language disclosure immediately before activation that names the third party and says what leaves the device;
- the local-only alternative remains usable and declining has no penalty;
- the app's privacy policy and Google Play Data Safety declaration are amended to match the binary; and
- the publisher and legal reviewer approve the data flow and performer/music rights.

Google Play places responsibility for third-party SDK data handling on the app developer, and requires an in-app privacy policy plus accurate Data Safety answers. See [SDK guidance](https://support.google.com/googleplay/android-developer/answer/13326895?hl=en), [prominent disclosure guidance](https://support.google.com/googleplay/android-developer/answer/11150561?hl=en), and [Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

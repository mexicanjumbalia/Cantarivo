# Cantarivo

> **Their voices sing with you.**

## A note to future creative partners

Cantarivo is being built around a simple, generous idea: the distance between a fan and the music they love should feel smaller, more human, and more full of possibility. Every singer, producer, songwriter, publisher, recording studio, label, and technology partner brings a distinct piece of that possibility. Our aim is to honor that work while creating new, clearly consented ways for people to sing alongside the voices and musical worlds that move them.

The project welcomes conversations with independent artists and established creative organizations alike. We are designing a rights-first home for artist-approved vocal experiences, transparent attribution, responsible metadata, and meaningful control over how a voice or recording may be used. The opportunity is not to replace the concert, the studio, or the artist—it is to extend the feeling of connection between those moments, with care for the people and craft behind every sound.

If Cantarivo’s direction resonates with your studio, catalog, voice, or creative practice, we would be glad to hear what a thoughtful collaboration could look like. There is no required format or size of partner; the strongest future of singing companions will be shaped by many kinds of artists and builders moving together.

## Version 0.2

This release establishes the corrected general singing-companion experience and the extension points for future rights-cleared recognition and artist-library integrations. The integration layer is intentionally metadata-first: it may resolve a user-authorized track or asset reference, but it does not scrape, copy, download, or redistribute music, lyrics, recordings, stems, or voices.

Cantarivo is a local-first, privacy-minded singing companion for moments when everyday listening becomes a chance to sing. It lets people choose whether a companion may join a vocal moment—without collecting audio, or treating consent as a setting buried three screens deep.


This repository is a source-available **singing companion preview**. It includes five locally bundled, manually selected **CC0** playtest tracks; it contains no commercial-catalog music, vocal models, music-recognition service, lyrics display, or song-identification feature. The Android preview has a temporary local sound-level and heuristic vocal-like-moment gate, not a real singing classifier. With a separate per-session choice, it can play a brief local **wordless synthetic harmony tone**; it is not a human, artist, or cloned voice.

## The open-content promise

Cantarivo will accept only audio assets that are explicitly dedicated under **CC0 1.0**. This is the most conservative practical route for a free, public project:

- no music that is merely described as “royalty free”;
- no commercial-catalog songs, lyrics, karaoke tracks, or cover recordings;
- no CC-BY-NC, CC-BY-ND, CC-BY-SA, or other conditional audio licenses;
- no asset is shipped until its composition and recording rights are both documented as CC0.

The release-ready catalog remains empty by design. The preview catalog contains five local CC0 playtest tracks, each with a source record and checksum. Any future track must be listed in [`content/music-catalog.json`](content/music-catalog.json), pass the automated guard, and be recorded in [`NOTICE.md`](NOTICE.md). Read the full [Open Content Policy](docs/OPEN_CONTENT_POLICY.md) before proposing an asset.

## Explore the live site

Cantarivo is available directly in a modern browser at the project's current [GitHub Pages address](https://mexicanjumbalia.github.io/driver-companion/). No download, local setup, or special address is needed.

## Optional local preview

This section is only for someone working on the project itself. Run:

```bash
npm start
```

Then open [http://localhost:4184](http://localhost:4184) in a browser. This temporary preview runs only on the same computer that starts it. It is not public and does not point to anyone else’s computer. Everyone else should use the live site above.

## What it demonstrates

- A simple singing-session setup with optional automatic local listening after Android permission is granted.
- Explicit, per-session microphone consent for local sound-level analysis.
- A plain-language companion choice: **Ask me first**, **Allow for this session**, or **Keep companion quiet**.
- Large manual controls to allow, silence, or end a session immediately.
- A synthetic “Simulate singing” control to test the permission flow without pretending to identify real singing, music, lyrics, artists, or songs.

## Singing companion direction

The preview is deliberately **button-first**: anyone can plainly allow the demo companion, keep it quiet, or end a singing session. Every companion decision expires when the session ends. The browser demo remains foreground-only and performs local sound-level analysis only after a clear, current-session choice. It does not record, transcribe, identify, retain, or upload audio. See the [scope document](docs/SINGING_COMPANION_SCOPE.md), [audio research and integration record](docs/OPEN_SOURCE_AUDIO_RESEARCH.md), and the [privacy policy](privacy.html).

## Future recognition and artist-library integrations

The [`integrations/recognition`](integrations/recognition/) folder is the controlled extension point for future song recognition, metadata resolution, artist-approved libraries, and voice-companion adapters. It includes provider contracts, an asset metadata schema, and a rights checklist. A future adapter may work with an official provider API or a direct partner feed from services such as Spotify, Apple Music, Speechify, a label, a studio, or an independent artist; it must not scrape consumer applications or infer permission from a match alone. No provider is integrated in version 0.2, and no protected catalog audio is bundled.

## Browser preview and current updates

Use the public GitHub Pages site for the current Cantarivo preview, privacy materials, and project updates. To run the same browser experience locally, start a static server with `npm start` and open the displayed local URL. GitHub Pages is built from an explicit allowlist into `public-site/`; the deployment does not publish the repository root or development files.

## Privacy and safety

Microphone audio is not recorded, transcribed, stored, or sent over the network by this demo. The five CC0 playtest tracks are static local app assets; playback produces no analytics and uses the device’s existing speaker or Bluetooth route. The companion’s default is quiet until the user chooses otherwise.

This project is a design and engineering preview, not legal advice.

## Publishing as a free GitHub Pages project

The repository includes a GitHub Actions workflow ready to deploy this static demo to GitHub Pages. GitHub Pages provides HTTPS for public repositories, which is needed for browser microphone access. The workflow builds an explicit allowlist into `public-site/`; it does not upload the repository root, Android sources, rights schema, or development documentation. Keep it a static, client-side demo: GitHub Pages is not a free SaaS host for accounts, payments, or server-side audio processing.

## Project support

[`donate.html`](donate.html) is a transparent, optional project-support page. The repository's native GitHub Sponsor button and the page's support button both open the project's [GitHub Sponsors profile](https://github.com/sponsors/mexicanjumbalia) in a new tab; Cantarivo does not collect payment information. Read the [Donations and Sponsorship policy](docs/DONATIONS_AND_SPONSORSHIP.md) before changing the funding setup. For project support, licensing, or collaboration inquiries, email [drivercompanionsuppteam1@gmail.com](mailto:drivercompanionsuppteam1@gmail.com).

## Development checks

```bash
npm run check:catalog
node scripts/build-public-site.mjs
node scripts/scan-secrets.mjs
```

The check fails if a catalog entry is missing its provenance or is not CC0 for both the musical composition and the sound recording.

The release workflow runs browser, catalog, public-site, tracked-file secret, and dependency-audit checks. Read [Main-branch protection](docs/BRANCH_PROTECTION.md) before merging a release.

## Project map

```text
Cantarivo/
  app.js                         # Local microphone meter and synthetic demo flow
  index.html                     # Accessible singing companion interface and consent dialogs
  privacy.html                   # Public privacy policy for the demo and approved future voice design
  styles.css                     # Responsive visual design
  content/music-catalog.json     # Release-ready catalog plus the bounded CC0 preview record
  docs/OPEN_CONTENT_POLICY.md    # Asset intake and licensing rules
  docs/MUSIC_COLLABORATION_FRAMEWORK.md # Partner-audio rights checklist
  docs/PRODUCER_VOCALIST_TERM_SHEET_TEMPLATE.md # Nonbinding partner discussion template
  docs/DONATIONS_AND_SPONSORSHIP.md # Safe funding activation policy
  docs/PROJECT_RIGHTS_AND_COMMERCIAL_LICENSING.md # Code/IP policy
  docs/SINGING_COMPANION_SCOPE.md      # Scope for session and native voice-command boundaries
  docs/NATIVE_SPEECH_PRIVACY_AND_DEVICE_TEST_PLAN.md # Native speech privacy and physical-device test checklist
  docs/OPEN_SOURCE_AUDIO_RESEARCH.md # Verified local-audio options and integration gates
  integrations/recognition/         # Future metadata/recognition adapters and partner asset contracts
  docs/PRIVACY_LEGAL_REVIEW_NOTES.md # Federal/state privacy issue-spotting and release-review gate
  scripts/validate-catalog.mjs   # Catalog compliance check
  .github/workflows/             # License guard and GitHub Pages deployment
  NOTICE.md                      # Third-party music and attribution record
```

## License and commercial use

The current source code is available under the [PolyForm Noncommercial License 1.0.0](LICENSE). It is source-available, but it is **not** OSI open source because commercial use is not granted. Commercial rights, if they are ever offered, require a separately signed agreement; see [Commercial Licensing](COMMERCIAL-LICENSE.md) and the [project rights policy](docs/PROJECT_RIGHTS_AND_COMMERCIAL_LICENSING.md).

The repository's initial public version carried the MIT License. That earlier grant remains relevant to copies that were distributed with it; the present policy applies prospectively to later releases. Audio assets, if any are ever added, retain the individual rights status documented in the catalog and notice files; they are never silently relicensed as source code.

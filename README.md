# Driver Companion

> **Your road. Your voice. Your choice.**

Driver Companion is a local-first, privacy-minded singing co-pilot for the moments when a traffic light becomes a spotlight. It lets drivers choose whether a companion may join a vocal moment—without collecting audio, identifying songs, or treating consent as a setting buried three screens deep.

This repository is an open-source **concept demo**. It intentionally contains **no third-party music, lyrics, backing tracks, vocal models, or music-recognition service**. The included demo uses a synthetic vocal moment and a local microphone-level meter only.

## The open-content promise

Driver Companion will accept only audio assets that are explicitly dedicated under **CC0 1.0**. This is the most conservative practical route for a free, public project:

- no music that is merely described as “royalty free”;
- no commercial-catalog songs, lyrics, karaoke tracks, or cover recordings;
- no CC-BY-NC, CC-BY-ND, CC-BY-SA, or other conditional audio licenses;
- no asset is shipped until its composition and recording rights are both documented as CC0.

The catalog is currently empty by design. Any future track must be listed in [`content/music-catalog.json`](content/music-catalog.json), pass the automated guard, and be recorded in [`NOTICE.md`](NOTICE.md). Read the full [Open Content Policy](docs/OPEN_CONTENT_POLICY.md) before proposing an asset.

## Run locally

Use a current browser. Microphone access requires `localhost` or HTTPS.

```bash
npm start
```

Or, if Python is installed:

```bash
py -m http.server 4184
```

Open [http://localhost:4184](http://localhost:4184). Port **4184** keeps Driver Companion separate from another local app on port 4173.

## What it demonstrates

- A parked-first, low-distraction drive setup.
- Explicit, per-drive microphone consent for local sound-level analysis.
- A plain-language companion choice: **Ask me first**, **Allow for this drive**, or **Keep companion quiet**.
- Large manual controls to allow, silence, or end a drive immediately.
- A synthetic “Simulate singing” control to test the permission flow without pretending to identify real singing, music, lyrics, artists, or songs.

## Privacy and safety

Audio is not recorded, transcribed, stored, or sent over the network by this demo. Set up while parked. The companion’s safe default is quiet until the driver chooses otherwise.

This project is a design and engineering demo—not a safety-certified in-vehicle system or legal advice. A production release needs distraction testing, accessibility review, jurisdiction-specific privacy review, and rights clearance for every actual asset or service.

## Publishing as a free GitHub Pages project

The repository includes a GitHub Actions workflow ready to deploy this static demo to GitHub Pages. GitHub Pages provides HTTPS for public repositories, which is needed for browser microphone access. Keep it a static, client-side demo: GitHub Pages is not a free SaaS host for accounts, payments, or server-side audio processing.

## Project support

[`donate.html`](donate.html) is a transparent, optional project-support page. It accepts no payment information and has no active donation link by default. The repository's native GitHub Sponsor button points to this page—not to a payment provider. When a verified HTTPS funding destination is chosen, set `url` and `providerName` in `donation-config.js`.

## Development checks

```bash
npm run check:catalog
```

The check fails if a catalog entry is missing its provenance or is not CC0 for both the musical composition and the sound recording.

## Project map

```text
Driver Companion/
  app.js                         # Local microphone meter and synthetic demo flow
  index.html                     # Accessible driver interface and consent dialogs
  styles.css                     # Responsive visual design
  content/music-catalog.json     # CC0-only catalog; empty until an asset is verified
  docs/OPEN_CONTENT_POLICY.md    # Asset intake and licensing rules
  scripts/validate-catalog.mjs   # Catalog compliance check
  .github/workflows/             # License guard and GitHub Pages deployment
  NOTICE.md                      # Third-party music and attribution record
```

## License

The source code is available under the [MIT License](LICENSE). Audio assets, if any are ever added, retain the individual license documented in the catalog and notice files; they are never silently relicensed as MIT.

# Open Content Policy

**Version 1.1 — 2026-07-27**

## Purpose

Cantarivo is a public, source-available project. This policy prevents a "free" catalog from becoming an undocumented rights risk.

## Hard rule: CC0 only

Only assets that are explicitly available under the Creative Commons CC0 1.0 Universal Public Domain Dedication may be included. The catalog validator enforces this exact identifier for both:

1. the underlying musical composition, including lyrics; and
2. the specific sound recording, performance, stems, loops, or samples.

`CC BY`, `CC BY-SA`, `CC BY-ND`, all `NC` licenses, platform-only licenses, "royalty-free" labels, and unverified public-domain claims are not accepted in this repository. This is deliberately stricter than necessary; it keeps a community-maintained project easy to audit.

## No music is assumed to be safe

Music metadata, a public streaming link, or a creator-uploaded label alone does not prove that the composition and recording can be redistributed. A song and its recording are separate works. Do not include popular songs, covers, lyrics, karaoke tracks, or music captured from another product. Do not submit a performer's vocal, a voice model, or an AI voice imitation unless it separately meets this policy and its use has been documented in writing.

## Catalog states

Cantarivo keeps research, clearance work, and shipped audio deliberately separate.

1. `documented-candidate` — a public source record exists in `content/music-credits.json`. It proves only that an individual source page displayed CC0 when retrieved. It is **not** audio in the app and it is not legal clearance.
2. `pre-import review` — a local-only record exists under `private-license-records/`. The record must capture the source-page evidence, original download address, and the remaining checks. This directory is ignored by Git and must never be pushed.
3. `private-pilot-playtest` — a small CC0 track may be bundled only for a named private-pilot test after its source evidence and file checksum are in the local ledger. The app must keep playback manual, local, and free of lyric display, song recognition, playback analytics, or automated starts. This is not a public-release clearance.
4. `bundled` — an audio file may enter a public product release only after every blocking check below is completed, the file checksum is added to the private record, a second maintainer has reviewed it, and the public catalog, credits, and notice have been updated.

The initial 100-record research catalog is generated with `npm run catalog:research`. It is intentionally a research list, not an in-app music library.

## Asset intake checklist

Before adding a file, a maintainer must:

1. Verify the individual creator/rightsholder source page displays a CC0 dedication and save its URL and retrieval date.
2. Create or update the local-only pre-import record before downloading any audio into an app directory.
3. Confirm that the dedication covers both composition and recording, plus every sample, stem, performance, and lyric.
4. Decide whether the file contains lyrics. If it does, retain a separate CC0 rights record for the lyric and any performer/voice rights; otherwise, exclude it from the private pilot.
5. Download the candidate only into a non-app staging location, calculate its SHA-256 checksum, and attach that checksum to the local record.
6. Have a second maintainer verify the source page, license, checksum, and no-lyrics/no-third-party-samples finding.
7. For a private-pilot playtest only, the source evidence, local checksum, and private-pilot limitations must be recorded in `content/music-catalog.json` and `NOTICE.md` before the audio enters `assets/music/private-pilot/`.
8. For any public release, complete the full release review, then add a `bundled` entry to `content/music-catalog.json`, add a matching public credit to `NOTICE.md`, and place the audio in the appropriate app asset directory.
9. Run `npm run check:catalog` before any commit or release.

## Credits and license data

`content/music-credits.json` is the future data source for an in-app “Music credits and licenses” page. It contains only title, creator, source, retrieval date, and CC0 evidence. The page must visibly distinguish **research candidates**, **private-pilot playtest tracks**, and any future **public-release tracks**.

The private ledger holds additional source-page hashes, original download addresses, and unresolved checks. Do not place a personal name, home address, payment details, or contributor contact details in it. Do not publish it.

## Bundled catalog entry shape

```json
{
  "id": "sunrise-loop-001",
  "title": "Sunrise Loop",
  "creator": "Example Creator",
  "sourceUrl": "https://example.org/sunrise-loop",
  "retrievedAt": "2026-07-26",
  "compositionLicense": "CC0-1.0",
  "recordingLicense": "CC0-1.0",
  "containsLyrics": false,
  "containsThirdPartySamples": false,
  "rightsStatement": "Creator dedicated both composition and recording to CC0 1.0."
}
```

## Useful research sources - not blanket permissions

- [MusicBrainz core data](https://musicbrainz.org/doc/About/Data_License) is CC0 metadata, not an audio catalog.
- [Creative Commons CC0](https://creativecommons.org/public-domain/cc0/) explains the public-domain dedication used by this project.
- [Wikimedia Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en) explains why individual files still need verification.
- [U.S. Copyright Office guidance](https://www.copyright.gov/register/pa-sr.html) explains the separate rights in a musical composition and sound recording.

This policy is an engineering safeguard, not legal advice. Consult qualified counsel before a commercial launch, particularly if the project gains users, distributes a native app, or introduces music recognition, lyric display, vocal synthesis, or externally supplied audio.

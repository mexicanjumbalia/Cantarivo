# Open Content Policy

## Purpose

Driver Companion is a public, open-source project. This policy prevents a “free” catalog from becoming an undocumented rights risk.

## Hard rule: CC0 only

Only assets that are explicitly available under the Creative Commons CC0 1.0 Universal Public Domain Dedication may be included. The catalog validator enforces this exact identifier for both:

1. the underlying musical composition, including lyrics; and
2. the specific sound recording, performance, stems, loops, or samples.

`CC BY`, `CC BY-SA`, `CC BY-ND`, all `NC` licenses, platform-only licenses, “royalty-free” labels, and unverified public-domain claims are not accepted in this repository. This is deliberately stricter than necessary; it keeps a community-maintained project easy to audit.

## No music is assumed to be safe

Music metadata, a public streaming link, or a creator-uploaded label alone does not prove that the composition and recording can be redistributed. A song and its recording are separate works. Do not include popular songs, covers, lyrics, karaoke tracks, or music captured from another product.

## Asset intake checklist

Before adding a file, a maintainer must:

1. Verify the creator/rightsholder’s CC0 dedication from a durable source.
2. Confirm that the dedication covers both composition and recording, plus every sample, stem, and lyric.
3. Record the source URL, retrieval date, creator, and rights statement in `content/music-catalog.json`.
4. Add a matching entry to `NOTICE.md`.
5. Run `npm run check:catalog`.
6. Preserve a human-readable copy or screenshot of the original license assertion outside the public source tree when feasible.

## Future catalog entry shape

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

## Useful research sources—not blanket permissions

- [MusicBrainz core data](https://musicbrainz.org/doc/About/Data_License) is CC0 metadata, not an audio catalog.
- [Creative Commons CC0](https://creativecommons.org/public-domain/cc0/) explains the public-domain dedication used by this project.
- [Wikimedia Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/en) explains why individual files still need verification.
- [U.S. Copyright Office guidance](https://www.copyright.gov/register/pa-sr.html) explains the separate rights in a musical composition and sound recording.

This policy is an engineering safeguard, not legal advice. Consult qualified counsel before a commercial launch, particularly if the project gains users, distributes a native app, or introduces music recognition, lyric display, vocal synthesis, or externally supplied audio.

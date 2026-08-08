# Recognition and artist-library integrations

This folder is the future integration boundary for song recognition, provider metadata, artist-approved vocal assets, and local companion cues.

## Design rule

Recognition resolves an authorized reference; it does not create rights. The app may receive a provider track ID, ISRC/ISWC, title, artist, album, territory, or playback context through an official API or a direct partner feed. It must not scrape Spotify, Apple Music, Speechify, label portals, or consumer apps; download protected audio; display lyrics without a license; or synthesize a recognizable artist voice without documented permission.

## Planned adapter stages

1. Resolve metadata through an official provider API or partner export.
2. Normalize IDs into the Cantarivo asset record.
3. Verify master, composition, performer, publisher, territory, and use rights.
4. Check whether the license permits local playback, interactive response, vocal stems, transformation, training, or synthetic vocals.
5. Activate only the minimum experience cleared for the current user, territory, and reporting period.
6. Record attribution, qualifying uses, revenue inputs, and removal/termination instructions in the owner ledger.

## Provider posture

The `providers.json` file is a planning registry, not an active integration list. Each provider needs a separate technical review, terms review, privacy review, rate-limit plan, and rights agreement. The app should use OAuth or a partner credential on a protected server when a provider requires it; no secret belongs in the Android app or browser bundle.

## Artist and studio participation

The `artist-library.schema.json` file describes the minimum metadata and approval record for an artist, studio, label, publisher, producer, or independent rights holder. It supports approved voice components such as harmonies, hooks, ad-libs, stems, spoken phrases, call-and-response, or original vocal performances without assuming that any such element is permitted merely because it can be recognized.

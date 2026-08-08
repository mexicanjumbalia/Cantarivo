import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const retrievedAt = new Date().toISOString().slice(0, 10);
const cc0Url = "https://creativecommons.org/publicdomain/zero/1.0/";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicCreditsPath = resolve(projectRoot, "content", "music-credits.json");
const privateLedgerPath = resolve(projectRoot, "private-license-records", "cc0-track-research-ledger.json");

// These sources are only used to create research records. No audio is downloaded
// or bundled by this script.
const sources = [
  ["Loyalty_Freak_Music", "TO_CHILL_AND_STAY_AWAKE", 99],
  ["Loyalty_Freak_Music", "ROLLER_DISCO_DANCE_DANCE", 99],
  ["Loyalty_Freak_Music", "INSTRUMENTAL_RB_BEATS_TO_SING_OR_RAP_ON", 99],
  ["Loyalty_Freak_Music", "WITCHY_BATTY_SPOOKY_HALLOWEEN_IN_SEPTEMBER_", 99],
  ["Loyalty_Freak_Music", "MELODIES_WITH_A_BEAT", 99],
  ["Loyalty_Freak_Music", "HYPER_METAL_", 99],
  ["Loyalty_Freak_Music", "MINIMAL_AMBIENT_BOUNCE", 99],
  ["Loyalty_Freak_Music", "POSITIVE_ATTITUDE_", 99],
  ["Loyalty_Freak_Music", "ROBOT_DANCE_", 99],
  ["Loyalty_Freak_Music", "singles", 99, false],
  ["Komiku", "Its_time_for_adventure_", 7],
];

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { "user-agent": "DriverCompanionCatalogResearch/1.0 (rights documentation only)" },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const slug = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const trackMetadata = (html) => [...html.matchAll(/data-track-info='([^']+)'/g)]
  .map((match) => JSON.parse(match[1]));

const hasCc0 = (html) => html.includes("CC0 1.0 Universal") && html.includes(cc0Url);

const records = [];
for (const [artistHandle, collectionHandle, limit, collectionMustDisplayCc0 = true] of sources) {
  const collectionUrl = `https://freemusicarchive.org/music/${artistHandle}/${collectionHandle}`;
  const collectionHtml = await fetchText(collectionUrl);
  const collectionDisplaysCc0 = hasCc0(collectionHtml);
  if (collectionMustDisplayCc0 && !collectionDisplaysCc0) {
    throw new Error(`CC0 evidence was not found on collection page: ${collectionUrl}`);
  }

  const collectionTracks = trackMetadata(collectionHtml).slice(0, limit);
  for (const track of collectionTracks) {
    const trackHtml = await fetchText(track.url);
    if (!hasCc0(trackHtml)) {
      throw new Error(`CC0 evidence was not found on individual track page: ${track.url}`);
    }

    records.push({
      id: `cc0-${slug(track.artistName)}-${slug(track.title)}-${track.id}`,
      title: track.title,
      creator: track.artistName,
      sourceUrl: track.url,
      sourceCollectionUrl: collectionUrl,
      downloadUrl: track.downloadUrl,
      originalFileUrl: track.fileUrl,
      retrievedAt,
      compositionLicense: "CC0-1.0",
      recordingLicense: "CC0-1.0",
      licenseUrl: cc0Url,
      rightsStatement: collectionDisplaysCc0
        ? "The individual Free Music Archive track page and its collection page displayed CC0 1.0 Universal when this record was retrieved. This is source-license evidence, not a legal warranty."
        : "The individual Free Music Archive track page displayed CC0 1.0 Universal when this record was retrieved; the collection page is retained only as a discovery source. This is source-license evidence, not a legal warranty.",
      sourceEvidenceSha256: {
        trackPage: sha256(trackHtml),
        collectionPage: sha256(collectionHtml),
      },
      assetState: "not-downloaded-not-bundled",
      catalogStatus: "documented-candidate",
      appBundlingAllowed: false,
      unresolvedChecks: [
        "Record a SHA-256 checksum of the downloaded audio before any app import.",
        "Confirm the particular audio contains no lyrics, or separately document CC0 provenance for every lyric.",
        "Confirm no third-party samples, covers, or performer rights require additional clearance.",
        "Complete a second-person review before changing appBundlingAllowed to true.",
      ],
    });
  }
}

if (records.length !== 100) {
  throw new Error(`Expected exactly 100 documented candidates; received ${records.length}.`);
}

const publicCredits = {
  schemaVersion: 1,
  pageTitle: "Cantarivo music credits and licenses",
  catalogPurpose: "research-only; no listed audio is bundled in the app",
  licensePolicy: "CC0-1.0 only",
  generatedAt: retrievedAt,
  entries: records.map(({ id, title, creator, sourceUrl, sourceCollectionUrl, retrievedAt: date, compositionLicense, recordingLicense, licenseUrl, catalogStatus }) => ({
    id,
    title,
    creator,
    sourceUrl,
    sourceCollectionUrl,
    retrievedAt: date,
    compositionLicense,
    recordingLicense,
    licenseUrl,
    catalogStatus,
  })),
};

const privateLedger = {
  schemaVersion: 1,
  recordPurpose: "Private pre-import rights ledger. Do not publish this file or treat its records as legal clearance.",
  generatedAt: retrievedAt,
  records,
};

await mkdir(dirname(publicCreditsPath), { recursive: true });
await mkdir(dirname(privateLedgerPath), { recursive: true });
await writeFile(publicCreditsPath, `${JSON.stringify(publicCredits, null, 2)}\n`);
await writeFile(privateLedgerPath, `${JSON.stringify(privateLedger, null, 2)}\n`);

console.log(`Created ${records.length} documented CC0 research candidates.`);
console.log(`Public credits data: ${publicCreditsPath}`);
console.log(`Private pre-import ledger: ${privateLedgerPath}`);

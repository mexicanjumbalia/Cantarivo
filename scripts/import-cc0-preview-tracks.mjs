import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ledgerPath = resolve(root, "private-license-records", "cc0-track-research-ledger.json");
const catalogPath = resolve(root, "content", "music-catalog.json");
const creditsPath = resolve(root, "content", "music-credits.json");
const stagingDirectory = resolve(root, "private-license-records", "staging", "cc0-preview");
const assetDirectory = resolve(root, "assets", "music", "cc0-playtest");

const selectedIds = [
  "cc0-komiku-fouler-l-horizon-140389",
  "cc0-komiku-le-grand-village-140390",
  "cc0-komiku-barque-sur-le-lac-140392",
  "cc0-komiku-la-citadelle-140393",
  "cc0-komiku-la-ville-aux-ponts-suspendus-140394",
];

const assetNames = {
  "cc0-komiku-fouler-l-horizon-140389": "fouler-l-horizon.mp3",
  "cc0-komiku-le-grand-village-140390": "le-grand-village.mp3",
  "cc0-komiku-barque-sur-le-lac-140392": "barque-sur-le-lac.mp3",
  "cc0-komiku-la-citadelle-140393": "la-citadelle.mp3",
  "cc0-komiku-la-ville-aux-ponts-suspendus-140394": "la-ville-aux-ponts-suspendus.mp3",
};

const checksum = (buffer) => createHash("sha256").update(buffer).digest("hex");
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const writeJson = async (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);

const ledger = await readJson(ledgerPath);
const catalog = await readJson(catalogPath);
const credits = await readJson(creditsPath);
const recordsById = new Map(ledger.records.map((record) => [record.id, record]));

await mkdir(stagingDirectory, { recursive: true });
await mkdir(assetDirectory, { recursive: true });

const previewTracks = [];
for (const id of selectedIds) {
  const record = recordsById.get(id);
  if (!record) throw new Error(`No private research record was found for ${id}.`);
  if (record.compositionLicense !== "CC0-1.0" || record.recordingLicense !== "CC0-1.0") {
    throw new Error(`${id} is not documented as CC0 for both composition and recording.`);
  }

  const response = await fetch(record.originalFileUrl, {
    headers: { "user-agent": "CantarivoPreview/1.0 (CC0 playtest import)" },
  });
  if (!response.ok) throw new Error(`Could not download ${id}: ${response.status} ${response.statusText}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("audio/")) throw new Error(`${id} did not return an audio response.`);

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length < 50_000) throw new Error(`${id} is unexpectedly small and was not imported.`);

  const assetName = assetNames[id];
  const stagedPath = resolve(stagingDirectory, assetName);
  const assetPath = resolve(assetDirectory, assetName);
  await writeFile(stagedPath, audio);
  await writeFile(assetPath, audio);

  const fileSha256 = checksum(audio);
  const mediaPath = `assets/music/cc0-playtest/${assetName}`;
  const importedAt = new Date().toISOString().slice(0, 10);

  Object.assign(record, {
    assetState: "bundled-preview-playtest",
    catalogStatus: "preview-playtest",
    importedAt,
    mediaPath,
    fileSha256,
    downloadedContentType: contentType,
    appBundlingAllowed: true,
    unresolvedChecks: [
      "This track is limited to the preview audio playtest until a release review is complete.",
      "No lyrics are displayed, transcribed, or used for recognition by Cantarivo.",
      "Before a public store release, independently re-check source ownership, any samples, performer rights, and current policy compatibility.",
    ],
  });

  previewTracks.push({
    id: record.id,
    title: record.title,
    creator: record.creator,
    sourceUrl: record.sourceUrl,
    retrievedAt: record.retrievedAt,
    compositionLicense: record.compositionLicense,
    recordingLicense: record.recordingLicense,
    containsLyrics: "not displayed or transcribed by the app",
    containsThirdPartySamples: "source-level CC0 dedication recorded; no separate sample list supplied",
    rightsStatement: record.rightsStatement,
    catalogStatus: "preview-playtest",
    mediaPath,
    fileSha256,
  });
}

catalog.previewTracks = previewTracks;
for (const entry of credits.entries) {
  const previewTrack = previewTracks.find((track) => track.id === entry.id);
  if (previewTrack) entry.catalogStatus = "preview-playtest";
}

await writeJson(ledgerPath, ledger);
await writeJson(catalogPath, catalog);
await writeJson(creditsPath, credits);

console.log(`Imported ${previewTracks.length} CC0 playtest track(s).`);

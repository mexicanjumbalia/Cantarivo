import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const catalogPath = new URL("../content/music-catalog.json", import.meta.url);
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const requiredFields = [
  "id",
  "title",
  "creator",
  "sourceUrl",
  "retrievedAt",
  "compositionLicense",
  "recordingLicense",
  "containsLyrics",
  "containsThirdPartySamples",
  "rightsStatement",
];
const privatePilotFields = [
  ...requiredFields,
  "catalogStatus",
  "mediaPath",
  "fileSha256",
];

const fail = (message) => {
  console.error(`Catalog policy violation: ${message}`);
  process.exitCode = 1;
};

let catalog;
try {
  catalog = JSON.parse(await readFile(catalogPath, "utf8"));
} catch (error) {
  fail(`music-catalog.json cannot be read: ${error.message}`);
  process.exit();
}

if (catalog.catalogLicensePolicy !== "CC0-1.0 only") fail("catalogLicensePolicy must be 'CC0-1.0 only'.");
if (!Array.isArray(catalog.allowedLicenses) || catalog.allowedLicenses.length !== 1 || catalog.allowedLicenses[0] !== "CC0-1.0") {
  fail("allowedLicenses must contain only CC0-1.0.");
}
if (!Array.isArray(catalog.tracks)) {
  fail("tracks must be an array.");
} else {
  const ids = new Set();
  catalog.tracks.forEach((track, index) => {
    const label = `tracks[${index}]`;
    requiredFields.forEach((field) => {
      if (!(field in track)) fail(`${label} is missing ${field}.`);
    });
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(track.id ?? "")) fail(`${label}.id must be a lowercase, hyphenated identifier.`);
    if (ids.has(track.id)) fail(`${label}.id is duplicated.`);
    ids.add(track.id);
    if (track.compositionLicense !== "CC0-1.0") fail(`${label}.compositionLicense must be CC0-1.0.`);
    if (track.recordingLicense !== "CC0-1.0") fail(`${label}.recordingLicense must be CC0-1.0.`);
    if (track.containsLyrics !== false) fail(`${label} may not contain lyrics.`);
    if (track.containsThirdPartySamples !== false) fail(`${label} may not contain third-party samples.`);
    if (typeof track.sourceUrl !== "string" || !/^https:\/\//.test(track.sourceUrl)) fail(`${label}.sourceUrl must be a secure, verifiable URL.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(track.retrievedAt ?? "")) fail(`${label}.retrievedAt must be ISO yyyy-mm-dd.`);
    if (typeof track.rightsStatement !== "string" || track.rightsStatement.length < 30) fail(`${label}.rightsStatement must document the CC0 evidence.`);
  });
}

if (catalog.privatePilotTracks !== undefined && !Array.isArray(catalog.privatePilotTracks)) {
  fail("privatePilotTracks must be an array when present.");
}

for (const [index, track] of (catalog.privatePilotTracks ?? []).entries()) {
  const label = `privatePilotTracks[${index}]`;
  privatePilotFields.forEach((field) => {
    if (!(field in track)) fail(`${label} is missing ${field}.`);
  });
  if (track.compositionLicense !== "CC0-1.0" || track.recordingLicense !== "CC0-1.0") {
    fail(`${label} must document CC0 for both composition and recording.`);
  }
  if (track.catalogStatus !== "private-pilot-playtest") fail(`${label}.catalogStatus must be private-pilot-playtest.`);
  if (!/^assets\/music\/private-pilot\/[a-z0-9-]+\.mp3$/.test(track.mediaPath ?? "")) fail(`${label}.mediaPath is not an approved private-pilot asset path.`);
  if (!/^[a-f0-9]{64}$/.test(track.fileSha256 ?? "")) fail(`${label}.fileSha256 must be a SHA-256 checksum.`);
  if (typeof track.containsLyrics !== "string" || typeof track.containsThirdPartySamples !== "string") {
    fail(`${label} must state the private-pilot lyric and sample review boundaries.`);
  }
  try {
    const assetPath = resolve(projectRoot, track.mediaPath);
    await access(assetPath);
    const actualHash = createHash("sha256").update(await readFile(assetPath)).digest("hex");
    if (actualHash !== track.fileSha256) fail(`${label}.fileSha256 does not match the local audio file.`);
  } catch {
    fail(`${label}.mediaPath does not exist locally.`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log(`Catalog check passed: ${catalog.tracks.length} release-ready and ${(catalog.privatePilotTracks ?? []).length} private-pilot CC0 track(s) documented.`);

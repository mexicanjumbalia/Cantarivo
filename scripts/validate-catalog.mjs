import { readFile } from "node:fs/promises";

const catalogPath = new URL("../content/music-catalog.json", import.meta.url);
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

if (process.exitCode) process.exit(process.exitCode);
console.log(`Catalog check passed: ${catalog.tracks.length} CC0-only track(s) documented.`);

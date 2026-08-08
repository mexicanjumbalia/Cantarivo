import { readFile } from "node:fs/promises";

const catalogPath = new URL("../content/music-credits.json", import.meta.url);
const requiredFields = [
  "id",
  "title",
  "creator",
  "sourceUrl",
  "sourceCollectionUrl",
  "retrievedAt",
  "compositionLicense",
  "recordingLicense",
  "licenseUrl",
  "catalogStatus",
];

const fail = (message) => {
  console.error(`CC0 research catalog violation: ${message}`);
  process.exitCode = 1;
};

let catalog;
try {
  catalog = JSON.parse(await readFile(catalogPath, "utf8"));
} catch (error) {
  fail(`music-credits.json cannot be read: ${error.message}`);
  process.exit();
}

if (catalog.licensePolicy !== "CC0-1.0 only") fail("licensePolicy must be 'CC0-1.0 only'.");
if (catalog.catalogPurpose !== "research-only; no listed audio is bundled in the app") fail("catalogPurpose must preserve the no-bundled-audio boundary.");
if (!Array.isArray(catalog.entries) || catalog.entries.length !== 100) fail("entries must contain exactly 100 research candidates.");

const ids = new Set();
for (const [index, entry] of (catalog.entries ?? []).entries()) {
  const label = `entries[${index}]`;
  for (const field of requiredFields) if (!(field in entry)) fail(`${label} is missing ${field}.`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id ?? "")) fail(`${label}.id must be a lowercase, hyphenated identifier.`);
  if (ids.has(entry.id)) fail(`${label}.id is duplicated.`);
  ids.add(entry.id);
  if (entry.compositionLicense !== "CC0-1.0" || entry.recordingLicense !== "CC0-1.0") fail(`${label} must document CC0 for both composition and recording.`);
  if (entry.licenseUrl !== "https://creativecommons.org/publicdomain/zero/1.0/") fail(`${label}.licenseUrl must be the canonical CC0 page.`);
  if (!/^https:\/\//.test(entry.sourceUrl ?? "") || !/^https:\/\//.test(entry.sourceCollectionUrl ?? "")) fail(`${label} requires secure source URLs.`);
  if (!["documented-candidate", "preview-playtest"].includes(entry.catalogStatus)) fail(`${label}.catalogStatus is not recognized.`);
}

if (process.exitCode) process.exit(process.exitCode);
const previewCount = catalog.entries.filter((entry) => entry.catalogStatus === "preview-playtest").length;
console.log(`CC0 research catalog check passed: ${catalog.entries.length - previewCount} documented candidates and ${previewCount} preview track(s).`);

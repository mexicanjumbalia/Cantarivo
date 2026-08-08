import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "public-site");

const publicFiles = [
  "index.html",
  "app.js",
  "styles.css",
  "privacy.html",
  "data-safety.html",
  "ai-vocal-companion.html",
  "donate.html",
  "donate.js",
  "donation-config.js"
];
const publicDirectories = [
  "assets/themes",
  "assets/music/cc0-playtest"
];
const forbiddenNames = new Set([
  "android",
  "docs",
  "supabase",
  "private-license-records",
  "integrations",
  "scripts",
  "content",
  "package.json",
  "pnpm-lock.yaml",
  "README.md"
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const relativePath of publicFiles) {
  const source = resolve(root, relativePath);
  await stat(source);
  await cp(source, resolve(output, relativePath));
}

for (const relativePath of publicDirectories) {
  const source = resolve(root, relativePath);
  await stat(source);
  await cp(source, resolve(output, relativePath), { recursive: true });
}

const copiedNames = new Set();
async function collect(directory, prefix = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (forbiddenNames.has(entry.name)) {
      throw new Error(`Forbidden public-site entry copied: ${relativePath}`);
    }
    copiedNames.add(relativePath);
    if (entry.isDirectory()) await collect(join(directory, entry.name), relativePath);
  }
}
await collect(output);

if (!copiedNames.has("index.html") || !copiedNames.has("privacy.html")) {
  throw new Error("The public site must include the app entry point and privacy policy.");
}

console.log(`Public site built at ${output}${sep} with ${copiedNames.size} entries.`);

import { copyFile, cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "mobile", "www-theme-picker");
const publicFiles = [
  "index.html",
  "app.js",
  "styles.css",
  "donate.html",
  "donate.js",
  "donation-config.js",
  "privacy.html",
  "data-safety.html",
  "ai-vocal-companion.html",
];

await mkdir(output, { recursive: true });
await Promise.all(publicFiles.map((file) => copyFile(resolve(root, file), resolve(output, file))));
await cp(resolve(root, "assets"), resolve(output, "assets"), { recursive: true });

console.log(`Mobile web bundle created with ${publicFiles.length} interface files and local playtest audio.`);

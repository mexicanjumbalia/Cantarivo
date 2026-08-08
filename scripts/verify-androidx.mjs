import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const androidRoot = resolve(root, "android");
const gradleProperties = await readFile(resolve(androidRoot, "gradle.properties"), "utf8");
const appGradle = await readFile(resolve(androidRoot, "app", "build.gradle"), "utf8");

assert.match(gradleProperties, /^android\.useAndroidX=true$/m, "AndroidX must remain enabled.");
assert.match(gradleProperties, /^android\.enableJetifier=false$/m, "Jetifier must stay disabled so legacy dependencies are visible.");
assert.match(appGradle, /androidx\.test\.runner\.AndroidJUnitRunner/, "Instrumentation tests must use the AndroidX runner.");
assert.match(appGradle, /androidx\.appcompat:appcompat/, "The app must depend directly on AndroidX AppCompat.");

const readableExtensions = new Set([".gradle", ".java", ".kt", ".kts", ".xml", ".properties"]);
const violations = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".gradle", "build"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(path);
      continue;
    }
    if (!readableExtensions.has(extname(entry.name)) && entry.name !== "gradle.properties") continue;
    const text = await readFile(path, "utf8");
    const withoutFileProviderMetadata = text.replaceAll("android.support.FILE_PROVIDER_PATHS", "");
    if (/com\.android\.support|(?:import|extends|<)\s*android\.support\./.test(withoutFileProviderMetadata)) {
      violations.push(path.replace(`${root}\\`, ""));
    }
  }
}

await scan(androidRoot);
assert.deepEqual(violations, [], `Legacy Android Support Library references found: ${violations.join(", ")}`);

console.log("AndroidX check passed: direct AndroidX dependencies, AndroidX tests, Jetifier disabled, and no legacy Support Library references.");

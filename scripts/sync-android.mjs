import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const cap = resolve(root, "node_modules", "@capacitor", "cli", "bin", "capacitor");

const build = spawnSync(process.execPath, [resolve(root, "scripts", "build-mobile.mjs")], {
  cwd: root,
  stdio: "inherit",
});

if (build.status !== 0) process.exit(build.status ?? 1);

const sync = spawnSync(process.execPath, [cap, "sync", "android"], {
  cwd: root,
  stdio: "inherit",
});

process.exit(sync.status ?? 1);

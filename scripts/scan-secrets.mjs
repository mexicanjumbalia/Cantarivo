import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const ignoredExtensions = new Set([
  ".apk", ".aab", ".class", ".gif", ".ico", ".jar", ".jpeg", ".jpg",
  ".mp3", ".mp4", ".png", ".webp", ".woff", ".woff2", ".zip"
]);

const patterns = [
  { name: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "GitHub token", pattern: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { name: "GitLab token", pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
  { name: "Slack token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "OpenAI-style key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    name: "assigned secret value",
    pattern: /\b(?:AWS|GITHUB|OPENAI|SUPABASE|STRIPE)[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{20,}/i
  }
];

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const findings = [];

for (const file of trackedFiles) {
  if (ignoredExtensions.has(extname(file).toLowerCase())) continue;
  let buffer;
  try {
    buffer = await readFile(file);
  } catch (error) {
    if (error.code === "ENOENT") continue;
    throw error;
  }
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");
  for (const { name, pattern } of patterns) {
    const match = text.match(pattern);
    if (match) findings.push(`${file}: ${name} (${match[0].slice(0, 80)})`);
  }
}

if (findings.length) {
  console.error("Potential credentials detected in tracked files:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed: ${trackedFiles.length} tracked files checked.`);
}

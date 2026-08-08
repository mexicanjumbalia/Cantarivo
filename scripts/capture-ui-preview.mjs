import { pathToFileURL } from "node:url";
import path from "node:path";

const [source, destination, playwrightModule, browserExecutable, widthArg, heightArg] = process.argv.slice(2);
if (!source || !destination || !playwrightModule || !browserExecutable) {
  throw new Error("Usage: capture-ui-preview.mjs <html-file> <png-file> <playwright-index.mjs> <browser-executable>");
}

const { chromium } = await import(pathToFileURL(path.resolve(playwrightModule)).href);
const width = Number.parseInt(widthArg ?? "412", 10);
const height = Number.parseInt(heightArg ?? "915", 10);

const browser = await chromium.launch({
  headless: true,
  executablePath: path.resolve(browserExecutable),
});
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});

await page.goto(pathToFileURL(path.resolve(source)).href, { waitUntil: "load" });
await page.screenshot({ path: path.resolve(destination), fullPage: true });
await browser.close();

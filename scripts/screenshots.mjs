/**
 * Regenerates the README screenshots in docs/screenshots/.
 *
 * Uses an installed Chrome or Edge via puppeteer-core (no browser download).
 * Run against a production build so the Next.js dev overlay isn't captured:
 *
 *   npm run build && npm start          # in one terminal
 *   npm run screenshots                 # in another
 *
 * Env: BASE_URL (default http://localhost:3000), BROWSER_PATH (override browser).
 */
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { demoState } from "./demo-data.mjs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = "docs/screenshots";
const STORAGE_KEY = "grindlog-v1";

const CANDIDATES = [
  process.env.BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Edge found. Set BROWSER_PATH to a Chromium-based browser.");
  process.exit(1);
}

const DESKTOP = { width: 1440, height: 960, deviceScaleFactor: 1 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const shots = [
  { name: "today", path: "/", viewport: DESKTOP },
  { name: "journal", path: "/journal", viewport: DESKTOP },
  { name: "calendar", path: "/calendar", viewport: DESKTOP, select: "yesterday" },
  { name: "insights", path: "/stats", viewport: DESKTOP },
  { name: "category", path: "/categories/dsa", viewport: DESKTOP },
  { name: "task-details", path: "/", viewport: DESKTOP, openTask: true },
  { name: "today-dark", path: "/", viewport: DESKTOP, theme: "dark" },
  { name: "mobile", path: "/", viewport: MOBILE },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--hide-scrollbars"] });

try {
  for (const shot of shots) {
    const page = await browser.newPage();
    await page.setViewport(shot.viewport);
    // Seed data before the app boots so the persisted store hydrates with it
    const data = demoState({ theme: shot.theme ?? "light" });
    await page.evaluateOnNewDocument(
      (k, v) => {
        localStorage.setItem(k, v);
      },
      STORAGE_KEY,
      JSON.stringify(data),
    );
    let url = BASE + shot.path;
    if (shot.select === "yesterday") {
      const y = new Date(Date.now() - 86400000);
      url += `?date=${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    }
    await page.goto(url, { waitUntil: "networkidle0" });
    await sleep(1200); // fonts, favicons, entry animations

    if (shot.openTask) {
      // Open the details of the first linked task in the list
      await page.evaluate(() => {
        const row = [...document.querySelectorAll('main [role="button"]')].find((el) => el.querySelector("a[href*='leetcode']"));
        row?.click();
      });
      await sleep(600);
    }

    const file = `${OUT}/${shot.name}.png`;
    await page.screenshot({ path: file });
    console.log("saved", file);
    await page.close();
  }
} finally {
  await browser.close();
}

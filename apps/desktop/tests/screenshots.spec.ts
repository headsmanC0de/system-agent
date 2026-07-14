import { expect, test } from "./fixtures";
import { BRAND_ID } from "../src/lib/branding";

const SCREENSHOT_DIR = `/tmp/${BRAND_ID}-screenshots`;

const ALL_PAGES = [
  { id: "Dashboard", nav: "Dashboard" },
  { id: "Projects", nav: "Projects" },
  { id: "Packages", nav: "Packages" },
  { id: "Hardware", nav: "Hardware" },
  { id: "GPU", nav: "GPU" },
  { id: "Snapshots", nav: "Snapshots" },
  { id: "Services", nav: "Services" },
  { id: "Autostart", nav: "Autostart" },
  { id: "Cron", nav: "Cron & Timers" },
  { id: "Disks", nav: "Disks" },
  { id: "Network", nav: "Network" },
  { id: "Battery", nav: "Battery & BT" },
  { id: "RGB", nav: "RGB" },
  { id: "Logs", nav: "Logs" },
  { id: "Passwords", nav: "Passwords" },
  { id: "Chat", nav: "Agent Chat" },
  { id: "LLM", nav: "Tesseract MoE" },
  { id: "Docs", nav: "Docs" },
  { id: "Settings", nav: "Settings" },
];

test.describe("Screenshots of all pages", () => {
  for (const pg of ALL_PAGES) {
    test(`screenshot ${pg.id}`, async ({ page, gotoPage }) => {
      await gotoPage(pg.nav);
      await expect(page.locator("main").locator("*").first()).toBeVisible();
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${pg.id.toLowerCase().replace(/\s+/g, "-")}.png`,
        fullPage: true,
      });
      await expect(page.locator("main")).toBeVisible();
    });
  }
});

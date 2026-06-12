// Shared Playwright fixtures (LH-111): nav + localStorage seeding, replacing the
// per-spec navigateTo copies and sleep-based waits (waitForTimeout is an
// anti-pattern per the official best-practices guide — web-first assertions
// auto-retry, actions auto-wait).
import { test as base, expect } from "@playwright/test";

export const BASE = "http://127.0.0.1:5173";

interface Fixtures {
  gotoPage: (name: string) => Promise<void>;
  seedStorage: (entries: Record<string, string>) => Promise<void>;
}

export const test = base.extend<Fixtures>({
  gotoPage: async ({ page }, use) => {
    await use(async (name: string) => {
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await page.locator(`text=${name}`).first().click();
    });
  },
  seedStorage: async ({ page }, use) => {
    await use(async (entries: Record<string, string>) => {
      await page.goto(BASE, { waitUntil: "domcontentloaded" });
      await page.evaluate((e) => {
        for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v);
      }, entries);
    });
  },
});

export { expect };

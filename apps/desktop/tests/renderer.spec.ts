import { BASE, expect, test } from "./fixtures";
import { BRAND_NAME } from "../src/lib/branding";

test.describe(`${BRAND_NAME} — Renderer Smoke Tests`, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
  });

  test("app loads with sidebar and main area", async ({ page }) => {
    await expect(page.locator("aside")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });

  test("sidebar has the configured brand", async ({ page }) => {
    const aside = page.locator("aside");
    await expect(aside.locator("div.text-sm.font-semibold")).toContainText(BRAND_NAME);
    await expect(aside.getByText("System Manager")).toBeVisible();
  });

  test("sidebar logo visible", async ({ page }) => {
    const logo = page.locator(`svg[aria-label="${BRAND_NAME} logo"]`);
    await expect(logo).toBeVisible({ timeout: 5000 });
  });

  test("default page is Dashboard", async ({ page }) => {
    await expect(page.locator("header")).toContainText("Dashboard", { timeout: 10000 });
    await expect(page.locator("main")).toBeVisible();
  });

  test("sidebar has all 4 nav groups", async ({ page }) => {
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Overview", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("System", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Peripherals", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Assistant", { exact: true })).toBeVisible();
  });

  test("sidebar collapse toggle works", async ({ page }) => {
    const aside = page.locator("aside");
    const width = () => aside.evaluate((el: HTMLElement) => el.offsetWidth);
    const initialWidth = await width();
    await page.locator("button >> svg").first().click();
    await expect.poll(width).toBeLessThan(initialWidth);
    await page.locator("button >> svg").first().click();
    await expect.poll(width).toBe(initialWidth);
  });
});

const PAGES = [
  { id: "Projects", title: "Projects" },
  { id: "Packages", title: "Package Manager" },
  { id: "Hardware", title: "Hardware Monitor" },
  { id: "GPU", title: "GPU Monitor" },
  { id: "Snapshots", title: "Btrfs Snapshots" },
  { id: "Services", title: "System Services" },
  { id: "Autostart", title: "Autostart Entries" },
  { id: "Cron & Timers", title: "Cron & Timers" },
  { id: "Disks", title: "Disk Usage" },
  { id: "Network", title: "Network Connections" },
  { id: "Battery & BT", title: "Battery & Bluetooth" },
  { id: "RGB", title: "RGB Control" },
  { id: "Logs", title: "System Logs" },
  { id: "Passwords", title: "Password Vault" },
  { id: "Agent Chat", title: "AI Assistant" },
  { id: "Tesseract MoE", title: "Tesseract MoE LLM" },
  { id: "Docs", title: "Docs" },
  { id: "Settings", title: "Settings" },
];

for (const pg of PAGES) {
  test(`navigate to ${pg.id} renders ${pg.title}`, async ({ page, gotoPage }) => {
    await gotoPage(pg.id);
    await expect(page.locator("header")).toContainText(pg.title, { timeout: 5000 });
    await expect(page.locator("main")).toBeVisible();
    const mainContent = page.locator("main");
    await expect(mainContent.locator("*").first()).toBeVisible({ timeout: 5000 });
  });
}

test.describe("Page-specific UI checks", () => {
  test("Dashboard page shows loading or data", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const hasContent = await main.locator("div, span, p, h1, h2").count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test("Passwords page has vault UI", async ({ page, gotoPage }) => {
    await gotoPage("Passwords");
    await expect(page.locator("header")).toContainText("Password Vault");
    await expect(page.locator("text=Total Entries").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Backend").first()).toBeVisible();
    await expect(page.locator("text=pass").first()).toBeVisible();
    const addBtn = page.locator("text=Add").first();
    await expect(addBtn).toBeVisible();
  });

  test("Battery page has device monitoring UI", async ({ page, gotoPage }) => {
    await gotoPage("Battery & BT");
    await expect(page.locator("header")).toContainText("Battery & Bluetooth");
    await expect(page.locator("text=Monitored").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Connected BT").first()).toBeVisible();
    await expect(page.locator("text=Paired BT").first()).toBeVisible();
    await expect(page.locator("text=Low Battery").first()).toBeVisible();
    await expect(page.locator("text=Power Devices").first()).toBeVisible();
    await expect(page.locator("text=Bluetooth").first()).toBeVisible();
    await expect(page.locator("text=EcoFlow").first()).toBeVisible();
  });

  test("Settings page shows accent colors", async ({ page, gotoPage }) => {
    await gotoPage("Settings");
    await expect(page.locator("header")).toContainText("Settings");
    const colorButtons = page.locator("button[title]");
    await expect(colorButtons.first()).toBeVisible({ timeout: 5000 });
  });

  test("Chat page has session sidebar and welcome", async ({ page, gotoPage }) => {
    await gotoPage("Agent Chat");
    await expect(page.locator("header")).toContainText("AI Assistant");
    await expect(page.locator("text=New chat").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Topics").first()).toBeVisible();
    await expect(page.locator("text=General").first()).toBeVisible();
  });

  test("LLM page shows Tesseract MoE info", async ({ page, gotoPage }) => {
    await gotoPage("Tesseract MoE");
    await expect(page.locator("header")).toContainText("Tesseract MoE LLM");
    await expect(page.locator("main").getByText("Tesseract MoE LLM").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[title="Start server"]')).toBeVisible();
    await expect(page.locator('button[title="Stop server"]')).toBeVisible();
  });

  test("Docs page shows knowledge base UI", async ({ page, gotoPage }) => {
    await gotoPage("Docs");
    await expect(page.locator("header")).toContainText("Docs");
    await expect(page.locator("text=Total Docs").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Categories").first()).toBeVisible();
    await expect(page.locator("text=New Doc").first()).toBeVisible();
  });

  test("Packages page has search", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await expect(page.locator("header")).toContainText("Package Manager");
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("No console errors on load", () => {
  test("check for JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("text=archlinux").first()).toBeVisible({ timeout: 10000 });
    const critical = errors.filter((e) => !e.includes("electronAPI") && !e.includes("invoke"));
    expect(critical).toHaveLength(0);
  });
});

test.describe("Accessibility basics", () => {
  test("all interactive buttons have cursor pointer", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    const buttons = page.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < Math.min(count, 20); i++) {
      const cursor = await buttons.nth(i).evaluate((el) => getComputedStyle(el).cursor);
      expect(cursor).toBe("pointer");
    }
  });
});

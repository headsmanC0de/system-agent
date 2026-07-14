import { BASE, expect, test } from "./fixtures";

test.describe("stable visual themes", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(BASE, { waitUntil: "networkidle" });
  });

  test("dark sidebar baseline", async ({ page }) => {
    await expect(page.locator("aside")).toHaveScreenshot("sidebar-dark.png", {
      animations: "disabled",
      mask: [page.locator("aside .font-mono")],
    });
  });

  test("light sidebar baseline", async ({ page }) => {
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("aside")).toHaveScreenshot("sidebar-light.png", {
      animations: "disabled",
      mask: [page.locator("aside .font-mono")],
    });
  });
});

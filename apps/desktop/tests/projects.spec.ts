import { expect, test } from "./fixtures";

test.describe("Projects page", () => {
  test("navigates to Projects page", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("header")).toContainText("Projects", { timeout: 5000 });
  });

  test("shows project cards with health scores", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=turborepo").first()).toBeVisible();
  });

  test("shows production readiness tab", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Production Readiness")).toBeVisible();
    await expect(page.locator("text=Overall Readiness")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=CI/CD Pipeline")).toBeVisible();
    await expect(page.locator("text=Code Quality")).toBeVisible();
    await expect(page.locator("text=Security")).toBeVisible();
    await expect(page.locator("span", { hasText: "Dependencies" }).first()).toBeVisible();
  });

  test("checklist shows pass and warn items", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Turborepo Remote Cache").first()).toBeVisible();
    await expect(page.locator("text=Build (turbo run build)").first()).toBeVisible();
    await expect(page.locator("text=No implicit any").first()).toBeVisible();
    await expect(page.locator("text=Test coverage").first()).toBeVisible();
  });

  test("dependencies tab shows packages", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 5000 });
    await page.locator("text=Dependencies").first().click();
    await expect(page.locator("text=turbo").first()).toBeVisible({ timeout: 5000 });
  });

  test("workspaces tab shows monorepo info", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 5000 });
    await page.locator("text=Workspaces").first().click();
    await expect(page.locator("text=monorepo").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=@project/desktop").first()).toBeVisible();
  });

  test("workspace expansion shows checklist and deps", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("text=Project").first()).toBeVisible({ timeout: 5000 });
    await page.locator("text=Workspaces").first().click();
    await page.locator("text=@project/desktop").first().click();
    await expect(page.locator("text=Readiness Checklist").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Dependencies").first()).toBeVisible();
  });

  test("add project input visible on + click", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    const addBtn = page.locator("button").filter({ hasText: /^\+$/ }).or(page.locator("button:has(svg.lucide-plus)"));
    await addBtn.first().click();
    await expect(page.locator('input[placeholder*="path"]')).toBeVisible({ timeout: 5000 });
  });

  test("stats cards show project counts", async ({ page, gotoPage }) => {
    await gotoPage("Projects");
    await expect(page.locator("text=Projects").nth(1)).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Outdated").first()).toBeVisible();
    await expect(page.locator("text=Avg Health").first()).toBeVisible();
  });
});

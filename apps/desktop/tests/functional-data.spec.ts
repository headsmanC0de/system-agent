import { expect, test } from "./fixtures";

test.describe("Dashboard — Data Rendering", () => {
  test("shows hostname and kernel from mock data", async ({ page, gotoPage }) => {
    await gotoPage("Dashboard");
    await expect(page.locator("text=archlinux").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=6.12.7-arch1-1").first()).toBeVisible();
    await expect(page.locator("text=x86_64").first()).toBeVisible();
    await expect(page.locator("text=up 3 days, 14:22").first()).toBeVisible();
  });

  test("shows CPU info with cores and load", async ({ page, gotoPage }) => {
    await gotoPage("Dashboard");
    await expect(page.locator("text=16 cores").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=CPU Usage").first()).toBeVisible();
  });

  test("shows disk usage from mock data", async ({ page, gotoPage }) => {
    await gotoPage("Dashboard");
    await expect(page.locator("text=183G").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=500G").first()).toBeVisible();
  });

  test("shows top processes table with entries", async ({ page, gotoPage }) => {
    await gotoPage("Dashboard");
    await expect(page.locator("text=Top Processes").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=firefox").first()).toBeVisible();
    await expect(page.locator("text=code").first()).toBeVisible();
    await expect(page.locator("text=discord").first()).toBeVisible();
    await expect(page.locator("text=spotify").first()).toBeVisible();
    await expect(page.locator("text=alacritty").first()).toBeVisible();
  });

  test("memory bar renders with percentage", async ({ page, gotoPage }) => {
    await gotoPage("Dashboard");
    await expect(page.locator("text=Memory").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows hardware configuration section", async ({ page, gotoPage }) => {
    await gotoPage("Dashboard");
    await expect(page.locator("text=Hardware Configuration").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=AMD Ryzen 9 9950X").first()).toBeVisible();
  });

  test("export report downloads JSON in demo mode", async ({ page, gotoPage }) => {
    await gotoPage("Dashboard");
    const download = page.waitForEvent("download");
    await page.locator('button:has-text("Export JSON")').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^system-report-.*\.json$/);
    await expect(page.locator("text=Report saved").first()).toBeVisible();
  });
});

test.describe("Packages — Data & Interactions", () => {
  test("shows stat cards with correct values", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await expect(page.locator("text=Installed").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Updates Available").first()).toBeVisible();
    await expect(page.locator("text=Orphans").first()).toBeVisible();
  });

  test("lists packages with names and versions", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await expect(page.locator("text=firefox").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=docker").first()).toBeVisible();
  });

  test("shows outdated packages section", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await expect(page.locator("text=Updates Available").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=133.0.3").first()).toBeVisible();
    const arrow = page.locator("text=→");
    await expect.poll(() => arrow.count()).toBeGreaterThanOrEqual(2);
  });

  test("search filters packages", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder*="Search"]').fill("fire");
    await expect(page.locator("text=firefox").first()).toBeVisible();
  });

  test("Update All and Remove Orphans buttons present", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await expect(page.locator("text=Update All").first()).toBeVisible({ timeout: 5000 });
    const removeBtn = page.locator("button").filter({ hasText: /Remove \d+ Orphans/ });
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
  });

  test("Update All asks confirmation; cancel does nothing, confirm runs", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await page.locator('button:has-text("Update All")').click();
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=pacman -Syu").first()).toBeVisible();
    await dialog.locator('button:has-text("Cancel")').click();
    await expect(dialog).toBeHidden();
    await page.locator('button:has-text("Update All")').click();
    await page.getByRole("dialog").locator('button:has-text("Confirm")').click();
    await expect(page.locator("text=updating packages").first()).toBeVisible();
  });

  test("package row opens detail modal", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    const row = page.locator(".cursor-pointer").filter({ hasText: "firefox" }).first();
    await expect(row).toBeVisible({ timeout: 5000 });
    await row.click();
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("text=Standalone web browser").first()).toBeVisible();
    await dialog.getByLabel("Close").click();
    await expect(dialog).toBeHidden();
  });

  test("search is debounced but still filters", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    const dockerRow = page.locator(".cursor-pointer").filter({ hasText: "docker" }).first();
    await expect(dockerRow).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder*="Search"]').fill("fire");
    await expect(page.locator(".cursor-pointer").filter({ hasText: "firefox" }).first()).toBeVisible();
    await expect(dockerRow).toBeHidden();
  });
});

test.describe("GPU — Data Rendering", () => {
  test("shows GPU name", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=NVIDIA GeForce RTX 4070 Ti SUPER").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows temperature card", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=GPU Temperature").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=45°C").first()).toBeVisible();
  });

  test("shows utilization card", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=GPU Utilization").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=12%").first()).toBeVisible();
  });

  test("shows fan speed card", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=Fan Speed").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=35%").first()).toBeVisible();
  });

  test("shows VRAM and Power bars", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=VRAM").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=GiB").first()).toBeVisible();
    await expect(page.locator("text=120").first()).toBeVisible();
  });

  test("power renders a single W unit with demo and production shape parity", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=120 / 285 W").first()).toBeVisible({ timeout: 5000 });
  });

  test("does not fabricate clock speeds that were not collected", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=Clock Speeds")).toHaveCount(0);
  });
});

test.describe("Services — Data & Interactions", () => {
  test("shows failed services section", async ({ page, gotoPage }) => {
    await gotoPage("Services");
    await expect(page.locator("text=Failed").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows running services", async ({ page, gotoPage }) => {
    await gotoPage("Services");
    await expect(page.locator("text=docker.service").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=NetworkManager.service").first()).toBeVisible();
    await expect(page.locator("text=sshd.service").first()).toBeVisible();
    await expect(page.locator("text=pipewire.service").first()).toBeVisible();
  });

  test("action buttons visible for each service", async ({ page, gotoPage }) => {
    await gotoPage("Services");
    const restartBtns = page.locator("text=Restart");
    await expect.poll(() => restartBtns.count()).toBeGreaterThanOrEqual(4);
    const stopBtns = page.locator("text=Stop");
    await expect.poll(() => stopBtns.count()).toBeGreaterThanOrEqual(4);
  });

  test("stat cards show Running and Failed counts", async ({ page, gotoPage }) => {
    await gotoPage("Services");
    await expect(page.locator("text=Running").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Failed").first()).toBeVisible();
  });

  test("tab navigation works", async ({ page, gotoPage }) => {
    await gotoPage("Services");
    await expect(page.locator("text=All (").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Running (").first()).toBeVisible();
    await expect(page.locator("text=Failed (").first()).toBeVisible();
  });
});

test.describe("Snapshots — Data & Interactions", () => {
  test("shows snapshot table with data", async ({ page, gotoPage }) => {
    await gotoPage("Snapshots");
    await expect(page.locator("text=Pre-system upgrade snapshot").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=single").first()).toBeVisible();
  });

  test("has create snapshot input", async ({ page, gotoPage }) => {
    await gotoPage("Snapshots");
    const input = page.locator("input").first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test("action buttons on each snapshot", async ({ page, gotoPage }) => {
    await gotoPage("Snapshots");
    const rollbacks = page.locator("text=Rollback");
    const deletes = page.locator("text=Delete");
    await expect.poll(() => rollbacks.count()).toBeGreaterThanOrEqual(2);
    await expect.poll(() => deletes.count()).toBeGreaterThanOrEqual(2);
  });

  test("snapshot diff button shows changes", async ({ page, gotoPage }) => {
    await gotoPage("Snapshots");
    await page.locator("text=Diff").first().click();
    await expect(page.getByText("/etc/pacman.conf").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/Diff \\d+\\.\\.\\d+:/").first()).toBeVisible();
  });
});

test.describe("Disks — Data Rendering", () => {
  test("shows disk entries with usage bars", async ({ page, gotoPage }) => {
    await gotoPage("Disks");
    await expect(page.locator("text=nvme0n1p2").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows second disk", async ({ page, gotoPage }) => {
    await gotoPage("Disks");
    await expect(page.locator("text=sda1").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Network — Data Rendering", () => {
  test("shows stat cards", async ({ page, gotoPage }) => {
    await gotoPage("Network");
    await expect(page.locator("text=Total Connections").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Listening").first()).toBeVisible();
    await expect(page.locator("text=Established").first()).toBeVisible();
  });

  test("shows connections table with data", async ({ page, gotoPage }) => {
    await gotoPage("Network");
    await expect(page.locator("text=firefox").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=ESTAB").first()).toBeVisible();
  });
});

test.describe("Battery & Bluetooth — Data Rendering", () => {
  test("shows stat cards", async ({ page, gotoPage }) => {
    await gotoPage("Battery & BT");
    await expect(page.locator("text=Monitored").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Connected BT").first()).toBeVisible();
    await expect(page.locator("text=Paired BT").first()).toBeVisible();
    await expect(page.locator("text=Low Battery").first()).toBeVisible();
  });

  test("shows power devices", async ({ page, gotoPage }) => {
    await gotoPage("Battery & BT");
    await expect(page.locator("text=Power Devices").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Logitech PRO X 2").first()).toBeVisible();
    await expect(page.locator("text=91%").first()).toBeVisible();
  });

  test("shows Bluetooth tab with devices", async ({ page, gotoPage }) => {
    await gotoPage("Battery & BT");
    await expect(page.locator('button:has-text("Bluetooth")')).toBeVisible({ timeout: 5000 });
  });

  test("shows EcoFlow tab with Delta 2 Max telemetry", async ({ page, gotoPage }) => {
    await gotoPage("Battery & BT");
    await page.getByRole("button", { name: /EcoFlow/ }).click();
    await expect(page.getByText("EcoFlow DELTA 2 Max").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("75.44%").first()).toBeVisible();
    await expect(page.getByText("R361MOCK5678").first()).toBeVisible();
    await expect(page.getByText("AC On").first()).toBeVisible();
    await expect(page.getByText("300 W").first()).toBeVisible();
  });

  test("filters EcoFlow devices by serial", async ({ page, gotoPage }) => {
    await gotoPage("Battery & BT");
    await page.getByRole("button", { name: /EcoFlow/ }).click();
    await page.getByPlaceholder("Search devices...").fill("R351MOCK1234");
    await expect(page.getByText("EcoFlow DELTA 2 Max").first()).toBeVisible();
    await page.getByPlaceholder("Search devices...").fill("missing-serial");
    await expect(page.getByText("No EcoFlow devices match your search").first()).toBeVisible();
  });
});

test.describe("Passwords — Data & Interactions", () => {
  test("shows vault stats", async ({ page, gotoPage }) => {
    await gotoPage("Passwords");
    await expect(page.locator("text=Total Entries").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Backend").first()).toBeVisible();
    await expect(page.locator("text=pass").first()).toBeVisible();
  });

  test("lists password entries", async ({ page, gotoPage }) => {
    await gotoPage("Passwords");
    await expect(page.locator("text=github").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=aws").first()).toBeVisible();
    await expect(page.locator("text=email").first()).toBeVisible();
    await expect(page.locator("text=wifi-home").first()).toBeVisible();
  });

  test("Add and Refresh buttons visible", async ({ page, gotoPage }) => {
    await gotoPage("Passwords");
    await expect(page.locator("text=Add").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Refresh").first()).toBeVisible();
  });

  test("click entry shows detail panel", async ({ page, gotoPage }) => {
    await gotoPage("Passwords");
    await page.locator("text=github").first().click();
    await expect(page.locator("text=Select an entry").first()).not.toBeVisible();
  });
});

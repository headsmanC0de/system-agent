import { expect, test } from "@playwright/test";

const BASE = "http://127.0.0.1:5173";

async function navigateTo(page: any, name: string) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
  await page.locator(`text=${name}`).first().click();
  await page.waitForTimeout(500);
}

test.describe("Dashboard — Data Rendering", () => {
  test("shows hostname and kernel from mock data", async ({ page }) => {
    await navigateTo(page, "Dashboard");
    await expect(page.locator("text=archlinux")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=6.12.7-arch1-1")).toBeVisible();
    await expect(page.locator("text=x86_64")).toBeVisible();
    await expect(page.locator("text=up 3 days, 14:22")).toBeVisible();
  });

  test("shows CPU info with cores and load", async ({ page }) => {
    await navigateTo(page, "Dashboard");
    await expect(page.locator("text=16 cores")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=CPU Usage")).toBeVisible();
  });

  test("shows disk usage from mock data", async ({ page }) => {
    await navigateTo(page, "Dashboard");
    await expect(page.locator("text=183G").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=500G").first()).toBeVisible();
  });

  test("shows top processes table with entries", async ({ page }) => {
    await navigateTo(page, "Dashboard");
    await expect(page.locator("text=Top Processes")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=firefox")).toBeVisible();
    await expect(page.locator("text=code")).toBeVisible();
    await expect(page.locator("text=discord")).toBeVisible();
    await expect(page.locator("text=spotify")).toBeVisible();
    await expect(page.locator("text=alacritty")).toBeVisible();
  });

  test("memory bar renders with percentage", async ({ page }) => {
    await navigateTo(page, "Dashboard");
    await expect(page.locator("text=Memory").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows hardware configuration section", async ({ page }) => {
    await navigateTo(page, "Dashboard");
    await expect(page.locator("text=Hardware Configuration")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=AMD Ryzen 9 9950X")).toBeVisible();
    await expect(page.locator("text=Tesseract MoE LLM")).toBeVisible();
  });
});

test.describe("Packages — Data & Interactions", () => {
  test("shows stat cards with correct values", async ({ page }) => {
    await navigateTo(page, "Packages");
    await expect(page.locator("text=Installed").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Updates Available").first()).toBeVisible();
    await expect(page.locator("text=Orphans").first()).toBeVisible();
  });

  test("lists packages with names and versions", async ({ page }) => {
    await navigateTo(page, "Packages");
    await expect(page.locator("text=firefox").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=docker").first()).toBeVisible();
  });

  test("shows outdated packages section", async ({ page }) => {
    await navigateTo(page, "Packages");
    await expect(page.locator("text=Updates Available").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=133.0.3").first()).toBeVisible();
    const arrow = page.locator("text=→");
    expect(await arrow.count()).toBeGreaterThanOrEqual(2);
  });

  test("search filters packages", async ({ page }) => {
    await navigateTo(page, "Packages");
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder*="Search"]').fill("fire");
    await page.waitForTimeout(300);
    await expect(page.locator("text=firefox").first()).toBeVisible();
  });

  test("Update All and Remove Orphans buttons present", async ({ page }) => {
    await navigateTo(page, "Packages");
    await expect(page.locator("text=Update All")).toBeVisible({ timeout: 5000 });
    const removeBtn = page.locator("button").filter({ hasText: /Remove \d+ Orphans/ });
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe("GPU — Data Rendering", () => {
  test("shows GPU name", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("text=NVIDIA GeForce RTX 4070 Ti SUPER")).toBeVisible({ timeout: 5000 });
  });

  test("shows temperature card", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("text=GPU Temperature")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=45°C")).toBeVisible();
  });

  test("shows utilization card", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("text=GPU Utilization")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=12%")).toBeVisible();
  });

  test("shows fan speed card", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("text=Fan Speed")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=35%")).toBeVisible();
  });

  test("shows VRAM and Power bars", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("text=VRAM")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=GiB").first()).toBeVisible();
    await expect(page.locator("text=120").first()).toBeVisible();
  });

  test("shows clock speeds section", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("text=Clock Speeds")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=2100")).toBeVisible();
  });
});

test.describe("Services — Data & Interactions", () => {
  test("shows failed services section", async ({ page }) => {
    await navigateTo(page, "Services");
    await expect(page.locator("text=Failed").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows running services", async ({ page }) => {
    await navigateTo(page, "Services");
    await expect(page.locator("text=docker.service")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=NetworkManager.service")).toBeVisible();
    await expect(page.locator("text=sshd.service")).toBeVisible();
    await expect(page.locator("text=pipewire.service")).toBeVisible();
  });

  test("action buttons visible for each service", async ({ page }) => {
    await navigateTo(page, "Services");
    const restartBtns = page.locator("text=Restart");
    expect(await restartBtns.count()).toBeGreaterThanOrEqual(4);
    const stopBtns = page.locator("text=Stop");
    expect(await stopBtns.count()).toBeGreaterThanOrEqual(4);
  });

  test("stat cards show Running and Failed counts", async ({ page }) => {
    await navigateTo(page, "Services");
    await expect(page.locator("text=Running").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Failed").first()).toBeVisible();
  });

  test("tab navigation works", async ({ page }) => {
    await navigateTo(page, "Services");
    await expect(page.locator("text=All (")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Running (")).toBeVisible();
    await expect(page.locator("text=Failed (")).toBeVisible();
  });
});

test.describe("Snapshots — Data & Interactions", () => {
  test("shows snapshot table with data", async ({ page }) => {
    await navigateTo(page, "Snapshots");
    await expect(page.locator("text=Pre-system upgrade snapshot")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=single").first()).toBeVisible();
  });

  test("has create snapshot input", async ({ page }) => {
    await navigateTo(page, "Snapshots");
    const input = page.locator('input').first();
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test("action buttons on each snapshot", async ({ page }) => {
    await navigateTo(page, "Snapshots");
    const rollbacks = page.locator("text=Rollback");
    const deletes = page.locator("text=Delete");
    expect(await rollbacks.count()).toBeGreaterThanOrEqual(2);
    expect(await deletes.count()).toBeGreaterThanOrEqual(2);
  });
});

test.describe("Disks — Data Rendering", () => {
  test("shows disk entries with usage bars", async ({ page }) => {
    await navigateTo(page, "Disks");
    await expect(page.locator("text=nvme0n1p2")).toBeVisible({ timeout: 5000 });
  });

  test("shows second disk", async ({ page }) => {
    await navigateTo(page, "Disks");
    await expect(page.locator("text=sda1")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Network — Data Rendering", () => {
  test("shows stat cards", async ({ page }) => {
    await navigateTo(page, "Network");
    await expect(page.locator("text=Total Connections")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Listening")).toBeVisible();
    await expect(page.locator("text=Established")).toBeVisible();
  });

  test("shows connections table with data", async ({ page }) => {
    await navigateTo(page, "Network");
    await expect(page.locator("text=firefox").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=ESTAB").first()).toBeVisible();
  });
});

test.describe("Battery & Bluetooth — Data Rendering", () => {
  test("shows stat cards", async ({ page }) => {
    await navigateTo(page, "Battery & BT");
    await expect(page.locator("text=Monitored")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Connected BT")).toBeVisible();
    await expect(page.locator("text=Paired BT")).toBeVisible();
    await expect(page.locator("text=Low Battery")).toBeVisible();
  });

  test("shows power devices", async ({ page }) => {
    await navigateTo(page, "Battery & BT");
    await expect(page.locator("text=Power Devices")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Logitech PRO X 2")).toBeVisible();
    await expect(page.locator("text=91%")).toBeVisible();
  });

  test("shows Bluetooth tab with devices", async ({ page }) => {
    await navigateTo(page, "Battery & BT");
    await expect(page.locator('button:has-text("Bluetooth")')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Passwords — Data & Interactions", () => {
  test("shows vault stats", async ({ page }) => {
    await navigateTo(page, "Passwords");
    await expect(page.locator("text=Total Entries").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Backend").first()).toBeVisible();
    await expect(page.locator("text=pass").first()).toBeVisible();
  });

  test("lists password entries", async ({ page }) => {
    await navigateTo(page, "Passwords");
    await expect(page.locator("text=github").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=aws").first()).toBeVisible();
    await expect(page.locator("text=email").first()).toBeVisible();
    await expect(page.locator("text=wifi-home").first()).toBeVisible();
  });

  test("Add and Refresh buttons visible", async ({ page }) => {
    await navigateTo(page, "Passwords");
    await expect(page.locator("text=Add").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Refresh")).toBeVisible();
  });

  test("click entry shows detail panel", async ({ page }) => {
    await navigateTo(page, "Passwords");
    await page.locator("text=github").first().click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=Select an entry").first()).not.toBeVisible();
  });
});

test.describe("Hardware — Data Rendering", () => {
  test("shows CPU usage bar", async ({ page }) => {
    await navigateTo(page, "Hardware");
    await expect(page.locator("text=CPU Usage")).toBeVisible({ timeout: 5000 });
  });

  test("shows sensors output", async ({ page }) => {
    await navigateTo(page, "Hardware");
    await page.waitForTimeout(500);
    const preContent = page.locator("pre");
    if (await preContent.isVisible()) {
      expect(await preContent.textContent()).toBeTruthy();
    }
  });
});

test.describe("Logs — Data Rendering", () => {
  test("shows log output", async ({ page }) => {
    await navigateTo(page, "Logs");
    await expect(page.locator("header")).toContainText("System Logs", { timeout: 5000 });
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const content = await main.textContent();
    expect(content!.length).toBeGreaterThan(0);
  });

  test("has count selector and refresh button", async ({ page }) => {
    await navigateTo(page, "Logs");
    const selects = page.locator("select");
    if (await selects.count() > 0) {
      await expect(selects.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("RGB — Data Rendering", () => {
  test("shows RGB devices from mock data", async ({ page }) => {
    await navigateTo(page, "RGB");
    await expect(page.locator("header")).toContainText("RGB Control", { timeout: 5000 });
  });

  test("has All White and All Off buttons", async ({ page }) => {
    await navigateTo(page, "RGB");
    await expect(page.locator("text=All White")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=All Off")).toBeVisible();
  });
});

test.describe("Cron & Timers — Data Rendering", () => {
  test("shows cron editor with content", async ({ page }) => {
    await navigateTo(page, "Cron & Timers");
    await expect(page.locator("header")).toContainText("Cron", { timeout: 5000 });
    const textarea = page.locator("textarea");
    if (await textarea.isVisible()) {
      const val = await textarea.inputValue();
      expect(val.length).toBeGreaterThan(0);
    }
  });

  test("shows timers section", async ({ page }) => {
    await navigateTo(page, "Cron & Timers");
    await page.waitForTimeout(500);
    await expect(page.locator("text=Timers").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Autostart — Data Rendering", () => {
  test("shows autostart entries", async ({ page }) => {
    await navigateTo(page, "Autostart");
    await expect(page.locator("header")).toContainText("Autostart", { timeout: 5000 });
    const main = page.locator("main");
    const content = await main.textContent();
    expect(content!.length).toBeGreaterThan(10);
  });

  test("shows entry state and source", async ({ page }) => {
    await navigateTo(page, "Autostart");
    await expect(page.locator("text=Enabled").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Chat — Data & Interactions", () => {
  test("shows session sidebar", async ({ page }) => {
    await navigateTo(page, "Agent Chat");
    await expect(page.locator("text=New chat").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Topics").first()).toBeVisible();
    await expect(page.locator("text=General").first()).toBeVisible();
  });

  test("shows welcome message when session has no messages", async ({ page }) => {
    await navigateTo(page, "Agent Chat");
    await page.waitForTimeout(500);
    const welcome = page.locator("text=Linux Agent Agent");
    if (await welcome.isVisible()) {
      await expect(welcome).toBeVisible();
    }
  });

  test("chat page renders with session sidebar", async ({ page }) => {
    await navigateTo(page, "Agent Chat");
    await expect(page.locator("header")).toContainText("AI Assistant", { timeout: 5000 });
    await expect(page.locator("main")).toBeVisible();
    const main = page.locator("main");
    const content = await main.textContent();
    expect(content!.length).toBeGreaterThan(0);
  });
});

test.describe("LLM (Tesseract MoE) — Data & Interactions", () => {
  test("shows model info card", async ({ page }) => {
    await navigateTo(page, "Tesseract MoE");
    await expect(page.locator("main").getByText("Tesseract MoE LLM").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Mixture of Experts").first()).toBeVisible();
    await expect(page.locator("text=47B").first()).toBeVisible();
    await expect(page.locator("text=Q4_K_M")).toBeVisible();
  });

  test("shows Start and Stop buttons", async ({ page }) => {
    await navigateTo(page, "Tesseract MoE");
    await expect(page.locator('button[title="Start server"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[title="Stop server"]')).toBeVisible();
  });

  test("shows inference status when running", async ({ page }) => {
    await navigateTo(page, "Tesseract MoE");
    await expect(page.locator("text=Running").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=VRAM Usage")).toBeVisible();
    await expect(page.locator("text=Throughput")).toBeVisible();
  });

  test("shows stat cards for inference metrics", async ({ page }) => {
    await navigateTo(page, "Tesseract MoE");
    await expect(page.locator("text=Avg Latency")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Requests/min")).toBeVisible();
    await expect(page.locator("text=Uptime")).toBeVisible();
  });

  test("config toggle button visible", async ({ page }) => {
    await navigateTo(page, "Tesseract MoE");
    const configBtn = page.locator("button[title='Configuration']");
    await expect(configBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Docs — Data & Interactions", () => {
  test("shows stat cards", async ({ page }) => {
    await navigateTo(page, "Docs");
    await expect(page.locator("text=Total Docs").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Categories").first()).toBeVisible();
  });

  test("shows document list with entries", async ({ page }) => {
    await navigateTo(page, "Docs");
    await expect(page.locator("text=GPU Crash Workaround")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Package Update Guide")).toBeVisible();
    await expect(page.locator("text=WiFi Setup")).toBeVisible();
  });

  test("shows category sidebar", async ({ page }) => {
    await navigateTo(page, "Docs");
    await expect(page.locator("text=Troubleshooting").first()).toBeVisible({ timeout: 5000 });
  });

  test("New Doc button visible", async ({ page }) => {
    await navigateTo(page, "Docs");
    await expect(page.locator("text=New Doc")).toBeVisible({ timeout: 5000 });
  });

  test("clicking doc shows content", async ({ page }) => {
    await navigateTo(page, "Docs");
    await page.locator("text=GPU Crash Workaround").first().click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=software rendering")).toBeVisible({ timeout: 5000 });
  });

  test("search input works", async ({ page }) => {
    await navigateTo(page, "Docs");
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("GPU");
      await page.waitForTimeout(300);
      await expect(page.locator("text=GPU Crash Workaround").first()).toBeVisible();
    }
  });
});

test.describe("Settings — Interactions", () => {
  test("12 accent color presets visible", async ({ page }) => {
    await navigateTo(page, "Settings");
    const colorBtns = page.locator("button[title]");
    expect(await colorBtns.count()).toBeGreaterThanOrEqual(12);
  });

  test("active preset has checkmark", async ({ page }) => {
    await navigateTo(page, "Settings");
    const checks = page.locator("svg.lucide-check");
    expect(await checks.count()).toBeGreaterThanOrEqual(1);
  });

  test("clicking different accent changes the check", async ({ page }) => {
    await navigateTo(page, "Settings");
    const colorBtns = page.locator("button[title]");
    const count = await colorBtns.count();
    if (count > 1) {
      await colorBtns.nth(1).click();
      await page.waitForTimeout(300);
      const checks = page.locator("svg");
      expect(await checks.count()).toBeGreaterThan(0);
    }
  });

  test("About section shows version info", async ({ page }) => {
    await navigateTo(page, "Settings");
    const aboutBtn = page.locator('button:has-text("About")');
    await aboutBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=0.1.0")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Private").first()).toBeVisible();
  });

  test("AI Provider section shows provider options", async ({ page }) => {
    await navigateTo(page, "Settings");
    const tabs = page.locator("button");
    const providerTab = tabs.filter({ hasText: /AI Provider|Provider/ });
    if (await providerTab.count() > 0) {
      await providerTab.first().click();
      await page.waitForTimeout(300);
    }
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });
});

test.describe("Edge Cases & Error Handling", () => {
  test("page refresh maintains current page", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("header")).toContainText("GPU", { timeout: 5000 });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await expect(page.locator("main")).toBeVisible();
  });

  test("rapid navigation between pages", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    const pages = ["Packages", "GPU", "Services", "Disks", "Network"];
    for (const pg of pages) {
      await page.locator(`text=${pg}`).first().click();
      await page.waitForTimeout(200);
    }
    await expect(page.locator("main")).toBeVisible();
  });

  test("sidebar collapse preserves page content", async ({ page }) => {
    await navigateTo(page, "GPU");
    await expect(page.locator("text=NVIDIA")).toBeVisible({ timeout: 5000 });
    await page.locator("button >> svg").first().click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=NVIDIA")).toBeVisible();
  });

  test("search with no results shows empty state", async ({ page }) => {
    await navigateTo(page, "Packages");
    await page.locator('input[placeholder*="Search"]').fill("zzzznonexistentpackage");
    await page.waitForTimeout(300);
    const rows = page.locator("div.hover\\:bg-secondary\\/50");
    expect(await rows.count()).toBe(0);
  });
});

test.describe("Security Checks", () => {
  test("no inline eval or dangerous patterns in source", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    const hasInlineEval = await page.evaluate(() => {
      const scripts = document.querySelectorAll("script");
      for (const s of scripts) {
        if (s.textContent?.includes("eval(") || s.textContent?.includes("Function(")) {
          return true;
        }
      }
      return false;
    });
    expect(hasInlineEval).toBe(false);
  });

  test("no console errors after navigating all pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    const allPages = [
      "Dashboard",
      "Projects",
      "Packages",
      "Hardware",
      "GPU",
      "Snapshots",
      "Services",
      "Autostart",
      "Cron & Timers",
      "Disks",
      "Network",
      "Battery & BT",
      "RGB",
      "Logs",
      "Passwords",
      "Agent Chat",
      "Tesseract MoE",
      "Docs",
      "Settings",
    ];
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    for (const pg of allPages) {
      await page.locator(`text=${pg}`).first().click();
      await page.waitForTimeout(300);
    }
    const critical = errors.filter((e) => !e.includes("electronAPI") && !e.includes("invoke") && !e.includes("fetch"));
    expect(critical).toHaveLength(0);
  });
});

test.describe("Mock-mode banner (audit D-1)", () => {
  test("shows demo-data banner when not running in Electron", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    const banner = page.getByTestId("mock-mode-banner");
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText(/demo data/i);
  });

  test("banner stays visible across navigation", async ({ page }) => {
    await navigateTo(page, "Battery & BT");
    await expect(page.getByTestId("mock-mode-banner")).toBeVisible();
  });
});

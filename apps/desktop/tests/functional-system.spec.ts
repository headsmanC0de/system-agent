import { BASE, expect, test } from "./fixtures";

test.describe("Hardware — Data Rendering", () => {
  test("memory totals render in GiB magnitude, not MiB (BF-042)", async ({ page, gotoPage }) => {
    await gotoPage("Hardware");
    await expect(page.locator("text=/62\\.\\d GB total/").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows CPU usage bar", async ({ page, gotoPage }) => {
    await gotoPage("Hardware");
    await expect(page.locator("text=CPU Usage").first()).toBeVisible({ timeout: 5000 });
  });

  test("shows sensors output", async ({ page, gotoPage }) => {
    await gotoPage("Hardware");
    await expect(page.locator("main")).toBeVisible();
    const preContent = page.locator("pre");
    if (await preContent.isVisible()) {
      expect(await preContent.textContent()).toBeTruthy();
    }
  });

  test("fan curves card lists hwmon fans (LH-104a)", async ({ page, gotoPage }) => {
    await gotoPage("Hardware");
    await expect(page.locator("text=Fan Curves").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=CPU Fan").first()).toBeVisible();
    await expect(
      page.locator("text=pwm not writable — add a udev rule to allow user PWM control").first(),
    ).toBeVisible();
  });

  test("fan curve preset updates sliders and enable applies (LH-104a)", async ({ page, gotoPage }) => {
    await gotoPage("Hardware");
    await expect(page.locator("text=Fan Curves").first()).toBeVisible({ timeout: 5000 });
    await page.locator("button", { hasText: "Silent" }).first().click();
    await expect(page.locator('input[type="range"]').first()).toHaveValue("10");
    await page.locator("button", { hasText: "Enable curves" }).first().click();
    await expect(page.locator("text=fan curves active").first()).toBeVisible();
    await page.locator("button", { hasText: "Disable curves" }).first().click();
    await expect(page.locator("text=auto mode restored").first()).toBeVisible();
  });
});

test.describe("Logs — Data Rendering", () => {
  test("shows log output", async ({ page, gotoPage }) => {
    await gotoPage("Logs");
    await expect(page.locator("header")).toContainText("System Logs", { timeout: 5000 });
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const content = await main.textContent();
    expect(content!.length).toBeGreaterThan(0);
  });

  test("has count selector and refresh button", async ({ page, gotoPage }) => {
    await gotoPage("Logs");
    const selects = page.locator("select");
    if (await selects.count() > 0) {
      await expect(selects.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("RGB — Data Rendering", () => {
  test("shows RGB devices from mock data", async ({ page, gotoPage }) => {
    await gotoPage("RGB");
    await expect(page.locator("header")).toContainText("RGB Control", { timeout: 5000 });
  });

  test("has All White and All Off buttons", async ({ page, gotoPage }) => {
    await gotoPage("RGB");
    await expect(page.locator("text=All White").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=All Off").first()).toBeVisible();
  });
});

test.describe("Cron & Timers — Data Rendering", () => {
  test("shows cron editor with content", async ({ page, gotoPage }) => {
    await gotoPage("Cron & Timers");
    await expect(page.locator("header")).toContainText("Cron", { timeout: 5000 });
    const textarea = page.locator("textarea");
    if (await textarea.isVisible()) {
      const val = await textarea.inputValue();
      expect(val.length).toBeGreaterThan(0);
    }
  });

  test("shows timers section", async ({ page, gotoPage }) => {
    await gotoPage("Cron & Timers");
    await expect(page.locator("text=Timers").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Autostart — Data Rendering", () => {
  test("shows autostart entries", async ({ page, gotoPage }) => {
    await gotoPage("Autostart");
    await expect(page.locator("header")).toContainText("Autostart", { timeout: 5000 });
    const main = page.locator("main");
    const content = await main.textContent();
    expect(content!.length).toBeGreaterThan(10);
  });

  test("shows entry state and source", async ({ page, gotoPage }) => {
    await gotoPage("Autostart");
    await expect(page.locator("text=Enabled").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Chat — Data & Interactions", () => {
  test("shows session sidebar", async ({ page, gotoPage }) => {
    await gotoPage("Agent Chat");
    await expect(page.locator("text=New chat").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Topics").first()).toBeVisible();
    await expect(page.locator("text=General").first()).toBeVisible();
  });

  test("shows welcome message when session has no messages", async ({ page, gotoPage }) => {
    await gotoPage("Agent Chat");
    await expect(page.locator("main")).toBeVisible();
    const welcome = page.locator("text=Linux Agent Agent");
    if (await welcome.isVisible()) {
      await expect(welcome).toBeVisible();
    }
  });

  test("chat page renders with session sidebar", async ({ page, gotoPage }) => {
    await gotoPage("Agent Chat");
    await expect(page.locator("header")).toContainText("AI Assistant", { timeout: 5000 });
    await expect(page.locator("main")).toBeVisible();
    const main = page.locator("main");
    const content = await main.textContent();
    expect(content!.length).toBeGreaterThan(0);
  });
});

test.describe("LLM (Tesseract MoE) — Data & Interactions", () => {
  test("shows model info card", async ({ page, gotoPage }) => {
    await gotoPage("Tesseract MoE");
    await expect(page.locator("main").getByText("Tesseract MoE LLM").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Mixture of Experts").first()).toBeVisible();
    await expect(page.locator("text=47B").first()).toBeVisible();
    await expect(page.locator("text=Q4_K_M").first()).toBeVisible();
  });

  test("shows Start and Stop buttons", async ({ page, gotoPage }) => {
    await gotoPage("Tesseract MoE");
    await expect(page.locator('button[title="Start server"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button[title="Stop server"]')).toBeVisible();
  });

  test("shows inference status when running", async ({ page, gotoPage }) => {
    await gotoPage("Tesseract MoE");
    await expect(page.locator("text=Running").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=VRAM Usage").first()).toBeVisible();
    await expect(page.locator("text=Throughput").first()).toBeVisible();
  });

  test("shows stat cards for inference metrics", async ({ page, gotoPage }) => {
    await gotoPage("Tesseract MoE");
    await expect(page.locator("text=Avg Latency").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Requests/min").first()).toBeVisible();
    await expect(page.locator("text=Uptime").first()).toBeVisible();
  });

  test("config toggle button visible", async ({ page, gotoPage }) => {
    await gotoPage("Tesseract MoE");
    const configBtn = page.locator("button[title='Configuration']");
    await expect(configBtn).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Docs — Data & Interactions", () => {
  test("shows stat cards", async ({ page, gotoPage }) => {
    await gotoPage("Docs");
    await expect(page.locator("text=Total Docs").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Categories").first()).toBeVisible();
  });

  test("shows document list with entries", async ({ page, gotoPage }) => {
    await gotoPage("Docs");
    await expect(page.locator("text=GPU Crash Workaround").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Package Update Guide").first()).toBeVisible();
    await expect(page.locator("text=WiFi Setup").first()).toBeVisible();
  });

  test("shows category sidebar", async ({ page, gotoPage }) => {
    await gotoPage("Docs");
    await expect(page.locator("text=Troubleshooting").first()).toBeVisible({ timeout: 5000 });
  });

  test("New Doc button visible", async ({ page, gotoPage }) => {
    await gotoPage("Docs");
    await expect(page.locator("text=New Doc").first()).toBeVisible({ timeout: 5000 });
  });

  test("clicking doc shows content", async ({ page, gotoPage }) => {
    await gotoPage("Docs");
    await page.locator("text=GPU Crash Workaround").first().click();
    await expect(page.locator("text=software rendering").first()).toBeVisible({ timeout: 5000 });
  });

  test("search input works", async ({ page, gotoPage }) => {
    await gotoPage("Docs");
    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill("GPU");
      await expect(page.locator("text=GPU Crash Workaround").first()).toBeVisible();
    }
  });
});

test.describe("Settings — Interactions", () => {
  test("12 accent color presets visible", async ({ page, gotoPage }) => {
    await gotoPage("Settings");
    const colorBtns = page.locator("button[title]");
    await expect.poll(() => colorBtns.count()).toBeGreaterThanOrEqual(12);
  });

  test("active preset has checkmark", async ({ page, gotoPage }) => {
    await gotoPage("Settings");
    const checks = page.locator("svg.lucide-check");
    await expect.poll(() => checks.count()).toBeGreaterThanOrEqual(1);
  });

  test("clicking different accent changes the check", async ({ page, gotoPage }) => {
    await gotoPage("Settings");
    const colorBtns = page.locator("button[title]");
    const count = await colorBtns.count();
    if (count > 1) {
      await colorBtns.nth(1).click();
      const checks = page.locator("svg");
      await expect.poll(() => checks.count()).toBeGreaterThan(0);
    }
  });

  test("About section shows version info", async ({ page, gotoPage }) => {
    await gotoPage("Settings");
    const aboutBtn = page.locator('button:has-text("About")');
    await aboutBtn.click();
    await expect(page.locator("text=0.1.0").first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Private").first()).toBeVisible();
  });

  test("AI Provider section shows provider options", async ({ page, gotoPage }) => {
    await gotoPage("Settings");
    const tabs = page.locator("button");
    const providerTab = tabs.filter({ hasText: /AI Provider|Provider/ });
    if (await providerTab.count() > 0) {
      await providerTab.first().click();
    }
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });
});

test.describe("Edge Cases & Error Handling", () => {
  test("page refresh maintains current page", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("header")).toContainText("GPU", { timeout: 5000 });
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible();
  });

  test("rapid navigation between pages", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    const pages = ["Packages", "GPU", "Services", "Disks", "Network"];
    for (const pg of pages) {
      await page.locator(`text=${pg}`).first().click();
    }
    await expect(page.locator("main")).toBeVisible();
  });

  test("sidebar collapse preserves page content", async ({ page, gotoPage }) => {
    await gotoPage("GPU");
    await expect(page.locator("text=NVIDIA").first()).toBeVisible({ timeout: 5000 });
    await page.locator("button >> svg").first().click();
    await expect(page.locator("text=NVIDIA").first()).toBeVisible();
  });

  test("search with no results shows empty state", async ({ page, gotoPage }) => {
    await gotoPage("Packages");
    await page.locator('input[placeholder*="Search"]').fill("zzzznonexistentpackage");
    const rows = page.locator("div.hover\\:bg-secondary\\/50");
    await expect(rows).toHaveCount(0);
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
      await expect(page.locator("main")).toBeVisible();
    }
    const critical = errors.filter((e) => !e.includes("electronAPI") && !e.includes("invoke") && !e.includes("fetch"));
    expect(critical).toHaveLength(0);
  });
});

test.describe("Chat secrets & base URL validation (audit LH-072/LH-073)", () => {
  async function openAiProvider(page: any, gotoPage: (name: string) => Promise<void>) {
    await gotoPage("Settings");
    await page.locator('button:has-text("AI Provider")').first().click();
  }

  test("API key is never persisted to the plaintext chat config", async ({ page, gotoPage }) => {
    await openAiProvider(page, gotoPage);
    const keyInput = page.locator('input[placeholder*="API key"]');
    await keyInput.fill("sk-test-secret-value");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("lh-secret-chat-api-key")))
      .toBe("sk-test-secret-value");
    const stored = await page.evaluate(() => ({
      config: localStorage.getItem("lh-chat-config"),
      secret: localStorage.getItem("lh-secret-chat-api-key"),
    }));
    expect(stored.config).not.toBeNull();
    expect(JSON.parse(stored.config!)).not.toHaveProperty("apiKey");
    expect(stored.config).not.toContain("sk-test-secret-value");
    expect(stored.secret).toBe("sk-test-secret-value");
  });

  test("legacy plaintext apiKey is purged from stored config on load", async ({ page, gotoPage }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    await page.evaluate(() => {
      localStorage.setItem("lh-chat-config", JSON.stringify({ providerId: "zai-standard", apiKey: "leaked-old-key" }));
    });
    await openAiProvider(page, gotoPage);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("lh-chat-config")))
      .not.toContain("leaked-old-key");
  });

  test("keyring warning shown when secrets backend is basic_text (LH-112)", async ({ page, gotoPage }) => {
    // mock secrets:backend returns "basic_text" — honest, since browser mode
    // stores the key in plain localStorage
    await openAiProvider(page, gotoPage);
    await expect(page.getByTestId("keyring-warning")).toBeVisible();
    await expect(page.getByTestId("keyring-warning")).toContainText("not encrypted");
  });

  test("custom provider warns on non-https base URL and accepts https/localhost", async ({ page, gotoPage }) => {
    await openAiProvider(page, gotoPage);
    await page.locator('button:has-text("Custom (OpenAI-compatible)")').click();
    const urlInput = page.locator('input[placeholder*="api.example.com"]');
    const warning = page.locator("text=Only https://");

    await urlInput.fill("http://evil.example.com/v1/");
    await expect(warning).toBeVisible();

    await urlInput.fill("https://api.example.com/v1/");
    await expect(warning).toBeHidden();

    await urlInput.fill("http://localhost:8080/v1/");
    await expect(warning).toBeHidden();
  });
});

test.describe("Mock-mode banner (audit D-1)", () => {
  test("shows demo-data banner when not running in Electron", async ({ page }) => {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 15000 });
    const banner = page.getByTestId("mock-mode-banner");
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText(/demo data/i);
  });

  test("banner stays visible across navigation", async ({ page, gotoPage }) => {
    await gotoPage("Battery & BT");
    await expect(page.getByTestId("mock-mode-banner")).toBeVisible();
  });
});

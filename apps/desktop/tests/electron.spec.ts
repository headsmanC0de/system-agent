// Electron-mode e2e (audit gap closer). Unlike the browser-mode specs, this launches
// the real built app (out/main/main.js) so it actually exercises the main process:
// the CSP (S-3), the preload IPC allowlist (S-4), nav guards (S-5), and a real IPC
// round-trip. Requires `npm run build` first (config's webServer is unused here).
import { type ElectronApplication, _electron as electron, expect, type Page, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const mainEntry = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "main", "main.js");

let app: ElectronApplication;
let win: Page;

test.beforeAll(async () => {
  app = await electron.launch({ args: [mainEntry] });
  win = await app.firstWindow();
  await win.waitForLoadState("domcontentloaded");
});

test.afterAll(async () => {
  await app?.close();
});

test("app launches and renders the real window", async () => {
  expect(await win.title()).toBe("Linux Agent");
  // electronAPI must be exposed by the preload (this is the real Electron path).
  expect(await win.evaluate(() => typeof (window as any).electronAPI?.invoke)).toBe("function");
});

test("S-4: preload allows known IPC channels and blocks unknown ones", async () => {
  // Known channel → real handler runs in the main process and resolves.
  const overview = await win.evaluate(() => (window as any).electronAPI.invoke("system:overview"));
  expect(overview).toBeTruthy();
  expect((overview as { hostname?: string }).hostname).toBeTruthy();

  // Unknown channel → rejected by the allowlist before it can reach ipcMain.
  const blocked = await win.evaluate(async () => {
    try {
      await (window as any).electronAPI.invoke("evil:arbitrary-channel");
      return "ALLOWED";
    } catch (e) {
      return (e as Error).message;
    }
  });
  expect(blocked).toContain("Blocked IPC channel");
});

test("S-3: production renderer ships a strict CSP", async () => {
  // file:// loads bypass session.onHeadersReceived, so the prod build injects a CSP
  // <meta>. Assert it's present in the loaded document and is actually strict.
  // (Eval-blocking can't be checked via page.evaluate — Playwright's eval runs in an
  //  isolated utility world that isn't subject to the page CSP.)
  const csp = await win.evaluate(
    () =>
      document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        ?.getAttribute("content") ?? "",
  );
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain("unsafe-eval");
});

test("S-5: window.open is denied by setWindowOpenHandler", async () => {
  const opened = await win.evaluate(() => {
    const w = window.open("https://example.com", "_blank");
    return w === null;
  });
  expect(opened).toBe(true);
});

// LH-063: the recovered-sandbox path (GPU workaround disabled). The app must still
// launch and expose the preload API when the NVIDIA+Wayland sandbox flags are NOT set.
test("S-2/LH-063: app launches with the GPU sandbox workaround disabled", async () => {
  const app2 = await electron.launch({
    args: [mainEntry],
    env: { ...process.env, LH_GPU_WORKAROUND: "0" },
  });
  try {
    const w2 = await app2.firstWindow();
    await w2.waitForLoadState("domcontentloaded");
    expect(await w2.title()).toBe("Linux Agent");
    expect(await w2.evaluate(() => typeof (window as any).electronAPI?.invoke)).toBe("function");
  } finally {
    await app2.close();
  }
});

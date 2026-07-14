// Electron-mode e2e (audit gap closer). Unlike the browser-mode specs, this launches
// the real built app (out/main/main.js) so it actually exercises the main process:
// the CSP (S-3), the preload IPC allowlist (S-4), nav guards (S-5), and a real IPC
// round-trip. Requires `npm run build` first (config's webServer is unused here).
import { type ElectronApplication, _electron as electron, expect, type Page, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BRAND_NAME } from "../src/lib/branding";

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
  expect(await win.title()).toBe(BRAND_NAME);
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

// LH-066b smoke (real Arch host): the read-only handlers implemented from mock-only
// channels actually execute their commands here. rollback-snapshot is intentionally
// NOT invoked (destructive); create/delete need polkit auth (pkexec) — not headless-safe.
test("LH-066b: read-only system handlers return sane data on a real host", async () => {
  const invoke = (ch: string, ...args: unknown[]) =>
    win.evaluate(([c, a]) => (window as any).electronAPI.invoke(c, ...(a as unknown[])), [ch, args] as const);

  const logs = (await invoke("system:logs", 5)) as string;
  expect(typeof logs).toBe("string");
  expect(logs.length).toBeGreaterThan(0);

  const ifaces = (await invoke("system:network-interfaces")) as unknown[];
  expect(Array.isArray(ifaces)).toBe(true);
  expect(ifaces.length).toBeGreaterThan(0); // at least loopback

  const ports = (await invoke("system:open-ports")) as unknown[];
  expect(Array.isArray(ports)).toBe(true);

  const specs = (await invoke("system:hardware-specs")) as { category: string; model: string }[];
  expect(Array.isArray(specs)).toBe(true);
  expect(specs.some((s) => s.category === "cpu")).toBe(true);

  // snapper list runs unprivileged now (LH-110); without ALLOW_USERS it must
  // degrade to an empty array, never throw.
  const snaps = (await invoke("system:snapshots")) as unknown[];
  expect(Array.isArray(snaps)).toBe(true);
});

test("LH-073: secrets round-trip through safeStorage, names validated", async () => {
  const value = await win.evaluate(async () => {
    await (window as any).electronAPI.invoke("secrets:set", "e2e-test", "s3cret-roundtrip");
    const got = await (window as any).electronAPI.invoke("secrets:get", "e2e-test");
    await (window as any).electronAPI.invoke("secrets:set", "e2e-test", "");
    return got;
  });
  expect(value).toBe("s3cret-roundtrip");

  const rejected = await win.evaluate(async () => {
    try {
      await (window as any).electronAPI.invoke("secrets:get", "../../etc/passwd");
      return "ALLOWED";
    } catch (e) {
      return (e as Error).message;
    }
  });
  expect(rejected).toContain("Invalid secret name");

  // LH-112: the backend is reported so the UI can warn when keys are only
  // obfuscated (basic_text = no unlocked keyring).
  const backend = await win.evaluate(() => (window as any).electronAPI.invoke("secrets:backend"));
  expect(["basic_text", "gnome_libsecret", "kwallet", "kwallet5", "kwallet6", "unknown", "os-keychain"]).toContain(
    backend,
  );
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
    expect(await w2.title()).toBe(BRAND_NAME);
    expect(await w2.evaluate(() => typeof (window as any).electronAPI?.invoke)).toBe("function");
  } finally {
    await app2.close();
  }
});

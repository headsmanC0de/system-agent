// Electron-mode e2e (audit gap closer). Unlike the browser-mode specs, this launches
// the real built app (out/main/main.js) so it actually exercises the main process:
// the CSP (S-3), the preload IPC allowlist (S-4), nav guards (S-5), and a real IPC
// round-trip. Requires `npm run build` first (config's webServer is unused here).

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type ElectronApplication, _electron as electron, expect, type Page, test } from "@playwright/test";
import { BRAND_ID, BRAND_NAME } from "../src/lib/branding";

const mainEntry = join(dirname(fileURLToPath(import.meta.url)), "..", "out", "main", "main.js");
const rendererAssets = join(dirname(mainEntry), "..", "renderer", "assets");
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

let app: ElectronApplication;
let win: Page;
let profilePath: string;

test("production renderer excludes demo fixtures", () => {
  const javascript = readdirSync(rendererAssets)
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFileSync(join(rendererAssets, name), "utf8"))
    .join("\n");
  expect(javascript).not.toContain("AMD Ryzen 9 7950X");
  expect(javascript).not.toContain("WH-1000XM6");
  expect(javascript).not.toContain("R351MOCK1234");
  expect(javascript).not.toContain("ghp_MOCK_NOT_A_REAL_TOKEN");
  expect(javascript).not.toContain("/home/user/models/tesseract-moe-q4km.gguf");
  expect(javascript).not.toContain("All 3 targets built clean in 4.2s");
  expect(javascript).not.toContain("Demo handler missing");
});

test.beforeAll(async () => {
  profilePath = mkdtempSync(join(tmpdir(), "system-agent-e2e-"));
  const profileArg = `--user-data-dir=${profilePath}`;
  const executablePath = process.env.SYSTEM_AGENT_EXECUTABLE;
  app = executablePath
    ? await electron.launch({ executablePath, args: [profileArg] })
    : await electron.launch({ args: [mainEntry, profileArg] });
  win = await app.firstWindow();
  await win.waitForLoadState("domcontentloaded");
});

test.afterAll(async () => {
  await app?.close();
  rmSync(profilePath, { force: true, recursive: true });
});

test("app launches and renders the real window", async () => {
  expect(await win.title()).toBe(BRAND_NAME);
  expect(new URL(win.url()).protocol).toBe(`${BRAND_ID}:`);
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

  const exposed = await win.evaluate(() => Object.keys((window as any).electronAPI).sort());
  expect(exposed).toEqual(["invoke"]);
  expect(await win.evaluate(() => (window as any).electronAPI.ipcRenderer)).toBeUndefined();
  expect(await win.evaluate(() => (window as any).electronAPI.process)).toBeUndefined();
  expect(await win.evaluate(() => (window as any).electronAPI.webFrame)).toBeUndefined();
});

test("project inspection reads the requested package instead of seeded metadata", async () => {
  const project = (await win.evaluate(
    ([path]) => (window as any).electronAPI.invoke("projects:inspect", path),
    [repoRoot],
  )) as { id: string; path: string; name: string; totalDeps: number; checks: Array<{ status: string }> };
  expect(project.id).toBe(repoRoot);
  expect(project.path).toBe(repoRoot);
  expect(project.name).toBe("system-agent");
  expect(project.totalDeps).toBeGreaterThan(0);
  expect(project.checks.every((check) => check.status === "pass")).toBe(true);
});

test("embedded SQLite persists document CRUD exclusively through repository-backed IPC", async () => {
  const title = `Electron SQLite ${crypto.randomUUID()}`;
  const created = (await win.evaluate(
    ([value]) =>
      (window as any).electronAPI.invoke("docs:create", {
        title: value,
        content: "created through the production bridge",
        category: "E2E",
        tags: ["sqlite", "repository"],
      }),
    [title],
  )) as { id: string; title: string };

  try {
    expect(created.title).toBe(title);
    const listed = (await win.evaluate(
      ([search]) => (window as any).electronAPI.invoke("docs:list", { search }),
      [title],
    )) as Array<{ id: string }>;
    expect(listed.map((entry) => entry.id)).toContain(created.id);

    const updated = (await win.evaluate(
      ([id]) => (window as any).electronAPI.invoke("docs:update", id, { content: "updated durably" }),
      [created.id],
    )) as { content: string };
    expect(updated.content).toBe("updated durably");
  } finally {
    await win.evaluate(([id]) => (window as any).electronAPI.invoke("docs:delete", id), [created.id]);
  }

  const afterDelete = (await win.evaluate(
    ([search]) => (window as any).electronAPI.invoke("docs:list", { search }),
    [title],
  )) as unknown[];
  expect(afterDelete).toEqual([]);
});

test("S-3: production renderer ships a strict CSP", async () => {
  // The build injects a defense-in-depth CSP meta tag in addition to protocol headers.
  // (Eval-blocking can't be checked via page.evaluate — Playwright's eval runs in an
  //  isolated utility world that isn't subject to the page CSP.)
  const csp = await win.evaluate(
    () => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute("content") ?? "",
  );
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).not.toContain("unsafe-eval");
});

test("CSP blocks inline scripts in the production main world", async () => {
  const executed = await win.evaluate(async () => {
    (window as any).__inlineCspProbe = false;
    const script = document.createElement("script");
    script.textContent = "window.__inlineCspProbe = true";
    document.body.appendChild(script);
    await new Promise((resolve) => setTimeout(resolve, 0));
    return (window as any).__inlineCspProbe;
  });
  expect(executed).toBe(false);
});

test("custom protocol blocks encoded traversal and session permissions", async () => {
  const traversal = await win.evaluate(async () => {
    try {
      const response = await fetch("system-agent://bundle/%2e%2e/%2e%2e/etc/passwd");
      return { blocked: response.status === 404, body: await response.text() };
    } catch {
      return { blocked: true, body: "" };
    }
  });
  expect(traversal.blocked).toBe(true);
  expect(traversal.body).not.toContain("root:");

  const permission = await win.evaluate(async () => (await navigator.permissions.query({ name: "geolocation" })).state);
  expect(permission).toBe("denied");
});

test("top-level navigation away from the exact app origin is denied", async () => {
  const initialUrl = win.url();
  await win.evaluate(() => {
    window.location.href = "https://example.com/blocked";
  });
  await expect.poll(() => win.url()).toBe(initialUrl);
});

test("S-5: window.open is denied by setWindowOpenHandler", async () => {
  const opened = await win.evaluate(() => {
    const w = window.open("https://example.com", "_blank");
    return w === null;
  });
  expect(opened).toBe(true);
});

// Real Arch host smoke: read-only handlers execute their commands here. Snapshot rollback is intentionally
// NOT invoked (destructive); create/delete need polkit auth (pkexec) — not headless-safe.
test("read-only system handlers return truthful data on a real host", async () => {
  const invoke = (ch: string, ...args: unknown[]) =>
    win.evaluate(([c, a]) => (window as any).electronAPI.invoke(c, ...(a as unknown[])), [ch, args] as const);

  const logs = (await invoke("system:logs", 5)) as {
    capturedAt: string;
    entries: Array<{ message: string; priority: string; timestamp: string; unit: string }>;
    error: string | null;
    source: string;
    status: string;
  };
  expect(logs.source).toBe("journalctl");
  expect(logs.status).toBe("ok");
  expect(logs.error).toBeNull();
  expect(Number.isNaN(Date.parse(logs.capturedAt))).toBe(false);
  expect(logs.entries.length).toBeGreaterThan(0);
  expect(logs.entries[0]?.message).toBeTruthy();

  const network = (await invoke("system:network")) as {
    capturedAt: string;
    error: string | null;
    hostname: string;
    publicIp: null;
    reachability: string;
    source: string;
    status: string;
  };
  expect(network.hostname).toBeTruthy();
  expect(network.publicIp).toBeNull();
  expect(network.reachability).toBe("unknown");
  expect(network.source).toContain("/proc/net/dev");
  expect(["ok", "partial"]).toContain(network.status);
  expect(Number.isNaN(Date.parse(network.capturedAt))).toBe(false);

  const ifaces = (await invoke("system:network-interfaces")) as unknown[];
  expect(Array.isArray(ifaces)).toBe(true);
  expect(ifaces.length).toBeGreaterThan(0); // at least loopback

  const ports = (await invoke("system:open-ports")) as unknown[];
  expect(Array.isArray(ports)).toBe(true);

  const specs = (await invoke("system:hardware-specs")) as { category: string; model: string }[];
  expect(Array.isArray(specs)).toBe(true);
  expect(specs.some((s) => s.category === "cpu")).toBe(true);

  const health = (await invoke("system:health")) as {
    status: string;
    error: string | null;
    checks: Array<{ id: string; status: string }>;
    diskUsage: number | null;
  };
  expect(["ok", "partial", "error"]).toContain(health.status);
  expect(health.checks.some((check) => check.id === "svc-critical" || check.id === "pkg-security")).toBe(false);
  expect(health.diskUsage === null || health.diskUsage > 0).toBe(true);
  expect(health.checks.filter((check) => check.status === "na").length > 0).toBe(health.status !== "ok");

  // Snapper listing is either real data or a correlated failure when ALLOW_USERS is absent.
  const snapshots = await win.evaluate(async () => {
    try {
      return { value: await (window as any).electronAPI.invoke("system:snapshots"), error: null };
    } catch (error) {
      return { value: null, error: (error as Error).message };
    }
  });
  if (snapshots.error) {
    expect(snapshots.error).toMatch(/IPC request failed \([a-z_]+, request [0-9a-f-]{36}\)/);
  } else {
    expect(Array.isArray(snapshots.value)).toBe(true);
  }
});

test("secrets round-trip through safeStorage and names are validated", async () => {
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
  expect(rejected).toContain("invalid_argument");
  expect(rejected).toMatch(/request [0-9a-f-]{36}/);
  expect(rejected).not.toContain("../../etc/passwd");

  // The backend is reported so the UI can warn when keys are only
  // obfuscated (basic_text = no unlocked keyring).
  const backend = await win.evaluate(() => (window as any).electronAPI.invoke("secrets:backend"));
  expect(["basic_text", "gnome_libsecret", "kwallet", "kwallet5", "kwallet6", "unknown", "os-keychain"]).toContain(
    backend,
  );
});

test("corrupt secret storage fails closed instead of looking empty", async () => {
  writeFileSync(join(profilePath, "secrets.json"), "{not-json", { mode: 0o600 });
  const rejected = await win.evaluate(async () => {
    try {
      await (window as any).electronAPI.invoke("secrets:get", "e2e-test");
      return "ALLOWED";
    } catch (error) {
      return (error as Error).message;
    }
  });
  expect(rejected).toContain("persistence_failure");
  expect(rejected).toMatch(/request [0-9a-f-]{36}/);
});

test("S-2: globally sandboxed launch keeps the minimal preload available", async () => {
  expect(await win.evaluate(() => typeof (window as any).electronAPI?.invoke)).toBe("function");
});

import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, chromium, expect, type Page, test } from "@playwright/test";
import { BRAND_ID, BRAND_NAME } from "../src/lib/branding";

const executable = process.env.SYSTEM_AGENT_EXECUTABLE;
let processHandle: ChildProcess;
let browser: Browser;
let page: Page;
let profile: string;

async function availablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Failed to reserve a CDP port"));
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

async function startInstalledApp(): Promise<void> {
  if (!executable) throw new Error("SYSTEM_AGENT_EXECUTABLE is required");
  const port = await availablePort();
  processHandle = spawn(executable, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`], {
    stdio: "ignore",
    env: { ...process.env, SYSTEM_AGENT_TRACE: "1" },
  });
  await expect
    .poll(
      async () => {
        try {
          browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
          return true;
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  page = browser.contexts()[0]?.pages()[0] as Page;
  await page.waitForLoadState("domcontentloaded");
}

async function stopInstalledApp(): Promise<void> {
  await browser?.close();
  if (!processHandle?.killed) {
    const exited = new Promise<void>((resolve) => processHandle.once("exit", () => resolve()));
    processHandle.kill("SIGTERM");
    await exited;
  }
}

test.beforeAll(async () => {
  profile = mkdtempSync(join(tmpdir(), "system-agent-installed-"));
  await startInstalledApp();
});

test.afterAll(async () => {
  await stopInstalledApp();
  rmSync(profile, { recursive: true, force: true });
});

test("installed hardened artifact renders and exposes repository-backed real IPC", async () => {
  await expect(page).toHaveTitle(BRAND_NAME);
  expect(new URL(page.url()).protocol).toBe(`${BRAND_ID}:`);
  expect(await page.evaluate(() => Object.keys((window as any).electronAPI).sort())).toEqual(["invoke"]);

  const overview = (await page.evaluate(() => (window as any).electronAPI.invoke("system:overview"))) as {
    hostname: string;
  };
  expect(overview.hostname).toBeTruthy();

  const title = `Installed SQLite ${crypto.randomUUID()}`;
  const created = (await page.evaluate(
    ([value]) =>
      (window as any).electronAPI.invoke("docs:create", {
        title: value,
        content: "installed artifact",
        category: "E2E",
        tags: ["installed"],
      }),
    [title],
  )) as { id: string };

  const logPath = join(profile, "logs", "main.jsonl");
  await expect.poll(() => readFileSync(logPath, "utf8")).toContain('"channel":"system:overview"');
  expect(readFileSync(logPath, "utf8")).toContain('"event":"started"');
  expect(statSync(logPath).mode & 0o777).toBe(0o600);

  await stopInstalledApp();
  expect(readFileSync(logPath, "utf8")).toContain('"event":"stopped"');
  await startInstalledApp();
  const persisted = (await page.evaluate(
    ([search]) => (window as any).electronAPI.invoke("docs:list", { search }),
    [title],
  )) as Array<{ id: string }>;
  expect(persisted.map((entry) => entry.id)).toContain(created.id);
  await page.evaluate(([id]) => (window as any).electronAPI.invoke("docs:delete", id), [created.id]);
});

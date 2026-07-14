import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { cpus, freemem, hostname, loadavg, networkInterfaces, release, tmpdir, totalmem } from "node:os";
import { join } from "node:path";
import { type Browser, chromium, expect, type Page, test } from "@playwright/test";
import type { CpuSample, MemoryData, NetworkSummary, OverviewData, SystemHealth } from "@project/types";
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

test("live production metrics agree with independent host sources", async () => {
  const invoke = <T>(channel: string) =>
    page.evaluate(([name]) => (window as any).electronAPI.invoke(name), [channel]) as Promise<T>;
  const command = (executable: string, args: string[]) => {
    const result = spawnSync(executable, args, { encoding: "utf8" });
    if (result.status !== 0 && result.status !== 1) throw new Error(`${executable} probe failed with ${result.status}`);
    return result.stdout.trim();
  };
  const countLines = (value: string) => value.split("\n").filter(Boolean).length;

  const overview = await invoke<OverviewData>("system:overview");
  const directDisk = command("df", ["-h", "/", "--output=size,used,avail,pcent"]).split("\n").at(-1)!;
  const directLoad = loadavg();
  const appLoad = overview.load.split(",").map((value) => Number(value.trim()));
  expect(overview.hostname).toBe(hostname());
  expect(overview.kernel).toBe(release());
  expect(overview.arch).toBe(command("uname", ["-m"]));
  expect(Number(overview.cpuCores)).toBe(Number(command("nproc", [])));
  expect(overview.cpuModel).toBe(cpus()[0]?.model.trim());
  expect(overview.disk.trim().split(/\s+/)).toEqual(directDisk.trim().split(/\s+/));
  expect(overview.uptime).toBe(command("uptime", ["-p"]));
  for (const [index, value] of appLoad.entries()) expect(Math.abs(value - directLoad[index]!)).toBeLessThan(0.25);

  const memory = await invoke<MemoryData>("system:memory");
  const directMemory = command("free", ["--bytes"])
    .split("\n")
    .map((line) => line.trim().split(/\s+/));
  expect(memory.mem.total).toBe(directMemory[1]?.[1]);
  expect(memory.swap.total).toBe(directMemory[2]?.[1]);
  const availableDelta = Math.abs(Number(memory.mem.available) - Number(directMemory[1]?.[6]));
  expect(availableDelta).toBeLessThan(512 * 1024 * 1024);

  const cpu = await invoke<CpuSample>("system:cpu-usage");
  const directCpu = readFileSync("/proc/stat", "utf8").split("\n")[0]!.split(/\s+/).slice(1).map(Number);
  const directIdle = directCpu[3]! + (directCpu[4] || 0);
  const directTotal = directCpu.reduce((sum, value) => sum + value, 0);
  expect(directIdle).toBeGreaterThanOrEqual(cpu.idle);
  expect(directTotal).toBeGreaterThanOrEqual(cpu.total);
  expect(directTotal - cpu.total).toBeLessThan(10_000);

  const network = await invoke<NetworkSummary>("system:network");
  const directTraffic = readFileSync("/proc/net/dev", "utf8")
    .split("\n")
    .slice(2)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 10 && parts[0] !== "lo:")
    .map((parts) => ({ name: parts[0]!.replace(":", ""), rxBytes: Number(parts[1]), txBytes: Number(parts[9]) }));
  const directRx = directTraffic.reduce((sum, item) => sum + item.rxBytes, 0);
  const directTx = directTraffic.reduce((sum, item) => sum + item.txBytes, 0);
  const expectedLocalIp =
    Object.values(networkInterfaces())
      .flat()
      .find((entry) => entry && entry.family === "IPv4" && !entry.internal)?.address ?? null;
  const route = JSON.parse(command("ip", ["-j", "route", "show", "default"])) as Array<{ gateway?: string }>;
  expect(network.hostname).toBe(hostname());
  expect(network.localIp).toBe(expectedLocalIp);
  expect(network.gateway).toBe(route[0]?.gateway ?? null);
  expect(network.publicIp).toBeNull();
  expect(network.reachability).toBe("unknown");
  expect(directRx).toBeGreaterThanOrEqual(network.totalRx!);
  expect(directTx).toBeGreaterThanOrEqual(network.totalTx!);
  expect(directRx - network.totalRx!).toBeLessThan(1024 * 1024 * 1024);
  expect(directTx - network.totalTx!).toBeLessThan(1024 * 1024 * 1024);

  const health = await invoke<SystemHealth>("system:health");
  const directOutdated = countLines(command("pacman", ["-Qu", "--color", "never"]));
  const directOrphans = countLines(command("pacman", ["-Qdtq", "--color", "never"]));
  const directFailed = countLines(command("systemctl", ["list-units", "--failed", "--no-legend", "--no-pager"]));
  const directUserProblems = command("systemctl", [
    "--user",
    "list-units",
    "--type=service",
    "--state=failed,activating",
    "--no-pager",
    "--no-legend",
    "--plain",
  ])
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts[2] === "failed" || parts[3] === "auto-restart").length;
  const directDiskUsage = Number(command("df", ["/", "--output=pcent"]).match(/\d+/)?.[0]);
  const directMemoryUsage = Math.round(((totalmem() - freemem()) / totalmem()) * 100);
  expect(health.hostname).toBe(hostname());
  expect(health.kernel).toBe(release());
  expect(health.outdatedPackages).toBe(directOutdated);
  expect(health.orphansCount).toBe(directOrphans);
  expect(health.failedServices).toBe(directFailed);
  expect(health.userServiceProblems).toBe(directUserProblems);
  expect(health.diskUsage).toBe(directDiskUsage);
  expect(Math.abs(health.memoryUsage! - directMemoryUsage)).toBeLessThanOrEqual(2);

  await expect(page.locator("main")).toContainText(overview.hostname);
  await expect(page.locator("main")).toContainText(overview.kernel);
  await expect(page.locator("main")).toContainText(`${overview.cpuCores} cores`);

  const networkButton = page.getByRole("button", { name: "Network", exact: true });
  await networkButton.evaluate((element: HTMLButtonElement) => element.click());
  await expect(page.locator("header")).toContainText("Network Connections");
  await expect(page.locator("main")).toContainText(network.localIp ?? "Unavailable");
  await expect(page.locator("main")).toContainText(`Gateway: ${network.gateway ?? "Unavailable"}`);
  await expect(page.locator("main")).toContainText("Collection Status");
  await expect(page.locator("main")).toContainText("Reachability unknown");

  const projectsButton = page.getByRole("button", { name: "Projects", exact: true });
  await projectsButton.evaluate((element: HTMLButtonElement) => element.click());
  const systemCard = page.locator("main").getByRole("button").filter({ hasText: "System" });
  await systemCard.evaluate((element: HTMLButtonElement) => element.click());
  await expect(page.locator("main")).toContainText(`${health.outdatedPackages} outdated`);
  await expect(page.locator("main")).toContainText(`${health.orphansCount} orphans`);
  await expect(page.locator("main")).toContainText(`${health.userServiceProblems} user svc`);
  await expect(page.locator("main")).toContainText(`${health.diskUsage}%`);

  console.log(
    `LIVE_METRICS_AUDIT ${JSON.stringify({
      cpuCores: overview.cpuCores,
      disk: overview.disk,
      health: {
        diskUsage: health.diskUsage,
        failedServices: health.failedServices,
        userServiceProblems: health.userServiceProblems,
        memoryUsage: health.memoryUsage,
        orphans: health.orphansCount,
        outdated: health.outdatedPackages,
        status: health.status,
      },
      hostname: overview.hostname,
      kernel: overview.kernel,
      memoryAvailableDeltaBytes: availableDelta,
      network: {
        gateway: network.gateway,
        localIp: network.localIp,
        rxDeltaBytes: directRx - network.totalRx!,
        status: network.status,
        txDeltaBytes: directTx - network.totalTx!,
      },
    })}`,
  );
});

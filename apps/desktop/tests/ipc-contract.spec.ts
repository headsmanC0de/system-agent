// Contract guard: channels.ts is the SSOT allowlist, but the three
// sides of the IPC bus are maintained by hand. The renderer side is enforced at
// compile time (invoke(channel: IpcChannel)); this spec enforces the main-process
// side: every allowlisted channel has an ipcMain.handle, every handler is
// allowlisted, and every channel has an explicit dev-only demo fallback.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const CHANNEL_RE = /"([a-z]+:[a-z0-9-]+)"/g;

function channelSet(text: string, re: RegExp): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(re)) out.add(m[1]!);
  return out;
}

const ipcSrc = readFileSync(join(SRC, "main", "ipc.ts"), "utf8");
const channelsSrc = readFileSync(join(SRC, "main", "channels.ts"), "utf8");
const demoSrc = readFileSync(join(SRC, "testing", "demo-api.ts"), "utf8");

// registrations go through the sender-validating handle() wrapper (checklist #17)
const handlers = channelSet(ipcSrc, /\bhandle\(\s*"([a-z]+:[a-z0-9-]+)"/g);
const allowlist = channelSet(channelsSrc.split("] as const")[0]!, CHANNEL_RE);
const demoBlock = demoSrc.slice(
  demoSrc.indexOf("export const DEMO_HANDLERS"),
  demoSrc.indexOf("const SYSTEM_AGENT_DEPS"),
);
const demoHandlers = channelSet(demoBlock, /^\s+"([a-z]+:[a-z0-9-]+)":/gm);

test("contract surfaces are non-trivial (regex sanity)", () => {
  expect(handlers.size).toBeGreaterThanOrEqual(60);
  expect(allowlist.size).toBeGreaterThanOrEqual(60);
  expect(demoHandlers.size).toBeGreaterThanOrEqual(60);
});

test("every allowlisted channel has an ipcMain.handle and vice versa", () => {
  const missingHandler = [...allowlist].filter((c) => !handlers.has(c));
  const unlisted = [...handlers].filter((c) => !allowlist.has(c));
  expect(missingHandler, "channels.ts entries with no ipcMain.handle").toEqual([]);
  expect(unlisted, "ipcMain.handle channels missing from channels.ts allowlist").toEqual([]);
});

test("every allowlisted channel has a dev-only demo handler", () => {
  const missingDemoHandler = [...allowlist].filter((channel) => !demoHandlers.has(channel));
  expect(missingDemoHandler, "channels without a demo handler (breaks browser tests)").toEqual([]);
});

test("EcoFlow IPC surface is read-only telemetry only", () => {
  const ecoflowChannels = [...allowlist].filter((channel) => channel.includes("ecoflow"));
  expect(ecoflowChannels).toEqual(["battery:ecoflow-devices"]);
  expect(ecoflowChannels.filter((channel) => /control|set|toggle|shutdown|power|ports|charge/i.test(channel))).toEqual(
    [],
  );
});

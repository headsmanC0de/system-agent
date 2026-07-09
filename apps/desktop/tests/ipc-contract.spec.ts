// Contract guard (audit LH-079): channels.ts is the SSOT allowlist, but the three
// sides of the IPC bus are maintained by hand. The renderer side is enforced at
// compile time (invoke(channel: IpcChannel)); this spec enforces the main-process
// side: every allowlisted channel has an ipcMain.handle, every handler is
// allowlisted, and every channel has a browser-mode MOCK fallback.
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
const apiSrc = readFileSync(join(SRC, "api.ts"), "utf8");

// registrations go through the sender-validating handle() wrapper (checklist #17)
const handlers = channelSet(ipcSrc, /\bhandle\(\s*"([a-z]+:[a-z0-9-]+)"/g);
const allowlist = channelSet(channelsSrc.split("] as const")[0]!, CHANNEL_RE);
const mockBlock = apiSrc.slice(apiSrc.indexOf("const MOCK"), apiSrc.indexOf("export async function invoke"));
const mocks = channelSet(mockBlock, /^\s+"([a-z]+:[a-z0-9-]+)":/gm);

test("contract surfaces are non-trivial (regex sanity)", () => {
  expect(handlers.size).toBeGreaterThanOrEqual(60);
  expect(allowlist.size).toBeGreaterThanOrEqual(60);
  expect(mocks.size).toBeGreaterThanOrEqual(60);
});

test("every allowlisted channel has an ipcMain.handle and vice versa", () => {
  const missingHandler = [...allowlist].filter((c) => !handlers.has(c));
  const unlisted = [...handlers].filter((c) => !allowlist.has(c));
  expect(missingHandler, "channels.ts entries with no ipcMain.handle").toEqual([]);
  expect(unlisted, "ipcMain.handle channels missing from channels.ts allowlist").toEqual([]);
});

test("every allowlisted channel has a browser-mode MOCK fallback", () => {
  const missingMock = [...allowlist].filter((c) => !mocks.has(c));
  expect(missingMock, "channels without a MOCK entry (breaks browser/tests)").toEqual([]);
});

test("EcoFlow IPC surface is read-only telemetry only", () => {
  const ecoflowChannels = [...allowlist].filter((channel) => channel.includes("ecoflow"));
  expect(ecoflowChannels).toEqual(["battery:ecoflow-devices"]);
  expect(ecoflowChannels.filter((channel) => /control|set|toggle|shutdown|power|ports|charge/i.test(channel))).toEqual([]);
});

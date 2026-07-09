import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const exec = promisify(execFile);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const helper = join(repoRoot, "scripts", "ecoflow_ble_helper.py");
const fixture = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "ecoflow-helper-snapshot.json");

test("EcoFlow helper normalizes fixture JSON to the Electron telemetry contract", async () => {
  const { stdout, stderr } = await exec("python3", [helper, "--normalize-json", fixture], {
    timeout: 10000,
    maxBuffer: 1024 * 1024,
  });

  expect(stderr).toBe("");
  const result = JSON.parse(stdout);
  expect(result.unavailableReason).toBeNull();
  expect(result.devices).toHaveLength(1);
  expect(result.devices[0]).toMatchObject({
    serial: "R351TEST1234",
    model: "EcoFlow DELTA 2 Max",
    connected: true,
    source: "ble",
    batteryLevel: 75.44,
    mainBatteryLevel: 75.44,
    inputWatts: 0,
    outputWatts: 0,
    acPorts: true,
    usbPorts: false,
    dc12vPort: false,
    acChargingSpeedWatts: 300,
    maxAcChargingPowerWatts: 1800,
  });
  expect(result.devices[0].extraBatteries).toEqual([
    {
      index: 1,
      serial: "R361TEST5678",
      batteryLevel: 76.1,
      cellTemperature: 19,
    },
  ]);
});

test("EcoFlow helper stays read-only and does not expose control packet calls", () => {
  const helperSource = readFileSync(helper, "utf8");
  expect(helperSource).not.toMatch(/\bsendPacket\b/);
  expect(helperSource).not.toMatch(/\bset_ac_charging_speed\b/);
  expect(helperSource).not.toMatch(/\benable_(ac|usb|dc)_/);
  expect(helperSource).not.toMatch(/\bshutdown\b|\breboot\b/);
});

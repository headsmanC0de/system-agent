import { expect, test } from "@playwright/test";
import { normalizeEcoFlowTelemetry } from "../src/main/ecoflow";

test("normalizes a Delta 2 Max snapshot with extra battery", () => {
  const result = normalizeEcoFlowTelemetry({
    devices: [
      {
        serial: "R351TEST1234",
        model: "EcoFlow DELTA 2 Max",
        connected: true,
        batteryLevel: 75.44,
        mainBatteryLevel: 75.44,
        extraBatteries: [{ index: 1, serial: "R361TEST5678", batteryLevel: 76.1, cellTemperature: 19 }],
        inputWatts: 0,
        outputWatts: 120,
        acPorts: true,
      },
    ],
  });

  expect(result.unavailableReason).toBeNull();
  expect(result.devices).toHaveLength(1);
  expect(result.devices[0]).toMatchObject({
    serial: "R351TEST1234",
    model: "EcoFlow DELTA 2 Max",
    connected: true,
    source: "ble",
    batteryLevel: 75.44,
    outputWatts: 120,
    acPorts: true,
  });
  expect(result.devices[0]?.extraBatteries[0]).toEqual({
    index: 1,
    serial: "R361TEST5678",
    batteryLevel: 76.1,
    cellTemperature: 19,
  });
});

test("rejects payloads without a device list", () => {
  const result = normalizeEcoFlowTelemetry({ devices: "not-an-array" });

  expect(result).toEqual({
    devices: [],
    unavailableReason: "EcoFlow helper returned no device list",
  });
});

test("drops malformed devices and preserves unavailable reason when empty", () => {
  const result = normalizeEcoFlowTelemetry({
    unavailableReason: "No authenticated EcoFlow devices",
    devices: [{ serial: "R351TEST1234" }, { model: "EcoFlow DELTA 2 Max" }],
  });

  expect(result).toEqual({
    devices: [],
    unavailableReason: "No authenticated EcoFlow devices",
  });
});

test("normalizes missing optional fields to nulls and empty arrays", () => {
  const result = normalizeEcoFlowTelemetry({
    devices: [{ serial: "R351TEST1234", model: "EcoFlow DELTA 2 Max" }],
  });

  expect(result.devices[0]).toMatchObject({
    serial: "R351TEST1234",
    model: "EcoFlow DELTA 2 Max",
    connected: false,
    batteryLevel: null,
    mainBatteryLevel: null,
    extraBatteries: [],
    inputWatts: null,
    acPorts: null,
    error: null,
  });
});

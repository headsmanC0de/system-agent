import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { readEcoFlowCloudDevices } from "../src/main/ecoflow";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ecoflowSource = join(repoRoot, "apps", "desktop", "src", "main", "ecoflow.ts");

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function cloudEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    ECOFLOW_CLOUD_ACCESS_KEY: "test-access-key",
    ECOFLOW_CLOUD_SECRET_KEY: "test-secret-key",
    ECOFLOW_CLOUD_HOST: "https://api.ecoflow.test",
    ...overrides,
  };
}

test("EcoFlow cloud reads configured serial telemetry without listing devices", async () => {
  const calls: FetchCall[] = [];
  const fetchImpl = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: input.toString(), init });
    return Response.json({
      code: "0",
      data: {
        soc: 82,
        remainTime: 315,
        wattsInSum: 44,
        wattsOutSum: 178,
      },
    });
  };

  const result = await readEcoFlowCloudDevices({
    env: cloudEnv({ ECOFLOW_DEVICE_SN: "R351TEST1234" }),
    fetchImpl,
  });

  expect(result.unavailableReason).toBeNull();
  expect(result.devices).toHaveLength(1);
  expect(result.devices[0]).toMatchObject({
    serial: "R351TEST1234",
    model: "EcoFlow device",
    connected: true,
    source: "cloud",
    batteryLevel: 82,
    inputWatts: 44,
    outputWatts: 178,
    remainingTimeDischargingMinutes: 315,
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.url).toContain("/iot-open/sign/device/quota/all");
  expect(calls[0]?.url).toContain("sn=R351TEST1234");
  expect(calls[0]?.url).not.toContain("test-secret-key");
  expect(calls[0]?.init?.headers).toMatchObject({
    accessKey: "test-access-key",
  });
  const headers = calls[0]?.init?.headers as Record<string, string>;
  expect(headers).toHaveProperty("sign");
  expect(headers.sign).toBe(
    createHmac("sha256", "test-secret-key")
      .update(`sn=R351TEST1234&accessKey=test-access-key&nonce=${headers.nonce}&timestamp=${headers.timestamp}`)
      .digest("hex"),
  );
});

test("EcoFlow cloud lists devices when no serial is configured", async () => {
  const calls: FetchCall[] = [];
  const fetchImpl = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: input.toString(), init });
    if (input.toString().includes("/device/list")) {
      return Response.json({
        code: "0",
        data: [
          {
            sn: "R351TEST1234",
            productName: "EcoFlow DELTA 2 Max",
            online: 1,
          },
        ],
      });
    }
    return Response.json({
      code: "0",
      data: {
        soc: 77,
        remainTime: 120,
        wattsInSum: 0,
        wattsOutSum: 92,
      },
    });
  };

  const result = await readEcoFlowCloudDevices({ env: cloudEnv(), fetchImpl });

  expect(result.unavailableReason).toBeNull();
  expect(result.devices[0]).toMatchObject({
    serial: "R351TEST1234",
    model: "EcoFlow DELTA 2 Max",
    connected: true,
    source: "cloud",
    batteryLevel: 77,
    outputWatts: 92,
  });
  expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
    "/iot-open/sign/device/list",
    "/iot-open/sign/device/quota/all",
  ]);
});

test("EcoFlow cloud degrades without credentials", async () => {
  const result = await readEcoFlowCloudDevices({
    env: cloudEnv({
      ECOFLOW_CLOUD_ACCESS_KEY: undefined,
      ECOFLOW_CLOUD_SECRET_KEY: undefined,
    }),
    fetchImpl: async () => {
      throw new Error("fetch should not be called without credentials");
    },
  });

  expect(result).toEqual({
    devices: [],
    unavailableReason: "EcoFlow cloud access key and secret key are not configured",
  });
});

test("EcoFlow cloud implementation stays read-only", () => {
  const source = readFileSync(ecoflowSource, "utf8");
  expect(source).not.toMatch(/\bset[A-Z]/);
  expect(source).not.toMatch(/\bput\b|\bpost\b|\bdelete\b/i);
  expect(source).not.toMatch(/\/set|\/control|\/shutdown|\/reboot|\/switch/i);
});

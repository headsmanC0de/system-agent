import { execFile } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import { promisify } from "node:util";

type EcoFlowExtraBattery = import("../types").EcoFlowExtraBattery;
type EcoFlowDevice = import("../types").EcoFlowDevice;
type EcoFlowTelemetryResult = import("../types").EcoFlowTelemetryResult;

const exec = promisify(execFile);
const DEFAULT_CLOUD_HOST = "https://api-e.ecoflow.com";
const DEVICE_LIST_PATH = "/iot-open/sign/device/list";
const DEVICE_QUOTA_PATH = "/iot-open/sign/device/quota/all";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type EcoFlowCloudOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
};

type EcoFlowCloudConfig = {
  accessKey: string;
  secretKey: string;
  host: string;
  serial: string | null;
};

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cloudConfig(env: NodeJS.ProcessEnv): EcoFlowCloudConfig | null {
  const accessKey = nullableString(env.ECOFLOW_CLOUD_ACCESS_KEY);
  const secretKey = nullableString(env.ECOFLOW_CLOUD_SECRET_KEY);
  if (!accessKey || !secretKey) return null;
  return {
    accessKey,
    secretKey,
    host: nullableString(env.ECOFLOW_CLOUD_HOST) ?? DEFAULT_CLOUD_HOST,
    serial: nullableString(env.ECOFLOW_DEVICE_SN),
  };
}

function normalizeEcoFlowExtraBattery(value: unknown, fallbackIndex: number): EcoFlowExtraBattery {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const index =
    typeof input.index === "number" && Number.isInteger(input.index) && input.index > 0 ? input.index : fallbackIndex;
  return {
    index,
    serial: nullableString(input.serial),
    batteryLevel: nullableNumber(input.batteryLevel),
    cellTemperature: nullableNumber(input.cellTemperature),
  };
}

function normalizeEcoFlowDevice(value: unknown): EcoFlowDevice | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const serial = nullableString(input.serial);
  const model = nullableString(input.model);
  if (!serial || !model) return null;
  const extraRaw = Array.isArray(input.extraBatteries) ? input.extraBatteries : [];
  return {
    serial,
    model,
    connected: input.connected === true,
    source: input.source === "cloud" ? "cloud" : "ble",
    lastSeen: nullableString(input.lastSeen),
    batteryLevel: nullableNumber(input.batteryLevel),
    mainBatteryLevel: nullableNumber(input.mainBatteryLevel),
    extraBatteries: extraRaw.map((battery, index) => normalizeEcoFlowExtraBattery(battery, index + 1)),
    inputWatts: nullableNumber(input.inputWatts),
    outputWatts: nullableNumber(input.outputWatts),
    acInputWatts: nullableNumber(input.acInputWatts),
    acOutputWatts: nullableNumber(input.acOutputWatts),
    dcOutputWatts: nullableNumber(input.dcOutputWatts),
    xt60InputWatts: nullableNumber(input.xt60InputWatts),
    xt60_2InputWatts: nullableNumber(input.xt60_2InputWatts),
    usbOutputWatts: nullableNumber(input.usbOutputWatts),
    acInputVolts: nullableNumber(input.acInputVolts),
    acInputAmps: nullableNumber(input.acInputAmps),
    acOutputVolts: nullableNumber(input.acOutputVolts),
    acOutputAmps: nullableNumber(input.acOutputAmps),
    dcInputVolts: nullableNumber(input.dcInputVolts),
    dcInputAmps: nullableNumber(input.dcInputAmps),
    dc12vOutputVolts: nullableNumber(input.dc12vOutputVolts),
    dc12vOutputAmps: nullableNumber(input.dc12vOutputAmps),
    acPorts: nullableBoolean(input.acPorts),
    usbPorts: nullableBoolean(input.usbPorts),
    dc12vPort: nullableBoolean(input.dc12vPort),
    chargeLimitMin: nullableNumber(input.chargeLimitMin),
    chargeLimitMax: nullableNumber(input.chargeLimitMax),
    acChargingSpeedWatts: nullableNumber(input.acChargingSpeedWatts),
    maxAcChargingPowerWatts: nullableNumber(input.maxAcChargingPowerWatts),
    energyBackup: nullableBoolean(input.energyBackup),
    energyBackupBatteryLevel: nullableNumber(input.energyBackupBatteryLevel),
    remainingTimeChargingMinutes: nullableNumber(input.remainingTimeChargingMinutes),
    remainingTimeDischargingMinutes: nullableNumber(input.remainingTimeDischargingMinutes),
    error: nullableString(input.error),
  };
}

function sortedCloudParams(params: Record<string, string>): string {
  return Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function cloudStringToSign(
  config: EcoFlowCloudConfig,
  params: Record<string, string>,
  nonce: string,
  timestamp: string,
): string {
  const data = sortedCloudParams(params);
  const auth = `accessKey=${config.accessKey}&nonce=${nonce}&timestamp=${timestamp}`;
  return data ? `${data}&${auth}` : auth;
}

function cloudHeaders(config: EcoFlowCloudConfig, params: Record<string, string>): Record<string, string> {
  const nonce = randomUUID().replaceAll("-", "");
  const timestamp = Date.now().toString();
  const sign = createHmac("sha256", config.secretKey)
    .update(cloudStringToSign(config, params, nonce, timestamp))
    .digest("hex");
  return {
    accessKey: config.accessKey,
    nonce,
    timestamp,
    sign,
  };
}

async function cloudJson(
  config: EcoFlowCloudConfig,
  path: string,
  params: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<unknown> {
  const url = new URL(path, config.host);
  for (const [key, value] of Object.entries(params)) url.searchParams.append(key, value);
  const response = await fetchImpl(url, {
    method: "GET",
    headers: cloudHeaders(config, params),
  });
  if (!response.ok) throw new Error(`EcoFlow cloud HTTP ${response.status}`);
  return response.json();
}

function cloudApiData(value: unknown): unknown {
  if (!value || typeof value !== "object") throw new Error("EcoFlow cloud returned invalid JSON");
  const input = value as Record<string, unknown>;
  if (input.code !== "0" && input.code !== 0 && input.message) throw new Error(String(input.message));
  if (input.code !== "0" && input.code !== 0 && input.error) throw new Error(String(input.error));
  if (input.code !== "0" && input.code !== 0 && input.code !== undefined)
    throw new Error(`EcoFlow cloud code ${input.code}`);
  return input.data;
}

function cloudDeviceList(data: unknown): Array<{ serial: string; model: string; connected: boolean }> {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).devices)
      ? ((data as Record<string, unknown>).devices as unknown[])
      : [];
  return list
    .map((item) => {
      const input = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const serial = nullableString(input.sn) ?? nullableString(input.serial);
      if (!serial) return null;
      return {
        serial,
        model: nullableString(input.productName) ?? nullableString(input.model) ?? "EcoFlow device",
        connected: input.online === 1 || input.online === true || input.connected === true,
      };
    })
    .filter((device): device is { serial: string; model: string; connected: boolean } => device !== null);
}

function cloudTelemetryDevice(serial: string, model: string, connected: boolean, quota: unknown): EcoFlowDevice | null {
  const data = quota && typeof quota === "object" ? (quota as Record<string, unknown>) : {};
  const inputWatts = nullableNumber(data.wattsInSum);
  const outputWatts = nullableNumber(data.wattsOutSum);
  const remainingMinutes = nullableNumber(data.remainTime);
  return normalizeEcoFlowDevice({
    serial,
    model,
    connected,
    source: "cloud",
    lastSeen: new Date().toISOString(),
    batteryLevel: nullableNumber(data.soc),
    mainBatteryLevel: nullableNumber(data.soc),
    extraBatteries: [],
    inputWatts,
    outputWatts,
    remainingTimeChargingMinutes: inputWatts !== null && inputWatts > 0 ? remainingMinutes : null,
    remainingTimeDischargingMinutes: outputWatts !== null && outputWatts > 0 ? remainingMinutes : null,
  });
}

export function normalizeEcoFlowTelemetry(value: unknown): EcoFlowTelemetryResult {
  if (!value || typeof value !== "object")
    return { devices: [], unavailableReason: "EcoFlow helper returned invalid JSON" };
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.devices))
    return { devices: [], unavailableReason: "EcoFlow helper returned no device list" };
  const devices = input.devices
    .map(normalizeEcoFlowDevice)
    .filter((device): device is EcoFlowDevice => device !== null);
  return {
    devices,
    unavailableReason: devices.length === 0 ? nullableString(input.unavailableReason) : null,
  };
}

export async function readEcoFlowCloudDevices(options: EcoFlowCloudOptions = {}): Promise<EcoFlowTelemetryResult> {
  const env = options.env ?? process.env;
  const config = cloudConfig(env);
  if (!config) {
    return {
      devices: [],
      unavailableReason: "EcoFlow cloud access key and secret key are not configured",
    };
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const devices = config.serial
      ? [{ serial: config.serial, model: "EcoFlow device", connected: true }]
      : cloudDeviceList(cloudApiData(await cloudJson(config, DEVICE_LIST_PATH, {}, fetchImpl)));
    const telemetry = await Promise.all(
      devices.map(async (device) =>
        cloudTelemetryDevice(
          device.serial,
          device.model,
          device.connected,
          cloudApiData(await cloudJson(config, DEVICE_QUOTA_PATH, { sn: device.serial }, fetchImpl)),
        ),
      ),
    );
    const normalized = telemetry.filter((device): device is EcoFlowDevice => device !== null);
    return {
      devices: normalized,
      unavailableReason: normalized.length === 0 ? "EcoFlow cloud returned no readable devices" : null,
    };
  } catch {
    console.warn("EcoFlow cloud read failed");
    return { devices: [], unavailableReason: "EcoFlow cloud read failed" };
  }
}

export async function readEcoFlowDevices(): Promise<EcoFlowTelemetryResult> {
  if (cloudConfig(process.env)) return readEcoFlowCloudDevices();
  const helper = nullableString(process.env.ECOFLOW_BLE_HELPER);
  if (!helper) return { devices: [], unavailableReason: "EcoFlow BLE helper is not configured" };
  if (!isAbsolute(helper)) return { devices: [], unavailableReason: "EcoFlow BLE helper path must be absolute" };
  try {
    const { stdout } = await exec(helper, [], { timeout: 15000, maxBuffer: 1024 * 1024 });
    try {
      return normalizeEcoFlowTelemetry(JSON.parse(stdout));
    } catch {
      console.warn("EcoFlow BLE helper returned invalid JSON");
      return { devices: [], unavailableReason: "EcoFlow BLE helper returned invalid JSON" };
    }
  } catch {
    console.warn("EcoFlow BLE helper execution failed");
    return { devices: [], unavailableReason: "EcoFlow BLE helper execution failed" };
  }
}

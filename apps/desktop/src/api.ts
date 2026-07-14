import type {
  CreateDocInput,
  DocEntry,
  DocsListOptions,
  NetworkSummary,
  SystemLogsResult,
  UpdateDocInput,
} from "@project/types";
import { getStorageItem, STORAGE_KEYS, setStorageItem } from "./lib/storage";
import type { IpcChannel } from "./main/channels";

interface ElectronBridge {
  invoke<T>(channel: IpcChannel, ...args: unknown[]): Promise<T>;
}

function electronBridge(): ElectronBridge | undefined {
  return (globalThis as { electronAPI?: ElectronBridge }).electronAPI;
}

export const isElectron = electronBridge() !== undefined;
export const isDemoMode = import.meta.env?.DEV === true && import.meta.env.VITE_DEMO_MODE === "1";

async function invokeDemo<T>(channel: IpcChannel, args: unknown[]): Promise<T> {
  if (!isDemoMode) {
    throw new Error("Electron bridge unavailable; production data cannot be collected");
  }

  const { DEMO_HANDLERS } = await import("./testing/demo-api");
  const handler = DEMO_HANDLERS[channel];
  return handler(...args) as T;
}

export async function invoke<T>(channel: IpcChannel, ...args: unknown[]): Promise<T> {
  const bridge = electronBridge();
  return bridge ? bridge.invoke<T>(channel, ...args) : invokeDemo<T>(channel, args);
}

export const system = {
  overview: () => invoke<import("@project/types").OverviewData>("system:overview"),
  memory: () => invoke<import("@project/types").MemoryData>("system:memory"),
  cpuUsage: () => invoke<import("@project/types").CpuSample>("system:cpu-usage"),
  topProcesses: () => invoke<import("@project/types").ProcessInfo[]>("system:top-processes"),
  killProcess: (pid: number) => invoke<string>("system:kill-process", pid),
  snapshotDiff: (from: string, to: string) => invoke<string>("system:snapshot-diff", from, to),
  saveReport: (content: string, suggestedName: string) => invoke<string>("system:save-report", content, suggestedName),
  packages: () => invoke<import("@project/types").PackageInfo[]>("system:packages"),
  outdated: () => invoke<import("@project/types").OutdatedPackage[]>("system:outdated"),
  packageInfo: (name: string) => invoke<string>("system:package-info", name),
  updatePackages: () => invoke<string>("system:update-packages"),
  orphans: () => invoke<string[]>("system:orphans"),
  removeOrphans: () => invoke<string>("system:remove-orphans"),
  snapshots: () => invoke<import("@project/types").SnapshotInfo[]>("system:snapshots"),
  createSnapshot: (desc: string) => invoke<string>("system:create-snapshot", desc),
  deleteSnapshot: (num: string) => invoke<string>("system:delete-snapshot", num),
  rollbackSnapshot: (num: string) => invoke<string>("system:rollback-snapshot", num),
  services: () => invoke<import("@project/types").ServiceInfo[]>("system:services"),
  failedServices: () => invoke<import("@project/types").FailedService[]>("system:failed-services"),
  serviceAction: (action: string, unit: string) => invoke<string>("system:service-action", action, unit),
  autostartList: () => invoke<import("@project/types").AutostartEntry[]>("system:autostart-list"),
  autostartToggle: (name: string, enable: boolean) => invoke<string>("system:autostart-toggle", name, enable),
  cronList: () => invoke<{ user: string; system: string }>("system:cron-list"),
  cronSave: (content: string) => invoke<string>("system:cron-save", content),
  timers: () => invoke<import("@project/types").TimerInfo[]>("system:timers"),
  gpu: () => invoke<import("@project/types").GpuData | null>("system:gpu"),
  hardwareSpecs: () => invoke<import("@project/types").HardwareSpec[]>("system:hardware-specs"),
  sensors: () => invoke<string>("system:sensors"),
  disk: () => invoke<import("@project/types").DiskInfo[]>("system:disk"),
  health: () => invoke<import("@project/types").SystemHealth>("system:health"),
  network: () => invoke<NetworkSummary>("system:network"),
  networkInterfaces: () => invoke<import("@project/types").NetworkInterface[]>("system:network-interfaces"),
  openPorts: () => invoke<import("@project/types").OpenPort[]>("system:open-ports"),
  netConnections: () => invoke<import("@project/types").NetConnection[]>("system:net-connections"),
  rgbDevices: () => invoke<string>("system:rgb-devices"),
  rgbSet: (args: string[]) => invoke<string>("system:rgb-set", args),
  journal: (count: number) => invoke<string>("system:journal", count),
  logs: (count: number) => invoke<SystemLogsResult>("system:logs", count),
};

export const passwords = {
  list: () => invoke<import("@project/types").PasswordEntry[]>("password:list"),
  show: (path: string) => invoke<import("@project/types").PasswordDetail | null>("password:show", path),
  generate: (path: string, length: number) => invoke<string>("password:generate", path, length),
  insert: (path: string, content: string) => invoke<string>("password:insert", path, content),
  delete: (path: string) => invoke<string>("password:delete", path),
  copy: (path: string) => invoke<string>("password:copy", path),
};

export const battery = {
  upowerDevices: () => invoke<import("@project/types").BatteryDevice[]>("battery:upower-devices"),
  ecoflowDevices: () => invoke<import("@project/types").EcoFlowTelemetryResult>("battery:ecoflow-devices"),
  btDevices: () => invoke<import("@project/types").BtDevice[]>("battery:bt-devices"),
  btConnect: (mac: string) => invoke<string>("battery:bt-connect", mac),
  btDisconnect: (mac: string) => invoke<string>("battery:bt-disconnect", mac),
  batteryWatch: (action: "start" | "stop") => invoke<void>("system:battery-watch", action),
};

export const llm = {
  modelInfo: () => invoke<import("@project/types").LLMModelInfo>("llm:model-info"),
  inferenceStatus: () => invoke<import("@project/types").LLMInferenceStatus>("llm:inference-status"),
  config: () => invoke<import("@project/types").LLMConfig>("llm:config"),
  start: () => invoke<string>("llm:start"),
  stop: () => invoke<string>("llm:stop"),
  saveConfig: (cfg: import("@project/types").LLMConfig) => invoke<string>("llm:save-config", cfg),
};

export const fans = {
  list: () => invoke<import("@project/types").FanInfo[]>("fans:list"),
  setConfig: (cfg: import("@project/types").FanConfig) => invoke<string>("fans:set-config", cfg),
  status: () =>
    invoke<{ enabled: boolean; error: string | null; fans: import("@project/types").FanInfo[] }>("fans:status"),
};

export const secrets = {
  get: (name: string) => invoke<string>("secrets:get", name),
  set: (name: string, value: string) => invoke<void>("secrets:set", name, value),
  backend: () => invoke<string>("secrets:backend"),
};

async function getProjects(): Promise<import("@project/types").ProjectInfo[]> {
  try {
    const stored = getStorageItem(STORAGE_KEYS.projects);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed as import("@project/types").ProjectInfo[];
    }
  } catch {
    // Invalid local UI state is treated as an empty catalog.
  }

  if (!isDemoMode) return [];
  const { buildDefaultProjects } = await import("./testing/demo-api");
  const defaults = buildDefaultProjects();
  setStorageItem(STORAGE_KEYS.projects, JSON.stringify(defaults));
  return defaults;
}

// The catalog is UI state; every project fact comes from the main-process inspector.
export const projects = {
  list: (): Promise<import("@project/types").ProjectInfo[]> => getProjects(),
  add: async (path: string): Promise<import("@project/types").ProjectInfo> => {
    const project = await invoke<import("@project/types").ProjectInfo>("projects:inspect", path);
    const existing = (await getProjects()).filter((entry) => entry.path !== project.path);
    existing.push(project);
    setStorageItem(STORAGE_KEYS.projects, JSON.stringify(existing));
    return project;
  },
  remove: async (id: string): Promise<string> => {
    const existing = (await getProjects()).filter((project) => project.id !== id);
    setStorageItem(STORAGE_KEYS.projects, JSON.stringify(existing));
    return "removed";
  },
  scan: async (id: string): Promise<import("@project/types").ProjectInfo | undefined> => {
    const existing = await getProjects();
    const index = existing.findIndex((project) => project.id === id);
    if (index < 0) return undefined;
    const project = await invoke<import("@project/types").ProjectInfo>("projects:inspect", existing[index]!.path);
    existing[index] = project;
    setStorageItem(STORAGE_KEYS.projects, JSON.stringify(existing));
    return project;
  },
  outdated: (path: string) => invoke<import("@project/types").ProjectDep[]>("projects:outdated", path),
};

export const docs = {
  init: () => invoke<string[]>("docs:init"),
  list: (opts?: DocsListOptions) => invoke<DocEntry[]>("docs:list", opts),
  create: (doc: CreateDocInput) => invoke<DocEntry>("docs:create", doc),
  update: (id: string, doc: UpdateDocInput) => invoke<DocEntry>("docs:update", id, doc),
  delete: (id: string) => invoke<void>("docs:delete", id),
  categories: () => invoke<string[]>("docs:categories"),
};

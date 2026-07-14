export interface OverviewData {
  hostname: string;
  kernel: string;
  arch: string;
  uptime: string;
  cpuModel: string;
  cpuCores: string;
  totalMem: string;
  disk: string;
  load: string;
}

export interface MemoryData {
  mem: { total: string; used: string; free: string; shared: string; buffCache: string; available: string };
  swap: { total: string; used: string; free: string; shared: string; buffCache: string; available: string };
}

export interface CpuSample {
  idle: number;
  total: number;
}

export interface ProcessInfo {
  user: string;
  pid: number;
  cpu: number;
  mem: number;
  rss: number;
  command: string;
}

export interface PackageInfo {
  name: string;
  version: string;
}

export interface OutdatedPackage {
  name: string;
  oldVer: string;
  newVer: string;
}

export interface SnapshotInfo {
  number: string;
  type: string;
  date: string;
  user: string;
  description: string;
}

export interface ServiceInfo {
  unit: string;
  active: string;
  sub: string;
}

export interface FailedService {
  unit: string;
  load: string;
  active: string;
  sub: string;
}

export interface AutostartEntry {
  name: string;
  state: string;
  source: string;
}

export interface TimerInfo {
  next: string;
  left: string;
  last: string;
  passed: string;
  unit: string;
  activates: string;
}

export interface GpuData {
  name: string;
  driverVersion: string;
  temp: number;
  util: number;
  memUsed: string;
  memTotal: string;
  power: string;
  powerLimit: string;
  fan: number;
}

export interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  avail: string;
  use: string;
  mount: string;
}

export interface HardwareSpec {
  category: string;
  model: string;
  source: "auto" | "manual";
}

export interface LLMModelInfo {
  name: string;
  architecture: string;
  parameters: string;
  quantization: string;
  contextLength: number;
  experts: number;
  activeExperts: number;
  license: string;
}

export interface LLMInferenceStatus {
  running: boolean;
  serverUrl: string | null;
  model: string | null;
  vramUsed: number | null;
  vramTotal: number | null;
  uptime: number | null;
  requestsPerMin: number | null;
  avgLatencyMs: number | null;
  tokensPerSec: number | null;
}

export interface LLMConfig {
  serverUrl: string;
  modelPath: string;
  contextLength: number;
  gpuLayers: number;
  threads: number;
  temperature: number;
  topP: number;
  repeatPenalty: number;
}

export interface NetConnection {
  netid: string;
  state: string;
  local: string;
  peer: string;
  process: string;
}

export type DataCollectionStatus = "ok" | "partial" | "error";

export type LogPriority = "err" | "warning" | "notice" | "info" | "debug";

export interface SystemLogEntry {
  priority: LogPriority;
  timestamp: string;
  unit: string;
  message: string;
}

export interface SystemLogsResult {
  capturedAt: string;
  entries: SystemLogEntry[];
  error: string | null;
  source: "journalctl";
  status: DataCollectionStatus;
}

export interface NetworkTrafficCounter {
  name: string;
  rxBytes: number;
  txBytes: number;
}

export interface NetworkSummary {
  capturedAt: string;
  dns: string[];
  error: string | null;
  gateway: string | null;
  hostname: string;
  localIp: string | null;
  publicIp: null;
  reachability: "unknown";
  source: "os.networkInterfaces+/proc/net/dev+ip+resolv.conf";
  status: DataCollectionStatus;
  totalRx: number | null;
  totalTx: number | null;
  traffic: NetworkTrafficCounter[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: string;
  result: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
  reasoningContent?: string;
  tokenUsage?: TokenUsage;
  toolCalls?: ToolCallInfo[];
}

export interface PasswordEntry {
  name: string;
  path: string;
  updated?: string;
}

export interface PasswordDetail {
  password: string;
  username: string;
  fields: Record<string, string>;
  full: string;
}

export interface BatteryDevice {
  name: string;
  type: string;
  nativePath: string;
  percentage: number;
  state: string;
  rechargeable: boolean;
  warningLevel: string;
  model: string;
  serial: string;
  updated: string;
  connection: "bluetooth" | "usb" | "wireless" | "unknown";
}

export interface BtDevice {
  mac: string;
  name: string;
  paired: boolean;
  connected: boolean;
  batteryAvailable: boolean;
  batteryLevel: number;
  icon: string;
}

export interface EcoFlowExtraBattery {
  index: number;
  serial: string | null;
  batteryLevel: number | null;
  cellTemperature: number | null;
}

export interface EcoFlowDevice {
  serial: string;
  model: string;
  connected: boolean;
  source: "ble" | "cloud";
  lastSeen: string | null;
  batteryLevel: number | null;
  mainBatteryLevel: number | null;
  extraBatteries: EcoFlowExtraBattery[];
  inputWatts: number | null;
  outputWatts: number | null;
  acInputWatts: number | null;
  acOutputWatts: number | null;
  dcOutputWatts: number | null;
  xt60InputWatts: number | null;
  xt60_2InputWatts: number | null;
  usbOutputWatts: number | null;
  acInputVolts: number | null;
  acInputAmps: number | null;
  acOutputVolts: number | null;
  acOutputAmps: number | null;
  dcInputVolts: number | null;
  dcInputAmps: number | null;
  dc12vOutputVolts: number | null;
  dc12vOutputAmps: number | null;
  acPorts: boolean | null;
  usbPorts: boolean | null;
  dc12vPort: boolean | null;
  chargeLimitMin: number | null;
  chargeLimitMax: number | null;
  acChargingSpeedWatts: number | null;
  maxAcChargingPowerWatts: number | null;
  energyBackup: boolean | null;
  energyBackupBatteryLevel: number | null;
  remainingTimeChargingMinutes: number | null;
  remainingTimeDischargingMinutes: number | null;
  error: string | null;
}

export interface EcoFlowTelemetryResult {
  devices: EcoFlowDevice[];
  unavailableReason: string | null;
}

export type ProjectType = "node";

export type DepRisk = "patch" | "minor" | "major" | "none";

export type CheckStatus = "pass" | "fail" | "warn" | "pending" | "na";

export type CheckCategory = "pipeline" | "quality" | "security" | "deps";

export interface ProjectCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  category: CheckCategory;
  fix?: string;
}

export interface ProjectDep {
  name: string;
  current: string;
  latest: string;
  type: "prod" | "dev";
  risk: DepRisk;
}

export interface ProjectWorkspace {
  name: string;
  path: string;
  types: ProjectType[];
  totalDeps: number;
  outdatedDeps: number;
  healthScore: number;
  deps: ProjectDep[];
  checks: ProjectCheck[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  isMonorepo: boolean;
  monorepoTool: string | null;
  types: ProjectType[];
  lastScanned: string;
  totalDeps: number;
  outdatedDeps: number;
  healthScore: number;
  deps: ProjectDep[];
  workspaces: ProjectWorkspace[];
  checks: ProjectCheck[];
}

export type SystemCheckCategory = "os" | "packages" | "services" | "security" | "storage";

export interface SystemCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  category: SystemCheckCategory;
  fix?: string;
}

export interface DocEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DocsListOptions {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export type CreateDocInput = Pick<DocEntry, "title" | "content" | "category" | "tags">;
export type UpdateDocInput = Partial<CreateDocInput>;

export interface DocsDatabaseHealth {
  applicationId: number;
  integrity: "ok";
  journalMode: string;
  path: string;
  schemaVersion: number;
  sqliteVersion: string;
}

export interface NetworkInterface {
  name: string;
  ip: string;
  ipv6: string;
  mac: string;
  status: "up" | "down";
  speed: string;
  type: "ethernet" | "wifi" | "bridge" | "loopback" | "virtual";
  rxBytes: number;
  txBytes: number;
}

export interface OpenPort {
  port: number;
  proto: string;
  service: string;
  state: string;
  pid: number;
  process: string;
}

export interface SystemHealth {
  capturedAt: string;
  status: DataCollectionStatus;
  error: string | null;
  hostname: string;
  kernel: string;
  arch: string;
  uptime: string;
  healthScore: number;
  checks: SystemCheck[];
  outdatedPackages: number | null;
  orphansCount: number | null;
  failedServices: number | null;
  userServiceProblems: number | null;
  stoppedCritical: number | null;
  snapshotsCount: number | null;
  autostartCount: number | null;
  diskUsage: number | null;
  memoryUsage: number | null;
}

export interface FanCurvePoint {
  temp: number;
  duty: number;
}

export interface FanInfo {
  id: string;
  chip: string;
  label: string;
  rpm: number | null;
  tempC: number | null;
  dutyPct: number | null;
  writable: boolean;
}

export interface FanConfig {
  enabled: boolean;
  curves: Record<string, FanCurvePoint[]>;
}

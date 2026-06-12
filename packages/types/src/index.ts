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

export interface CronLogEntry {
  timestamp: string;
  exitCode: number;
  duration: string;
  output: string;
}

export interface GpuData {
  name: string;
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
  source: "auto" | "manual" | "builtin";
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
  serverUrl: string;
  model: string;
  vramUsed: number;
  vramTotal: number;
  uptime: number;
  requestsPerMin: number;
  avgLatencyMs: number;
  tokensPerSec: number;
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

export type PageId =
  | "dashboard"
  | "projects"
  | "packages"
  | "snapshots"
  | "services"
  | "autostart"
  | "cron"
  | "hardware"
  | "gpu"
  | "disks"
  | "network"
  | "rgb"
  | "logs"
  | "battery"
  | "passwords"
  | "docs"
  | "chat"
  | "llm"
  | "settings";

export type ProjectType = "node" | "rust" | "go" | "python" | "zig" | "unknown";

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
  hostname: string;
  kernel: string;
  arch: string;
  uptime: string;
  healthScore: number;
  checks: SystemCheck[];
  outdatedPackages: number;
  orphansCount: number;
  failedServices: number;
  stoppedCritical: number;
  snapshotsCount: number;
  autostartCount: number;
  diskUsage: number;
  memoryUsage: number;
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

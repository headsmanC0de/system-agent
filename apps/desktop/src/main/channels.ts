// SSOT for the IPC surface. IpcChannel types every renderer call and main
// registration; the preload derives its runtime allowlist from this array.
// Main startup also asserts exhaustive registration, while the demo adapter is
// compile-time exhaustive. Project catalog operations stay renderer-local.
export const IPC_CHANNELS = [
  "battery:bt-connect",
  "battery:bt-devices",
  "battery:bt-disconnect",
  "battery:ecoflow-devices",
  "battery:upower-devices",
  "docs:categories",
  "docs:create",
  "docs:delete",
  "docs:init",
  "docs:list",
  "docs:update",
  "fans:list",
  "fans:set-config",
  "fans:status",
  "llm:config",
  "llm:inference-status",
  "llm:model-info",
  "llm:save-config",
  "llm:start",
  "llm:stop",
  "password:copy",
  "password:delete",
  "password:generate",
  "password:insert",
  "password:list",
  "password:show",
  "projects:inspect",
  "projects:outdated",
  "secrets:backend",
  "secrets:get",
  "secrets:set",
  "system:autostart-list",
  "system:autostart-toggle",
  "system:battery-watch",
  "system:cpu-usage",
  "system:create-snapshot",
  "system:cron-list",
  "system:cron-save",
  "system:delete-snapshot",
  "system:disk",
  "system:failed-services",
  "system:gpu",
  "system:hardware-specs",
  "system:health",
  "system:journal",
  "system:kill-process",
  "system:logs",
  "system:memory",
  "system:net-connections",
  "system:network",
  "system:network-interfaces",
  "system:open-ports",
  "system:orphans",
  "system:outdated",
  "system:overview",
  "system:package-info",
  "system:packages",
  "system:remove-orphans",
  "system:rgb-devices",
  "system:rgb-set",
  "system:rollback-snapshot",
  "system:save-report",
  "system:snapshot-diff",
  "system:sensors",
  "system:service-action",
  "system:services",
  "system:snapshots",
  "system:timers",
  "system:top-processes",
  "system:update-packages",
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

export type IpcErrorCode =
  | "dependency_unavailable"
  | "internal"
  | "invalid_argument"
  | "persistence_failure"
  | "timeout"
  | "untrusted_sender";

export type IpcResponse<T> =
  | { ok: true; value: T; requestId: string }
  | { ok: false; error: { code: IpcErrorCode; retryable: boolean }; requestId: string };

const ALLOWED = new Set<string>(IPC_CHANNELS);

export function isAllowedChannel(channel: string): channel is IpcChannel {
  return ALLOWED.has(channel);
}

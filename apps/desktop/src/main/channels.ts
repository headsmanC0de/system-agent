// SSOT for IPC channel names (audit S-4). This is the exact set of channels the
// renderer invokes (see api.ts); the preload allowlist rejects anything outside it,
// so a compromised renderer cannot reach arbitrary ipcMain handlers.
//
// Derived from `grep -oE '"[a-z]+:[a-z0-9-]+"' src/api.ts`. Keep in sync with api.ts.
// (projects list/add/remove/scan are renderer-local localStorage — not invoked over IPC.)
export const IPC_CHANNELS = [
  "battery:bt-connect",
  "battery:bt-devices",
  "battery:bt-disconnect",
  "battery:upower-devices",
  "docs:categories",
  "docs:create",
  "docs:delete",
  "docs:init",
  "docs:list",
  "docs:update",
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
  "projects:outdated",
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
  "system:sensors",
  "system:service-action",
  "system:services",
  "system:snapshots",
  "system:timers",
  "system:top-processes",
  "system:update-packages",
] as const;

export type IpcChannel = (typeof IPC_CHANNELS)[number];

const ALLOWED = new Set<string>(IPC_CHANNELS);

export function isAllowedChannel(channel: string): channel is IpcChannel {
  return ALLOWED.has(channel);
}

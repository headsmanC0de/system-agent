import { readFile, realpath } from "node:fs/promises";
import os from "node:os";
import { basename, isAbsolute, join } from "node:path";
import type {
  CreateDocInput,
  DocsListOptions,
  LogPriority,
  NetworkSummary,
  ProjectDep,
  ProjectInfo,
  SystemCheck,
  SystemLogEntry,
  SystemLogsResult,
  UpdateDocInput,
} from "@project/types";
import { app, ipcMain, Notification } from "electron";
import { IPC_CHANNELS, type IpcChannel } from "./channels";
import { CommandRunner } from "./command-runner";
import { DocsRepository } from "./docs-repository";
import { readEcoFlowDevices } from "./ecoflow";
import { isTrustedRendererUrl } from "./runtime-origin";
import { IpcFault, telemetry } from "./telemetry";

const commands = new CommandRunner(telemetry);

function dependencyRisk(current: string, latest: string): ProjectDep["risk"] {
  const currentParts = current.match(/\d+/g)?.map(Number) ?? [];
  const latestParts = latest.match(/\d+/g)?.map(Number) ?? [];
  if (currentParts[0] !== latestParts[0]) return "major";
  if (currentParts[1] !== latestParts[1]) return "minor";
  if (currentParts[2] !== latestParts[2]) return "patch";
  return "none";
}

async function inspectNodeProject(inputPath: string): Promise<ProjectInfo> {
  if (!isAbsolute(inputPath) || inputPath.includes("\0")) throw new TypeError("Project path must be absolute");
  const path = await realpath(inputPath);
  const manifest = JSON.parse(await readFile(join(path, "package.json"), "utf8")) as Record<string, unknown>;
  const dependencies = (manifest.dependencies ?? {}) as Record<string, string>;
  const devDependencies = (manifest.devDependencies ?? {}) as Record<string, string>;
  const lock = await readFile(join(path, "package-lock.json"), "utf8")
    .then((value) => JSON.parse(value) as { packages?: Record<string, { version?: string }> })
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
  const outdatedRaw =
    (await commands.run({
      operation: "projects.npm-outdated",
      executable: "npm",
      args: ["outdated", "--json"],
      cwd: path,
      timeoutMs: 30_000,
      maxBufferBytes: 2 * 1024 * 1024,
      allowedExitCodes: [1],
    })) || "{}";
  const outdated = JSON.parse(outdatedRaw) as Record<string, { current?: string; latest?: string }>;
  const deps = Object.entries({ ...dependencies, ...devDependencies }).map(([name, declared]) => {
    const current = lock?.packages?.[`node_modules/${name}`]?.version ?? declared;
    const latest = outdated[name]?.latest ?? current;
    return {
      name,
      current,
      latest,
      type: name in devDependencies ? ("dev" as const) : ("prod" as const),
      risk: dependencyRisk(current, latest),
    };
  });
  const hasLock = lock !== null;
  const checks = [
    {
      id: "manifest",
      label: "Package manifest",
      status: "pass" as const,
      message: "package.json parsed successfully",
      category: "deps" as const,
    },
    {
      id: "lockfile",
      label: "Reproducible dependency lock",
      status: hasLock ? ("pass" as const) : ("warn" as const),
      message: hasLock ? "package-lock.json parsed successfully" : "package-lock.json is missing",
      category: "deps" as const,
      ...(!hasLock && { fix: "Generate and commit package-lock.json" }),
    },
  ];
  const workspaces = Array.isArray(manifest.workspaces) ? manifest.workspaces : [];
  return {
    id: path,
    name: typeof manifest.name === "string" ? manifest.name : basename(path),
    path,
    isMonorepo: workspaces.length > 0,
    monorepoTool: workspaces.length > 0 ? "npm workspaces" : null,
    types: ["node"],
    lastScanned: new Date().toISOString(),
    totalDeps: deps.length,
    outdatedDeps: deps.filter((dependency) => dependency.risk !== "none").length,
    healthScore: hasLock ? 100 : 50,
    deps,
    workspaces: [],
    checks,
  };
}

let batteryWatchInterval: NodeJS.Timeout | null = null;
const notifiedDevices = new Map<string, number>();
let docsRepository: DocsRepository | null = null;

function getDocsRepository(): DocsRepository {
  docsRepository ??= new DocsRepository(join(app.getPath("userData"), "docs.db"));
  return docsRepository;
}

export function closeIpcResources(): void {
  docsRepository?.close();
  docsRepository = null;
}

async function getBatteryDevices(): Promise<Array<{ mac: string; name: string; batteryLevel: number }>> {
  const stdout = await cmd("bluetoothctl", ["devices"]);
  if (!stdout) return [];
  const devices: Array<{ mac: string; name: string; batteryLevel: number }> = [];
  const lines = stdout.split("\n").filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const mac = parts[1] || "";
    const name = parts.slice(2).join(" ");
    if (!mac) continue;
    const info = await cmd("bluetoothctl", ["info", mac]);
    const battMatch = info.match(/Battery Percentage.*?(\d+)/);
    if (battMatch) devices.push({ mac, name: name || mac, batteryLevel: parseInt(battMatch[1]!, 10) });
  }
  return devices;
}

function checkBatteryLevels() {
  getBatteryDevices()
    .then((devices) => {
      for (const device of devices) {
        if (device.batteryLevel < 25 && device.batteryLevel > 0) {
          const lastNotified = notifiedDevices.get(device.mac);
          if (!lastNotified || lastNotified >= 25) {
            const n = new Notification({
              title: "Battery Low",
              body: `${device.name} battery low: ${device.batteryLevel}%`,
            });
            n.show();
            notifiedDevices.set(device.mac, device.batteryLevel);
          }
        } else if (device.batteryLevel >= 25) {
          notifiedDevices.delete(device.mac);
        }
      }
    })
    .catch(() => {});
}

function cmd(command: string, args: string[] = []) {
  return commands.run({ operation: `system.${command}`, executable: command, args });
}

function cmdAllowNoMatches(command: string, args: string[]) {
  return commands.run({
    operation: `system.${command}.query`,
    executable: command,
    args,
    allowedExitCodes: [1],
  });
}

function shell(operation: string, script: string) {
  return commands.run({ operation, executable: "bash", args: ["-c", script] });
}

function journalPriority(value: unknown): LogPriority {
  const priority = Number(value);
  if (priority <= 3) return "err";
  if (priority === 4) return "warning";
  if (priority === 5) return "notice";
  if (priority === 7) return "debug";
  return "info";
}

// pkexec pops a graphical polkit auth dialog — the user may take a while to type
// their password, so the regular 15s cmd() timeout would kill the prompt mid-entry.
function authCmd(operation: string, args: string[], timeout = 120000) {
  return commands.run({
    operation,
    executable: "pkexec",
    args,
    timeoutMs: timeout,
    maxBufferBytes: 10 * 1024 * 1024,
  });
}

const PKG_NAME_RE = /^[a-zA-Z0-9@._+-]+$/;

const VALID_SERVICE_ACTIONS = ["start", "stop", "restart", "reload", "status"];
const SERVICE_NAME_RE = /^[a-zA-Z0-9@._-]+\.service$/;
const BT_MAC_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const PASS_PATH_RE = /^[a-zA-Z0-9_/.-]+$/;

function assertServiceName(unit: string) {
  if (!SERVICE_NAME_RE.test(unit)) throw new TypeError(`Invalid service name: ${unit}`);
}

function assertBtMac(mac: string) {
  if (!BT_MAC_RE.test(mac)) throw new TypeError(`Invalid MAC address: ${mac}`);
}

function assertPassPath(p: string) {
  if (!PASS_PATH_RE.test(p)) throw new TypeError(`Invalid pass path: ${p}`);
}

// Electron security checklist #17: validate the sender of every IPC message.
// The app is a single locked-down window, but a compromised/hijacked frame must
// still never reach handlers that shell out. Trusted senders: the bundled
// custom-protocol renderer (prod) or the exact dev-server origin.
const rawHandle = ipcMain.handle.bind(ipcMain);
const registeredChannels = new Set<IpcChannel>();

function trustedSender(frame: Electron.WebFrameMain | null): boolean {
  if (!frame) return false;
  return isTrustedRendererUrl(frame.url);
}

function handle(channel: IpcChannel, listener: (e: Electron.IpcMainInvokeEvent, ...args: any[]) => unknown) {
  if (registeredChannels.has(channel)) throw new Error(`Duplicate IPC registration: ${channel}`);
  registeredChannels.add(channel);
  rawHandle(channel, (e, ...args) => {
    return telemetry.runIpcResult(channel, () => {
      if (!trustedSender(e.senderFrame)) throw new IpcFault("untrusted_sender");
      return listener(e, ...args);
    });
  });
}

export function initIpc() {
  handle("system:overview", async () => {
    const [hostname, kernel, arch, uptime, cpuModel, cpuCores, totalMem, disk, load] = await Promise.all([
      os.hostname(),
      cmd("uname", ["-r"]),
      cmd("uname", ["-m"]),
      cmd("uptime", ["-p"]),
      shell("overview.cpu-model", "cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d: -f2 | xargs"),
      shell("overview.cpu-count", "nproc"),
      shell("overview.memory-total", "free -h | awk '/^Mem:/ {print $2}'"),
      // GNU df has no --no-header flag; drop the header line via tail instead.
      shell("overview.root-disk", "df -h / --output=size,used,avail,pcent | tail -n +2"),
      cmd("uptime").then((o) => o.replace(/.*load average: /, "")),
    ]);
    return { hostname, kernel, arch, uptime, cpuModel: cpuModel.trim(), cpuCores, totalMem, disk: disk.trim(), load };
  });

  handle("system:memory", async () => {
    const raw = await cmd("free", ["--bytes"]);
    const lines = raw.split("\n").map((l) => l.split(/\s+/).filter(Boolean));
    const parse = (l: string[]) => ({
      total: l[1],
      used: l[2],
      free: l[3],
      shared: l[4],
      buffCache: l[5],
      available: l[6],
    });
    return { mem: parse(lines[1]!), swap: parse(lines[2]!) };
  });

  handle("system:cpu-usage", async () => {
    const raw = await shell("cpu.stat", "cat /proc/stat | head -1");
    const vals = raw.split(/\s+/).slice(1).map(Number);
    const idle = vals[3]! + (vals[4] || 0);
    const total = vals.reduce((a, b) => a + b, 0);
    return { idle, total };
  });

  handle("system:top-processes", async () => {
    const raw = await shell(
      "processes.memory-top",
      "ps aux --sort=-%mem | head -30 | awk '{printf \"%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n\", $1,$2,$3,$4,$6,$11}'",
    );
    const lines = raw.split("\n").slice(1);
    return lines.map((l) => {
      const [user, pid, cpu, mem, rss, command] = l.split("\t");
      return { user, pid: Number(pid), cpu: parseFloat(cpu!), mem: parseFloat(mem!), rss: Number(rss), command };
    });
  });

  handle("system:kill-process", async (_e, pid: number) => {
    if (typeof pid !== "number" || pid <= 1 || pid > 4194304) throw new RangeError("Invalid PID");
    return cmd("kill", [String(pid)]);
  });

  handle("system:packages", async () => {
    const raw = await cmd("pacman", ["-Q", "--color", "never"]);
    return raw.split("\n").map((l) => {
      const [name, version] = l.split(/\s+/);
      return { name, version };
    });
  });

  handle("system:outdated", async () => {
    const raw = await cmdAllowNoMatches("pacman", ["-Qu", "--color", "never"]);
    if (!raw) return [];
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [name, oldVer, , newVer] = l.split(/\s+/);
        return { name, oldVer, newVer };
      });
  });

  handle("system:orphans", async () => {
    const raw = await cmdAllowNoMatches("pacman", ["-Qdtq", "--color", "never"]);
    return raw ? raw.split("\n").filter(Boolean) : [];
  });

  // Explicit user actions → pkexec (polkit GUI prompt), same model as snapper.
  // --noconfirm is required (no TTY); the UI shows a confirmation modal first.
  handle("system:remove-orphans", async () => {
    const raw = await cmdAllowNoMatches("pacman", ["-Qdtq", "--color", "never"]);
    const orphans = raw.split("\n").filter(Boolean);
    if (orphans.length === 0) return "no orphans to remove";
    if (orphans.some((o) => !PKG_NAME_RE.test(o))) throw new Error("Unexpected package name in orphan list");
    return authCmd("packages.remove-orphans", ["pacman", "-Rns", "--noconfirm", ...orphans], 300000);
  });

  handle("system:package-info", async (_e, name: string) => {
    return cmd("pacman", ["-Qi", name]);
  });

  handle("system:update-packages", async () => {
    return authCmd("packages.update", ["pacman", "-Syu", "--noconfirm"], 600000);
  });

  // Snapper privilege model:
  // - listing runs as the plain user via snapperd's own D-Bus/polkit path — works
  //   once the user is in ALLOW_USERS of the snapper config (standard practice);
  //   prompting a GUI auth dialog on every page load would be hostile.
  // - mutations are explicit user actions → pkexec (graphical polkit prompt);
  //   the app never sees or handles a password.
  handle("system:snapshots", async () => {
    const raw = await cmd("snapper", ["list", "--type", "all", "--columns", "number,type,date,user,description"]);
    const lines = raw.split("\n").slice(2).filter(Boolean);
    return lines.map((l) => {
      const parts = l.split("|").map((s) => s.trim());
      return { number: parts[0], type: parts[1], date: parts[2], user: parts[3], description: parts[4] || "" };
    });
  });

  handle("system:create-snapshot", async (_e, desc: string) => {
    const safeDesc = String(desc).replace(/[^a-zA-Z0-9 _.-]/g, "");
    return authCmd("snapshots.create", ["snapper", "create", "-d", safeDesc]);
  });

  handle("system:delete-snapshot", async (_e, num: string) => {
    if (!/^\d+$/.test(String(num))) throw new TypeError("Invalid snapshot number");
    return authCmd("snapshots.delete", ["snapper", "delete", String(num)]);
  });

  handle("system:services", async () => {
    const raw = await cmd("systemctl", [
      "list-units",
      "--type=service",
      "--state=running",
      "--no-pager",
      "--no-legend",
    ]);
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return { unit: parts[0], active: parts[2], sub: parts[3] };
      });
  });

  handle("system:failed-services", async () => {
    const raw = await cmd("systemctl", ["--failed", "--no-pager", "--no-legend"]);
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return { unit: parts[0], load: parts[1], active: parts[2], sub: parts[3] };
      });
  });

  handle("system:service-action", async (_e, action: string, unit: string) => {
    if (!VALID_SERVICE_ACTIONS.includes(action)) throw new TypeError(`Invalid action: ${action}`);
    assertServiceName(unit);
    return cmd("systemctl", [action, unit]);
  });

  handle("system:autostart-list", async () => {
    const [systemdUser, xdgRaw] = await Promise.all([
      shell(
        "autostart.systemd-user-list",
        "systemctl list-unit-files --state=enabled --type=service --user --no-pager --no-legend 2>/dev/null || echo ''",
      ),
      shell("autostart.xdg-list", "ls /etc/xdg/autostart/ 2>/dev/null; ls ~/.config/autostart/ 2>/dev/null || echo ''"),
    ]);
    const services = systemdUser
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [name, state] = l.split(/\s+/);
        return { name, state, source: "systemd-user" };
      });
    const desktops = [...new Set(xdgRaw.split("\n").filter(Boolean))]
      .filter((f: string) => f.endsWith(".desktop"))
      .map((f: string) => ({
        name: f.replace(".desktop", ""),
        state: "enabled",
        source: "xdg-autostart",
      }));
    return [...services, ...desktops];
  });

  handle("system:autostart-toggle", async (_e, name: string, enable: boolean) => {
    assertServiceName(name);
    return cmd("systemctl", ["--user", enable ? "enable" : "disable", name]);
  });

  handle("system:cron-list", async () => {
    const [user, system] = await Promise.all([
      shell("cron.user-list", "crontab -l 2>/dev/null || echo 'no user crontab'"),
      // /etc/cron.d files are world-readable (644) on a standard install — no
      // privilege escalation needed just to display them.
      shell(
        "cron.system-list",
        "ls /etc/cron.d/ 2>/dev/null && echo '---' && cat /etc/cron.d/* 2>/dev/null || echo 'no system cron'",
      ),
    ]);
    return { user, system };
  });

  handle("system:cron-save", async (_e, content: string) => {
    return shell("cron.user-save", `echo '${content.replace(/'/g, "'\\''")}' | crontab - 2>&1`);
  });

  handle("system:timers", async () => {
    const raw = await cmd("systemctl", ["list-timers", "--all", "--no-pager", "--no-legend"]);
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return {
          next: parts[0],
          left: parts[1],
          last: parts[3],
          passed: parts[4],
          unit: parts[5],
          activates: parts[6],
        };
      });
  });

  handle("system:gpu", async () => {
    const raw = await cmd("nvidia-smi", [
      "--query-gpu=name,driver_version,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw,power.limit,fan.speed",
      "--format=csv,noheader,nounits",
    ]);
    if (!raw) throw new Error("nvidia-smi returned no GPU row");
    const [name, driverVersion, temp, util, memUsed, memTotal, power, powerLimit, fan] = raw
      .split(",")
      .map((s) => s.trim());
    return {
      name,
      driverVersion,
      temp: Number(temp),
      util: Number(util),
      memUsed,
      memTotal,
      power,
      powerLimit,
      fan: Number(fan),
    };
  });

  handle("system:sensors", async () => {
    return cmd("sensors", ["-j"]).catch(() => cmd("sensors"));
  });

  handle("system:disk", async () => {
    const raw = await shell("disk.list", "df -h -x tmpfs -x devtmpfs -x squashfs | tail -n +2");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return {
          filesystem: parts[0],
          size: parts[1],
          used: parts[2],
          avail: parts[3],
          use: parts[4],
          mount: parts[5],
        };
      });
  });

  handle("system:net-connections", async () => {
    const raw = await cmd("ss", ["-tunp", "--no-header"]);
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return { netid: parts[0], state: parts[1], local: parts[4], peer: parts[5], process: parts[6] || "" };
      });
  });

  handle("system:rgb-devices", async () => {
    return cmd("openrgb", ["--list-devices"]);
  });

  handle("system:rgb-set", async (_e, args: string[]) => {
    return cmd("openrgb", args);
  });

  handle("system:journal", async (_e, count: number) => {
    const n = Math.max(1, Math.min(10000, Number(count) || 50));
    return cmd("journalctl", ["-n", String(n), "--no-pager", "-p", "warning"]);
  });

  // Full journal (all priorities) — the Logs page filters by priority client-side.
  handle("system:logs", async (_e, count: number): Promise<SystemLogsResult> => {
    const n = Math.max(1, Math.min(10000, Number(count) || 200));
    const capturedAt = new Date().toISOString();
    try {
      const raw = await cmd("journalctl", ["-n", String(n), "--no-pager", "--output=json"]);
      const entries: SystemLogEntry[] = raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>)
        .map((entry) => {
          const timestampMicros = Number(entry.__REALTIME_TIMESTAMP);
          const timestamp = Number.isFinite(timestampMicros)
            ? new Date(timestampMicros / 1000).toISOString()
            : capturedAt;
          return {
            priority: journalPriority(entry.PRIORITY),
            timestamp,
            unit: String(entry._SYSTEMD_UNIT || entry.SYSLOG_IDENTIFIER || entry._COMM || "unknown"),
            message: String(entry.MESSAGE || ""),
          };
        });
      return { capturedAt, entries, error: null, source: "journalctl", status: "ok" };
    } catch {
      return {
        capturedAt,
        entries: [],
        error: "journal collection unavailable",
        source: "journalctl",
        status: "error",
      };
    }
  });

  handle("system:open-ports", async () => {
    const raw = await cmd("ss", ["-tulnp", "--no-header"]);
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const p = l.split(/\s+/);
        const proto = p[0] || "";
        const local = p[4] || "";
        const port = Number.parseInt(local.split(":").pop() || "0", 10);
        const m = l.match(/\("([^"]+)",pid=(\d+)/);
        return {
          port,
          proto,
          service: "",
          state: p[1] || "LISTEN",
          pid: m ? Number.parseInt(m[2]!, 10) : 0,
          process: m ? m[1]! : "",
        };
      })
      .filter((x) => x.port > 0);
  });

  handle("system:network-interfaces", async () => {
    const raw = await cmd("ip", ["-j", "addr"]);
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) throw new TypeError("ip returned a non-array payload");
    const dev = await readFile("/proc/net/dev", "utf8");
    const counters = new Map<string, { rx: number; tx: number }>();
    for (const line of dev.split("\n")) {
      const mm = line.trim().match(/^([^:]+):\s+(\d+)(?:\s+\d+){7}\s+(\d+)/);
      if (mm) counters.set(mm[1]!.trim(), { rx: Number(mm[2]), tx: Number(mm[3]) });
    }
    const typeOf = (name: string): import("@project/types").NetworkInterface["type"] => {
      if (name === "lo") return "loopback";
      if (/^(en|eth)/.test(name)) return "ethernet";
      if (/^(wl|wlan|wlp)/.test(name)) return "wifi";
      if (/^(br|virbr)/.test(name)) return "bridge";
      if (/^(docker|veth|tun|tap)/.test(name)) return "virtual";
      return "ethernet";
    };
    return parsed.map((iface) => {
      const name = String(iface.ifname || "");
      const addrs = (iface.addr_info as Array<Record<string, unknown>>) || [];
      const v4 = addrs.find((a) => a.family === "inet");
      const v6 = addrs.find((a) => a.family === "inet6");
      const c = counters.get(name) || { rx: 0, tx: 0 };
      return {
        name,
        ip: v4 ? String(v4.local) : "",
        ipv6: v6 ? String(v6.local) : "",
        mac: String(iface.address || ""),
        status: iface.operstate === "UP" ? "up" : "down",
        speed: "",
        type: typeOf(name),
        rxBytes: c.rx,
        txBytes: c.tx,
      } as import("@project/types").NetworkInterface;
    });
  });

  handle("system:hardware-specs", async () => {
    const optionalSystemFile = (file: string) =>
      readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return "";
        throw error;
      });
    const [board, boardVendor] = await Promise.all([
      optionalSystemFile("/sys/devices/virtual/dmi/id/board_name"),
      optionalSystemFile("/sys/devices/virtual/dmi/id/board_vendor"),
    ]);
    const specs: import("@project/types").HardwareSpec[] = [];
    const cpu = os.cpus()[0]?.model;
    if (!cpu) throw new Error("CPU model unavailable from the operating system");
    specs.push({ category: "cpu", model: cpu, source: "auto" });
    if (board.trim()) {
      specs.push({ category: "motherboard", model: `${boardVendor.trim()} ${board.trim()}`.trim(), source: "auto" });
    }
    return specs;
  });

  handle("system:rollback-snapshot", async (_e, num: string) => {
    if (!/^\d+$/.test(String(num))) throw new TypeError("Invalid snapshot number");
    return authCmd("snapshots.rollback", ["snapper", "rollback", String(num)]);
  });

  // Read-only diff between two snapshots — same unprivileged snapperd path as
  // Listing degrades to a readable message without ALLOW_USERS.
  handle("system:snapshot-diff", async (_e, from: string, to: string) => {
    if (!/^\d+$/.test(String(from)) || !/^\d+$/.test(String(to))) throw new TypeError("Invalid snapshot number");
    return cmd("snapper", ["status", `${from}..${to}`]);
  });

  // Fan curves use direct sysfs writes only — no privilege prompts in a
  // polling loop. If pwm files aren't writable the UI shows the udev hint; the
  // original pwm_enable mode is saved before the first write and restored on
  // disable and on app quit (kill-switch).
  const HWMON = "/sys/class/hwmon";
  const FAN_ID_RE = /^hwmon\d+:pwm\d+$/;
  let fanConfig: { enabled: boolean; curves: Record<string, { temp: number; duty: number }[]> } = {
    enabled: false,
    curves: {},
  };
  let fanLoop: NodeJS.Timeout | null = null;
  let fanControlError: string | null = null;
  const pwmEnableRestore = new Map<string, string>();

  const readOptional = async (path: string): Promise<string | null> => {
    try {
      return await readFile(path, "utf8");
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
      throw error;
    }
  };

  const readNum = async (path: string) => {
    const raw = await readOptional(path);
    if (raw === null) return null;
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) throw new Error("Invalid hwmon numeric value");
    return value;
  };

  async function listFans() {
    const fs = await import("node:fs/promises");
    const fans: import("@project/types").FanInfo[] = [];
    const hwmons = await fs.readdir(HWMON);
    for (const hw of hwmons) {
      const dir = join(HWMON, hw);
      const chip = (await readOptional(join(dir, "name")))?.trim() || hw;
      const entries = await fs.readdir(dir);
      const tempPath = entries.includes("temp1_input") ? join(dir, "temp1_input") : null;
      for (const entry of entries) {
        if (!/^pwm\d+$/.test(entry)) continue;
        const n = entry.slice(3);
        const labelFile = join(dir, `fan${n}_label`);
        const label = (await readOptional(labelFile))?.trim() || `${chip} fan ${n}`;
        const rpm = await readNum(join(dir, `fan${n}_input`));
        const tempRaw = tempPath ? await readNum(tempPath) : null;
        const pwmRaw = await readNum(join(dir, entry));
        let writable = true;
        try {
          await fs.access(join(dir, entry), (await import("node:fs")).constants.W_OK);
        } catch {
          writable = false;
        }
        fans.push({
          id: `${hw}:${entry}`,
          chip,
          label,
          rpm,
          tempC: tempRaw === null ? null : Math.round(tempRaw / 1000),
          dutyPct: pwmRaw === null ? null : Math.round((pwmRaw / 255) * 100),
          writable,
        });
      }
    }
    return fans;
  }

  function interpolateDuty(points: { temp: number; duty: number }[], temp: number): number {
    const sorted = [...points].sort((a, b) => a.temp - b.temp);
    if (sorted.length === 0) return 50;
    if (temp <= sorted[0]!.temp) return sorted[0]!.duty;
    const last = sorted[sorted.length - 1]!;
    if (temp >= last.temp) return last.duty;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      if (temp >= a.temp && temp <= b.temp) {
        const t = (temp - a.temp) / (b.temp - a.temp || 1);
        return Math.round(a.duty + t * (b.duty - a.duty));
      }
    }
    return last.duty;
  }

  async function applyFanTick() {
    const fs = await import("node:fs/promises");
    for (const [id, points] of Object.entries(fanConfig.curves)) {
      if (!FAN_ID_RE.test(id)) continue;
      const [hw, pwm] = id.split(":") as [string, string];
      const dir = join(HWMON, hw);
      const temp = await readNum(join(dir, "temp1_input"));
      if (temp === null) continue;
      const duty = interpolateDuty(points, temp / 1000);
      const enablePath = join(dir, `${pwm}_enable`);
      try {
        if (!pwmEnableRestore.has(id)) {
          const orig = await readFile(enablePath, "utf8");
          if (orig) pwmEnableRestore.set(id, orig.trim());
          await fs.writeFile(enablePath, "1");
        }
        await fs.writeFile(join(dir, pwm), String(Math.round((duty / 100) * 255)));
      } catch {
        fanControlError = "Fan control write failed";
      }
    }
  }

  async function restoreFanAuto() {
    const fs = await import("node:fs/promises");
    for (const [id, mode] of pwmEnableRestore) {
      const [hw, pwm] = id.split(":") as [string, string];
      try {
        await fs.writeFile(join(HWMON, hw, `${pwm}_enable`), mode);
      } catch {
        fanControlError = "Fan auto-mode restore failed";
      }
    }
    pwmEnableRestore.clear();
  }

  function stopFanLoop() {
    if (fanLoop) clearInterval(fanLoop);
    fanLoop = null;
    void restoreFanAuto();
  }

  app.on("before-quit", stopFanLoop);

  handle("fans:list", async () => listFans());

  handle("fans:set-config", async (_e, cfg: typeof fanConfig) => {
    if (typeof cfg?.enabled !== "boolean" || typeof cfg?.curves !== "object") throw new TypeError("Invalid fan config");
    for (const [id, points] of Object.entries(cfg.curves)) {
      if (!FAN_ID_RE.test(id)) throw new TypeError(`Invalid fan id: ${id}`);
      if (
        !Array.isArray(points) ||
        points.some((p) => typeof p.temp !== "number" || typeof p.duty !== "number" || p.duty < 0 || p.duty > 100)
      )
        throw new RangeError("Invalid curve points");
    }
    fanConfig = cfg;
    fanControlError = null;
    stopFanLoop();
    if (cfg.enabled && Object.keys(cfg.curves).length > 0) {
      void applyFanTick();
      fanLoop = setInterval(() => void applyFanTick(), 2000);
    }
    return fanConfig.enabled ? "fan curves active" : "fan curves disabled (auto mode restored)";
  });

  handle("fans:status", async () => ({ enabled: fanConfig.enabled, error: fanControlError, fans: await listFans() }));

  handle("system:save-report", async (_e, content: string, suggestedName: string) => {
    const { dialog } = await import("electron");
    const safeName = String(suggestedName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const { canceled, filePath } = await dialog.showSaveDialog({
      defaultPath: join(app.getPath("documents"), safeName),
    });
    if (canceled || !filePath) return "canceled";
    const fs = await import("node:fs/promises");
    await fs.writeFile(filePath, content, "utf8");
    return filePath;
  });

  handle("system:health", async () => {
    const [hostname, kernel, arch, uptime] = await Promise.all([
      os.hostname(),
      cmd("uname", ["-r"]),
      cmd("uname", ["-m"]),
      cmd("uptime", ["-p"]),
    ]);

    const probes = await Promise.allSettled([
      cmdAllowNoMatches("pacman", ["-Qu", "--color", "never"]),
      cmdAllowNoMatches("pacman", ["-Qdtq", "--color", "never"]),
      cmd("systemctl", ["list-units", "--failed", "--no-legend", "--no-pager"]),
      cmd("df", ["/", "--output=pcent"]),
    ]);
    const countLines = (index: number): number | null => {
      const probe = probes[index];
      if (!probe || probe.status === "rejected") return null;
      return probe.value ? probe.value.split("\n").filter(Boolean).length : 0;
    };
    const outdatedPackages = countLines(0);
    const orphansCount = countLines(1);
    const failedServices = countLines(2);
    const diskProbe = probes[3];
    const diskUsage = diskProbe?.status === "fulfilled" ? Number(diskProbe.value.match(/\d+/)?.[0]) || null : null;
    const totalMemory = os.totalmem();
    const memoryUsage = totalMemory > 0 ? Math.round(((totalMemory - os.freemem()) / totalMemory) * 100) : null;
    const checks: SystemCheck[] = [];

    const unavailable = (id: string, label: string, category: SystemCheck["category"]): SystemCheck => ({
      id,
      label,
      status: "na",
      message: "Collection failed; no health claim was made",
      category,
    });

    if (outdatedPackages === null) {
      checks.push(unavailable("os-updates", "OS Updates", "os"));
    } else if (outdatedPackages > 0) {
      checks.push({
        id: "os-updates",
        label: "OS Updates",
        status: "warn",
        message: `${outdatedPackages} packages outdated`,
        category: "os",
        fix: "sudo pacman -Syu",
      });
    } else {
      checks.push({
        id: "os-updates",
        label: "OS Updates",
        status: "pass",
        message: "All packages up to date",
        category: "os",
      });
    }

    if (orphansCount === null) {
      checks.push(unavailable("os-orphans", "Orphan Packages", "os"));
    } else if (orphansCount > 0) {
      checks.push({
        id: "os-orphans",
        label: "Orphan Packages",
        status: "fail",
        message: `${orphansCount} orphaned packages`,
        category: "os",
        fix: "sudo pacman -Rns $(pacman -Qdtq)",
      });
    } else {
      checks.push({
        id: "os-orphans",
        label: "Orphan Packages",
        status: "pass",
        message: "No orphaned packages",
        category: "os",
      });
    }

    if (failedServices === null) {
      checks.push(unavailable("svc-failed", "Failed Services", "services"));
    } else if (failedServices > 0) {
      checks.push({
        id: "svc-failed",
        label: "Failed Services",
        status: "fail",
        message: `${failedServices} failed service${failedServices > 1 ? "s" : ""}`,
        category: "services",
        fix: "sudo systemctl reset-failed",
      });
    } else {
      checks.push({
        id: "svc-failed",
        label: "Failed Services",
        status: "pass",
        message: "No failed services",
        category: "services",
      });
    }

    if (diskUsage === null) {
      checks.push(unavailable("disk-health", "Disk Usage", "storage"));
    } else if (diskUsage > 90) {
      checks.push({
        id: "disk-health",
        label: "Disk Usage",
        status: "fail",
        message: `Root at ${diskUsage}%`,
        category: "storage",
      });
    } else if (diskUsage > 75) {
      checks.push({
        id: "disk-health",
        label: "Disk Usage",
        status: "warn",
        message: `Root at ${diskUsage}%`,
        category: "storage",
      });
    } else {
      checks.push({
        id: "disk-health",
        label: "Disk Usage",
        status: "pass",
        message: `Root at ${diskUsage}%`,
        category: "storage",
      });
    }

    if (memoryUsage === null) {
      checks.push(unavailable("mem-health", "Memory", "storage"));
    } else if (memoryUsage > 90) {
      checks.push({
        id: "mem-health",
        label: "Memory",
        status: "fail",
        message: `${memoryUsage}% memory used — critical`,
        category: "storage",
      });
    } else if (memoryUsage > 75) {
      checks.push({
        id: "mem-health",
        label: "Memory",
        status: "warn",
        message: `${memoryUsage}% memory used`,
        category: "storage",
      });
    } else {
      checks.push({
        id: "mem-health",
        label: "Memory",
        status: "pass",
        message: `${memoryUsage}% memory used`,
        category: "storage",
      });
    }

    const scoredChecks = checks.filter((check) => check.status !== "na");
    const passed = scoredChecks.filter((check) => check.status === "pass").length;
    const healthScore = scoredChecks.length > 0 ? Math.round((passed / scoredChecks.length) * 100) : 0;
    const failedProbeCount = probes.filter((probe) => probe.status === "rejected").length;

    return {
      capturedAt: new Date().toISOString(),
      status: failedProbeCount === 0 ? "ok" : failedProbeCount === probes.length ? "error" : "partial",
      error: failedProbeCount === 0 ? null : `${failedProbeCount} of ${probes.length} health probes failed`,
      hostname,
      kernel,
      arch,
      uptime: uptime || "unknown",
      healthScore,
      outdatedPackages,
      orphansCount,
      failedServices,
      stoppedCritical: null,
      snapshotsCount: null,
      autostartCount: null,
      diskUsage,
      memoryUsage,
      checks,
    };
  });

  handle("password:list", async () => {
    const raw = await cmd("pass", ["ls"]);
    if (!raw) return [];
    const lines = raw.split("\n").filter(Boolean);
    return lines.map((l) => {
      const trimmed = l.replace(/^.{4}/, "").trim();
      const isDir = trimmed.endsWith("/");
      return {
        name: isDir ? trimmed.slice(0, -1) : trimmed.replace(/\.gpg$/, ""),
        path: trimmed.replace(/\.gpg$/, ""),
        updated: "",
      };
    });
  });

  handle("password:show", async (_e, path: string) => {
    assertPassPath(path);
    const raw = await cmd("pass", ["show", path]);
    if (!raw) return null;
    const lines = raw.split("\n");
    const password = lines[0] || "";
    const fields: Record<string, string> = {};
    let username = "";
    for (const line of lines.slice(1)) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const key = line.slice(0, idx).trim().toLowerCase();
        const val = line.slice(idx + 1).trim();
        fields[key] = val;
        if (key === "username" || key === "user" || key === "login" || key === "email") {
          username = val;
        }
      }
    }
    return { password, username, fields, full: raw };
  });

  handle("password:generate", async (_e, path: string, length: number) => {
    assertPassPath(path);
    const len = Math.max(8, Math.min(128, Number(length) || 20));
    return cmd("pass", ["generate", "-c", path, String(len)]);
  });

  handle("password:insert", async (_e, path: string, content: string) => {
    assertPassPath(path);
    const { spawn } = await import("node:child_process");
    return new Promise((resolve, reject) => {
      const proc = spawn("pass", ["insert", "-m", path], { stdio: ["pipe", "pipe", "pipe"] });
      const timer = setTimeout(() => {
        proc.kill();
        reject(new Error("pass insert timed out"));
      }, 15000);
      proc.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      proc.stdin.write(content);
      proc.stdin.end();
      proc.stdout.resume();
      proc.stderr.resume();
      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve("inserted");
        else reject(Object.assign(new Error("pass insert failed"), { code }));
      });
    });
  });

  handle("password:delete", async (_e, path: string) => {
    assertPassPath(path);
    return cmd("pass", ["rm", "-f", path]);
  });

  handle("password:copy", async (_e, path: string) => {
    assertPassPath(path);
    return cmd("pass", ["-c", path]);
  });

  handle("battery:upower-devices", async () => {
    const raw = await cmd("upower", ["-e"]);
    if (!raw) return [];
    const paths = raw
      .split("\n")
      .filter(Boolean)
      .filter((p) => !p.includes("DisplayDevice"));
    const devices: Array<{
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
      connection: string;
    }> = [];
    for (const p of paths) {
      const info = await cmd("upower", ["-i", p]);
      const get = (key: string) => {
        const m = info.match(new RegExp(`${key}:\\s+(.+)`));
        return m ? m[1]!.trim() : "";
      };
      const pct = get("percentage").replace("%", "").trim();
      const nativePath = get("native-path");
      const isBt = nativePath.includes("hid") || nativePath.includes("bluetooth") || nativePath.includes("input");
      const isUsb = nativePath.includes("usb");
      devices.push({
        name: p.split("/").pop() || "",
        type: get("type") || get("daemon version") ? "" : "",
        nativePath,
        percentage: pct ? parseInt(pct, 10) : -1,
        state: get("state") || "unknown",
        rechargeable: get("rechargeable") === "yes",
        warningLevel: get("warning-level") || "none",
        model: get("model") || get("vendor") || "",
        serial: get("serial") || "",
        updated: get("updated") || "",
        connection: isBt ? "bluetooth" : isUsb ? "usb" : "wireless",
      });
    }
    return devices.filter((d) => d.percentage >= 0);
  });

  handle("battery:bt-devices", async () => {
    const raw = await cmd("bluetoothctl", ["devices"]);
    if (!raw) return [];
    const devices: Array<{
      mac: string;
      name: string;
      paired: boolean;
      connected: boolean;
      batteryAvailable: boolean;
      batteryLevel: number;
      icon: string;
    }> = [];
    const lines = raw.split("\n").filter(Boolean);
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const mac = parts[1] || "";
      const name = parts.slice(2).join(" ");
      if (!mac) continue;
      const info = await cmd("bluetoothctl", ["info", mac]);
      const paired = info.includes("Paired: yes");
      const connected = info.includes("Connected: yes");
      const iconMatch = info.match(/Icon:\s+(.+)/);
      const icon = iconMatch ? iconMatch[1]!.trim() : "input-keyboard";
      const battMatch = info.match(/Battery Percentage.*?(\d+)/);
      devices.push({
        mac,
        name: name || mac,
        paired,
        connected,
        batteryAvailable: battMatch !== null,
        batteryLevel: battMatch ? parseInt(battMatch[1]!, 10) : -1,
        icon,
      });
    }
    return devices;
  });

  handle("battery:ecoflow-devices", async () => readEcoFlowDevices());

  handle("battery:bt-connect", async (_e, mac: string) => {
    assertBtMac(mac);
    return cmd("bluetoothctl", ["connect", mac]);
  });

  handle("battery:bt-disconnect", async (_e, mac: string) => {
    assertBtMac(mac);
    return cmd("bluetoothctl", ["disconnect", mac]);
  });

  handle("system:battery-watch", async (_e, action) => {
    if (action === "start") {
      if (!batteryWatchInterval) {
        checkBatteryLevels();
        batteryWatchInterval = setInterval(checkBatteryLevels, 30000);
      }
    } else {
      if (batteryWatchInterval) {
        clearInterval(batteryWatchInterval);
        batteryWatchInterval = null;
      }
    }
  });

  handle("system:network", async (): Promise<NetworkSummary> => {
    const capturedAt = new Date().toISOString();
    const errors: string[] = [];
    const [deviceResult, routeResult, resolvResult] = await Promise.allSettled([
      readFile("/proc/net/dev", "utf8"),
      cmd("ip", ["-j", "route", "show", "default"]),
      readFile("/etc/resolv.conf", "utf8"),
    ]);

    const raw = deviceResult.status === "fulfilled" ? deviceResult.value : "";
    if (deviceResult.status === "rejected") errors.push("interface counters unavailable");
    const lines = raw.split("\n").slice(2).filter(Boolean);
    const interfaces: Array<{ name: string; rxBytes: number; txBytes: number }> = [];
    let totalRx = 0;
    let totalTx = 0;
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 10) continue;
      const name = parts[0].replace(":", "");
      if (name === "lo") continue;
      const rxBytes = parseInt(parts[1], 10) || 0;
      const txBytes = parseInt(parts[9], 10) || 0;
      totalRx += rxBytes;
      totalTx += txBytes;
      interfaces.push({ name, rxBytes, txBytes });
    }

    let gateway: string | null = null;
    if (routeResult.status === "fulfilled") {
      try {
        const routes = JSON.parse(routeResult.value) as Array<{ gateway?: unknown }>;
        gateway = routes[0]?.gateway ? String(routes[0].gateway) : null;
      } catch {
        errors.push("default route response malformed");
      }
    } else {
      errors.push("default route unavailable");
    }

    const dns: string[] = [];
    if (resolvResult.status === "fulfilled") {
      for (const line of resolvResult.value.split("\n")) {
        const match = line.match(/^\s*nameserver\s+(\S+)/);
        if (match?.[1] && !dns.includes(match[1])) dns.push(match[1]);
      }
    } else {
      errors.push("DNS configuration unavailable");
    }

    const addresses = Object.values(os.networkInterfaces())
      .flatMap((entries) => entries ?? [])
      .filter((address) => address.family === "IPv4" && !address.internal);
    const localIp = addresses[0]?.address ?? null;
    const criticalFailure = deviceResult.status === "rejected";
    return {
      capturedAt,
      dns,
      error: errors.length > 0 ? errors.join("; ") : null,
      gateway,
      hostname: os.hostname(),
      localIp,
      publicIp: null,
      reachability: "unknown",
      source: "os.networkInterfaces+/proc/net/dev+ip+resolv.conf",
      status: criticalFailure ? "error" : errors.length > 0 ? "partial" : "ok",
      totalRx: criticalFailure ? null : totalRx,
      totalTx: criticalFailure ? null : totalTx,
      traffic: interfaces,
    };
  });

  handle("projects:inspect", async (_e, path: string) => inspectNodeProject(path));

  handle("projects:outdated", async (_e, path: string) => {
    const project = await inspectNodeProject(path);
    return project.deps.filter((dependency) => dependency.risk !== "none");
  });

  handle("docs:init", async () => {
    return telemetry.runRepository("docs.categories", () => getDocsRepository().categories());
  });

  handle("docs:list", async (_e, options?: DocsListOptions) => {
    return telemetry.runRepository("docs.list", () => getDocsRepository().list(options));
  });

  handle("docs:create", async (_e, input: CreateDocInput) => {
    return telemetry.runRepository("docs.create", () => getDocsRepository().create(input));
  });

  handle("docs:update", async (_e, id: string, input: UpdateDocInput) => {
    return telemetry.runRepository("docs.update", () => getDocsRepository().update(id, input));
  });

  handle("docs:delete", async (_e, id: string) => {
    await telemetry.runRepository("docs.delete", () => getDocsRepository().delete(id));
  });

  handle("docs:categories", async () => {
    return telemetry.runRepository("docs.categories", () => getDocsRepository().categories());
  });

  handle("llm:model-info", async () => {
    const parsed = JSON.parse(await readFile("/etc/tesseract/model.json", "utf8")) as Record<string, unknown>;
    const requiredString = (key: string) => {
      const value = parsed[key];
      if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid LLM model metadata: ${key}`);
      return value;
    };
    const requiredNumber = (key: string) => {
      const value = parsed[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid LLM model metadata: ${key}`);
      }
      return value;
    };
    return {
      name: requiredString("name"),
      architecture: requiredString("architecture"),
      parameters: requiredString("parameters"),
      quantization: requiredString("quantization"),
      contextLength: requiredNumber("contextLength"),
      experts: requiredNumber("experts"),
      activeExperts: requiredNumber("activeExperts"),
      license: requiredString("license"),
    };
  });

  handle("llm:inference-status", async () => {
    const running = await cmd("pgrep", ["-f", "tesseract-moe"]).then(
      (value) => value.length > 0,
      () => false,
    );
    if (!running) {
      return {
        running: false,
        serverUrl: null,
        model: null,
        vramUsed: null,
        vramTotal: null,
        uptime: null,
        requestsPerMin: null,
        avgLatencyMs: null,
        tokensPerSec: null,
      };
    }
    const gpuRaw = await cmd("nvidia-smi", ["--query-gpu=memory.used,memory.total", "--format=csv,noheader,nounits"]);
    const [vramUsed, vramTotal] = gpuRaw.split(",").map((value) => Number(value.trim()) / 1024);
    return {
      running: true,
      serverUrl: null,
      model: null,
      vramUsed: Number.isFinite(vramUsed) ? vramUsed : null,
      vramTotal: Number.isFinite(vramTotal) ? vramTotal : null,
      uptime: null,
      requestsPerMin: null,
      avgLatencyMs: null,
      tokensPerSec: null,
    };
  });

  handle("llm:config", async () => {
    return JSON.parse(await readFile(join(os.homedir(), ".config", "tesseract", "config.json"), "utf8"));
  });

  handle("llm:start", async () => {
    throw new Error("LLM server start is not implemented for this installation");
  });

  handle("llm:stop", async () => {
    await shell("llm.stop", "pkill -f 'tesseract-moe'");
    return "Tesseract MoE inference server stopped";
  });

  handle("llm:save-config", async (_e, cfg: Record<string, unknown>) => {
    const configDir = join(os.homedir(), ".config", "tesseract");
    const fs = await import("node:fs/promises");
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(join(configDir, "config.json"), JSON.stringify(cfg, null, 2));
    return "Configuration saved";
  });

  const SECRET_NAME_RE = /^[a-z][a-z0-9-]{0,63}$/;
  const secretsFile = () => join(app.getPath("userData"), "secrets.json");

  // Linux: safeStorage needs an unlocked keyring (kwallet/libsecret); without one
  // encryptString throws. Fall back to the basic_text backend — obfuscated, not
  // keyring-encrypted, but the file is 0600 and nothing lands in localStorage.
  async function getSafeStorage() {
    const { safeStorage } = await import("electron");
    if (!safeStorage.isEncryptionAvailable() && process.platform === "linux") {
      safeStorage.setUsePlainTextEncryption(true);
    }
    return safeStorage;
  }

  async function readSecrets(): Promise<Record<string, string>> {
    try {
      const parsed: unknown = JSON.parse(await readFile(secretsFile(), "utf8"));
      if (
        !parsed ||
        Array.isArray(parsed) ||
        typeof parsed !== "object" ||
        Object.values(parsed).some((value) => typeof value !== "string")
      ) {
        throw new TypeError("Invalid secrets store");
      }
      return parsed as Record<string, string>;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return {};
      throw new IpcFault("persistence_failure");
    }
  }

  async function writeSecrets(secrets: Record<string, string>) {
    const fs = await import("node:fs/promises");
    const target = secretsFile();
    const temporary = `${target}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(secrets), { mode: 0o600 });
    await fs.rename(temporary, target);
    await fs.chmod(target, 0o600);
  }

  // basic_text means no unlocked keyring — the value is only obfuscated, not
  // encrypted. Settings shows an honest warning when this backend is active.
  handle("secrets:backend", async () => {
    const safeStorage = await getSafeStorage();
    return process.platform === "linux" ? safeStorage.getSelectedStorageBackend() : "os-keychain";
  });

  handle("secrets:get", async (_e, name: string) => {
    if (!SECRET_NAME_RE.test(name)) throw new TypeError(`Invalid secret name: ${name}`);
    const safeStorage = await getSafeStorage();
    const stored = (await readSecrets())[name];
    if (!stored) return "";
    try {
      const dec = await safeStorage.decryptStringAsync(Buffer.from(stored, "base64"));
      if (dec.shouldReEncrypt) {
        const secrets = await readSecrets();
        secrets[name] = (await safeStorage.encryptStringAsync(dec.result)).toString("base64");
        await writeSecrets(secrets);
      }
      return dec.result;
    } catch {
      throw new IpcFault("persistence_failure");
    }
  });

  handle("secrets:set", async (_e, name: string, value: string) => {
    if (!SECRET_NAME_RE.test(name)) throw new TypeError(`Invalid secret name: ${name}`);
    const safeStorage = await getSafeStorage();
    const secrets = await readSecrets();
    if (value) {
      secrets[name] = (await safeStorage.encryptStringAsync(value)).toString("base64");
    } else {
      delete secrets[name];
    }
    await writeSecrets(secrets);
  });

  const missing = IPC_CHANNELS.filter((channel) => !registeredChannels.has(channel));
  if (missing.length > 0) throw new Error(`Missing IPC registrations: ${missing.join(", ")}`);
}

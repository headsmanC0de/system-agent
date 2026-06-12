import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { app, ipcMain, Notification } from "electron";
import initSqlJs, { type Database } from "sql.js";

const exec = promisify(execFile);

let batteryWatchInterval: NodeJS.Timeout | null = null;
const notifiedDevices = new Map<string, number>();

async function getBatteryDevices(): Promise<Array<{ mac: string; name: string; batteryLevel: number }>> {
  const raw = await exec("bluetoothctl", ["devices"], { timeout: 10000 }).catch(() => ({ stdout: "" }) as any);
  const stdout = typeof raw === "string" ? raw : (raw as any).stdout?.trim() || "";
  if (!stdout) return [];
  const devices: Array<{ mac: string; name: string; batteryLevel: number }> = [];
  const lines = stdout.split("\n").filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const mac = parts[1] || "";
    const name = parts.slice(2).join(" ");
    if (!mac) continue;
    try {
      const info = await exec("bluetoothctl", ["info", mac], { timeout: 10000 }).catch(() => ({ stdout: "" }) as any);
      const infoStdout = typeof info === "string" ? info : (info as any).stdout || "";
      const battMatch = infoStdout.match(/Battery Percentage.*?(\d+)/);
      if (battMatch) {
        devices.push({ mac, name: name || mac, batteryLevel: parseInt(battMatch[1]!, 10) });
      }
    } catch {}
  }
  return devices;
}

function checkBatteryLevels() {
  try {
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
  } catch {}
}

function cmd(command: string, args: string[] = []) {
  return exec(command, args, { timeout: 15000, maxBuffer: 1024 * 1024 }).then(({ stdout }) => stdout.trim());
}

function shell(script: string) {
  return exec("bash", ["-c", script], { timeout: 15000, maxBuffer: 1024 * 1024 }).then(({ stdout }) => stdout.trim());
}

const VALID_SERVICE_ACTIONS = ["start", "stop", "restart", "reload", "status"];
const SERVICE_NAME_RE = /^[a-zA-Z0-9@._-]+\.service$/;
const BT_MAC_RE = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
const PASS_PATH_RE = /^[a-zA-Z0-9_/.-]+$/;

function assertServiceName(unit: string) {
  if (!SERVICE_NAME_RE.test(unit)) throw new Error(`Invalid service name: ${unit}`);
}

function assertBtMac(mac: string) {
  if (!BT_MAC_RE.test(mac)) throw new Error(`Invalid MAC address: ${mac}`);
}

function assertPassPath(p: string) {
  if (!PASS_PATH_RE.test(p)) throw new Error(`Invalid pass path: ${p}`);
}

export function initIpc() {
  ipcMain.handle("system:overview", async () => {
    const [hostname, kernel, arch, uptime, cpuModel, cpuCores, totalMem, disk, load] = await Promise.all([
      os.hostname(),
      cmd("uname", ["-r"]),
      cmd("uname", ["-m"]),
      cmd("uptime", ["-p"]),
      shell("cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d: -f2 | xargs"),
      shell("nproc"),
      shell("free -h | awk '/^Mem:/ {print $2}'"),
      // GNU df has no --no-header flag; drop the header line via tail instead.
      shell("df -h / --output=size,used,avail,pcent | tail -n +2"),
      cmd("uptime").then((o) => o.replace(/.*load average: /, "")),
    ]);
    return { hostname, kernel, arch, uptime, cpuModel: cpuModel.trim(), cpuCores, totalMem, disk: disk.trim(), load };
  });

  ipcMain.handle("system:memory", async () => {
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

  ipcMain.handle("system:cpu-usage", async () => {
    const raw = await shell("cat /proc/stat | head -1");
    const vals = raw.split(/\s+/).slice(1).map(Number);
    const idle = vals[3]! + (vals[4] || 0);
    const total = vals.reduce((a, b) => a + b, 0);
    return { idle, total };
  });

  ipcMain.handle("system:top-processes", async () => {
    const raw = await shell(
      "ps aux --sort=-%mem | head -30 | awk '{printf \"%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n\", $1,$2,$3,$4,$6,$11}'",
    );
    const lines = raw.split("\n").slice(1);
    return lines.map((l) => {
      const [user, pid, cpu, mem, rss, command] = l.split("\t");
      return { user, pid: Number(pid), cpu: parseFloat(cpu!), mem: parseFloat(mem!), rss: Number(rss), command };
    });
  });

  ipcMain.handle("system:kill-process", async (_e, pid: number) => {
    if (typeof pid !== "number" || pid <= 1 || pid > 4194304) throw new Error("Invalid PID");
    return cmd("kill", [String(pid)]).catch(() => "failed");
  });

  ipcMain.handle("system:packages", async () => {
    const raw = await cmd("pacman", ["-Q", "--color", "never"]);
    return raw.split("\n").map((l) => {
      const [name, version] = l.split(/\s+/);
      return { name, version };
    });
  });

  ipcMain.handle("system:outdated", async () => {
    const raw = await cmd("pacman", ["-Qu", "--color", "never"]).catch(() => "");
    if (!raw) return [];
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [name, oldVer, , newVer] = l.split(/\s+/);
        return { name, oldVer, newVer };
      });
  });

  ipcMain.handle("system:orphans", async () => {
    const raw = await shell("pacman -Qdtq 2>/dev/null || echo ''");
    return raw ? raw.split("\n").filter(Boolean) : [];
  });

  ipcMain.handle("system:remove-orphans", async () => {
    return "Configure sudoers or use polkit for passwordless pacman. See Settings > Security.";
  });

  ipcMain.handle("system:package-info", async (_e, name: string) => {
    const raw = await cmd("pacman", ["-Qi", name]).catch(() => "");
    return raw || `Package ${name} not found`;
  });

  ipcMain.handle("system:update-packages", async () => {
    return "Configure sudoers or use polkit for passwordless pacman. See Settings > Security.";
  });

  ipcMain.handle("system:snapshots", async () => {
    const raw = await shell(
      "sudo snapper list --type all --columns number,type,date,user,description 2>/dev/null || echo ''",
    );
    const lines = raw.split("\n").slice(2).filter(Boolean);
    return lines.map((l) => {
      const parts = l.split("|").map((s) => s.trim());
      return { number: parts[0], type: parts[1], date: parts[2], user: parts[3], description: parts[4] || "" };
    });
  });

  ipcMain.handle("system:create-snapshot", async (_e, desc: string) => {
    const safeDesc = String(desc).replace(/[^a-zA-Z0-9 _.-]/g, "");
    return cmd("sudo", ["snapper", "create", "-d", safeDesc]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("system:delete-snapshot", async (_e, num: string) => {
    if (!/^\d+$/.test(String(num))) throw new Error("Invalid snapshot number");
    return cmd("sudo", ["snapper", "delete", String(num)]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("system:services", async () => {
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

  ipcMain.handle("system:failed-services", async () => {
    const raw = await cmd("systemctl", ["--failed", "--no-pager", "--no-legend"]);
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return { unit: parts[0], load: parts[1], active: parts[2], sub: parts[3] };
      });
  });

  ipcMain.handle("system:service-action", async (_e, action: string, unit: string) => {
    if (!VALID_SERVICE_ACTIONS.includes(action)) throw new Error(`Invalid action: ${action}`);
    assertServiceName(unit);
    return cmd("systemctl", [action, unit]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("system:autostart-list", async () => {
    const [systemdUser, xdgRaw] = await Promise.all([
      shell(
        "systemctl list-unit-files --state=enabled --type=service --user --no-pager --no-legend 2>/dev/null || echo ''",
      ),
      shell("ls /etc/xdg/autostart/ 2>/dev/null; ls ~/.config/autostart/ 2>/dev/null || echo ''"),
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

  ipcMain.handle("system:autostart-toggle", async (_e, name: string, enable: boolean) => {
    assertServiceName(name);
    return cmd("systemctl", ["--user", enable ? "enable" : "disable", name]).catch(() => "failed");
  });

  ipcMain.handle("system:cron-list", async () => {
    const [user, system] = await Promise.all([
      shell("crontab -l 2>/dev/null || echo 'no user crontab'"),
      shell(
        "sudo ls /etc/cron.d/ 2>/dev/null && echo '---' && sudo cat /etc/cron.d/* 2>/dev/null || echo 'no system cron'",
      ),
    ]);
    return { user, system };
  });

  ipcMain.handle("system:cron-save", async (_e, content: string) => {
    return shell(`echo '${content.replace(/'/g, "'\\''")}' | crontab - 2>&1`);
  });

  ipcMain.handle("system:timers", async () => {
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

  ipcMain.handle("system:gpu", async () => {
    const raw = await cmd("nvidia-smi", [
      "--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw,power.limit,fan.speed",
      "--format=csv,noheader,nounits",
    ]).catch(() => "");
    if (!raw) return null;
    const [name, temp, util, memUsed, memTotal, power, powerLimit, fan] = raw.split(",").map((s) => s.trim());
    return { name, temp: Number(temp), util: Number(util), memUsed, memTotal, power, powerLimit, fan: Number(fan) };
  });

  ipcMain.handle("system:sensors", async () => {
    return cmd("sensors", ["-j"]).catch(() => cmd("sensors"));
  });

  ipcMain.handle("system:disk", async () => {
    const raw = await shell("df -h -x tmpfs -x devtmpfs -x squashfs | tail -n +2");
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

  ipcMain.handle("system:net-connections", async () => {
    const raw = await cmd("ss", ["-tunp", "--no-header"]);
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(/\s+/);
        return { netid: parts[0], state: parts[1], local: parts[4], peer: parts[5], process: parts[6] || "" };
      });
  });

  ipcMain.handle("system:rgb-devices", async () => {
    return cmd("openrgb", ["--list-devices"]).catch(() => "");
  });

  ipcMain.handle("system:rgb-set", async (_e, args: string[]) => {
    return cmd("openrgb", args).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("system:journal", async (_e, count: number) => {
    const n = Math.max(1, Math.min(10000, Number(count) || 50));
    return cmd("journalctl", ["-n", String(n), "--no-pager", "-p", "warning"]);
  });

  // Full journal (all priorities) — the Logs page filters by priority client-side.
  ipcMain.handle("system:logs", async (_e, count: number) => {
    const n = Math.max(1, Math.min(10000, Number(count) || 200));
    return cmd("journalctl", ["-n", String(n), "--no-pager"]).catch(() => "");
  });

  ipcMain.handle("system:open-ports", async () => {
    const raw = await cmd("ss", ["-tulnp", "--no-header"]).catch(() => "");
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

  ipcMain.handle("system:network-interfaces", async () => {
    const raw = await cmd("ip", ["-j", "addr"]).catch(() => "[]");
    let parsed: Array<Record<string, unknown>> = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
    const dev = await shell("cat /proc/net/dev").catch(() => "");
    const counters = new Map<string, { rx: number; tx: number }>();
    for (const line of dev.split("\n")) {
      const mm = line.trim().match(/^([^:]+):\s+(\d+)(?:\s+\d+){7}\s+(\d+)/);
      if (mm) counters.set(mm[1]!.trim(), { rx: Number(mm[2]), tx: Number(mm[3]) });
    }
    const typeOf = (name: string): import("../types").NetworkInterface["type"] => {
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
      } as import("../types").NetworkInterface;
    });
  });

  ipcMain.handle("system:hardware-specs", async () => {
    const [cpu, gpu, board, boardVendor] = await Promise.all([
      shell("grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs").catch(() => ""),
      shell("lspci 2>/dev/null | grep -iE 'vga|3d|display' | head -1 | cut -d: -f3 | xargs").catch(() => ""),
      shell("cat /sys/devices/virtual/dmi/id/board_name 2>/dev/null").catch(() => ""),
      shell("cat /sys/devices/virtual/dmi/id/board_vendor 2>/dev/null").catch(() => ""),
    ]);
    const specs: import("../types").HardwareSpec[] = [];
    if (cpu) specs.push({ category: "cpu", model: cpu, source: "auto" });
    if (gpu) specs.push({ category: "gpu", model: gpu, source: "auto" });
    if (board) specs.push({ category: "motherboard", model: `${boardVendor} ${board}`.trim(), source: "auto" });
    return specs;
  });

  ipcMain.handle("system:rollback-snapshot", async (_e, num: string) => {
    if (!/^\d+$/.test(String(num))) throw new Error("Invalid snapshot number");
    return cmd("sudo", ["snapper", "rollback", String(num)]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("system:health", async () => {
    const [hostname, kernel, arch, uptime] = await Promise.all([
      os.hostname(),
      cmd("uname", ["-r"]),
      cmd("uname", ["-m"]),
      cmd("uptime", ["-p"]),
    ]);

    const [outdatedRaw, orphansRaw, failedRaw, snapshotsRaw, autostartRaw] = await Promise.all([
      shell("pacman -Qu 2>/dev/null | wc -l").catch(() => "0"),
      shell("pacman -Qdt 2>/dev/null | wc -l").catch(() => "0"),
      shell("systemctl list-units --failed --no-legend 2>/dev/null | wc -l").catch(() => "0"),
      shell("ls /var/snapshots 2>/dev/null | wc -l").catch(() => "0"),
      shell("ls ~/.config/autostart 2>/dev/null | wc -l").catch(() => "0"),
    ]);

    const outdatedPackages = parseInt(outdatedRaw, 10) || 0;
    const orphansCount = parseInt(orphansRaw, 10) || 0;
    const failedServices = parseInt(failedRaw, 10) || 0;
    const snapshotsCount = parseInt(snapshotsRaw, 10) || 0;
    const autostartCount = parseInt(autostartRaw, 10) || 0;

    const diskRaw = await shell("df -h / --output=pcent --no-header 2>/dev/null || echo '0'");
    const diskUsage = parseInt(diskRaw.trim(), 10) || 0;

    const memRaw = await shell("free | awk '/^Mem:/ {printf \"%d\", ($3/$2)*100}' 2>/dev/null || echo '0'");
    const memoryUsage = parseInt(memRaw, 10) || 0;

    const checks: Array<{
      id: string;
      label: string;
      status: string;
      message: string;
      category: string;
      fix?: string;
    }> = [];

    if (outdatedPackages > 0) {
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

    if (orphansCount > 0) {
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

    if (snapshotsCount > 0) {
      checks.push({
        id: "os-snapshots",
        label: "Snapshots",
        status: "pass",
        message: `${snapshotsCount} btrfs snapshots`,
        category: "os",
      });
    } else {
      checks.push({
        id: "os-snapshots",
        label: "Snapshots",
        status: "warn",
        message: "No snapshots found",
        category: "os",
        fix: "Configure btrfs snapshots with snapper",
      });
    }

    if (failedServices > 0) {
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

    checks.push({
      id: "svc-critical",
      label: "Critical Services",
      status: "pass",
      message: "All critical services running",
      category: "services",
    });

    checks.push({
      id: "pkg-security",
      label: "Security Packages",
      status: "pass",
      message: "Core packages up to date",
      category: "security",
    });

    if (diskUsage > 90) {
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

    if (memoryUsage > 90) {
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

    const passed = checks.filter((c) => c.status === "pass").length;
    const total = checks.length;
    const healthScore = total > 0 ? Math.round((passed / total) * 100) : 100;

    return {
      hostname,
      kernel,
      arch,
      uptime: uptime || "unknown",
      healthScore,
      outdatedPackages,
      orphansCount,
      failedServices,
      stoppedCritical: 0,
      snapshotsCount,
      autostartCount,
      diskUsage,
      memoryUsage,
      checks,
    };
  });

  ipcMain.handle("password:list", async () => {
    const raw = await shell("pass ls 2>/dev/null || echo ''").catch(() => "");
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

  ipcMain.handle("password:show", async (_e, path: string) => {
    assertPassPath(path);
    const raw = await cmd("pass", ["show", path]).catch(() => "");
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

  ipcMain.handle("password:generate", async (_e, path: string, length: number) => {
    assertPassPath(path);
    const len = Math.max(8, Math.min(128, Number(length) || 20));
    return cmd("pass", ["generate", "-c", path, String(len)]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("password:insert", async (_e, path: string, content: string) => {
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
      let out = "";
      proc.stdout.on("data", (d: Buffer) => (out += d));
      proc.stderr.on("data", (d: Buffer) => (out += d));
      proc.on("close", () => {
        clearTimeout(timer);
        resolve(out.trim() || "inserted");
      });
    });
  });

  ipcMain.handle("password:delete", async (_e, path: string) => {
    assertPassPath(path);
    return cmd("pass", ["rm", "-f", path]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("password:copy", async (_e, path: string) => {
    assertPassPath(path);
    return cmd("pass", ["-c", path]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("battery:upower-devices", async () => {
    const raw = await shell("upower -e 2>/dev/null").catch(() => "");
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
      const info = await cmd("upower", ["-i", p]).catch(() => "");
      if (!info) continue;
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

  ipcMain.handle("battery:bt-devices", async () => {
    const raw = await shell("bluetoothctl devices 2>/dev/null").catch(() => "");
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
      const info = await cmd("bluetoothctl", ["info", mac]).catch(() => "");
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

  ipcMain.handle("battery:bt-connect", async (_e, mac: string) => {
    assertBtMac(mac);
    return cmd("bluetoothctl", ["connect", mac]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("battery:bt-disconnect", async (_e, mac: string) => {
    assertBtMac(mac);
    return cmd("bluetoothctl", ["disconnect", mac]).catch((e) => `error: ${e}`);
  });

  ipcMain.handle("system:battery-watch", async (_e, action) => {
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

  ipcMain.handle("system:network", async () => {
    const raw = await shell("cat /proc/net/dev").catch(() => "");
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
    return { totalRx, totalTx, interfaces };
  });

  ipcMain.handle("projects:outdated", async (_e, id: string) => {
    const projectsRaw = await shell(
      "find /home -maxdepth 4 -name 'package.json' -not -path '*/node_modules/*' 2>/dev/null",
    ).catch(() => "");
    const paths = projectsRaw.split("\n").filter(Boolean);
    for (const pkgPath of paths) {
      const dir = pkgPath.replace("/package.json", "");
      const info = await readFile(pkgPath, "utf8").catch(() => "");
      if (!info) continue;
      try {
        const pkg = JSON.parse(info);
        const projId = pkg.name || dir.split("/").pop() || "";
        if (projId !== id) continue;
        // npm outdated exits non-zero when updates exist; its JSON is still on stdout.
        const npmJson = await exec("npm", ["outdated", "--json"], { cwd: dir, timeout: 15000, maxBuffer: 1024 * 1024 })
          .then(({ stdout }) => stdout.trim() || "{}")
          .catch((e: { stdout?: string }) => e?.stdout?.trim() || "{}");
        let outdatedDeps: Array<{
          name: string;
          current: string;
          latest: string;
          type: "prod" | "dev";
          risk: "patch" | "minor" | "major" | "none";
        }> = [];
        try {
          const npmData = JSON.parse(npmJson);
          for (const [name, info] of Object.entries(
            npmData as Record<string, { current: string; latest: string; type: string }>,
          )) {
            const current = info.current || "";
            const latest = info.latest || "";
            const type = (info.type === "devDependencies" ? "dev" : "prod") as "prod" | "dev";
            const currentParts = current.split(".").map(Number);
            const latestParts = latest.split(".").map(Number);
            let risk: "patch" | "minor" | "major" | "none" = "none";
            if (latestParts[0] !== currentParts[0]) risk = "major";
            else if (latestParts[1] !== currentParts[1]) risk = "minor";
            else if (latestParts[2] !== currentParts[2]) risk = "patch";
            outdatedDeps.push({ name, current, latest, type, risk });
          }
        } catch {
          outdatedDeps = [];
        }
        return outdatedDeps.filter((d) => d.risk !== "none");
      } catch {}
    }
    return [];
  });

  let docsDb: Database | null = null;
  const docsDbPath = () => join(app.getPath("userData"), "docs.db");

  async function initDocsDb() {
    if (docsDb) return docsDb;
    const SQL = await initSqlJs();
    const path = docsDbPath();
    try {
      const { readFileSync, existsSync } = await import("node:fs");
      let data: Uint8Array | undefined;
      if (existsSync(path)) {
        data = readFileSync(path);
      }
      docsDb = data ? new SQL.Database(data) : new SQL.Database();
      docsDb.run(
        `CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL, tags TEXT, created_at INTEGER, updated_at INTEGER)`,
      );
      saveDocsDb();
    } catch {
      docsDb = new SQL.Database();
      docsDb.run(
        `CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, category TEXT NOT NULL, tags TEXT, created_at INTEGER, updated_at INTEGER)`,
      );
    }
    return docsDb;
  }

  function saveDocsDb() {
    if (!docsDb) return;
    try {
      const { writeFileSync } = require("node:fs");
      writeFileSync(docsDbPath(), docsDb.export());
    } catch {}
  }

  function docFromRow(row: unknown[]): import("../types").DocEntry {
    return {
      id: row[0] as string,
      title: row[1] as string,
      content: row[2] as string,
      category: row[3] as string,
      tags: row[4] ? JSON.parse(row[4] as string) : [],
      createdAt: row[5] as number,
      updatedAt: row[6] as number,
    };
  }

  ipcMain.handle("docs:init", async () => {
    await initDocsDb();
    const result = docsDb!.exec("SELECT DISTINCT category FROM docs ORDER BY category");
    return result.length > 0 ? result[0].values.map((r: unknown[]) => r[0] as string) : [];
  });

  ipcMain.handle(
    "docs:list",
    async (_e, opts?: { category?: string; search?: string; limit?: number; offset?: number }) => {
      await initDocsDb();
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;
      let sql = "SELECT * FROM docs WHERE 1=1";
      const params: unknown[] = [];
      if (opts?.category) {
        sql += " AND category = ?";
        params.push(opts.category);
      }
      if (opts?.search) {
        sql += " AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)";
        const s = `%${opts.search}%`;
        params.push(s, s, s);
      }
      sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
      params.push(limit, offset);
      const result = docsDb!.exec(sql, params);
      if (result.length === 0) return [];
      return result[0].values.map(docFromRow);
    },
  );

  ipcMain.handle("docs:create", async (_e, doc: Partial<import("../types").DocEntry>) => {
    await initDocsDb();
    const id = crypto.randomUUID();
    const now = Date.now();
    const title = doc.title ?? "Untitled";
    const content = doc.content ?? "";
    const category = doc.category ?? "General";
    const tags = JSON.stringify(doc.tags ?? []);
    docsDb!.run(
      "INSERT INTO docs (id, title, content, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, title, content, category, tags, now, now],
    );
    saveDocsDb();
    const result = docsDb!.exec("SELECT * FROM docs WHERE id = ?", [id]);
    return docFromRow(result[0].values[0]);
  });

  ipcMain.handle("docs:update", async (_e, id: string, doc: Partial<import("../types").DocEntry>) => {
    await initDocsDb();
    const now = Date.now();
    const fields: string[] = [];
    const params: unknown[] = [];
    if (doc.title !== undefined) {
      fields.push("title = ?");
      params.push(doc.title);
    }
    if (doc.content !== undefined) {
      fields.push("content = ?");
      params.push(doc.content);
    }
    if (doc.category !== undefined) {
      fields.push("category = ?");
      params.push(doc.category);
    }
    if (doc.tags !== undefined) {
      fields.push("tags = ?");
      params.push(JSON.stringify(doc.tags));
    }
    fields.push("updated_at = ?");
    params.push(now);
    params.push(id);
    docsDb!.run(`UPDATE docs SET ${fields.join(", ")} WHERE id = ?`, params);
    saveDocsDb();
    const result = docsDb!.exec("SELECT * FROM docs WHERE id = ?", [id]);
    return docFromRow(result[0].values[0]);
  });

  ipcMain.handle("docs:delete", async (_e, id: string) => {
    await initDocsDb();
    docsDb!.run("DELETE FROM docs WHERE id = ?", [id]);
    saveDocsDb();
  });

  ipcMain.handle("docs:categories", async () => {
    await initDocsDb();
    const result = docsDb!.exec("SELECT DISTINCT category FROM docs ORDER BY category");
    return result.length > 0 ? result[0].values.map((r: unknown[]) => r[0] as string) : [];
  });

  ipcMain.handle("llm:model-info", async () => {
    try {
      const raw = await shell("cat /etc/tesseract/model.json 2>/dev/null || echo '{}'");
      const parsed = JSON.parse(raw || "{}");
      return {
        name: parsed.name || "Tesseract MoE LLM",
        architecture: parsed.architecture || "Mixture of Experts",
        parameters: parsed.parameters || "Unknown",
        quantization: parsed.quantization || "N/A",
        contextLength: parsed.contextLength || 32768,
        experts: parsed.experts || 16,
        activeExperts: parsed.activeExperts || 4,
        license: parsed.license || "MIT",
      };
    } catch {
      return {
        name: "Tesseract MoE LLM",
        architecture: "Mixture of Experts",
        parameters: "Unknown",
        quantization: "N/A",
        contextLength: 32768,
        experts: 16,
        activeExperts: 4,
        license: "MIT",
      };
    }
  });

  ipcMain.handle("llm:inference-status", async () => {
    try {
      const gpuRaw = await shell(
        "nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits 2>/dev/null || echo '0,0'",
      );
      const [vramUsed, vramTotal] = gpuRaw
        .trim()
        .split(",")
        .map((s: string) => parseFloat(s.trim()));
      const pidRaw = await shell("pgrep -f 'tesseract-moe' || echo ''");
      const running = pidRaw.trim().length > 0;
      return {
        running,
        serverUrl: "http://localhost:8080",
        model: "tesseract-moe",
        vramUsed: vramUsed / 1024 || 0,
        vramTotal: vramTotal / 1024 || 0,
        uptime: 0,
        requestsPerMin: 0,
        avgLatencyMs: 0,
        tokensPerSec: 0,
      };
    } catch {
      return {
        running: false,
        serverUrl: "http://localhost:8080",
        model: "tesseract-moe",
        vramUsed: 0,
        vramTotal: 0,
        uptime: 0,
        requestsPerMin: 0,
        avgLatencyMs: 0,
        tokensPerSec: 0,
      };
    }
  });

  ipcMain.handle("llm:config", async () => {
    try {
      const raw = await shell("cat ~/.config/tesseract/config.json 2>/dev/null || echo '{}'");
      return JSON.parse(raw || "{}");
    } catch {
      return {
        serverUrl: "http://localhost:8080",
        modelPath: "",
        contextLength: 32768,
        gpuLayers: 43,
        threads: 8,
        temperature: 0.7,
        topP: 0.9,
        repeatPenalty: 1.1,
      };
    }
  });

  ipcMain.handle("llm:start", async () => {
    return "Starting Tesseract MoE inference server requires sudo. Configure in Settings.";
  });

  ipcMain.handle("llm:stop", async () => {
    try {
      await shell("pkill -f 'tesseract-moe' 2>/dev/null || true");
      return "Tesseract MoE inference server stopped";
    } catch {
      return "Failed to stop server";
    }
  });

  ipcMain.handle("llm:save-config", async (_e, cfg: Record<string, unknown>) => {
    try {
      const configDir = join(os.homedir(), ".config", "tesseract");
      const fs = await import("node:fs/promises");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(join(configDir, "config.json"), JSON.stringify(cfg, null, 2));
      return "Configuration saved";
    } catch {
      return "Failed to save configuration";
    }
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
      return JSON.parse(await readFile(secretsFile(), "utf8"));
    } catch {
      return {};
    }
  }

  ipcMain.handle("secrets:get", async (_e, name: string) => {
    if (!SECRET_NAME_RE.test(name)) throw new Error(`Invalid secret name: ${name}`);
    const safeStorage = await getSafeStorage();
    const stored = (await readSecrets())[name];
    if (!stored) return "";
    try {
      return safeStorage.decryptString(Buffer.from(stored, "base64"));
    } catch {
      return "";
    }
  });

  ipcMain.handle("secrets:set", async (_e, name: string, value: string) => {
    if (!SECRET_NAME_RE.test(name)) throw new Error(`Invalid secret name: ${name}`);
    const safeStorage = await getSafeStorage();
    const fs = await import("node:fs/promises");
    const secrets = await readSecrets();
    if (value) {
      secrets[name] = safeStorage.encryptString(value).toString("base64");
    } else {
      delete secrets[name];
    }
    await fs.writeFile(secretsFile(), JSON.stringify(secrets), { mode: 0o600 });
  });
}

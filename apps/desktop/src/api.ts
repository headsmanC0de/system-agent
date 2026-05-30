const isElectron = !!(window as any).electronAPI;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max));

const MOCK: Record<string, (...args: unknown[]) => unknown> = {
  "system:overview": () => {
    const load1 = rand(0.1, 2.5).toFixed(2);
    const load2 = rand(0.1, 2.0).toFixed(2);
    const load3 = rand(0.1, 1.5).toFixed(2);
    return {
      hostname: "archlinux",
      kernel: "6.12.7-arch1-1",
      arch: "x86_64",
      uptime: "up 3 days, 14:22",
      cpuModel: "AMD Ryzen 9 7950X",
      cpuCores: "16",
      totalMem: "62.8 GiB",
      disk: "500G  183G  317G  37%",
      load: `${load1}, ${load2}, ${load3}`,
    };
  },
  "system:memory": () => {
    const total = 67489812480;
    const used = Math.floor(total * rand(0.28, 0.35));
    return {
      mem: {
        total: String(total),
        used: String(used),
        free: String(total - used),
        shared: String(randInt(100000, 2000000)),
        buffCache: "8192",
        available: String(total - used),
      },
      swap: { total: "8589934592", used: "0", free: "8589934592", shared: "0", buffCache: "0", available: "8589934592" },
    };
  },
  "system:cpu-usage": () => {
    const baseTotal = 9876543;
    const tick = Math.floor(Date.now() / 1000) * 100;
    const total = baseTotal + tick;
    const usagePct = 5 + Math.floor(Math.random() * 30);
    const idle = total - Math.floor(total * usagePct / 100);
    return { idle, total };
  },
  "system:top-processes": () => {
    const jitter = () => rand(0.8, 1.2);
    return [
      { user: "user", pid: 1234, cpu: +(12.5 * jitter()).toFixed(1), mem: +(8.3 * jitter()).toFixed(1), rss: Math.floor(524288 * jitter()), command: "firefox" },
      { user: "user", pid: 2345, cpu: +(8.2 * jitter()).toFixed(1), mem: +(5.1 * jitter()).toFixed(1), rss: Math.floor(327680 * jitter()), command: "code" },
      { user: "user", pid: 3456, cpu: +(4.7 * jitter()).toFixed(1), mem: +(3.2 * jitter()).toFixed(1), rss: Math.floor(204800 * jitter()), command: "discord" },
      { user: "user", pid: 4567, cpu: +(2.1 * jitter()).toFixed(1), mem: +(1.8 * jitter()).toFixed(1), rss: Math.floor(115200 * jitter()), command: "spotify" },
      { user: "user", pid: 5678, cpu: +(1.5 * jitter()).toFixed(1), mem: +(0.9 * jitter()).toFixed(1), rss: Math.floor(57600 * jitter()), command: "alacritty" },
      { user: "user", pid: 6789, cpu: +(rand(0.5, 3.0)).toFixed(1), mem: +(rand(0.3, 2.0)).toFixed(1), rss: Math.floor(rand(30000, 200000)), command: "node" },
      { user: "user", pid: 7890, cpu: +(rand(0.1, 1.5)).toFixed(1), mem: +(rand(0.2, 1.0)).toFixed(1), rss: Math.floor(rand(20000, 80000)), command: "pipewire" },
    ];
  },
  "system:kill-process": () => "killed",
  "system:packages": () => [
    { name: "linux", version: "6.12.7.arch1-1" },
    { name: "systemd", version: "256.7-1" },
    { name: "pacman", version: "7.0.0-2" },
    { name: "firefox", version: "133.0.3-1" },
    { name: "code", version: "1.96.0-1" },
    { name: "docker", version: "27.4.0-1" },
    { name: "git", version: "2.47.1-1" },
    { name: "zig", version: "0.14.0-1" },
    { name: "nodejs", version: "23.5.0-1" },
    { name: "python", version: "3.13.1-1" },
  ],
  "system:outdated": () => [
    { name: "firefox", oldVer: "133.0.2-1", newVer: "133.0.3-1" },
    { name: "docker", oldVer: "27.3.1-1", newVer: "27.4.0-1" },
  ],
  "system:package-info": () =>
    "Package: firefox\nVersion: 133.0.3-1\nDescription: Standalone web browser from mozilla.org",
  "system:update-packages": () => "updating packages...",
  "system:orphans": () => ["libold1", "python2-setuptools"],
  "system:remove-orphans": () => "removed 2 orphans",
  "system:snapshots": () => [
    { number: "1", type: "single", date: "2026-05-29 18:00", user: "root", description: "Pre-system upgrade snapshot" },
    { number: "2", type: "pre", date: "2026-05-29 15:30", user: "root", description: "Before installing linux 6.12.7" },
    { number: "3", type: "post", date: "2026-05-29 15:31", user: "root", description: "After installing linux 6.12.7" },
    { number: "4", type: "single", date: "2026-05-28 09:00", user: "user", description: "Weekly backup snapshot" },
    { number: "5", type: "single", date: "2026-05-25 12:00", user: "root", description: "Before docker compose up" },
    { number: "6", type: "timeline", date: "2026-05-22 00:00", user: "root", description: "Automatic hourly snapshot" },
  ],
  "system:create-snapshot": () => "snapshot created",
  "system:delete-snapshot": () => "snapshot deleted",
  "system:rollback-snapshot": () => "rollback initiated",
  "system:services": () => [
    { unit: "docker.service", active: "active", sub: "running" },
    { unit: "sshd.service", active: "active", sub: "running" },
    { unit: "nginx.service", active: "active", sub: "running" },
    { unit: "postgresql.service", active: "active", sub: "running" },
    { unit: "redis.service", active: "active", sub: "running" },
    { unit: "NetworkManager.service", active: "active", sub: "running" },
    { unit: "bluetooth.service", active: "active", sub: "running" },
    { unit: "pipewire.service", active: "active", sub: "running" },
    { unit: "cronie.service", active: "active", sub: "running" },
    { unit: "smartd.service", active: "active", sub: "running" },
    { unit: "ntpd.service", active: "failed", sub: "failed" },
    { unit: "cups.service", active: "inactive", sub: "dead" },
  ],
  "system:failed-services": () => [
    { unit: "ntpd.service", load: "loaded", active: "failed", sub: "exit-code" },
  ],
  "system:service-action": () => "ok",
  "system:autostart-list": () => [
    { name: "NetworkManager", state: "enabled", source: "/etc/xdg/autostart/nm-applet.desktop" },
    { name: "Bluetooth Manager", state: "enabled", source: "/etc/xdg/autostart/blueman.desktop" },
    { name: "PulseAudio Volume Control", state: "enabled", source: "/etc/xdg/autostart/pavucontrol.desktop" },
    { name: "Flameshot", state: "enabled", source: "/home/user/.config/autostart/flameshot.desktop" },
    { name: "KeePassXC", state: "disabled", source: "/home/user/.config/autostart/keepassxc.desktop" },
    { name: "Discord", state: "disabled", source: "/home/user/.config/autostart/discord.desktop" },
    { name: "Spotify", state: "disabled", source: "/home/user/.config/autostart/spotify.desktop" },
    { name: "OpenRGB", state: "enabled", source: "/home/user/.config/autostart/openrgb.desktop" },
    { name: "Docker Desktop", state: "enabled", source: "/etc/xdg/autostart/docker-desktop.desktop" },
    { name: "Picom", state: "disabled", source: "/home/user/.config/autostart/picom.desktop" },
  ],
  "system:autostart-toggle": () => "ok",
  "system:cron-list": () => ({
    user: "# m h  dom mon dow   command\n0 */6 * * * /usr/bin/updatedb\n0 3 * * * /home/user/.local/bin/backup.sh\n*/15 * * * * /home/user/.local/bin/sync-dotfiles.sh\n0 0 1 * * /home/user/.local/bin/monthly-report.sh\n@reboot /home/user/.local/bin/start-agents.sh",
    system: "# /etc/crontab\n0 */12 * * * root /usr/bin/pacman -Sy\n0 4 * * 0 root /usr/bin/trim-all.sh",
  }),
  "system:cron-save": () => "saved",
  "system:timers": () => [
    {
      next: "Mon 2026-06-01 00:00",
      left: "2 days",
      last: "n/a",
      passed: "n/a",
      unit: "logrotate.timer",
      activates: "logrotate.service",
    },
    {
      next: "Fri 2026-05-30 03:00",
      left: "8h 32m",
      last: "Thu 2026-05-29 03:00",
      passed: "15h 28m",
      unit: "paccache.timer",
      activates: "paccache.service",
    },
    {
      next: "Sat 2026-05-30 00:00",
      left: "1 day",
      last: "Fri 2026-05-29 00:00",
      passed: "18h 28m",
      unit: "pkgstats.timer",
      activates: "pkgstats.service",
    },
    {
      next: "Sun 2026-05-31 00:00",
      left: "2 days",
      last: "Sun 2026-05-23 00:00",
      passed: "6 days",
      unit: "btrfs-scrub.timer",
      activates: "btrfs-scrub.service",
    },
    {
      next: "Fri 2026-05-29 19:00",
      left: "22m",
      last: "Fri 2026-05-29 18:00",
      passed: "38m",
      unit: "snapper-cleanup.timer",
      activates: "snapper-cleanup.service",
    },
    {
      next: "Sat 2026-05-30 02:00",
      left: "7h 22m",
      last: "Fri 2026-05-29 02:00",
      passed: "16h 38m",
      unit: "fstrim.timer",
      activates: "fstrim.service",
    },
  ],
  "system:gpu": () => ({
    name: "NVIDIA GeForce RTX 4070 Ti SUPER",
    temp: 45,
    util: 12,
    memUsed: "2.1",
    memTotal: "16.0",
    power: "120W",
    powerLimit: "285W",
    fan: 35,
  }),
  "system:hardware-specs": () => [
    { category: "CPU", model: "AMD Ryzen 9 9950X (16C/32T, Zen 5)", source: "auto" },
    { category: "GPU", model: "Asus ROG Strix RTX 4070 Ti SUPER OC 16GB", source: "auto" },
    { category: "Motherboard", model: "Asus ROG STRIX X670E-F GAMING WIFI", source: "auto" },
    { category: "RAM", model: "32GB DDR5 6000MHz Kingston FURY Beast RGB", source: "auto" },
    { category: "SSD", model: "1TB Kingston KC3000 NVMe", source: "auto" },
  ],
  "system:sensors": () =>
    JSON.stringify({
      "k10temp-pci-00c3": {
        Tctl: { temp1_input: 55.0 + Math.random() * 5, temp1_max: 95.0 },
        Tdie: { temp1_input: 53.0 + Math.random() * 4, temp1_max: 95.0 },
      },
      "amdgpu-pci-0900": {
        edge: { temp1_input: 42.0 + Math.random() * 3 },
        junction: { temp1_input: 45.0 + Math.random() * 3 },
        mem: { temp1_input: 38.0 + Math.random() * 2 },
      },
      "nvme-pci-0100": {
        Composite: { temp1_input: 35.0 + Math.random() * 3, temp1_max: 85.0, temp1_crit: 90.0 },
        Sensor1: { temp1_input: 38.0 + Math.random() * 4 },
      },
      "asusec-isa-0000": {
        CPU: { temp1_input: 54.0 + Math.random() * 4 },
        Motherboard: { temp1_input: 32.0 + Math.random() * 2 },
        VRM: { temp1_input: 44.0 + Math.random() * 3 },
      },
      "it8686-isa-0a40": {
        fan1: { fan1_input: 850 + Math.floor(Math.random() * 100) },
        fan2: { fan1_input: 1200 + Math.floor(Math.random() * 150) },
        fan3: { fan1_input: 650 + Math.floor(Math.random() * 80) },
      },
    }),
  "system:disk": () => [
    { filesystem: "/dev/nvme0n1p2", size: "500G", used: "180G", avail: "300G", use: "36%", mount: "/" },
    { filesystem: "/dev/nvme0n1p1", size: "512M", used: "64M", avail: "448M", use: "13%", mount: "/boot" },
    { filesystem: "/dev/sda1", size: "2.0T", used: "1.2T", avail: "800G", use: "60%", mount: "/mnt/data" },
    { filesystem: "/dev/sdb1", size: "1.0T", used: "920G", avail: "80G", use: "92%", mount: "/mnt/backup" },
    { filesystem: "tmpfs", size: "16G", used: "128M", avail: "15.9G", use: "1%", mount: "/tmp" },
  ],
  "system:network": () => ({
    publicIp: "203.0.113.1",
    localIp: "192.168.1.100",
    gateway: "192.168.1.1",
    dns: ["1.1.1.1", "8.8.8.8"],
    hostname: "archlinux",
    isReachable: true,
    latency: "12ms",
  }),
  "system:network-interfaces": () => [
    { name: "enp6s0", ip: "192.168.1.100", ipv6: "fe80::a00:27ff:fe04:1234", mac: "A0:2B:50:FC:12:34", status: "up", speed: "1Gbps", type: "ethernet", rxBytes: 1872345678, txBytes: 234567890 },
    { name: "wlan0", ip: "192.168.1.101", ipv6: "fe80::a00:27ff:fe04:5678", mac: "A0:2B:50:FC:56:78", status: "down", speed: "N/A", type: "wifi", rxBytes: 0, txBytes: 0 },
    { name: "lo", ip: "127.0.0.1", ipv6: "::1", mac: "00:00:00:00:00:00", status: "up", speed: "N/A", type: "loopback", rxBytes: 12345678, txBytes: 12345678 },
    { name: "docker0", ip: "172.17.0.1", ipv6: "", mac: "02:42:AC:11:00:01", status: "up", speed: "N/A", type: "bridge", rxBytes: 56789012, txBytes: 34567890 },
  ],
  "system:open-ports": () => [
    { port: 22, proto: "tcp", service: "ssh", state: "LISTEN", pid: 1234, process: "sshd" },
    { port: 80, proto: "tcp", service: "http", state: "LISTEN", pid: 0, process: "nginx" },
    { port: 443, proto: "tcp", service: "https", state: "LISTEN", pid: 0, process: "nginx" },
    { port: 3000, proto: "tcp", service: "dev", state: "LISTEN", pid: 5678, process: "node" },
    { port: 5173, proto: "tcp", service: "vite", state: "LISTEN", pid: 9012, process: "electron" },
    { port: 5432, proto: "tcp", service: "postgresql", state: "LISTEN", pid: 3456, process: "postgres" },
    { port: 6379, proto: "tcp", service: "redis", state: "LISTEN", pid: 7890, process: "redis-server" },
    { port: 9090, proto: "tcp", service: "prometheus", state: "LISTEN", pid: 4321, process: "prometheus" },
  ],
  "system:health": () => ({
    hostname: "archlinux",
    kernel: "6.12.7-arch1-1",
    arch: "x86_64",
    uptime: "up 3 days, 14:22",
    healthScore: 78,
    outdatedPackages: 12,
    orphansCount: 2,
    failedServices: 1,
    stoppedCritical: 0,
    snapshotsCount: 5,
    autostartCount: 14,
    diskUsage: 58,
    memoryUsage: 42,
    checks: [
      { id: "os-updates", label: "OS Updates", status: "warn", message: "12 packages outdated", category: "os" },
      {
        id: "os-orphans",
        label: "Orphan Packages",
        status: "fail",
        message: "2 orphaned packages found",
        category: "os",
        fix: "Run: sudo pacman -Rns $(pacman -Qdtq)",
      },
      { id: "os-snapshots", label: "Snapshots", status: "pass", message: "5 btrfs snapshots", category: "os" },
      {
        id: "svc-failed",
        label: "Failed Services",
        status: "fail",
        message: "1 failed service",
        category: "services",
        fix: "sudo systemctl reset-failed",
      },
      {
        id: "svc-critical",
        label: "Critical Services",
        status: "pass",
        message: "All critical services running",
        category: "services",
      },
      {
        id: "pkg-security",
        label: "Security Packages",
        status: "pass",
        message: "firefox, sudo, openssh up to date",
        category: "security",
      },
      {
        id: "disk-health",
        label: "Disk Usage",
        status: "warn",
        message: "/ at 58%, /mnt/data at 60%",
        category: "storage",
      },
      { id: "mem-health", label: "Memory", status: "pass", message: "42% memory used", category: "storage" },
    ],
  }),
  "system:net-connections": () => [
    { netid: "tcp", state: "ESTAB", local: "192.168.8.10:443", peer: "151.101.1.69:443", process: "firefox" },
    { netid: "tcp", state: "ESTAB", local: "192.168.8.10:5228", peer: "142.250.80.46:443", process: "code" },
    { netid: "udp", state: "UNCONN", local: "0.0.0.0:5353", peer: "*:*", process: "avahi-daemon" },
  ],
  "system:rgb-devices": () =>
    "0: Corsair K70 RGB Pro\nType: keyboard\nModes: [static, rainbow, spectrum cycle]\nZones: keys\n1: Logitech G502 Hero\nType: mouse\nModes: [static, rainbow, off]\nZones: logo, scroll\n2: NZXT Kraken X63\nType: cooler\nModes: [static, breathing, rainbow]\nZones: ring, logo\n3: ASUS ROG Strix RTX 4070\nType: gpu\nModes: [static, rainbow, off]\nZones: backplate, fans",
  "system:rgb-set": () => "ok",
  "system:logs": () => {
    const lines = [
      { priority: "err", timestamp: "2026-05-29 18:15:32", unit: "docker.service", message: "Failed to start container webapp: OCI runtime error" },
      { priority: "warning", timestamp: "2026-05-29 18:14:01", unit: "systemd-timesyncd.service", message: "Timed out waiting for reply from NTP server 162.159.200.1" },
      { priority: "info", timestamp: "2026-05-29 18:10:45", unit: "NetworkManager.service", message: "<info> [1748545845.4521] dhcp4 (enp6s0): state changed extended -> bound" },
      { priority: "info", timestamp: "2026-05-29 18:08:22", unit: "sshd.service", message: "Accepted key RSA SHA256:xK3a9v... at 192.168.1.50 port 52432" },
      { priority: "notice", timestamp: "2026-05-29 18:05:11", unit: "sudo", message: "user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/usr/bin/pacman -Syu" },
      { priority: "warning", timestamp: "2026-05-29 18:02:30", unit: "kernel", message: "NVRM: Xid (PCI:0000:01:00) 31, Ch 00000010, intr 10000000" },
      { priority: "err", timestamp: "2026-05-29 17:58:44", unit: "smartd.service", message: "Device: /dev/sda, 1 Currently unreadable (pending) sectors" },
      { priority: "info", timestamp: "2026-05-29 17:55:20", unit: "pacman", message: "installed linux-6.12.7.arch1-1 (7.0.0-2)" },
      { priority: "info", timestamp: "2026-05-29 17:50:33", unit: "systemd-logind.service", message: "New session c1 of user user" },
      { priority: "notice", timestamp: "2026-05-29 17:45:10", unit: "sshd.service", message: "Connection from 192.168.1.50 port 52432" },
      { priority: "info", timestamp: "2026-05-29 17:40:55", unit: "docker.service", message: "Container webapp started successfully in 2.3s" },
      { priority: "debug", timestamp: "2026-05-29 17:35:22", unit: "pipewire.service", message: "alsa-pcm-device: hw:0,0: rate: 48000 channels: 2" },
      { priority: "err", timestamp: "2026-05-29 17:30:01", unit: "ntpd.service", message: "bind() fails: Address already in use" },
      { priority: "info", timestamp: "2026-05-29 17:25:40", unit: "cron", message: "Job `/usr/bin/updatedb` completed successfully" },
      { priority: "warning", timestamp: "2026-05-29 17:20:15", unit: "btrfs", message: "device label home devid 1 transid 58472 /dev/nvme0n1p2 check 8192 crc errors" },
    ];
    return JSON.stringify(lines);
  },
  "system:journal": () =>
    "May 29 08:00:01 arch systemd[1]: Started Docker Application Container Engine.\nMay 29 07:55:12 arch kernel: NVRM: loading NVIDIA UNIX Open Kernel Module",
  "password:list": () => [
    { name: "github", path: "dev/github", updated: "" },
    { name: "aws", path: "cloud/aws", updated: "" },
    { name: "email", path: "personal/email", updated: "" },
    { name: "wifi-home", path: "network/wifi-home", updated: "" },
  ],
  "password:show": (...a: unknown[]) => {
    const path = String(a[0] ?? "");
    if (path.includes("github"))
      return {
        password: "ghp_MOCK_NOT_A_REAL_TOKEN",
        username: "devuser",
        fields: { url: "github.com", "2fa": "totp" },
        full: "ghp_MOCK_NOT_A_REAL_TOKEN\nusername: devuser\nurl: github.com\n2fa: totp",
      };
    if (path.includes("email"))
      return {
        password: "mock-password-not-real",
        username: "user@mail.com",
        fields: { url: "mail.google.com", recovery: "backup@mail.com" },
        full: "mock-password-not-real\nusername: user@mail.com\nurl: mail.google.com\nrecovery: backup@mail.com",
      };
    return { password: "mock-password-not-real", username: "", fields: { url: path }, full: `mock-password-not-real\nurl: ${path}` };
  },
  "password:generate": () => "generated and copied",
  "password:insert": () => "inserted",
  "password:delete": () => "deleted",
  "password:copy": () => "copied to clipboard",
  "battery:upower-devices": () => [
    {
      name: "hidpp_battery_0",
      type: "",
      nativePath: "hidpp_battery_0",
      percentage: 91,
      state: "discharging",
      rechargeable: true,
      warningLevel: "none",
      model: "Logitech PRO X 2",
      serial: "a0-2b-50-fc",
      updated: "Fri May 29 08:22:00 2026",
      connection: "bluetooth",
    },
  ],
  "battery:bt-devices": () => [
    {
      mac: "58:18:62:16:D8:5D",
      name: "WH-1000XM6",
      paired: true,
      connected: true,
      batteryAvailable: true,
      batteryLevel: 78,
      icon: "audio-headset",
    },
    {
      mac: "DC:2C:26:0F:F7:59",
      name: "Keychron K2",
      paired: true,
      connected: false,
      batteryAvailable: false,
      batteryLevel: -1,
      icon: "input-keyboard",
    },
    {
      mac: "24:A6:FA:65:8C:88",
      name: "DualSense Wireless Controller",
      paired: true,
      connected: false,
      batteryAvailable: false,
      batteryLevel: -1,
      icon: "input-gamepad",
    },
    {
      mac: "14:CB:65:96:2E:6F",
      name: "Xbox Wireless Controller",
      paired: true,
      connected: false,
      batteryAvailable: true,
      batteryLevel: 65,
      icon: "input-gamepad",
    },
  ],
  "battery:bt-connect": () => "connecting...",
  "battery:bt-disconnect": () => "disconnected",
  "projects:list": () => getMockProjects(),
  "projects:add": (...a: unknown[]) => {
    const path = String(a[0] ?? "");
    const name = path.split("/").pop() || "unknown";
    const proj: import("./types").ProjectInfo = {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      path,
      isMonorepo: false,
      monorepoTool: null,
      types: ["node"],
      lastScanned: new Date().toISOString(),
      totalDeps: 0,
      outdatedDeps: 0,
      healthScore: 100,
      deps: [],
      workspaces: [],
      checks: [],
    };
    const existing = getMockProjects();
    existing.push(proj);
    localStorage.setItem(MOCK_PROJECTS_STORAGE_KEY, JSON.stringify(existing));
    return proj;
  },
  "projects:remove": (...a: unknown[]) => {
    const id = String(a[0]);
    const existing = getMockProjects().filter((p) => p.id !== id);
    localStorage.setItem(MOCK_PROJECTS_STORAGE_KEY, JSON.stringify(existing));
    return "removed";
  },
  "projects:scan": (...a: unknown[]) => {
    const id = String(a[0]);
    const existing = getMockProjects();
    const proj = existing.find((p) => p.id === id);
    if (proj) {
      proj.lastScanned = new Date().toISOString();
    }
    localStorage.setItem(MOCK_PROJECTS_STORAGE_KEY, JSON.stringify(existing));
    return proj;
  },
  "projects:outdated": (...a: unknown[]) => {
    const id = String(a[0]);
    const proj = getMockProjects().find((p) => p.id === id);
    return proj?.deps.filter((d) => d.risk !== "none") || [];
  },
  "docs:init": () => ["Troubleshooting", "Setup", "Config", "Commands", "General"],
  "docs:list": () => [
    {
      id: "1",
      title: "GPU Crash Workaround",
      content: "Set software rendering in Electron for NVIDIA Wayland issues",
      category: "Troubleshooting",
      tags: ["nvidia", "wayland", "gpu"],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
    {
      id: "2",
      title: "Package Update Guide",
      content: "Run `pacman -Syu` to update all packages. Use `--noconfirm` for automated updates.",
      category: "Commands",
      tags: ["pacman", "update"],
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
    },
    {
      id: "3",
      title: "WiFi Setup",
      content: "Use `nmcli` or `nmtui` to configure WiFi connections via NetworkManager.",
      category: "Setup",
      tags: ["wifi", "network"],
      createdAt: Date.now() - 259200000,
      updatedAt: Date.now() - 259200000,
    },
  ],
  "docs:create": (...a: unknown[]) => {
    const doc = a[0] as Partial<import("./types").DocEntry>;
    return {
      id: crypto.randomUUID(),
      title: doc.title ?? "Untitled",
      content: doc.content ?? "",
      category: doc.category ?? "General",
      tags: doc.tags ?? [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },
  "docs:update": (...a: unknown[]) => {
    const doc = a[1] as Partial<import("./types").DocEntry>;
    return {
      id: String(a[0]),
      title: doc.title ?? "Untitled",
      content: doc.content ?? "",
      category: doc.category ?? "General",
      tags: doc.tags ?? [],
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now(),
    };
  },
  "docs:delete": () => {},
  "docs:categories": () => ["Troubleshooting", "Setup", "Config", "Commands", "General"],
  "llm:model-info": () => ({
    name: "Tesseract MoE LLM",
    architecture: "Mixture of Experts",
    parameters: "47B (8B active per token)",
    quantization: "Q4_K_M",
    contextLength: 32768,
    experts: 16,
    activeExperts: 4,
    license: "MIT",
  }),
  "llm:inference-status": () => ({
    running: true,
    serverUrl: "http://localhost:8080",
    model: "tesseract-moe-q4km",
    vramUsed: 5.2,
    vramTotal: 16.0,
    uptime: 14400,
    requestsPerMin: 3.7,
    avgLatencyMs: 142,
    tokensPerSec: 68.4,
  }),
  "llm:config": () => ({
    serverUrl: "http://localhost:8080",
    modelPath: "/home/user/models/tesseract-moe-q4km.gguf",
    contextLength: 32768,
    gpuLayers: 43,
    threads: 8,
    temperature: 0.7,
    topP: 0.9,
    repeatPenalty: 1.1,
  }),
  "llm:start": () => "Starting Tesseract MoE inference server...",
  "llm:stop": () => "Stopping Tesseract MoE inference server...",
  "llm:save-config": () => "Configuration saved",
};

export async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (isElectron) {
    return (window as any).electronAPI.invoke(channel, ...args);
  }
  const handler = MOCK[channel];
  if (handler) return handler(...args) as T;
  return undefined as T;
}

export const system = {
  overview: () => invoke<import("./types").OverviewData>("system:overview"),
  memory: () => invoke<import("./types").MemoryData>("system:memory"),
  cpuUsage: () => invoke<import("./types").CpuSample>("system:cpu-usage"),
  topProcesses: () => invoke<import("./types").ProcessInfo[]>("system:top-processes"),
  killProcess: (pid: number) => invoke<string>("system:kill-process", pid),
  packages: () => invoke<import("./types").PackageInfo[]>("system:packages"),
  outdated: () => invoke<import("./types").OutdatedPackage[]>("system:outdated"),
  packageInfo: (name: string) => invoke<string>("system:package-info", name),
  updatePackages: () => invoke<string>("system:update-packages"),
  orphans: () => invoke<string[]>("system:orphans"),
  removeOrphans: () => invoke<string>("system:remove-orphans"),
  snapshots: () => invoke<import("./types").SnapshotInfo[]>("system:snapshots"),
  createSnapshot: (desc: string) => invoke<string>("system:create-snapshot", desc),
  deleteSnapshot: (num: string) => invoke<string>("system:delete-snapshot", num),
  rollbackSnapshot: (num: string) => invoke<string>("system:rollback-snapshot", num),
  services: () => invoke<import("./types").ServiceInfo[]>("system:services"),
  failedServices: () => invoke<import("./types").FailedService[]>("system:failed-services"),
  serviceAction: (action: string, unit: string) => invoke<string>("system:service-action", action, unit),
  autostartList: () => invoke<import("./types").AutostartEntry[]>("system:autostart-list"),
  autostartToggle: (name: string, enable: boolean) => invoke<string>("system:autostart-toggle", name, enable),
  cronList: () => invoke<{ user: string; system: string }>("system:cron-list"),
  cronSave: (content: string) => invoke<string>("system:cron-save", content),
  timers: () => invoke<import("./types").TimerInfo[]>("system:timers"),
  gpu: () => invoke<import("./types").GpuData | null>("system:gpu"),
  hardwareSpecs: () => invoke<import("./types").HardwareSpec[]>("system:hardware-specs"),
  sensors: () => invoke<string>("system:sensors"),
  disk: () => invoke<import("./types").DiskInfo[]>("system:disk"),
  health: () => invoke<import("./types").SystemHealth>("system:health"),
  network: () => invoke<{ publicIp: string; localIp: string; gateway: string; dns: string[]; hostname: string; isReachable: boolean; latency: string }>("system:network"),
  networkInterfaces: () => invoke<import("./types").NetworkInterface[]>("system:network-interfaces"),
  openPorts: () => invoke<import("./types").OpenPort[]>("system:open-ports"),
  netConnections: () => invoke<import("./types").NetConnection[]>("system:net-connections"),
  rgbDevices: () => invoke<string>("system:rgb-devices"),
  rgbSet: (args: string[]) => invoke<string>("system:rgb-set", args),
  journal: (count: number) => invoke<string>("system:journal", count),
  logs: (count: number) => invoke<string>("system:logs", count),
};

export const passwords = {
  list: () => invoke<import("./types").PasswordEntry[]>("password:list"),
  show: (path: string) => invoke<import("./types").PasswordDetail | null>("password:show", path),
  generate: (path: string, length: number) => invoke<string>("password:generate", path, length),
  insert: (path: string, content: string) => invoke<string>("password:insert", path, content),
  delete: (path: string) => invoke<string>("password:delete", path),
  copy: (path: string) => invoke<string>("password:copy", path),
};

export const battery = {
  upowerDevices: () => invoke<import("./types").BatteryDevice[]>("battery:upower-devices"),
  btDevices: () => invoke<import("./types").BtDevice[]>("battery:bt-devices"),
  btConnect: (mac: string) => invoke<string>("battery:bt-connect", mac),
  btDisconnect: (mac: string) => invoke<string>("battery:bt-disconnect", mac),
  batteryWatch: (action: "start" | "stop") => invoke<void>("system:battery-watch", action),
};

export const llm = {
  modelInfo: () => invoke<import("./types").LLMModelInfo>("llm:model-info"),
  inferenceStatus: () => invoke<import("./types").LLMInferenceStatus>("llm:inference-status"),
  config: () => invoke<import("./types").LLMConfig>("llm:config"),
  start: () => invoke<string>("llm:start"),
  stop: () => invoke<string>("llm:stop"),
  saveConfig: (cfg: import("./types").LLMConfig) => invoke<string>("llm:save-config", cfg),
};

const LINUX_HELPER_DEPS = [
  { name: "react", current: "19.2.6", latest: "19.2.8", type: "prod" as const, risk: "patch" as const },
  { name: "react-dom", current: "19.2.6", latest: "19.2.8", type: "prod" as const, risk: "patch" as const },
  { name: "electron", current: "42.3.0", latest: "42.3.0", type: "dev" as const, risk: "none" as const },
  { name: "vite", current: "8.0.12", latest: "8.1.0", type: "dev" as const, risk: "minor" as const },
  { name: "tailwindcss", current: "4.3.0", latest: "4.3.0", type: "prod" as const, risk: "none" as const },
  { name: "lucide-react", current: "1.17.0", latest: "1.17.0", type: "prod" as const, risk: "none" as const },
  { name: "typescript", current: "6.0.2", latest: "6.1.0", type: "dev" as const, risk: "minor" as const },
  { name: "electron-vite", current: "3.2.0", latest: "3.2.0", type: "dev" as const, risk: "none" as const },
  { name: "class-variance-authority", current: "0.7.1", latest: "0.7.1", type: "prod" as const, risk: "none" as const },
  { name: "clsx", current: "2.1.1", latest: "2.1.1", type: "prod" as const, risk: "none" as const },
  { name: "tailwind-merge", current: "3.6.0", latest: "3.6.0", type: "prod" as const, risk: "none" as const },
  {
    name: "@electron-toolkit/preload",
    current: "3.0.1",
    latest: "3.0.1",
    type: "prod" as const,
    risk: "none" as const,
  },
  { name: "@electron-toolkit/utils", current: "4.0.0", latest: "4.0.0", type: "prod" as const, risk: "none" as const },
  { name: "@vitejs/plugin-react", current: "6.0.1", latest: "6.0.1", type: "dev" as const, risk: "none" as const },
  { name: "electron-builder", current: "26.8.1", latest: "26.8.1", type: "dev" as const, risk: "none" as const },
  { name: "eslint", current: "10.3.0", latest: "10.3.0", type: "dev" as const, risk: "none" as const },
];

const LINUX_HELPER_CHECKS: import("./types").ProjectCheck[] = [
  {
    id: "turbo-cache",
    label: "Turborepo Remote Cache",
    status: "pass",
    message: "Connected to remote cache",
    category: "pipeline",
  },
  {
    id: "build",
    label: "Build (turbo run build)",
    status: "pass",
    message: "All 3 targets built clean in 4.2s",
    category: "pipeline",
  },
  { id: "tests", label: "Tests (playwright)", status: "pass", message: "101/101 passed (1.3m)", category: "pipeline" },
  { id: "lint", label: "Lint (eslint)", status: "pass", message: "0 errors, 0 warnings", category: "pipeline" },
  { id: "typecheck", label: "TypeCheck (tsc --noEmit)", status: "pass", message: "0 errors", category: "pipeline" },
  {
    id: "strict-ts",
    label: "TypeScript strict mode",
    status: "pass",
    message: "strict: true in tsconfig",
    category: "quality",
  },
  {
    id: "no-any",
    label: "No implicit any",
    status: "warn",
    message: "3 occurrences of `any` in api.ts",
    category: "quality",
    fix: "Replace `any` with proper types",
  },
  {
    id: "coverage",
    label: "Test coverage > 80%",
    status: "pending",
    message: "Coverage report not generated yet",
    category: "quality",
    fix: "Add --coverage flag to test runner",
  },
  {
    id: "no-console",
    label: "No console.log in production",
    status: "pass",
    message: "0 console statements in src/",
    category: "quality",
  },
  {
    id: "audit",
    label: "npm audit — 0 vulnerabilities",
    status: "pass",
    message: "0 critical, 0 high, 0 moderate",
    category: "security",
  },
  {
    id: "no-secrets",
    label: "No secrets in codebase",
    status: "pass",
    message: "No API keys or tokens detected",
    category: "security",
  },
  {
    id: "lockfile",
    label: "Lockfile present & up to date",
    status: "pass",
    message: "package-lock.json synced",
    category: "deps",
  },
  {
    id: "no-major-outdated",
    label: "No major version updates pending",
    status: "pass",
    message: "All deps within major version",
    category: "deps",
  },
  {
    id: "no-orphans",
    label: "No orphaned packages",
    status: "pass",
    message: "0 orphaned packages found",
    category: "deps",
  },
  {
    id: "license-compliance",
    label: "License compliance",
    status: "pass",
    message: "All deps use permissive licenses",
    category: "deps",
  },
];

const LINUX_HELPER_WS_CHECKS: import("./types").ProjectCheck[] = [
  {
    id: "ws-build",
    label: "Build (electron-vite build)",
    status: "pass",
    message: "main + preload + renderer built in 3.1s",
    category: "pipeline",
  },
  { id: "ws-lint", label: "Lint (eslint)", status: "pass", message: "0 errors", category: "pipeline" },
  { id: "ws-typecheck", label: "TypeCheck (tsc --noEmit)", status: "pass", message: "0 errors", category: "pipeline" },
  {
    id: "ws-no-any",
    label: "No implicit any",
    status: "warn",
    message: "3 occurrences of `any` in api.ts",
    category: "quality",
    fix: "Replace `any` with proper types",
  },
  {
    id: "ws-no-console",
    label: "No console.log in production",
    status: "pass",
    message: "0 console statements",
    category: "quality",
  },
];

const MOCK_PROJECTS_STORAGE_KEY = "lh-projects";

function getMockProjects(): import("./types").ProjectInfo[] {
  try {
    const stored = localStorage.getItem(MOCK_PROJECTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const defaults = buildDefaultProjects();
  localStorage.setItem(MOCK_PROJECTS_STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

function buildDefaultProjects(): import("./types").ProjectInfo[] {
  const outdated = LINUX_HELPER_DEPS.filter((d) => d.risk !== "none");
  const allChecks = LINUX_HELPER_CHECKS;
  const wsChecks = LINUX_HELPER_WS_CHECKS;
  const rootOutdated = [
    { name: "turbo", current: "2.9.16", latest: "2.9.18", type: "dev" as const, risk: "patch" as const },
    { name: "prettier", current: "3.6.0", latest: "3.6.0", type: "dev" as const, risk: "none" as const },
  ];
  const wsOutdated = LINUX_HELPER_DEPS.filter((d) => d.risk !== "none");
  const desktopChecks = wsChecks.map((c) => ({ ...c, id: `${c.id}-desktop` }));

  return [
    {
      id: "project",
      name: "Project",
      path: "/home/user/projects/linux-helper",
      isMonorepo: true,
      monorepoTool: "turborepo",
      types: ["node"],
      lastScanned: new Date().toISOString(),
      totalDeps: rootOutdated.length + LINUX_HELPER_DEPS.length,
      outdatedDeps: outdated.length + 1,
      healthScore: 92,
      deps: rootOutdated,
      checks: allChecks,
      workspaces: [
        {
          name: "@project/desktop",
          path: "apps/desktop",
          types: ["node"],
          totalDeps: LINUX_HELPER_DEPS.length,
          outdatedDeps: wsOutdated.length,
          healthScore: 90,
          deps: LINUX_HELPER_DEPS,
          checks: desktopChecks,
        },
      ],
    },
  ];
}

export const projects = {
  list: () => invoke<import("./types").ProjectInfo[]>("projects:list"),
  add: (path: string) => invoke<import("./types").ProjectInfo>("projects:add", path),
  remove: (id: string) => invoke<string>("projects:remove", id),
  scan: (id: string) => invoke<import("./types").ProjectInfo>("projects:scan", id),
  outdated: (id: string) => invoke<import("./types").ProjectDep[]>("projects:outdated", id),
};

export const docs = {
  init: () => invoke<string[]>("docs:init"),
  list: (opts?: { category?: string; search?: string; limit?: number; offset?: number }) =>
    invoke<import("./types").DocEntry[]>("docs:list", opts),
  create: (doc: Partial<import("./types").DocEntry>) => invoke<import("./types").DocEntry>("docs:create", doc),
  update: (id: string, doc: Partial<import("./types").DocEntry>) =>
    invoke<import("./types").DocEntry>("docs:update", id, doc),
  delete: (id: string) => invoke<void>("docs:delete", id),
  categories: () => invoke<string[]>("docs:categories"),
};

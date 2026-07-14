import { ema, useCpuHistory, usePolling } from "@project/hooks";
import type { HardwareSpec, OverviewData, ProcessInfo } from "@project/types";
import { Bar, Card, Sparkline, StaleDataNotice } from "@project/ui";
import {
  Activity,
  Box,
  Brain,
  Check,
  ClipboardList,
  Copy,
  Cpu,
  Fan,
  HardDrive,
  Headphones,
  Keyboard,
  Layout,
  MemoryStick,
  Monitor,
  MonitorOff,
  MoreVertical,
  Mouse,
  Pause,
  PcCase,
  Play,
  Plus,
  Server,
  Skull,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { system } from "../api";
import { getStorageItem, STORAGE_KEYS, setStorageItem } from "../lib/storage";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  cpu: Cpu,
  gpu: Monitor,
  motherboard: Layout,
  ram: MemoryStick,
  ssd: HardDrive,
  hdd: HardDrive,
  psu: Zap,
  cooler: Fan,
  case: PcCase,
  keyboard: Keyboard,
  mouse: Mouse,
  headphones: Headphones,
  monitor: Monitor,
  router: Wifi,
  llm: Brain,
};

function SpecIcon({ category }: { category: string }) {
  const Icon = ICON_MAP[category.toLowerCase()] || Box;
  return <Icon size={14} className="text-muted-foreground" />;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title={`Copy: ${text}`}
    >
      {copied ? <Check size={12} className="text-success-foreground" /> : <Copy size={12} />}
    </button>
  );
}

function OverviewCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-4 group">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex-shrink-0 text-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-lg font-semibold leading-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

export function DashboardPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [procs, setProcs] = useState<ProcessInfo[]>([]);
  const [specs, setSpecs] = useState<HardwareSpec[]>([]);
  const [showAddSpec, setShowAddSpec] = useState(false);
  const [addCategory, setAddCategory] = useState("");
  const [addModel, setAddModel] = useState("");
  const [actionPid, setActionPid] = useState<number | null>(null);
  const [memUsed, setMemUsed] = useState("...");
  const [memTotal, setMemTotal] = useState("...");
  const [memPercent, setMemPercent] = useState(0);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const memSmoothed = useRef<number | null>(null);
  const { cpuHistory, updateCpu } = useCpuHistory();

  const formatBytes = (bytes: string) => {
    const gb = parseInt(bytes, 10) / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(parseInt(bytes, 10) / (1024 * 1024)).toFixed(0)} MB`;
  };

  const refreshOverview = useCallback(async () => {
    setOverview(await system.overview());
  }, []);

  const refreshProcesses = useCallback(async () => {
    setProcs(await system.topProcesses());
  }, []);

  const refreshMetrics = useCallback(async () => {
    const [cpu, memRaw] = await Promise.all([system.cpuUsage(), system.memory()]);
    updateCpu(cpu);
    const mt = parseInt(memRaw.mem.total, 10);
    const mu = parseInt(memRaw.mem.used, 10);
    const rawMp = mt > 0 ? Math.max(0, Math.min(100, (mu / mt) * 100)) : 0;
    memSmoothed.current = ema(memSmoothed.current, rawMp);
    const mp = Math.round(memSmoothed.current);
    setMemTotal(memRaw.mem.total);
    setMemUsed(memRaw.mem.used);
    setMemPercent(mp);
    setMemHistory((h) => [...h.slice(-59), mp]);
  }, [updateCpu]);

  const loadSpecs = useCallback(async () => {
    const auto = await system.hardwareSpecs();
    const manual: HardwareSpec[] = JSON.parse(getStorageItem(STORAGE_KEYS.manualSpecs) || "[]");
    setSpecs([...auto, ...manual]);
  }, []);

  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  const addManualSpec = () => {
    if (!addCategory.trim() || !addModel.trim()) return;
    const entry: HardwareSpec = { category: addCategory.trim(), model: addModel.trim(), source: "manual" };
    const manual: HardwareSpec[] = JSON.parse(getStorageItem(STORAGE_KEYS.manualSpecs) || "[]");
    manual.push(entry);
    setStorageItem(STORAGE_KEYS.manualSpecs, JSON.stringify(manual));
    setAddCategory("");
    setAddModel("");
    setShowAddSpec(false);
    loadSpecs();
  };

  const removeManualSpec = (index: number) => {
    const manual: HardwareSpec[] = JSON.parse(getStorageItem(STORAGE_KEYS.manualSpecs) || "[]");
    manual.splice(index, 1);
    setStorageItem(STORAGE_KEYS.manualSpecs, JSON.stringify(manual));
    loadSpecs();
  };

  const { error: overviewError } = usePolling(refreshOverview, 30_000);
  const { error: processError } = usePolling(refreshProcesses, 5_000);
  const { error: metricsError } = usePolling(refreshMetrics, 2_000);
  const pollError = overviewError ?? processError ?? metricsError;

  useEffect(() => {
    const close = () => setActionPid(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const kill = async (pid: number) => {
    await system.killProcess(pid);
    refreshProcesses();
  };

  const [exportStatus, setExportStatus] = useState("");

  const exportReport = async (format: "json" | "html") => {
    try {
      const [ov, memory, disks, gpu, services] = await Promise.all([
        system.overview(),
        system.memory(),
        system.disk(),
        system.gpu().catch(() => null),
        system.services().catch(() => []),
      ]);
      const generatedAt = new Date().toISOString();
      const report = { generatedAt, overview: ov, memory, disks, gpu, services };
      const stamp = generatedAt.slice(0, 19).replace(/[:T]/g, "-");
      let content: string;
      if (format === "json") {
        content = JSON.stringify(report, null, 2);
      } else {
        const section = (title: string, body: unknown) =>
          `<h2>${title}</h2><pre>${JSON.stringify(body, null, 2).replace(/</g, "&lt;")}</pre>`;
        content = `<!doctype html><html><head><meta charset="utf-8"><title>System Report ${generatedAt}</title><style>body{font:14px monospace;margin:2rem;background:#0b0b0d;color:#e4e4e7}pre{background:#18181b;padding:1rem;border-radius:8px;overflow:auto}</style></head><body><h1>System Report</h1><p>${generatedAt}</p>${section("Overview", ov)}${section("Memory", memory)}${section("Disks", disks)}${section("GPU", gpu)}${section("Services", services)}</body></html>`;
      }
      const result = await system.saveReport(content, `system-report-${stamp}.${format}`);
      setExportStatus(result === "canceled" ? "" : `Report saved: ${result}`);
    } catch (e) {
      setExportStatus(`Export failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  if (!overview) return <div className="text-muted-foreground">Loading...</div>;

  const cpuPercent = cpuHistory.length > 0 ? cpuHistory[cpuHistory.length - 1]! : null;

  return (
    <div className="space-y-3">
      <StaleDataNotice error={pollError} />
      <div className="flex items-center justify-end gap-2">
        {exportStatus && <span className="text-xs text-muted-foreground">{exportStatus}</span>}
        <button onClick={() => exportReport("json")} className="btn-ghost text-xs">
          Export JSON
        </button>
        <button onClick={() => exportReport("html")} className="btn-ghost text-xs">
          Export HTML
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <OverviewCard label="Hostname" value={overview.hostname} sub={overview.arch} icon={<Server size={12} />} />
        <OverviewCard
          label="Kernel"
          value={overview.kernel}
          sub={`Uptime: ${overview.uptime}`}
          icon={<Monitor size={12} />}
        />
        <OverviewCard
          label="CPU"
          value={`${overview.cpuCores} cores`}
          sub={`Load: ${overview.load}`}
          icon={<Cpu size={12} />}
        />
        <OverviewCard
          label="Disk"
          value={overview.disk.split(/\s+/)[1] || ""}
          sub={`of ${overview.disk.split(/\s+/)[0] || ""}`}
          icon={<HardDrive size={12} />}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-foreground" />
              <span className="text-sm text-foreground font-medium">CPU Usage</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">
              {cpuPercent ?? "—"}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </span>
          </div>
          <Bar label="" value="" pct={cpuPercent ?? 0} size="md" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Load: {overview.load}</span>
            <Sparkline data={cpuHistory} width={140} height={32} />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MemoryStick size={14} className="text-foreground" />
              <span className="text-sm text-foreground font-medium">Memory</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">
              {memPercent}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </span>
          </div>
          <Bar label="" value="" pct={memPercent} size="md" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatBytes(memUsed)} / {formatBytes(memTotal)}
            </span>
            <Sparkline data={memHistory} width={140} height={32} />
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-foreground" />
            <span className="text-sm font-medium">Hardware Configuration</span>
            <span className="text-xs text-muted-foreground">({specs.length} items)</span>
          </div>
          <div className="flex items-center gap-1">
            <CopyButton text={specs.map((s) => `${s.category}: ${s.model}`).join("\n")} />
            <button
              onClick={() => setShowAddSpec(!showAddSpec)}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Add component"
            >
              {showAddSpec ? <X size={12} /> : <Plus size={12} />}
            </button>
          </div>
        </div>
        {showAddSpec && (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-muted/30">
            <input
              type="text"
              placeholder="Category (e.g. PSU, Cooler)"
              value={addCategory}
              onChange={(e) => setAddCategory(e.target.value)}
              className="w-32 rounded-md border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
            <input
              type="text"
              placeholder="Model (e.g. Be Quiet! Dark Power 13 850W)"
              value={addModel}
              onChange={(e) => setAddModel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addManualSpec()}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
            <button onClick={addManualSpec} className="btn-primary text-xs px-2 py-1">
              Add
            </button>
          </div>
        )}
        <div>
          {specs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No hardware information available</div>
          ) : (
            specs.map((s, i) => (
              <div
                key={`${s.category}-${i}`}
                className="flex items-center gap-3 px-4 py-2 border-b border-border/30 hover:bg-muted/30 transition-colors group"
              >
                <SpecIcon category={s.category} />
                <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{s.category}</span>
                <span className="flex-1 text-sm truncate">{s.model}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={s.model} />
                  {s.source === "manual" && (
                    <button
                      onClick={() => removeManualSpec(i)}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-success animate-pulse" />
            <span className="text-sm font-medium">Top Processes</span>
          </div>
          <span className="text-xs text-muted-foreground">by memory • live</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5">PID</th>
              <th className="px-4 py-2.5">User</th>
              <th className="px-4 py-2.5">CPU%</th>
              <th className="px-4 py-2.5">MEM%</th>
              <th className="px-4 py-2.5">RSS</th>
              <th className="px-4 py-2.5">Command</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {procs.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <MonitorOff size={32} className="mb-2 opacity-50" />
                    <p>No running processes found</p>
                  </div>
                </td>
              </tr>
            )}
            {procs.map((p) => (
              <tr key={p.pid} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs">{p.pid}</td>
                <td className="px-4 py-2.5">{p.user}</td>
                <td className="px-4 py-2.5 font-mono">{p.cpu.toFixed(1)}</td>
                <td className="px-4 py-2.5 font-mono">{p.mem.toFixed(1)}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{(p.rss / 1024).toFixed(0)}M</td>
                <td className="px-4 py-2.5 truncate max-w-[200px] text-muted-foreground">{p.command}</td>
                <td className="px-4 py-2.5 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionPid(actionPid === p.pid ? null : p.pid);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {actionPid === p.pid && (
                    <div className="absolute right-12 top-0 z-10 w-40 rounded-xl border border-border bg-card shadow-lg py-1">
                      <button
                        onClick={() => {
                          kill(p.pid);
                          setActionPid(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-muted transition-colors"
                      >
                        <Skull size={12} /> Kill Process
                      </button>
                      <button
                        onClick={() => {
                          setActionPid(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Pause size={12} /> Pause (SIGSTOP)
                      </button>
                      <button
                        onClick={() => {
                          setActionPid(null);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <Play size={12} /> Resume (SIGCONT)
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

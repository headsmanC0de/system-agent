import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Cpu,
  FolderOpen,
  MinusCircle,
  Package,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { projects, system } from "../api";
import { Badge, Bar, Card, Output } from "../components/ui";
import { useAsyncData } from "../lib/hooks";
import type {
  CheckCategory,
  DepRisk,
  ProjectCheck,
  ProjectDep,
  ProjectInfo,
  SystemCheckCategory,
  SystemHealth,
} from "../types";

type ProjectTab = "readiness" | "deps" | "workspaces" | "system";

const CAT_META: Record<CheckCategory, { label: string; icon: React.ReactNode; color: string }> = {
  pipeline: { label: "CI/CD Pipeline", icon: <Cpu size={14} />, color: "text-info-foreground" },
  quality: { label: "Code Quality", icon: <Code size={14} />, color: "text-purple-400" },
  security: { label: "Security", icon: <Shield size={14} />, color: "text-destructive" },
  deps: { label: "Dependencies", icon: <Package size={14} />, color: "text-success-foreground" },
};

const SYS_CAT_META: Record<SystemCheckCategory, { label: string; icon: React.ReactNode; color: string }> = {
  os: { label: "OS Updates", icon: <Shield size={14} />, color: "text-info-foreground" },
  packages: { label: "Packages", icon: <Package size={14} />, color: "text-success-foreground" },
  services: { label: "Services", icon: <Cpu size={14} />, color: "text-warning-foreground" },
  security: { label: "Security", icon: <Shield size={14} />, color: "text-destructive" },
  storage: { label: "Storage", icon: <Boxes size={14} />, color: "text-muted-foreground" },
};

const STATUS_ICON: Record<
  string,
  { icon: React.ReactNode; color: string; variant: "success" | "danger" | "warning" | "default" }
> = {
  pass: { icon: <CheckCircle2 size={16} />, color: "text-success-foreground", variant: "success" },
  fail: { icon: <XCircle size={16} />, color: "text-destructive", variant: "danger" },
  warn: { icon: <AlertTriangle size={16} />, color: "text-warning-foreground", variant: "warning" },
  pending: { icon: <Clock size={16} />, color: "text-muted-foreground", variant: "default" },
  na: { icon: <MinusCircle size={16} />, color: "text-muted-foreground", variant: "default" },
};

const RISK_VARIANT: Record<DepRisk, "success" | "warning" | "danger" | null> = {
  patch: "success",
  minor: "warning",
  major: "danger",
  none: null,
};

const READINESS_TIERS = [
  { threshold: 90, color: "bg-success" },
  { threshold: 70, color: "bg-warning" },
  { threshold: 0, color: "bg-destructive" },
];

function scoreColor(score: number): string {
  if (score >= 90) return "text-success-foreground";
  if (score >= 70) return "text-warning-foreground";
  return "text-destructive";
}

function scoreRing(score: number): string {
  if (score >= 90) return "stroke-success";
  if (score >= 70) return "stroke-warning";
  return "stroke-destructive";
}

function HealthRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = circ - (circ * score) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-label={`Health score ${score}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} className="stroke-secondary" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={pct}
          strokeLinecap="round"
          className={scoreRing(score)}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor(score)}`}>
        {score}
      </div>
    </div>
  );
}

function ChecklistSection({
  checks,
  category,
  defaultOpen = true,
}: {
  checks: ProjectCheck[];
  category: CheckCategory;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = CAT_META[category];
  const catChecks = checks.filter((c) => c.category === category);
  if (catChecks.length === 0) return null;
  const passed = catChecks.filter((c) => c.status === "pass").length;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 mb-2 w-full text-left group">
        {open ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
        <span className={meta.color}>{meta.icon}</span>
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {passed}/{catChecks.length}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5">
          {catChecks.map((c) => {
            const si = STATUS_ICON[c.status] || STATUS_ICON.na;
            return (
              <div key={c.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/30">
                <span className={`mt-0.5 flex-shrink-0 ${si.color}`}>{si.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{c.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.message}</div>
                  {c.fix && <div className="mt-0.5 text-xs text-primary">Fix: {c.fix}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SystemCheckSection({
  checks,
  category,
  defaultOpen = true,
}: {
  checks: SystemHealth["checks"];
  category: SystemCheckCategory;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = SYS_CAT_META[category];
  const catChecks = checks.filter((c) => c.category === category);
  if (catChecks.length === 0) return null;
  const passed = catChecks.filter((c) => c.status === "pass").length;
  return (
    <div>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 mb-2 w-full text-left group">
        {open ? (
          <ChevronDown size={14} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={14} className="text-muted-foreground" />
        )}
        <span className={meta.color}>{meta.icon}</span>
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {passed}/{catChecks.length}
        </span>
      </button>
      {open && (
        <div className="space-y-1.5">
          {catChecks.map((c) => {
            const si = STATUS_ICON[c.status] || STATUS_ICON.na;
            return (
              <div key={c.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-secondary/30">
                <span className={`mt-0.5 flex-shrink-0 ${si.color}`}>{si.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{c.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.message}</div>
                  {c.fix && <div className="mt-0.5 text-xs text-primary">Fix: {c.fix}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReadinessBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-secondary">
        <div
          className={`h-1.5 rounded-full transition-all ${
            score >= 90 ? "bg-success" : score >= 70 ? "bg-warning" : "bg-destructive"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${scoreColor(score)}`}>{score}%</span>
    </div>
  );
}

export function ProjectsPage() {
  const [projs, setProjs] = useState<ProjectInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ProjectTab>("readiness");
  const [addPath, setAddPath] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [depFilter, setDepFilter] = useState<"all" | "outdated" | "prod" | "dev">("all");
  const [expandedWs, setExpandedWs] = useState<string | null>(null);
  const [outdatedDeps, setOutdatedDeps] = useState<Record<string, ProjectDep[]>>({});
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [output, setOutput] = useState("");

  const isSystem = selectedId === "system";

  const loadSystemHealth = useCallback(async () => {
    try {
      const health = await system.health();
      setSystemHealth(health);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const refresh = useCallback(async () => {
    const list = await projects.list();
    setProjs(list);
    if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
  }, [selectedId]);

  useAsyncData(refresh);

  useEffect(() => {
    if (isSystem) {
      loadSystemHealth();
    }
  }, [isSystem]);

  const selected = projs.find((p) => p.id === selectedId) || null;

  const addProject = async () => {
    if (!addPath.trim()) return;
    try {
      await projects.add(addPath.trim());
      setAddPath("");
      setShowAdd(false);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const removeProject = async (id: string) => {
    try {
      await projects.remove(id);
      if (selectedId === id) setSelectedId(projs[0]?.id || null);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const scanProject = async (id: string) => {
    try {
      await projects.scan(id);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const checkOutdated = async (id: string) => {
    try {
      const deps = await projects.outdated(id);
      setOutdatedDeps((prev) => ({ ...prev, [id]: deps }));
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const filteredDeps = (deps: ProjectInfo["deps"]) => {
    if (!deps) return [];
    let d = deps;
    if (depFilter === "outdated") d = d.filter((x) => x.risk !== "none");
    else if (depFilter === "prod") d = d.filter((x) => x.type === "prod");
    else if (depFilter === "dev") d = d.filter((x) => x.type === "dev");
    return d;
  };

  const totalOutdated = projs.reduce(
    (s, p) => s + p.outdatedDeps + p.workspaces.reduce((w, ws) => w + ws.outdatedDeps, 0),
    0,
  );
  const avgHealth = projs.length > 0 ? Math.round(projs.reduce((s, p) => s + p.healthScore, 0) / projs.length) : 0;

  const readinessScore = (checks: ProjectCheck[]) => {
    if (checks.length === 0) return 0;
    const passed = checks.filter((c) => c.status === "pass").length;
    return Math.round((passed / checks.length) * 100);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-4">
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs px-2 py-1">
              <Plus size={14} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Card className="p-3 text-center">
              <div className="text-lg font-bold">{projs.length}</div>
              <div className="text-xs text-muted-foreground">Projects</div>
            </Card>
            <Card className="p-3 text-center">
              <div
                className={`text-lg font-bold ${totalOutdated > 0 ? "text-warning-foreground" : "text-success-foreground"}`}
              >
                {totalOutdated}
              </div>
              <div className="text-xs text-muted-foreground">Outdated</div>
            </Card>
            <Card className="p-3 text-center">
              <div className={`text-lg font-bold ${scoreColor(avgHealth)}`}>{avgHealth}</div>
              <div className="text-xs text-muted-foreground">Avg Health</div>
            </Card>
          </div>

          {showAdd && (
            <Card className="border-primary/30 !bg-primary/5 p-4">
              <div className="text-xs font-medium text-primary mb-2">Add Project</div>
              <input
                type="text"
                placeholder="/path/to/project"
                value={addPath}
                onChange={(e) => setAddPath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addProject()}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={addProject} className="btn-primary text-xs flex-1">
                  Add
                </button>
                <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
              </div>
            </Card>
          )}

          <div className="space-y-1.5 flex-1">
            <button
              onClick={() => {
                setSelectedId("system");
                setTab("system");
              }}
              className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                selectedId === "system" ? "border-primary bg-muted" : "border-border hover:bg-muted/50"
              }`}
            >
              <HealthRing score={systemHealth?.healthScore ?? 0} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1">
                  <span className="text-amber-500">★</span> System
                </div>
                <div className="text-xs text-muted-foreground truncate">{systemHealth?.hostname ?? "archlinux"}</div>
                <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                  <Badge variant={systemHealth && systemHealth.outdatedPackages > 0 ? "warning" : "default"}>
                    {systemHealth?.outdatedPackages ?? 0} outdated
                  </Badge>
                  {systemHealth && systemHealth.failedServices > 0 && (
                    <Badge variant="danger">{systemHealth.failedServices} failed svc</Badge>
                  )}
                  {systemHealth && systemHealth.orphansCount > 0 && (
                    <Badge variant="danger">{systemHealth.orphansCount} orphans</Badge>
                  )}
                </div>
              </div>
            </button>

            {projs.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedId(p.id);
                  setTab("readiness");
                }}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left cursor-pointer transition-colors ${
                  selectedId === p.id ? "border-primary bg-muted" : "border-border hover:bg-muted/50"
                }`}
              >
                <HealthRing score={p.healthScore} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.path}</div>
                  <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                    {p.isMonorepo && <Badge variant="info">{p.monorepoTool}</Badge>}
                    {p.types.map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                    {p.outdatedDeps > 0 && <Badge variant="warning">{p.outdatedDeps} outdated</Badge>}
                    {outdatedDeps[p.id] && <Badge variant="warning">{outdatedDeps[p.id].length} checked</Badge>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      checkOutdated(p.id);
                    }}
                    className="mt-1 btn-ghost text-xs px-2 py-1 rounded"
                  >
                    Check outdated
                  </button>
                </div>
              </div>
            ))}
            {projs.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
                No projects tracked. Click + to add one.
              </div>
            )}
          </div>
        </div>

        {isSystem && systemHealth ? (
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground font-mono">
                  {systemHealth.hostname} · {systemHealth.kernel} · {systemHealth.arch}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{systemHealth.uptime}</span>
                <button onClick={loadSystemHealth} className="btn-ghost text-xs">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <Card className="p-5">
              <div className="flex items-center gap-4">
                <HealthRing score={systemHealth.healthScore} size={64} />
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">System Health</div>
                  <Bar label="" value="" pct={systemHealth.healthScore} colorTiers={READINESS_TIERS} size="md" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="rounded-lg bg-secondary/50 px-3 py-2 text-center">
                  <div
                    className={`text-lg font-bold ${systemHealth.outdatedPackages > 0 ? "text-warning-foreground" : "text-success-foreground"}`}
                  >
                    {systemHealth.outdatedPackages}
                  </div>
                  <div className="text-xs text-muted-foreground">Outdated</div>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2 text-center">
                  <div
                    className={`text-lg font-bold ${systemHealth.failedServices > 0 ? "text-destructive" : "text-success-foreground"}`}
                  >
                    {systemHealth.failedServices}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed Svc</div>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2 text-center">
                  <div
                    className={`text-lg font-bold ${systemHealth.orphansCount > 0 ? "text-destructive" : "text-success-foreground"}`}
                  >
                    {systemHealth.orphansCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Orphans</div>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2 text-center">
                  <div
                    className={`text-lg font-bold ${systemHealth.diskUsage > 75 ? "text-warning-foreground" : "text-success-foreground"}`}
                  >
                    {systemHealth.diskUsage}%
                  </div>
                  <div className="text-xs text-muted-foreground">Disk</div>
                </div>
              </div>
            </Card>

            {(["os", "packages", "services", "security", "storage"] as SystemCheckCategory[]).map((cat) => (
              <Card key={cat} className="p-4">
                <SystemCheckSection
                  checks={systemHealth.checks}
                  category={cat}
                  defaultOpen={cat === "os" || cat === "services"}
                />
              </Card>
            ))}
            {output && <Output>{output}</Output>}
          </div>
        ) : selected ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground font-mono">{selected.path}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Last scanned: {new Date(selected.lastScanned).toLocaleString()}
                </span>
                <button onClick={() => scanProject(selected.id)} className="btn-ghost text-xs">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => removeProject(selected.id)} className="btn-danger p-1.5 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex gap-1 mb-4">
              {(["readiness", "deps", "workspaces"] as ProjectTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {t === "readiness" ? "Production Readiness" : t === "deps" ? "Dependencies" : "Workspaces"}
                </button>
              ))}
            </div>

            {tab === "readiness" && (
              <div className="space-y-3">
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold">Overall Readiness</h3>
                    <span className={`text-2xl font-bold ${scoreColor(readinessScore(selected.checks))}`}>
                      {readinessScore(selected.checks)}%
                    </span>
                  </div>
                  <Bar label="" value="" pct={readinessScore(selected.checks)} colorTiers={READINESS_TIERS} size="md" />
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span className="text-success-foreground">
                      {selected.checks.filter((c) => c.status === "pass").length} pass
                    </span>
                    <span className="text-warning-foreground">
                      {selected.checks.filter((c) => c.status === "warn").length} warn
                    </span>
                    <span className="text-destructive">
                      {selected.checks.filter((c) => c.status === "fail").length} fail
                    </span>
                    <span>{selected.checks.filter((c) => c.status === "pending").length} pending</span>
                  </div>
                </Card>

                {(["pipeline", "quality", "security", "deps"] as CheckCategory[]).map((cat) => (
                  <Card key={cat} className="p-4">
                    <ChecklistSection checks={selected.checks} category={cat} />
                  </Card>
                ))}
              </div>
            )}

            {tab === "deps" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {(["all", "outdated", "prod", "dev"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setDepFilter(f)}
                      className={`rounded-md px-2 py-1 text-xs transition-colors ${
                        depFilter === f ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {f === "all"
                        ? `All (${selected.deps.length})`
                        : f === "outdated"
                          ? `Outdated (${selected.deps.filter((d) => d.risk !== "none").length})`
                          : f === "prod"
                            ? "Prod"
                            : "Dev"}
                    </button>
                  ))}
                </div>
                <Card className="!p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-2">Package</th>
                        <th className="px-4 py-2">Current</th>
                        <th className="px-4 py-2">Latest</th>
                        <th className="px-4 py-2">Type</th>
                        <th className="px-4 py-2">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeps(selected.deps).map((d) => {
                        const rv = RISK_VARIANT[d.risk];
                        return (
                          <tr key={d.name} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="px-4 py-1.5 font-medium text-xs">{d.name}</td>
                            <td className="px-4 py-1.5 font-mono text-xs">{d.current}</td>
                            <td className="px-4 py-1.5 font-mono text-xs">
                              {d.risk !== "none" ? <span className="text-primary">{d.latest}</span> : d.latest}
                            </td>
                            <td className="px-4 py-1.5">
                              <Badge variant={d.type === "prod" ? "primary" : "default"}>{d.type}</Badge>
                            </td>
                            <td className="px-4 py-1.5">{rv && <Badge variant={rv}>{d.risk}</Badge>}</td>
                          </tr>
                        );
                      })}
                      {filteredDeps(selected.deps).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                            No dependencies match this filter
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            )}

            {tab === "workspaces" && (
              <div className="space-y-3">
                {selected.isMonorepo ? (
                  <>
                    <div className="rounded-lg border border-info/20 !bg-info/5 px-4 py-2 flex items-center gap-2 text-sm">
                      <Boxes size={16} className="text-info-foreground" />
                      <span className="text-info-foreground font-medium">{selected.monorepoTool}</span>
                      <span className="text-muted-foreground">
                        monorepo — {selected.workspaces.length} workspace{selected.workspaces.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {selected.workspaces.map((ws) => (
                      <Card key={ws.name} className="!p-0">
                        <button
                          onClick={() => setExpandedWs(expandedWs === ws.name ? null : ws.name)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          {expandedWs === ws.name ? (
                            <ChevronDown size={14} className="text-muted-foreground" />
                          ) : (
                            <ChevronRight size={14} className="text-muted-foreground" />
                          )}
                          <HealthRing score={ws.healthScore} size={32} />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{ws.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {ws.path} · {ws.totalDeps} deps · {ws.outdatedDeps} outdated
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {ws.types.map((t) => (
                              <Badge key={t}>{t}</Badge>
                            ))}
                          </div>
                        </button>
                        {expandedWs === ws.name && (
                          <div className="border-t border-border px-4 py-3 space-y-3">
                            {ws.checks.length > 0 && (
                              <div>
                                <div className="text-xs font-medium mb-2">Readiness Checklist</div>
                                <ReadinessBar score={readinessScore(ws.checks)} />
                                {(["pipeline", "quality", "security", "deps"] as CheckCategory[]).map((cat) =>
                                  ws.checks.some((c) => c.category === cat) ? (
                                    <ChecklistSection key={cat} checks={ws.checks} category={cat} />
                                  ) : null,
                                )}
                              </div>
                            )}
                            {ws.deps.length > 0 && (
                              <div>
                                <div className="text-xs font-medium mb-2">Dependencies ({ws.deps.length})</div>
                                <div className="max-h-[300px] overflow-y-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                        <th className="px-2 py-1">Package</th>
                                        <th className="px-2 py-1">Current</th>
                                        <th className="px-2 py-1">Latest</th>
                                        <th className="px-2 py-1">Risk</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ws.deps.map((d) => {
                                        const rv = RISK_VARIANT[d.risk];
                                        return (
                                          <tr key={d.name} className="border-b border-border/30 hover:bg-secondary/20">
                                            <td className="px-2 py-1">{d.name}</td>
                                            <td className="px-2 py-1 font-mono">{d.current}</td>
                                            <td className="px-2 py-1 font-mono">
                                              {d.risk !== "none" ? (
                                                <span className="text-primary">{d.latest}</span>
                                              ) : (
                                                d.latest
                                              )}
                                            </td>
                                            <td className="px-2 py-1">{rv && <Badge variant={rv}>{d.risk}</Badge>}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                  </>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">Not a monorepo — no workspaces.</div>
                )}
              </div>
            )}
            {output && <Output>{output}</Output>}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
              Select a project to view details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

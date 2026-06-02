import { useMemo, useState } from "react";
import { system } from "../api";
import { Card, Output, SearchInput, StatCard } from "../components/ui";
import { useAsyncData } from "../lib/hooks";
import type { FailedService, ServiceInfo } from "../types";

type Tab = "all" | "running" | "failed" | "inactive";

interface ServiceRow {
  unit: string;
  active: string;
  sub: string;
  status: "running" | "failed" | "inactive";
}

function statusDot(status: ServiceRow["status"]) {
  const colors: Record<string, string> = {
    running: "bg-success",
    failed: "bg-destructive",
    inactive: "bg-muted-foreground",
  };
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${colors[status]}`} />;
}

export function ServicesPage() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [failed, setFailed] = useState<FailedService[]>([]);
  const [search, setSearch] = useState("");
  const [output, setOutput] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const refresh = async () => {
    try {
      const [s, f] = await Promise.all([system.services(), system.failedServices()]);
      setServices(s);
      setFailed(f);
    } catch (err) {
      console.error("Failed to refresh services:", err);
    }
  };

  useAsyncData(refresh);

  const act = async (action: string, unit: string) => {
    try {
      const res = await system.serviceAction(action, unit);
      setOutput(res);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const rows: ServiceRow[] = useMemo(() => {
    const failedUnits = new Set(failed.map((f) => f.unit));
    return services.map((s) => ({
      unit: s.unit,
      active: s.active,
      sub: s.sub,
      status: failedUnits.has(s.unit) ? "failed" : s.active === "active" ? "running" : "inactive",
    }));
  }, [services, failed]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === "running") list = rows.filter((r) => r.status === "running");
    else if (tab === "failed") list = rows.filter((r) => r.status === "failed");
    else if (tab === "inactive") list = rows.filter((r) => r.status === "inactive");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.unit.toLowerCase().includes(q));
    }
    return list;
  }, [rows, tab, search]);

  const counts = useMemo(() => {
    const running = rows.filter((r) => r.status === "running").length;
    const failedC = rows.filter((r) => r.status === "failed").length;
    const inactive = rows.filter((r) => r.status === "inactive").length;
    return { total: rows.length, running, failed: failedC, inactive };
  }, [rows]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: `All (${counts.total})` },
    { key: "running", label: `Running (${counts.running})` },
    { key: "failed", label: `Failed (${counts.failed})` },
    { key: "inactive", label: `Inactive (${counts.inactive})` },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Running" value={counts.running} />
        <StatCard label="Failed" value={counts.failed} accent={counts.failed > 0} variant="destructive" />
        <StatCard label="Inactive" value={counts.inactive} />
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search services..." />

      <Card className="p-0">
        <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
          {filtered.map((s) => (
            <div key={s.unit} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50">
              <div className="flex items-center gap-2.5 min-w-0">
                {statusDot(s.status)}
                <span className="truncate text-sm font-medium">{s.unit}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{s.sub}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => act("restart", s.unit)} className="btn-secondary text-xs px-2.5 py-1 rounded">
                  Restart
                </button>
                {s.status === "running" && (
                  <button onClick={() => act("stop", s.unit)} className="btn-danger text-xs px-2.5 py-1 rounded">
                    Stop
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No services found</div>
          )}
        </div>
      </Card>

      {output && <Output maxHeight="max-h-[100px]">{output}</Output>}
    </div>
  );
}

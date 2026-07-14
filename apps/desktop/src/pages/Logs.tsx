import { usePolling } from "@project/hooks";
import type { SystemLogsResult } from "@project/types";
import { Badge, Card, SearchInput, StatCard } from "@project/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { system } from "../api";

const PRIORITY_ORDER = ["err", "warning", "notice", "info", "debug"] as const;

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "default" | "primary"> = {
  err: "danger",
  warning: "warning",
  notice: "default",
  info: "primary",
  debug: "default",
};

const PRIORITY_LABELS: Record<string, string> = {
  err: "Error",
  warning: "Warning",
  notice: "Notice",
  info: "Info",
  debug: "Debug",
};

export function LogsPage() {
  const [result, setResult] = useState<SystemLogsResult | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [follow, setFollow] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await system.logs(200);
      setResult(next);
      setLastUpdated(new Date(next.capturedAt).toLocaleTimeString());
    } catch (error) {
      setResult({
        capturedAt: new Date().toISOString(),
        entries: [],
        error: error instanceof Error ? error.message : String(error),
        source: "journalctl",
        status: "error",
      });
    }
  }, []);

  usePolling(refresh, follow ? 3000 : 0);

  useEffect(() => {
    if (follow && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result, follow, priorityFilter, unitFilter, search]);

  const entries = result?.entries ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    for (const p of PRIORITY_ORDER) {
      c[p] = entries.filter((e) => e.priority === p).length;
    }
    return c;
  }, [entries]);

  const units = useMemo(() => {
    const set = new Set(entries.map((e) => e.unit));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (priorityFilter !== "all" && e.priority !== priorityFilter) return false;
      if (unitFilter !== "all" && e.unit !== unitFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.message.toLowerCase().includes(q) ||
          e.unit.toLowerCase().includes(q) ||
          e.timestamp.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, priorityFilter, unitFilter, search]);

  return (
    <div className="space-y-3">
      {result?.status === "error" && (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          System logs unavailable from {result.source}: {result.error || "unknown collection error"}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Entries" value={counts.all} accent />
        <StatCard label="Errors" value={counts.err} accent variant={counts.err > 0 ? "destructive" : "default"} />
        <StatCard label="Warnings" value={counts.warning} accent />
        <StatCard label="Last Updated" value={lastUpdated || "—"} />
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          {["all", ...PRIORITY_ORDER].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                priorityFilter === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {p === "all" ? "All" : PRIORITY_LABELS[p] || p}
              <span className="ml-1 opacity-70">{counts[p] ?? 0}</span>
            </button>
          ))}

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="rounded-md border border-input bg-transparent px-2 py-1 text-xs outline-none"
          >
            <option value="all">All Units</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." className="w-48" />

          <button
            onClick={() => setFollow((f) => !f)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              follow
                ? "bg-success text-success-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {follow ? "Following" : "Follow"}
          </button>

          <button
            onClick={() => {
              setPriorityFilter("all");
              setUnitFilter("all");
              setSearch("");
              setExpandedIdx(null);
            }}
            className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Clear
          </button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {result?.status === "error" ? "Logs could not be collected" : "No log entries match filters"}
            </div>
          ) : (
            filtered.map((entry, i) => {
              const isExpanded = expandedIdx === i;
              const variant = PRIORITY_VARIANT[entry.priority] || "default";
              return (
                <div
                  key={i}
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className={`flex cursor-pointer items-start gap-3 border-b border-border px-4 py-2.5 transition-colors last:border-b-0 hover:bg-muted/50 ${
                    entry.priority === "err" ? "bg-destructive/5" : ""
                  }`}
                >
                  <div className="shrink-0 pt-0.5">
                    <Badge variant={variant}>{PRIORITY_LABELS[entry.priority] || entry.priority}</Badge>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{entry.timestamp}</span>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {entry.unit}
                  </Badge>
                  <span className={`min-w-0 flex-1 text-sm ${isExpanded ? "" : "truncate"}`}>{entry.message}</span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </Card>
    </div>
  );
}

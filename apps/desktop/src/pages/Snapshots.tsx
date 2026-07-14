import { useAsyncData } from "@project/hooks";
import type { SnapshotInfo } from "@project/types";
import { Badge, Card, Output, SearchInput, StatCard } from "@project/ui";
import { Camera, GitCompare, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { system } from "../api";

type TabFilter = "all" | "single" | "pre/post" | "timeline";

const TYPE_BADGE: Record<string, "default" | "warning" | "success" | "primary"> = {
  single: "default",
  pre: "warning",
  post: "success",
  timeline: "primary",
};

function matchesTab(s: SnapshotInfo, tab: TabFilter) {
  if (tab === "all") return true;
  if (tab === "single") return s.type === "single";
  if (tab === "pre/post") return s.type === "pre" || s.type === "post";
  if (tab === "timeline") return s.type === "timeline";
  return true;
}

const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "single", label: "Single" },
  { key: "pre/post", label: "Pre/Post" },
  { key: "timeline", label: "Timeline" },
];

export function SnapshotsPage() {
  const [snaps, setSnaps] = useState<SnapshotInfo[]>([]);
  const [output, setOutput] = useState("");
  const [desc, setDesc] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");

  const refresh = useCallback(async () => {
    const s = await system.snapshots();
    setSnaps(s);
  }, []);

  useAsyncData(refresh);

  const filtered = useMemo(() => snaps.filter((s) => matchesTab(s, tab)), [snaps, tab]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of snaps) m[s.type] = (m[s.type] || 0) + 1;
    return m;
  }, [snaps]);

  const latestDate = snaps.length > 0 ? snaps[0].date : "—";

  const create = async () => {
    if (!desc.trim()) return;
    try {
      const res = await system.createSnapshot(desc);
      setOutput(res);
      setDesc("");
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const del = async (num: string) => {
    if (!window.confirm(`Delete snapshot #${num}? This cannot be undone.`)) return;
    try {
      const res = await system.deleteSnapshot(num);
      setOutput(res);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const diff = async (num: string) => {
    const cur = Number(num);
    const prev = filtered
      .map((s) => Number(s.number))
      .filter((n) => !Number.isNaN(n) && n < cur)
      .sort((a, b) => a - b)
      .pop();
    const from = prev !== undefined ? String(prev) : num;
    try {
      const res = await system.snapshotDiff(from, num);
      setOutput(`Diff ${from}..${num}:\n${res}`);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const rollback = async (num: string) => {
    if (!window.confirm(`Rollback to snapshot #${num}? This will restart the system.`)) return;
    try {
      const res = await system.rollbackSnapshot(num);
      setOutput(res);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Snapshots" value={snaps.length} accent />
        <StatCard label="Latest Snapshot" value={latestDate} />
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-2">Breakdown</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(typeCounts).map(([type, count]) => (
              <Badge key={type} variant={TYPE_BADGE[type] || "default"}>
                {type} ({count})
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <SearchInput value={desc} onChange={setDesc} placeholder="Describe new snapshot..." className="flex-1" />
        <button onClick={create} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} />
          Create
        </button>
      </div>

      {filtered.length === 0 && (
        <Card className="p-8 flex flex-col items-center justify-center text-muted-foreground">
          <Camera size={32} className="mb-2 opacity-50" />
          <p>No snapshots match this filter.</p>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((s) => (
          <Card key={s.number} className="p-4 flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary/30 text-sm font-bold text-primary shrink-0">
              #{s.number}
            </div>

            <Badge variant={TYPE_BADGE[s.type] || "default"} className="shrink-0">
              {s.type}
            </Badge>

            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{s.description}</div>
              <div className="text-xs text-muted-foreground">
                {s.date} &middot; {s.user}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => diff(s.number)} className="btn-ghost text-xs flex items-center gap-1">
                <GitCompare size={12} />
                Diff
              </button>
              <button onClick={() => rollback(s.number)} className="btn-ghost text-xs flex items-center gap-1">
                <RotateCcw size={12} />
                Rollback
              </button>
              <button onClick={() => del(s.number)} className="btn-danger text-xs flex items-center gap-1">
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>

      {output && <Output>{output}</Output>}
    </div>
  );
}

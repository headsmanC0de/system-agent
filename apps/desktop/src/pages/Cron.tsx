import { Clock, Edit3, FileText, Play, Save, Timer, X } from "lucide-react";
import { useCallback, useState } from "react";
import { system } from "../api";
import { Badge, Card, Output } from "../components/ui";
import { useAsyncData } from "../lib/hooks";
import type { TimerInfo } from "../types";

function describeCron(line: string): { schedule: string; command: string; raw: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  let command = "";
  let schedule = "";

  if (trimmed.startsWith("@")) {
    const parts = trimmed.split(/\s+/);
    const at = parts[0];
    command = parts.slice(1).join(" ");
    const specials: Record<string, string> = {
      "@reboot": "At reboot",
      "@yearly": "Yearly (Jan 1, 00:00)",
      "@annually": "Annually (Jan 1, 00:00)",
      "@monthly": "Monthly (1st, 00:00)",
      "@weekly": "Weekly (Sunday, 00:00)",
      "@daily": "Daily at 00:00",
      "@hourly": "Every hour",
    };
    schedule = specials[at] || at;
    return { schedule, command, raw: trimmed };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 6) return null;
  const [min, hour, dom, mon, dow, ...cmd] = parts;
  command = cmd.join(" ");

  if (hour.startsWith("*/") && min === "0") schedule = `Every ${hour.slice(2)} hours`;
  else if (min === "*/5") schedule = "Every 5 minutes";
  else if (min === "*/10") schedule = "Every 10 minutes";
  else if (min === "*/15") schedule = "Every 15 minutes";
  else if (min === "*/30") schedule = "Every 30 minutes";
  else if (min.startsWith("*/")) schedule = `Every ${min.slice(2)} minutes`;
  else if (min === "0" && hour === "*") schedule = "Every hour";
  else if (min === "0" && hour !== "*" && dom === "*" && mon === "*" && dow === "*") schedule = `Daily at ${hour.padStart(2, "0")}:00`;
  else if (min !== "*" && hour !== "*" && dom === "*" && mon === "*" && dow === "*") schedule = `Daily at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  else if (dow !== "*" && dom === "*" && mon === "*") {
    const days: Record<string, string> = { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat", "7": "Sun" };
    schedule = `${days[dow] || dow} at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  } else schedule = `${min} ${hour} ${dom} ${mon} ${dow}`;

  return { schedule, command, raw: trimmed };
}

function scheduleVariant(schedule: string): "success" | "primary" | "warning" | "default" {
  if (schedule.includes("reboot")) return "warning";
  if (schedule.includes("Daily") || schedule.includes("hourly") || schedule.includes("Every hour")) return "primary";
  if (schedule.includes("Weekly") || schedule.includes("Monthly") || schedule.includes("Yearly")) return "success";
  return "default";
}

function timeLeftVariant(left: string): "success" | "primary" | "warning" | "danger" {
  if (left.includes("m ") || left.match(/^\d+m$/)) return "danger";
  if (left.includes("h")) return "warning";
  return "success";
}

function extractCommandName(cmd: string): string {
  const parts = cmd.split("/");
  return parts[parts.length - 1] || cmd;
}

type CronTab = "user" | "system";

export function CronPage() {
  const [cron, setCron] = useState({ user: "", system: "" });
  const [timers, setTimers] = useState<TimerInfo[]>([]);
  const [editVal, setEditVal] = useState("");
  const [output, setOutput] = useState("");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<CronTab | "timers">("user");

  const refresh = useCallback(async () => {
    const [c, t] = await Promise.all([system.cronList(), system.timers()]);
    setCron(c);
    setTimers(t);
    setEditVal(tab === "user" ? c.user : c.system);
  }, [tab]);

  useAsyncData(refresh);

  const save = async () => {
    try {
      const res = await system.cronSave(editVal);
      setOutput(res);
      setEditing(false);
      refresh();
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const currentCron = tab === "user" ? cron.user : cron.system;
  const parsedLines = currentCron.split("\n").map((line) => ({ line, parsed: describeCron(line) }));
  const activeJobs = parsedLines.filter((p) => p.parsed !== null);
  const comments = parsedLines.filter((p) => p.parsed === null && p.line.trim().startsWith("#"));
  const emptyLines = parsedLines.filter((p) => !p.line.trim());

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(["user", "system", "timers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setEditing(false); }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {t === "timers" ? <Timer size={13} /> : <FileText size={13} />}
            {t === "user" ? "User Crontab" : t === "system" ? "System Crontab" : "Systemd Timers"}
            {t !== "system" && (
              <Badge variant="default" className="ml-1">
                {t === "user" ? activeJobs.length + (tab === "user" ? 0 : 0) : timers.length}
              </Badge>
            )}
          </button>
        ))}
        <div className="flex-1" />
        {tab !== "timers" && !editing && (
          <button onClick={() => { setEditVal(tab === "user" ? cron.user : cron.system); setEditing(true); }} className="btn-secondary flex items-center gap-1.5 text-xs">
            <Edit3 size={13} /> Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary flex items-center gap-1.5 text-xs">
              <Save size={13} /> Save
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost flex items-center gap-1.5 text-xs">
              <X size={13} /> Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Clock size={16} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Cron Jobs</div>
            <div className="text-xl font-bold">
              {(cron.user.split("\n").filter((l) => describeCron(l)).length) +
                (cron.system.split("\n").filter((l) => describeCron(l)).length)}
            </div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
            <Timer size={16} className="text-success-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Systemd Timers</div>
            <div className="text-xl font-bold">{timers.length}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
            <Play size={16} className="text-info-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Due Soon</div>
            <div className="text-xl font-bold">{timers.filter((t) => t.left.includes("m ") || t.left.match(/^\d+m$/)).length}</div>
          </div>
        </Card>
      </div>

      {tab === "timers" ? (
        <Card className="p-0">
          <div className="border-b border-border/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
            Active Timers ({timers.length})
          </div>
          <div className="divide-y divide-border/50">
            {timers.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No active systemd timers</div>
            ) : (
              timers.map((t) => (
                <div key={t.unit} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Timer size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t.unit.replace(".timer", "")}</span>
                      <Badge variant="default" className="text-[10px]">{t.activates}</Badge>
                    </div>
                    <div className="flex gap-4 mt-0.5 text-xs text-muted-foreground">
                      <span>Next: {t.next}</span>
                      {t.last !== "n/a" && <span>Last: {t.last}</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <Badge variant={timeLeftVariant(t.left)}>{t.left}</Badge>
                    {t.passed !== "n/a" && (
                      <div className="mt-0.5 text-xs text-muted-foreground">ran {t.passed} ago</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : editing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText size={12} />
            <span>Editing {tab === "user" ? "user" : "system"} crontab — one job per line</span>
          </div>
          <textarea
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            rows={12}
            className="w-full rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </div>
      ) : (
        <Card className="p-0">
          <div className="border-b border-border/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center justify-between">
            <span>{tab === "user" ? "User" : "System"} Crontab</span>
            <span>{activeJobs.length} jobs • {comments.length} comments</span>
          </div>
          {currentCron ? (
            <div className="divide-y divide-border/50">
              {parsedLines.map(({ line, parsed }, i) => {
                if (!parsed) {
                  if (line.trim().startsWith("#")) {
                    return (
                      <div key={i} className="px-4 py-1.5 text-xs text-muted-foreground/50 font-mono italic">
                        {line}
                      </div>
                    );
                  }
                  if (!line.trim()) return <div key={i} className="h-1" />;
                  return (
                    <div key={i} className="px-4 py-2 text-xs text-muted-foreground font-mono">{line}</div>
                  );
                }
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
                      <Clock size={12} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={scheduleVariant(parsed.schedule)}>{parsed.schedule}</Badge>
                        <span className="text-sm font-medium font-mono truncate">{extractCommandName(parsed.command)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground font-mono truncate" title={parsed.command}>
                        {parsed.command}
                      </div>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { navigator.clipboard.writeText(parsed.raw); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No {tab === "user" ? "user" : "system"} crontab configured
            </div>
          )}
        </Card>
      )}

      {output && <Output>{output}</Output>}
    </div>
  );
}

import { useAsyncData } from "@project/hooks";
import type { DiskInfo } from "@project/types";
import { Card, StatCard } from "@project/ui";
import { AlertTriangle, CheckCircle2, Database, FolderOpen, HardDrive } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { system } from "../api";

function diskStatus(pct: number) {
  if (pct >= 90) return { label: "Critical", cls: "text-destructive", bg: "bg-destructive" };
  if (pct >= 70) return { label: "Warning", cls: "text-warning-foreground", bg: "bg-warning" };
  return { label: "Healthy", cls: "text-success-foreground", bg: "bg-success" };
}

function diskType(fs: string) {
  if (fs.startsWith("/dev/nvme")) return "NVMe";
  if (fs.startsWith("/dev/sd")) return "SSD/HDD";
  if (fs === "tmpfs") return "TMPFS";
  return "Block";
}

export function DisksPage() {
  const [disks, setDisks] = useState<DiskInfo[]>([]);

  const refresh = useCallback(async () => {
    setDisks(await system.disk());
  }, []);

  useAsyncData(refresh);

  const physicalDisks = useMemo(() => disks.filter((d) => d.filesystem !== "tmpfs"), [disks]);
  const totalUsed = useMemo(() => {
    let used = 0;
    let total = 0;
    for (const d of physicalDisks) {
      used += parseSize(d.used);
      total += parseSize(d.size);
    }
    return { used, total };
  }, [physicalDisks]);

  const criticalCount = physicalDisks.filter((d) => parseInt(d.use, 10) >= 90).length;

  if (disks.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="flex h-32 items-center justify-center">
          <div className="text-center text-muted-foreground">
            <HardDrive size={32} className="mx-auto mb-2 opacity-50" />
            <p>No disk information available</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Drives" value={physicalDisks.length} />
        <StatCard label="Total Capacity" value={formatTotal(totalUsed.total)} />
        <StatCard label="Total Used" value={formatTotal(totalUsed.used)} />
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${criticalCount > 0 ? "bg-destructive/10" : "bg-success/10"}`}
            >
              {criticalCount > 0 ? (
                <AlertTriangle size={18} className="text-destructive" />
              ) : (
                <CheckCircle2 size={18} className="text-success-foreground" />
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Health</div>
              <div
                className={`text-xl font-bold ${criticalCount > 0 ? "text-destructive" : "text-success-foreground"}`}
              >
                {criticalCount > 0 ? `${criticalCount} Critical` : "All Good"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-3">
        {disks.map((d) => {
          const pct = parseInt(d.use, 10);
          const status = diskStatus(pct);
          const dtype = diskType(d.filesystem);

          return (
            <Card key={`${d.filesystem}-${d.mount}`} className="p-0 overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                    d.filesystem === "tmpfs" ? "bg-info/10" : "bg-primary/10"
                  }`}
                >
                  {d.filesystem === "tmpfs" ? (
                    <Database size={18} className="text-info-foreground" />
                  ) : (
                    <HardDrive size={18} className="text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{d.mount}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                      {dtype}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
                      {d.filesystem}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-lg font-bold tabular-nums ${status.cls}`}>{pct}%</span>
                    <span className="text-xs text-muted-foreground">
                      {d.used} used of {d.size}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <FolderOpen size={11} className="inline mr-0.5" />
                      {d.avail} free
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${status.bg}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function parseSize(s: string): number {
  const num = parseFloat(s);
  if (s.endsWith("T")) return num * 1024;
  if (s.endsWith("G")) return num;
  if (s.endsWith("M")) return num / 1024;
  return num;
}

function formatTotal(gb: number): string {
  return gb >= 1024 ? `${(gb / 1024).toFixed(1)} TB` : `${gb.toFixed(0)} GB`;
}

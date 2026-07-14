import { useHistory, usePolling } from "@project/hooks";
import type { GpuData } from "@project/types";
import { Bar, Card, Sparkline, StaleDataNotice } from "@project/ui";
import { useCallback, useState } from "react";
import { system } from "../api";

function tempColor(temp: number): string {
  if (temp >= 85) return "text-destructive";
  if (temp >= 70) return "text-warning-foreground";
  return "text-success-foreground";
}

function tempBarColor(temp: number): string {
  if (temp >= 85) return "bg-destructive";
  if (temp >= 70) return "bg-warning";
  return "bg-success";
}

export function GpuPage() {
  const [gpu, setGpu] = useState<GpuData | null>(null);
  const { history: tempHistory, push: pushTemp } = useHistory();
  const { history: utilHistory, push: pushUtil } = useHistory();
  const { history: memHistory, push: pushMem } = useHistory();
  const { history: fanHistory, push: pushFan } = useHistory();

  const refresh = useCallback(async () => {
    const g = await system.gpu();
    setGpu(g);
    if (g) {
      const memPct = g.memTotal ? Math.round((parseFloat(g.memUsed) / parseFloat(g.memTotal)) * 100) : 0;
      pushTemp(g.temp);
      pushUtil(g.util);
      pushMem(memPct);
      pushFan(g.fan);
    }
  }, [pushTemp, pushUtil, pushMem, pushFan]);

  const { error: pollError } = usePolling(refresh, 2000);

  if (!gpu) {
    return (
      <div className="space-y-3">
        <StaleDataNotice error={pollError} />
        <div className="text-muted-foreground">GPU telemetry has not been collected.</div>
      </div>
    );
  }

  const memPct = gpu.memTotal ? Math.round((parseFloat(gpu.memUsed) / parseFloat(gpu.memTotal)) * 100) : 0;
  const powerPct = gpu.powerLimit ? Math.round((parseFloat(gpu.power) / parseFloat(gpu.powerLimit)) * 100) : 0;

  return (
    <div className="space-y-3">
      <StaleDataNotice error={pollError} />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">{gpu.name}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {gpu.power} / {gpu.powerLimit} W
            </span>
            <span>Driver: {gpu.driverVersion}</span>
          </div>
        </div>
        <Bar label="Power" value={`${gpu.power} / ${gpu.powerLimit} W`} pct={powerPct} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">GPU Temperature</div>
            <span className={`text-2xl font-bold tabular-nums ${tempColor(gpu.temp)}`}>{gpu.temp}°C</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary">
            <div
              className={`h-1.5 rounded-full transition-all ${tempBarColor(gpu.temp)}`}
              style={{ width: `${Math.min(gpu.temp, 100)}%` }}
            />
          </div>
          <div className="mt-2">
            <Sparkline data={tempHistory} width={280} height={40} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">GPU Utilization</div>
            <span className="text-2xl font-bold tabular-nums">
              {gpu.util}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary">
            <div className="h-1.5 rounded-full transition-all bg-primary" style={{ width: `${gpu.util}%` }} />
          </div>
          <div className="mt-2">
            <Sparkline data={utilHistory} width={280} height={40} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">VRAM</div>
            <span className="text-2xl font-bold tabular-nums">
              {memPct}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </span>
          </div>
          <Bar label="" value="" pct={memPct} size="md" />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {gpu.memUsed} / {gpu.memTotal} GiB
            </span>
            <Sparkline data={memHistory} width={180} height={32} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">Fan Speed</div>
            <span className="text-2xl font-bold tabular-nums">
              {gpu.fan}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary">
            <div className="h-1.5 rounded-full transition-all bg-primary" style={{ width: `${gpu.fan}%` }} />
          </div>
          <div className="mt-2">
            <Sparkline data={fanHistory} width={280} height={40} />
          </div>
        </Card>
      </div>
    </div>
  );
}

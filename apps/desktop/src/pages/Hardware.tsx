import { useCallback, useMemo, useState } from "react";
import { Cpu, Fan, MemoryStick, Thermometer } from "lucide-react";
import { system } from "../api";
import { Bar, Card, Sparkline } from "../components/ui";
import { useCpuHistory, useCpuUsage, usePolling } from "../lib/hooks";

interface SensorReading {
  chip: string;
  sensor: string;
  type: "temp" | "fan";
  value: number;
  max?: number;
  crit?: number;
}

function parseSensors(raw: string): SensorReading[] {
  try {
    const data = JSON.parse(raw);
    const readings: SensorReading[] = [];
    for (const chip of Object.keys(data)) {
      const chipData = data[chip];
      if (typeof chipData !== "object" || chipData === null) continue;
      for (const sensor of Object.keys(chipData)) {
        const sensorData = chipData[sensor];
        if (typeof sensorData !== "object" || sensorData === null) continue;
        for (const key of Object.keys(sensorData)) {
          if (key.endsWith("_input") && typeof sensorData[key] === "number") {
            const isFan = key.startsWith("fan");
            readings.push({
              chip,
              sensor: sensor.replace(/_/g, " "),
              type: isFan ? "fan" : "temp",
              value: sensorData[key],
              max: typeof sensorData[key.replace("_input", "_max")] === "number" ? sensorData[key.replace("_input", "_max")] : undefined,
              crit: typeof sensorData[key.replace("_input", "_crit")] === "number" ? sensorData[key.replace("_input", "_crit")] : undefined,
            });
          }
        }
      }
    }
    return readings;
  } catch {
    return [];
  }
}

function tempColor(temp: number, max?: number): string {
  const threshold = max || 80;
  const pct = temp / threshold;
  if (pct >= 0.9) return "text-destructive";
  if (pct >= 0.7) return "text-warning-foreground";
  return "text-success-foreground";
}

function tempBarColor(temp: number, max?: number): string {
  const threshold = max || 80;
  const pct = temp / threshold;
  if (pct >= 0.9) return "bg-destructive";
  if (pct >= 0.7) return "bg-warning";
  return "bg-success";
}

function chipLabel(chip: string): string {
  if (chip.includes("k10temp")) return "CPU";
  if (chip.includes("amdgpu")) return "GPU";
  if (chip.includes("nvme")) return "NVMe";
  if (chip.includes("asusec")) return "Board";
  if (chip.includes("it8686")) return "Fans";
  return chip;
}

export function HardwarePage() {
  const [sensorsRaw, setSensorsRaw] = useState("");
  const [memRaw, setMemRaw] = useState<{ total: string; used: string; available: string } | null>(null);
  const { cpuPercent, updateCpu } = useCpuUsage();
  const { cpuHistory, updateCpu: updateCpuHistory } = useCpuHistory();

  const refresh = useCallback(async () => {
    const [s, cpu, mem] = await Promise.all([
      system.sensors().catch(() => ""),
      system.cpuUsage(),
      system.memory().catch(() => null),
    ]);
    setSensorsRaw(s);
    updateCpu(cpu);
    updateCpuHistory(cpu);
    if (mem) {
      setMemRaw({ total: mem.mem.total, used: mem.mem.used, available: mem.mem.available });
    }
  }, [updateCpu, updateCpuHistory]);

  usePolling(refresh, 1000);

  const allReadings = useMemo(() => parseSensors(sensorsRaw), [sensorsRaw]);
  const temps = allReadings.filter((r) => r.type === "temp");
  const fans = allReadings.filter((r) => r.type === "fan");
  const memPct = memRaw ? Math.round((parseInt(memRaw.used) / parseInt(memRaw.total)) * 100) : 0;
  const formatGb = (v: string) => (parseInt(v) / 1024 / 1024).toFixed(1);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-foreground" />
              <span className="text-sm text-foreground font-medium">CPU Usage</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">{cpuPercent}<span className="text-sm font-normal text-muted-foreground">%</span></span>
          </div>
          <Bar label="" value="" pct={cpuPercent} size="md" />
          <div className="mt-2">
            <Sparkline data={cpuHistory} width={320} height={40} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MemoryStick size={14} className="text-foreground" />
              <span className="text-sm text-foreground font-medium">Memory</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">{memPct}<span className="text-sm font-normal text-muted-foreground">%</span></span>
          </div>
          <Bar label="" value="" pct={memPct} size="md" />
          {memRaw && (
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span>{formatGb(memRaw.used)} GB used</span>
              <span>{formatGb(memRaw.available)} GB available</span>
              <span>{formatGb(memRaw.total)} GB total</span>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
          <Thermometer size={14} className="text-foreground" />
          <span className="text-sm font-medium">Temperatures</span>
          <span className="text-xs text-muted-foreground ml-auto">{temps.length} sensors</span>
        </div>
        {temps.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">No temperature sensors detected</div>
        ) : (
          <div className="divide-y divide-border/30">
            {temps.map((r, i) => {
              const pct = r.max ? Math.min(Math.round((r.value / r.max) * 100), 100) : Math.min(Math.round(r.value), 100);
              return (
                <div key={`${r.chip}-${r.sensor}-${i}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Thermometer size={12} className={tempColor(r.value, r.max)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{chipLabel(r.chip)}</span>
                      <span className="text-sm">{r.sensor}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-secondary">
                      <div className={`h-1.5 rounded-full transition-all ${tempBarColor(r.value, r.max)}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-sm font-bold tabular-nums ${tempColor(r.value, r.max)}`}>{r.value.toFixed(1)}°C</span>
                    {r.max && <span className="text-xs text-muted-foreground ml-1">/{r.max}°C</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {fans.length > 0 && (
        <Card className="p-0">
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
            <Fan size={14} className="text-foreground" />
            <span className="text-sm font-medium">Fans</span>
            <span className="text-xs text-muted-foreground ml-auto">{fans.length} fans</span>
          </div>
          <div className="divide-y divide-border/30">
            {fans.map((r, i) => (
              <div key={`fan-${r.chip}-${i}`} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Fan size={12} className="text-info-foreground" />
                </div>
                <span className="flex-1 text-sm">{r.sensor}</span>
                <span className="text-sm font-bold tabular-nums">{Math.round(r.value)} RPM</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

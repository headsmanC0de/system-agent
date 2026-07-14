import { Cpu, Fan, MemoryStick, Thermometer } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { fans as fansApi, system } from "../api";
import { Bar, Button, Card, Sparkline, StaleDataNotice } from "../components/ui";
import { useAsyncData, useCpuHistory, useCpuUsage, usePolling } from "../lib/hooks";
import { getStorageItem, STORAGE_KEYS, setStorageItem } from "../lib/storage";
import type { FanCurvePoint, FanInfo } from "../types";

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
              max:
                typeof sensorData[key.replace("_input", "_max")] === "number"
                  ? sensorData[key.replace("_input", "_max")]
                  : undefined,
              crit:
                typeof sensorData[key.replace("_input", "_crit")] === "number"
                  ? sensorData[key.replace("_input", "_crit")]
                  : undefined,
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

const CURVE_TEMPS = [40, 55, 70, 85];
const DEFAULT_DUTIES = [20, 35, 60, 100];
const FAN_PRESETS: { name: string; duties: number[] }[] = [
  { name: "Silent", duties: [10, 25, 45, 80] },
  { name: "Balanced", duties: [20, 35, 60, 100] },
  { name: "Performance", duties: [40, 60, 85, 100] },
];
function defaultCurve(): FanCurvePoint[] {
  return CURVE_TEMPS.map((temp, i) => ({ temp, duty: DEFAULT_DUTIES[i] }));
}

function loadStoredCurves(): Record<string, FanCurvePoint[]> {
  try {
    const raw = getStorageItem(STORAGE_KEYS.fanCurves);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function curveX(temp: number): number {
  return Math.min(Math.max(((temp - 30) / 60) * 100, 0), 100);
}

function FanCurvePreview({ curve, tempC }: { curve: FanCurvePoint[]; tempC: number | null }) {
  const points = curve.map((p) => `${curveX(p.temp)},${80 - (p.duty / 100) * 80}`).join(" ");
  return (
    <svg
      className="w-full"
      height={80}
      viewBox="0 0 100 80"
      preserveAspectRatio="none"
      role="img"
      aria-label="Fan curve preview"
    >
      <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      {tempC !== null && (
        <line
          x1={curveX(tempC)}
          x2={curveX(tempC)}
          y1={0}
          y2={80}
          stroke="var(--destructive)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

function FanCurvesCard() {
  const [fanList, setFanList] = useState<FanInfo[] | null>(null);
  const [curves, setCurves] = useState<Record<string, FanCurvePoint[]>>(loadStoredCurves);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");

  useAsyncData(
    useCallback(async () => {
      setFanList(await fansApi.list());
    }, []),
  );

  const curveFor = useCallback((id: string) => curves[id] ?? defaultCurve(), [curves]);

  const saveCurves = useCallback((next: Record<string, FanCurvePoint[]>) => {
    setCurves(next);
    try {
      setStorageItem(STORAGE_KEYS.fanCurves, JSON.stringify(next));
    } catch {}
  }, []);

  const setDuty = (id: string, idx: number, duty: number) => {
    saveCurves({
      ...curves,
      [id]: curveFor(id).map((p, i) => (i === idx ? { ...p, duty } : p)),
    });
  };

  const applyPreset = (id: string, duties: number[]) => {
    saveCurves({
      ...curves,
      [id]: CURVE_TEMPS.map((temp, i) => ({ temp, duty: duties[i] })),
    });
  };

  const toggleCurves = async () => {
    const nextEnabled = !enabled;
    const writableCurves: Record<string, FanCurvePoint[]> = {};
    for (const fan of fanList ?? []) {
      if (fan.writable) writableCurves[fan.id] = curveFor(fan.id);
    }
    try {
      const result = await fansApi.setConfig({ enabled: nextEnabled, curves: writableCurves });
      setEnabled(nextEnabled);
      setStatus(result);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
        <Fan size={14} className="text-foreground" />
        <span className="text-sm font-medium">Fan Curves</span>
        {fanList !== null && <span className="text-xs text-muted-foreground ml-auto">{fanList.length} PWM fans</span>}
      </div>
      {fanList !== null && fanList.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground text-center">
          No controllable PWM fans detected (hwmon exposes none on this machine).
        </div>
      ) : (
        <div className="divide-y divide-border/30">
          {(fanList ?? []).map((fan) => {
            const curve = curveFor(fan.id);
            return (
              <div key={fan.id} className="px-4 py-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {fan.label} <span className="text-muted-foreground font-normal">· {fan.chip}</span>
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {fan.rpm !== null && <span>{Math.round(fan.rpm)} RPM</span>}
                    {fan.rpm !== null && fan.tempC !== null && <span> · </span>}
                    {fan.tempC !== null && <span>{fan.tempC.toFixed(0)}°C</span>}
                  </span>
                </div>
                {!fan.writable && (
                  <div className="text-xs text-warning-foreground">
                    pwm not writable — add a udev rule to allow user PWM control
                  </div>
                )}
                <div className="flex gap-2">
                  {FAN_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="secondary"
                      size="sm"
                      onClick={() => applyPreset(fan.id, preset.duties)}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {curve.map((point, idx) => (
                    <div key={point.temp} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                        <span>{point.temp}°C</span>
                        <span>{point.duty}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={point.duty}
                        aria-label={`${point.temp}°C duty`}
                        className="w-full accent-primary"
                        onChange={(e) => setDuty(fan.id, idx, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
                <FanCurvePreview curve={curve} tempC={fan.tempC} />
              </div>
            );
          })}
          {fanList !== null && fanList.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Button variant={enabled ? "destructive" : "default"} size="sm" onClick={toggleCurves}>
                {enabled ? "Disable curves" : "Enable curves"}
              </Button>
              {status && <span className="text-xs text-muted-foreground">{status}</span>}
            </div>
          )}
        </div>
      )}
    </Card>
  );
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

  const { error: pollError } = usePolling(refresh, 1000);

  const allReadings = useMemo(() => parseSensors(sensorsRaw), [sensorsRaw]);
  const temps = allReadings.filter((r) => r.type === "temp");
  const fans = allReadings.filter((r) => r.type === "fan");
  const memPct = memRaw ? Math.round((parseInt(memRaw.used, 10) / parseInt(memRaw.total, 10)) * 100) : 0;
  const formatGb = (v: string) => (parseInt(v, 10) / 1024 / 1024 / 1024).toFixed(1);

  return (
    <div className="space-y-3">
      <StaleDataNotice error={pollError} />
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-foreground" />
              <span className="text-sm text-foreground font-medium">CPU Usage</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">
              {cpuPercent}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </span>
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
            <span className="text-2xl font-bold tabular-nums">
              {memPct}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </span>
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
              const pct = r.max
                ? Math.min(Math.round((r.value / r.max) * 100), 100)
                : Math.min(Math.round(r.value), 100);
              return (
                <div
                  key={`${r.chip}-${r.sensor}-${i}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Thermometer size={12} className={tempColor(r.value, r.max)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                        {chipLabel(r.chip)}
                      </span>
                      <span className="text-sm">{r.sensor}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-secondary">
                      <div
                        className={`h-1.5 rounded-full transition-all ${tempBarColor(r.value, r.max)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-sm font-bold tabular-nums ${tempColor(r.value, r.max)}`}>
                      {r.value.toFixed(1)}°C
                    </span>
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
              <div
                key={`fan-${r.chip}-${i}`}
                className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors"
              >
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

      <FanCurvesCard />
    </div>
  );
}

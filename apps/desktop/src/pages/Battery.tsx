import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  Cable,
  Gamepad2,
  Headphones,
  Keyboard,
  Mouse,
  Plug,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { battery } from "../api";
import { Badge, Card, SearchInput } from "../components/ui";
import { usePolling } from "../lib/hooks";
import type { BatteryDevice, BtDevice, EcoFlowDevice } from "../types";

function batteryIcon(pct: number, charging: boolean, size = 20) {
  if (charging) return <BatteryCharging size={size} className="text-success-foreground" />;
  if (pct >= 90) return <BatteryFull size={size} className="text-success-foreground" />;
  if (pct >= 60) return <BatteryMedium size={size} className="text-warning-foreground" />;
  if (pct >= 30) return <BatteryLow size={size} className="text-warning-foreground" />;
  return <BatteryWarning size={size} className="text-destructive" />;
}

function deviceIcon(icon: string) {
  if (icon.includes("mouse") || icon.includes("Mouse")) return Mouse;
  if (icon.includes("keyboard") || icon.includes("Keyboard")) return Keyboard;
  if (icon.includes("headphone") || icon.includes("audio") || icon.includes("Headset")) return Headphones;
  if (icon.includes("gamepad") || icon.includes("Gamepad")) return Gamepad2;
  return Battery;
}

function pctColor(pct: number): string {
  if (pct >= 80) return "bg-success";
  if (pct >= 60) return "bg-warning";
  if (pct >= 30) return "bg-warning";
  return "bg-destructive";
}

function connectionLabel(conn: string) {
  switch (conn) {
    case "bluetooth":
      return { icon: <Bluetooth size={12} />, label: "Bluetooth", cls: "text-info-foreground" };
    case "usb":
      return { icon: <Cable size={12} />, label: "USB / Cable", cls: "text-success-foreground" };
    case "wireless":
      return { icon: <Plug size={12} />, label: "Wireless", cls: "text-info" };
    default:
      return { icon: <Battery size={12} />, label: "Device", cls: "text-muted-foreground" };
  }
}

function formatPct(value: number | null): string {
  return value === null ? "N/A" : `${Number.isInteger(value) ? value : value.toFixed(2)}%`;
}

function formatWatts(value: number | null): string {
  return value === null ? "N/A" : `${value} W`;
}

function formatMinutes(value: number | null): string {
  if (value === null) return "N/A";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function portBadge(label: string, enabled: boolean | null) {
  if (enabled === null) return <Badge>{label} N/A</Badge>;
  return <Badge variant={enabled ? "success" : "secondary"}>{`${label} ${enabled ? "On" : "Off"}`}</Badge>;
}

export function BatteryPage() {
  const [upowerDevices, setUpowerDevices] = useState<BatteryDevice[]>([]);
  const [btDevices, setBtDevices] = useState<BtDevice[]>([]);
  const [ecoflowDevices, setEcoflowDevices] = useState<EcoFlowDevice[]>([]);
  const [ecoflowUnavailable, setEcoflowUnavailable] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [output, setOutput] = useState("");
  const [tab, setTab] = useState<"upower" | "ecoflow" | "bluetooth">("upower");
  const [watcherActive, setWatcherActive] = useState(false);

  const refresh = useCallback(async () => {
    const [up, ecoflow, bt] = await Promise.all([
      battery.upowerDevices(),
      battery.ecoflowDevices(),
      battery.btDevices(),
    ]);
    setUpowerDevices(up);
    setEcoflowDevices(ecoflow.devices);
    setEcoflowUnavailable(ecoflow.unavailableReason);
    setBtDevices(bt);
  }, []);

  useEffect(() => {
    battery.batteryWatch("start").then(() => setWatcherActive(true));
    return () => {
      battery.batteryWatch("stop");
      setWatcherActive(false);
    };
  }, []);

  usePolling(refresh, 30000);

  const btAction = async (mac: string, action: "connect" | "disconnect") => {
    const fn = action === "connect" ? battery.btConnect : battery.btDisconnect;
    setOutput(await fn(mac));
    setTimeout(() => setOutput(""), 3000);
    setTimeout(refresh, 2000);
  };

  const filteredUpower = search
    ? upowerDevices.filter(
        (d) =>
          d.model.toLowerCase().includes(search.toLowerCase()) ||
          d.nativePath.toLowerCase().includes(search.toLowerCase()),
      )
    : upowerDevices;

  const filteredBt = search
    ? btDevices.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) || d.mac.toLowerCase().includes(search.toLowerCase()),
      )
    : btDevices;

  const filteredEcoflow = search
    ? ecoflowDevices.filter(
        (d) =>
          d.model.toLowerCase().includes(search.toLowerCase()) ||
          d.serial.toLowerCase().includes(search.toLowerCase()) ||
          d.extraBatteries.some((b) => b.serial?.toLowerCase().includes(search.toLowerCase())),
      )
    : ecoflowDevices;

  const connectedBt = btDevices.filter((d) => d.connected);
  const totalDevices = upowerDevices.length + connectedBt.length + ecoflowDevices.length;
  const lowBattery = [...upowerDevices, ...connectedBt].filter(
    (d) => ("percentage" in d ? d.percentage : d.batteryLevel) < 20,
  );
  const lowEcoflow = ecoflowDevices.filter((d) => d.batteryLevel !== null && d.batteryLevel < 20);
  const lowBatteryCount = lowBattery.length + lowEcoflow.length;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-foreground">
            <div
              className={`h-2 w-2 rounded-full ${watcherActive ? "bg-success animate-pulse" : "bg-muted-foreground"}`}
            />
            <span>BT Battery Watch {watcherActive ? "Active" : "Inactive"}</span>
          </div>
          <button onClick={refresh} className="btn-secondary flex items-center gap-1.5">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Battery size={18} className="text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Monitored</div>
            <div className="text-xl font-bold">{totalDevices}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <BluetoothConnected size={18} className="text-success-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Connected BT</div>
            <div className="text-xl font-bold">{connectedBt.length}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
            <Bluetooth size={18} className="text-info-foreground" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Paired BT</div>
            <div className="text-xl font-bold">{btDevices.length}</div>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${lowBattery.length > 0 ? "bg-destructive/10" : "bg-secondary"}`}
          >
            <BatteryWarning
              size={18}
              className={lowBattery.length > 0 ? "text-destructive" : "text-muted-foreground"}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Low Battery</div>
            <div className={`text-xl font-bold ${lowBatteryCount > 0 ? "text-destructive" : ""}`}>
              {lowBatteryCount}
            </div>
          </div>
        </Card>
      </div>

      {output && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">{output}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setTab("upower")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "upower" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          Power Devices ({upowerDevices.length})
        </button>
        <button
          onClick={() => setTab("bluetooth")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "bluetooth" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          Bluetooth ({btDevices.length})
        </button>
        <button
          onClick={() => setTab("ecoflow")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "ecoflow" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          EcoFlow ({ecoflowDevices.length})
        </button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Search devices..." />

      {tab === "upower" && (
        <div className="space-y-3">
          {filteredUpower.length === 0 ? (
            <Card className="flex h-32 items-center justify-center">
              <div className="text-center">
                <Battery size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                <div className="text-sm text-muted-foreground">No battery devices detected via UPower</div>
              </div>
            </Card>
          ) : (
            filteredUpower.map((dev) => {
              const conn = connectionLabel(dev.connection);
              return (
                <Card key={dev.nativePath} className="flex items-center gap-4 p-4">
                  <div className="flex-shrink-0">{batteryIcon(dev.percentage, dev.state === "charging", 28)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{dev.model || dev.nativePath}</span>
                      <Badge
                        variant={
                          dev.state === "charging" ? "success" : dev.state === "discharging" ? "default" : "primary"
                        }
                      >
                        {dev.state === "charging"
                          ? "Charging"
                          : dev.state === "discharging"
                            ? "Discharging"
                            : dev.state}
                      </Badge>
                      <span className={`flex items-center gap-1 text-xs ${conn.cls}`}>
                        {conn.icon}
                        {conn.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full bg-secondary">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${pctColor(dev.percentage)}`}
                          style={{ width: `${dev.percentage}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm font-bold w-12 text-right">{dev.percentage}%</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {dev.serial && <span className="mr-3">S/N: {dev.serial}</span>}
                      {dev.updated && <span>Updated: {dev.updated}</span>}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {tab === "ecoflow" && (
        <div className="space-y-3">
          {ecoflowUnavailable && (
            <Card className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Zap size={18} className="text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium">EcoFlow BLE unavailable</div>
                <div className="text-xs text-muted-foreground">{ecoflowUnavailable}</div>
              </div>
            </Card>
          )}
          {filteredEcoflow.length === 0 ? (
            <Card className="flex h-32 items-center justify-center">
              <div className="text-center">
                <Zap size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                <div className="text-sm text-muted-foreground">
                  {search ? "No EcoFlow devices match your search" : "No EcoFlow devices detected"}
                </div>
              </div>
            </Card>
          ) : (
            filteredEcoflow.map((dev) => (
              <Card key={dev.serial} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">{batteryIcon(dev.batteryLevel ?? 0, false, 30)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{dev.model}</span>
                      <Badge variant={dev.connected ? "success" : "secondary"}>
                        {dev.connected ? "Connected" : "Offline"}
                      </Badge>
                      {portBadge("AC", dev.acPorts)}
                      {portBadge("USB", dev.usbPorts)}
                      {portBadge("DC", dev.dc12vPort)}
                    </div>
                    <div className="mt-1 text-xs font-mono text-muted-foreground">{dev.serial}</div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2.5 flex-1 rounded-full bg-secondary">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${pctColor(dev.batteryLevel ?? 0)}`}
                          style={{ width: `${Math.max(0, Math.min(100, dev.batteryLevel ?? 0))}%` }}
                        />
                      </div>
                      <span className="w-16 text-right font-mono text-sm font-bold">{formatPct(dev.batteryLevel)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Input</div>
                        <div className="font-mono">{formatWatts(dev.inputWatts)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Output</div>
                        <div className="font-mono">{formatWatts(dev.outputWatts)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">AC Charge</div>
                        <div className="font-mono">{formatWatts(dev.acChargingSpeedWatts)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Runtime</div>
                        <div className="font-mono">{formatMinutes(dev.remainingTimeDischargingMinutes)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">AC Out</div>
                        <div className="font-mono">
                          {formatWatts(dev.acOutputWatts)} / {dev.acOutputVolts ?? "N/A"} V
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">XT60</div>
                        <div className="font-mono">
                          {formatWatts(dev.xt60InputWatts)} + {formatWatts(dev.xt60_2InputWatts)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Charge Limit</div>
                        <div className="font-mono">
                          {formatPct(dev.chargeLimitMin)} - {formatPct(dev.chargeLimitMax)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Main Battery</div>
                        <div className="font-mono">{formatPct(dev.mainBatteryLevel)}</div>
                      </div>
                    </div>
                    {dev.extraBatteries.length > 0 && (
                      <div className="mt-4 divide-y divide-border/50 rounded-md border border-border/60">
                        {dev.extraBatteries.map((extra) => (
                          <div
                            key={`${dev.serial}-${extra.index}`}
                            className="flex items-center justify-between px-3 py-2"
                          >
                            <div>
                              <div className="text-sm font-medium">Extra Battery {extra.index}</div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {extra.serial ?? "Unknown serial"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-sm font-bold">{formatPct(extra.batteryLevel)}</div>
                              <div className="text-xs text-muted-foreground">
                                {extra.cellTemperature === null ? "N/A" : `${extra.cellTemperature} C`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "bluetooth" && (
        <Card className="p-0">
          <div className="max-h-[500px] overflow-y-auto divide-y divide-border/50">
            {filteredBt.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <div className="text-center">
                  <BluetoothOff size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                  <div className="text-sm text-muted-foreground">No Bluetooth devices found</div>
                </div>
              </div>
            ) : (
              filteredBt.map((dev) => {
                const DevIcon = deviceIcon(dev.icon);
                return (
                  <div key={dev.mac} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${dev.connected ? "bg-info/10" : "bg-secondary"}`}
                    >
                      <DevIcon size={18} className={dev.connected ? "text-info-foreground" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{dev.name}</span>
                        {dev.connected && <Badge variant="primary">Connected</Badge>}
                        {dev.paired && !dev.connected && <Badge>Paired</Badge>}
                        {dev.batteryAvailable && dev.batteryLevel >= 0 && (
                          <div className="flex items-center gap-1 ml-2">
                            {batteryIcon(dev.batteryLevel, false, 14)}
                            <span className="text-xs font-mono">{dev.batteryLevel}%</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{dev.mac}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dev.connected ? (
                        <button
                          onClick={() => btAction(dev.mac, "disconnect")}
                          className="rounded-md px-3 py-1 text-xs bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={() => btAction(dev.mac, "connect")}
                          className="rounded-md px-3 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

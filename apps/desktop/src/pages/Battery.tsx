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
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { battery } from "../api";
import { Badge, Card, SearchInput } from "../components/ui";
import { usePolling } from "../lib/hooks";
import type { BatteryDevice, BtDevice } from "../types";

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

export function BatteryPage() {
  const [upowerDevices, setUpowerDevices] = useState<BatteryDevice[]>([]);
  const [btDevices, setBtDevices] = useState<BtDevice[]>([]);
  const [search, setSearch] = useState("");
  const [output, setOutput] = useState("");
  const [tab, setTab] = useState<"upower" | "bluetooth">("upower");
  const [watcherActive, setWatcherActive] = useState(false);

  const refresh = useCallback(async () => {
    const [up, bt] = await Promise.all([battery.upowerDevices(), battery.btDevices()]);
    setUpowerDevices(up);
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

  const connectedBt = btDevices.filter((d) => d.connected);
  const totalDevices = upowerDevices.length + connectedBt.length;
  const lowBattery = [...upowerDevices, ...connectedBt].filter(
    (d) => ("percentage" in d ? d.percentage : d.batteryLevel) < 20,
  );

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
            <div className={`text-xl font-bold ${lowBattery.length > 0 ? "text-destructive" : ""}`}>
              {lowBattery.length}
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
                  <div
                    key={dev.mac}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
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

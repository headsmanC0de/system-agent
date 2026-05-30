import { useEffect, useState } from "react";
import { system } from "../api";
import { Badge, Button, Card, Output } from "../components/ui";

interface RgbDevice {
  idx: number;
  name: string;
  type: string;
  modes: string[];
  zones: string[];
}

function parseDevices(raw: string): RgbDevice[] {
  const devices: RgbDevice[] = [];
  let current: Partial<RgbDevice> | null = null;

  for (const line of raw.split("\n")) {
    const trim = line.trim();
    if (/^\d+:/.test(trim)) {
      if (current?.idx !== undefined) devices.push(current as RgbDevice);
      current = { idx: parseInt(trim, 10), name: trim.replace(/^\d+:\s*/, ""), modes: [], zones: [] };
    } else if (current) {
      if (trim.startsWith("Type:")) current.type = trim.replace("Type:", "").trim();
      else if (trim.startsWith("Modes:"))
        current.modes = trim
          .replace("Modes:", "")
          .replace(/\[|\]/g, "")
          .split(",")
          .map((s) => s.trim());
      else if (trim.startsWith("Zones:"))
        current.zones = trim
          .replace("Zones:", "")
          .split(",")
          .map((s) => s.trim());
    }
  }
  if (current?.idx !== undefined) devices.push(current as RgbDevice);
  return devices;
}

const PRESETS = [
  { color: "FFFFFF" },
  { color: "FF0000" },
  { color: "00FF00" },
  { color: "0000FF" },
  { color: "F97316" },
  { color: "A855F7" },
  { color: "06B6D4" },
  { color: "EC4899" },
];

function DeviceCard({
  device,
  onApply,
}: {
  device: RgbDevice;
  onApply: (deviceIdx: number, mode: string, color: string) => void;
}) {
  const [hexInput, setHexInput] = useState("");
  const [presetsOpen, setPresetsOpen] = useState(false);

  const applyHex = () => {
    const cleaned = hexInput.replace(/^#/, "").toUpperCase();
    if (/^[0-9A-F]{6}$/.test(cleaned)) {
      onApply(device.idx, "static", cleaned);
      setHexInput("");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{device.name}</div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{device.type}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">Device {device.idx}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onApply(device.idx, "Rainbow", "")}
            className="rounded-md border border-border px-2 py-1 text-xs hover:border-primary/50"
          >
            Rainbow
          </button>
          <button
            onClick={() => onApply(device.idx, "Off", "")}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:border-destructive/50 hover:text-destructive"
          >
            Off
          </button>
        </div>
      </div>

      {device.zones.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {device.zones.map((z) => (
            <Badge key={z} variant="secondary" className="text-[10px]">
              {z}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">#</span>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6))}
          placeholder="FF0000"
          maxLength={6}
          className="h-7 w-24 rounded-md border border-border bg-background px-2 font-mono text-xs uppercase placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && applyHex()}
        />
        <Button variant="outline" size="sm" onClick={applyHex} disabled={hexInput.length !== 6}>
          Apply
        </Button>
      </div>

      <details open={presetsOpen} onToggle={(e) => setPresetsOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="mt-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
          Color presets
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.color}
              onClick={() => onApply(device.idx, "static", p.color)}
              className="h-6 w-6 rounded-full border border-border/50 transition-transform hover:scale-110"
              style={{ backgroundColor: `#${p.color}` }}
              title={`#${p.color}`}
            />
          ))}
        </div>
      </details>
    </Card>
  );
}

export function RgbPage() {
  const [devices, setDevices] = useState<RgbDevice[]>([]);
  const [output, setOutput] = useState("");

  useEffect(() => {
    system.rgbDevices().then((raw) => {
      if (raw) setDevices(parseDevices(raw));
    });
  }, []);

  const apply = async (deviceIdx: number, mode: string, color: string) => {
    const args = ["--device", String(deviceIdx), "--mode", mode];
    if (color && !["Off", "Rainbow", "Spectrum Cycle"].includes(mode)) {
      args.push("--color", color);
    }
    try {
      const res = await system.rgbSet(args);
      setOutput(res);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const allOff = async () => {
    try {
      for (const d of devices) {
        await system.rgbSet(["--device", String(d.idx), "--mode", "Off"]);
      }
      setOutput("All devices turned off");
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  const allWhite = async () => {
    try {
      for (const d of devices) {
        await system.rgbSet(["--device", String(d.idx), "--mode", "static", "--color", "FFFFFF"]);
      }
      setOutput("All devices set to white static");
    } catch (err) {
      setOutput(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={allWhite}>
          All White
        </Button>
        <Button variant="ghost" size="sm" onClick={allOff}>
          All Off
        </Button>
      </div>

      <div className="space-y-3">
        {devices.map((d) => (
          <DeviceCard key={d.idx} device={d} onApply={apply} />
        ))}
        {devices.length === 0 && (
          <div className="text-sm text-muted-foreground">No RGB devices detected. Make sure OpenRGB is installed.</div>
        )}
      </div>

      {output && <Output>{output}</Output>}
    </div>
  );
}

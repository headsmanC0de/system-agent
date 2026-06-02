import {
  Cable,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Globe,
  Lock,
  Network,
  Server,
  Signal,
  Wifi,
} from "lucide-react";
import { useCallback, useState } from "react";
import { system } from "../api";
import { Badge, Card, StatCard } from "../components/ui";
import { useAsyncData, usePolling } from "../lib/hooks";
import type { NetConnection, NetworkInterface, OpenPort } from "../types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title={`Copy: ${text}`}
    >
      {copied ? <Check size={10} className="text-success-foreground" /> : <Copy size={10} />}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function IfaceIcon({ type }: { type: NetworkInterface["type"] }) {
  switch (type) {
    case "wifi":
      return <Wifi size={16} className="text-info-foreground" />;
    case "ethernet":
      return <Cable size={16} className="text-success-foreground" />;
    case "bridge":
      return <Network size={16} className="text-warning-foreground" />;
    case "loopback":
      return <Server size={16} className="text-muted-foreground" />;
    default:
      return <Signal size={16} className="text-muted-foreground" />;
  }
}

function statusVariant(state: string): "success" | "danger" | "default" | "primary" | "info" | "warning" {
  if (state === "LISTEN") return "primary";
  if (state === "ESTAB") return "success";
  if (state === "UNCONN") return "default";
  if (state === "TIME_WAIT") return "warning";
  if (state === "CLOSE_WAIT") return "danger";
  return "default";
}

export function NetworkPage() {
  const [netInfo, setNetInfo] = useState<{
    publicIp: string;
    localIp: string;
    gateway: string;
    dns: string[];
    hostname: string;
    isReachable: boolean;
    latency: string;
  } | null>(null);
  const [ifaces, setIfaces] = useState<NetworkInterface[]>([]);
  const [ports, setPorts] = useState<OpenPort[]>([]);
  const [conns, setConns] = useState<NetConnection[]>([]);
  const [portsOpen, setPortsOpen] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const [ni, ifData, portData, connData] = await Promise.all([
        system.network(),
        system.networkInterfaces(),
        system.openPorts(),
        system.netConnections(),
      ]);
      setNetInfo(ni);
      setIfaces(ifData);
      setPorts(portData);
      setConns(connData);
    } catch {}
  }, []);

  const refreshConns = useCallback(async () => {
    try {
      setConns(await system.netConnections());
    } catch {}
  }, []);

  useAsyncData(refreshAll);
  usePolling(refreshConns, 1000);

  const listening = conns.filter((c) => c.state === "LISTEN");
  const established = conns.filter((c) => c.state === "ESTAB");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe size={14} className="text-foreground" />
            <span>Public IP</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold font-mono">{netInfo?.publicIp ?? "..."}</span>
            {netInfo?.publicIp && <CopyButton text={netInfo.publicIp} />}
          </div>
          <div className="mt-1">
            {netInfo?.isReachable ? <Badge variant="success">Online</Badge> : <Badge variant="danger">Offline</Badge>}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Server size={14} className="text-foreground" />
            <span>Local IP</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-semibold font-mono">{netInfo?.localIp ?? "..."}</span>
            {netInfo?.localIp && <CopyButton text={netInfo.localIp} />}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Gateway: {netInfo?.gateway ?? "..."}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock size={14} className="text-foreground" />
            <span>DNS Servers</span>
          </div>
          <div className="mt-1.5 space-y-0.5">
            {netInfo?.dns?.length ? (
              netInfo.dns.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="text-sm font-mono">{d}</span>
                  <CopyButton text={d} />
                </div>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">...</span>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Signal size={14} className="text-foreground" />
            <span>Connectivity</span>
          </div>
          <div className="mt-1.5 text-sm font-semibold">{netInfo?.latency ?? "..."}</div>
          <div className="mt-1 text-xs text-muted-foreground">Hostname: {netInfo?.hostname ?? "..."}</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Connections" value={conns.length} />
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Established" value={established.length} accent />
          <StatCard label="Listening" value={listening.length} />
        </div>
      </div>

      <Card className="p-0">
        <div className="border-b border-border px-4 py-2 text-sm font-medium">Network Interfaces</div>
        <div className="divide-y divide-border/50">
          {ifaces.map((iface) => (
            <div key={iface.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
              <IfaceIcon type={iface.type} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{iface.name}</span>
                  <Badge variant={iface.status === "up" ? "success" : "danger"}>{iface.status}</Badge>
                  {iface.speed !== "N/A" && <span className="text-xs text-muted-foreground">{iface.speed}</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono">{iface.ip}</span>
                  {iface.ipv6 && <span className="font-mono hidden lg:inline">{iface.ipv6}</span>}
                  <span className="font-mono">{iface.mac}</span>
                </div>
              </div>
              <div className="text-right text-xs space-y-0.5 flex-shrink-0">
                <div>
                  <span className="text-muted-foreground">RX </span>
                  <span className="font-mono text-success-foreground">{formatBytes(iface.rxBytes)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">TX </span>
                  <span className="font-mono text-info-foreground">{formatBytes(iface.txBytes)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0">
        <button
          onClick={() => setPortsOpen(!portsOpen)}
          className="flex w-full items-center justify-between border-b border-border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <span>Open Ports ({ports.length})</span>
          {portsOpen ? (
            <ChevronDown size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={14} className="text-muted-foreground" />
          )}
        </button>
        {portsOpen && (
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Port</th>
                  <th className="px-4 py-2">Proto</th>
                  <th className="px-4 py-2">Service</th>
                  <th className="px-4 py-2">Process</th>
                  <th className="px-4 py-2">State</th>
                </tr>
              </thead>
              <tbody>
                {ports.map((p) => (
                  <tr key={p.port} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-4 py-2 font-mono text-xs">{p.port}</td>
                    <td className="px-4 py-2 text-xs">{p.proto}</td>
                    <td className="px-4 py-2 text-xs">{p.service}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{p.process}</td>
                    <td className="px-4 py-2">
                      <Badge variant="primary">{p.state}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <div className="border-b border-border px-4 py-2 text-sm font-medium">Active Connections ({conns.length})</div>
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2">Proto</th>
                <th className="px-4 py-2">State</th>
                <th className="px-4 py-2">Local</th>
                <th className="px-4 py-2">Remote</th>
                <th className="px-4 py-2">Process</th>
              </tr>
            </thead>
            <tbody>
              {conns.slice(0, 200).map((c, i) => (
                <tr
                  key={`${c.netid}-${c.local}-${c.peer}-${i}`}
                  className="border-b border-border/50 hover:bg-muted/50"
                >
                  <td className="px-4 py-2 font-mono text-xs">{c.netid}</td>
                  <td className="px-4 py-2">
                    <Badge variant={statusVariant(c.state)}>{c.state}</Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{c.local}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.peer}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground truncate max-w-[150px]">{c.process}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

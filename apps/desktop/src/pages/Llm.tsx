import { useAsyncData, useHistory, usePolling } from "@project/hooks";
import type { LLMConfig, LLMInferenceStatus, LLMModelInfo } from "@project/types";
import { Bar, Card, Output, Sparkline, StaleDataNotice, StatCard } from "@project/ui";
import { Activity, Brain, Play, RefreshCw, Save, Settings2, Square, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import { llm } from "../api";

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function LlmPage() {
  const [modelInfo, setModelInfo] = useState<LLMModelInfo | null>(null);
  const [status, setStatus] = useState<LLMInferenceStatus | null>(null);
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [output, setOutput] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const { history: vramHistory, push: pushVram } = useHistory();
  const { history: tpsHistory, push: pushTps } = useHistory();
  const [editConfig, setEditConfig] = useState<LLMConfig | null>(null);

  const loadStaticData = useCallback(async () => {
    const [mi, cfg] = await Promise.all([llm.modelInfo(), llm.config()]);
    setModelInfo(mi);
    setConfig(cfg);
    if (cfg) setEditConfig((current) => current ?? cfg);
  }, []);

  const refreshStatus = useCallback(async () => {
    const st = await llm.inferenceStatus();
    setStatus(st);
    if (st) {
      const vPct = st.vramTotal && st.vramUsed !== null ? Math.round((st.vramUsed / st.vramTotal) * 100) : 0;
      pushVram(vPct);
      if (st.tokensPerSec !== null) pushTps(st.tokensPerSec);
    }
  }, [pushVram, pushTps]);

  const refresh = useCallback(async () => {
    await Promise.all([loadStaticData(), refreshStatus()]);
  }, [loadStaticData, refreshStatus]);

  const { error: staticError } = useAsyncData(loadStaticData);
  const { error: statusError } = usePolling(refreshStatus, 2000);

  const handleStart = async () => {
    try {
      setOutput(await llm.start());
    } catch (e) {
      setOutput(`Error: ${e}`);
    }
  };

  const handleStop = async () => {
    try {
      setOutput(await llm.stop());
    } catch (e) {
      setOutput(`Error: ${e}`);
    }
  };

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    try {
      setOutput(await llm.saveConfig(editConfig));
      setConfig(editConfig);
      setShowConfig(false);
    } catch (e) {
      setOutput(`Error: ${e}`);
    }
  };

  const vramPct =
    status?.vramTotal && status.vramUsed !== null ? Math.round((status.vramUsed / status.vramTotal) * 100) : 0;

  return (
    <div className="space-y-3">
      <StaleDataNotice error={staticError ?? statusError} />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-primary" />
            <div>
              <div className="text-sm font-semibold">{modelInfo?.name ?? "Model not configured"}</div>
              <div className="text-xs text-muted-foreground">{modelInfo?.architecture ?? "Metadata unavailable"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {status?.running ? (
              <span className="flex items-center gap-1.5 text-xs text-success-foreground">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Running
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                Stopped
              </span>
            )}
            <button
              onClick={handleStart}
              className="flex h-7 items-center gap-1 rounded-md bg-success/10 px-2 text-xs text-success-foreground hover:bg-success/20 transition-colors"
              title="Start server"
            >
              <Play size={12} /> Start
            </button>
            <button
              onClick={handleStop}
              className="flex h-7 items-center gap-1 rounded-md bg-destructive/10 px-2 text-xs text-destructive hover:bg-destructive/20 transition-colors"
              title="Stop server"
            >
              <Square size={12} /> Stop
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex h-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              title="Configuration"
            >
              <Settings2 size={14} />
            </button>
            <button
              onClick={refresh}
              className="flex h-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {modelInfo && (
          <div className="grid grid-cols-4 gap-3 mt-3">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Parameters</div>
              <div className="text-sm font-semibold">{modelInfo.parameters}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Experts</div>
              <div className="text-sm font-semibold">
                {modelInfo.experts} ({modelInfo.activeExperts} active)
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Context</div>
              <div className="text-sm font-semibold">{(modelInfo.contextLength / 1024).toFixed(0)}K tokens</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Quantization</div>
              <div className="text-sm font-semibold">{modelInfo.quantization}</div>
            </div>
          </div>
        )}
      </Card>

      {status?.running && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Activity size={12} /> VRAM Usage
              </div>
              <span className="text-2xl font-bold tabular-nums">
                {vramPct}
                <span className="text-sm font-normal text-muted-foreground">%</span>
              </span>
            </div>
            <Bar label="" value="" pct={vramPct} size="md" />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {status.vramUsed?.toFixed(1) ?? "—"} / {status.vramTotal?.toFixed(1) ?? "—"} GB
              </span>
              <Sparkline data={vramHistory} width={180} height={32} />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Zap size={12} /> Throughput
              </div>
              <span className="text-2xl font-bold tabular-nums">
                {status.tokensPerSec?.toFixed(1) ?? "—"}
                <span className="text-sm font-normal text-muted-foreground"> t/s</span>
              </span>
            </div>
            <div className="mt-2">
              <Sparkline data={tpsHistory} width={280} height={40} />
            </div>
          </Card>

          <StatCard
            label="Avg Latency"
            value={status.avgLatencyMs === null ? "Not reported" : `${status.avgLatencyMs}ms`}
          />
          <StatCard label="Requests/min" value={status.requestsPerMin?.toFixed(1) ?? "Not reported"} />
          <StatCard label="Uptime" value={status.uptime === null ? "Not reported" : formatUptime(status.uptime)} />
          <StatCard label="Server" value={status.serverUrl?.replace("http://", "") ?? "Not reported"} />
        </div>
      )}

      {showConfig && (editConfig || config) && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Inference Configuration</div>
            <button
              onClick={handleSaveConfig}
              className="flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 text-xs text-primary hover:bg-primary/20 transition-colors"
            >
              <Save size={12} /> Save
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(editConfig || config!).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>
                <input
                  type={typeof value === "number" ? "number" : "text"}
                  value={String((editConfig || config)![key as keyof LLMConfig])}
                  onChange={(e) => {
                    const base = editConfig || config!;
                    setEditConfig({
                      ...base,
                      [key]: typeof value === "number" ? Number(e.target.value) : e.target.value,
                    });
                  }}
                  className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {output && <Output className="whitespace-pre-wrap">{output}</Output>}
    </div>
  );
}

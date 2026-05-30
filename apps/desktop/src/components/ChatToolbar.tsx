import { Brain, ChevronDown, Database, Sparkles, Wrench } from "lucide-react";
import { useState } from "react";
import type { ChatConfig, ChatModel, ChatProvider } from "../lib/chat";
import { getAvailableModels, getProvider, PROVIDERS, saveChatConfig } from "../lib/chat";
import type { ChatSession } from "../lib/sessions";
import { calculateContextUsage, getSessionTokenSummary } from "../lib/sessions";

interface Props {
  config: ChatConfig;
  session: ChatSession | null;
  onConfigChange: (cfg: ChatConfig) => void;
}

export function ChatToolbar({ config, session, onConfigChange }: Props) {
  const [showModelPicker, setShowModelPicker] = useState(false);
  const provider = getProvider(config.providerId);
  const models = getAvailableModels(config);
  const currentModel = models.find((m) => m.id === config.modelId);

  const context = session ? calculateContextUsage(session) : null;
  const tokens = session ? getSessionTokenSummary(session) : null;
  const contextColor = (context?.percent || 0) > 80 ? "bg-destructive" : (context?.percent || 0) > 50 ? "bg-warning" : "bg-success";

  const toggle = (field: "thinkingEnabled" | "toolsEnabled" | "streamingEnabled") => {
    const updated = saveChatConfig({ [field]: !config[field] });
    onConfigChange(updated);
  };

  const setProvider = (id: string) => {
    const p = PROVIDERS.find((pr) => pr.id === id);
    if (!p) return;
    const m = p.models[0];
    const updated = saveChatConfig({ providerId: id, modelId: m?.id || "" });
    onConfigChange(updated);
    setShowModelPicker(false);
  };

  const setModel = (id: string) => {
    const updated = saveChatConfig({ modelId: id });
    onConfigChange(updated);
    setShowModelPicker(false);
  };

  return (
    <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs">
      <div className="relative">
        <button
          onClick={() => setShowModelPicker(!showModelPicker)}
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 hover:bg-muted transition-colors"
        >
          <span className="font-medium">{provider?.name || "Provider"}</span>
          <span className="text-foreground/50">/</span>
          <span>{currentModel?.name || config.modelId}</span>
          <ChevronDown size={10} />
        </button>
        {showModelPicker && (
          <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border bg-card shadow-lg">
            <div className="border-b p-2">
              <div className="mb-1.5 text-[10px] font-medium uppercase text-foreground/40">Provider</div>
              <div className="flex gap-1">
                {PROVIDERS.filter((p) => p.id !== "custom").map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`rounded px-2 py-1 text-xs transition-colors ${
                      config.providerId === p.id ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2">
              <div className="mb-1.5 text-[10px] font-medium uppercase text-foreground/40">Model</div>
              <div className="space-y-0.5">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-xs transition-colors ${
                      config.modelId === m.id ? "bg-primary/15 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="font-medium">{m.name}</span>
                    <div className="flex items-center gap-1">
                      {m.thinking && <Brain size={9} className="text-info" />}
                      {m.tools && <Wrench size={9} className="text-warning" />}
                      {m.streaming && <Sparkles size={9} className="text-success" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-border" />

      <button
        onClick={() => toggle("thinkingEnabled")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
          config.thinkingEnabled && currentModel?.thinking ? "bg-info/15 text-info" : "text-foreground/30 hover:bg-muted"
        }`}
        title={currentModel?.thinking ? "Toggle thinking/reasoning" : "Model doesn't support thinking"}
      >
        <Brain size={12} />
        <span>Reason</span>
      </button>

      <button
        onClick={() => toggle("toolsEnabled")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
          config.toolsEnabled && currentModel?.tools ? "bg-warning/15 text-warning" : "text-foreground/30 hover:bg-muted"
        }`}
        title={currentModel?.tools ? "Toggle function calling" : "Model doesn't support tools"}
      >
        <Wrench size={12} />
        <span>Tools</span>
      </button>

      <button
        onClick={() => toggle("streamingEnabled")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 transition-colors ${
          config.streamingEnabled ? "bg-success/15 text-success" : "text-foreground/30 hover:bg-muted"
        }`}
        title="Toggle streaming"
      >
        <Sparkles size={12} />
        <span>Stream</span>
      </button>

      <div className="flex-1" />

      {context && (
        <div className="flex items-center gap-2 text-foreground/40">
          <div className="flex items-center gap-1.5">
            <Database size={10} />
            <span>{context.percent}%</span>
            <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${contextColor}`} style={{ width: `${context.percent}%` }} />
            </div>
          </div>
          {tokens && tokens.cached > 0 && (
            <span className="text-success">cache {tokens.cacheSavings}</span>
          )}
        </div>
      )}
    </div>
  );
}

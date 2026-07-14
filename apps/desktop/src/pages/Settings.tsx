import { Badge, Card } from "@project/ui";
import { Check, Cpu, Eye, EyeOff, Info, Key, Moon, Palette, Plus, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { secrets as secretsApi } from "../api";
import { APP_VERSION } from "../lib/app-version";
import { BRAND_COPYRIGHT, BRAND_NAME, BRAND_URL, ORG_NAME, ORG_URL } from "../lib/branding";
import {
  type ChatConfig,
  getAvailableModels,
  getChatConfig,
  isValidBaseUrl,
  loadApiKey,
  PROVIDERS,
  saveChatConfig,
} from "../lib/chat";
import {
  applyMode,
  applyTheme,
  getPresetColor,
  getStoredMode,
  getStoredThemeId,
  THEME_PRESETS,
  type ThemeMode,
} from "../lib/theme";

type SettingsSection = "appearance" | "ai-provider" | "about";

export function SettingsPage() {
  const [activeId, setActiveId] = useState(getStoredThemeId());
  const [mode, setMode] = useState<ThemeMode>(getStoredMode());
  const [section, setSection] = useState<SettingsSection>("appearance");
  const [chatConfig, setChatConfigState] = useState<ChatConfig>(getChatConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [customModelId, setCustomModelId] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [secretsBackend, setSecretsBackend] = useState("");

  useEffect(() => {
    loadApiKey().then(() => setChatConfigState(getChatConfig()));
    secretsApi.backend().then((b) => setSecretsBackend(b || ""));
  }, []);

  const select = (id: string) => {
    setActiveId(id);
    applyTheme(id);
  };

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
  };

  const updateChat = (partial: Partial<ChatConfig>) => {
    const updated = saveChatConfig(partial);
    setChatConfigState(updated);
  };

  const availableModels = getAvailableModels(chatConfig);
  const currentProvider = PROVIDERS.find((p) => p.id === chatConfig.providerId);

  const addCustomModel = () => {
    if (!customModelId.trim()) return;
    const provider = PROVIDERS.find((p) => p.id === "custom");
    if (provider) {
      provider.models.push({
        id: customModelId,
        name: customModelName || customModelId,
        thinking: false,
        streaming: true,
        tools: false,
      });
      updateChat({ modelId: customModelId });
      setCustomModelId("");
      setCustomModelName("");
    }
  };

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
    { id: "ai-provider", label: "AI Provider", icon: <Cpu size={16} /> },
    { id: "about", label: "About", icon: <Info size={16} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6">
      <div className="w-48 flex-shrink-0 space-y-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
              section === s.id ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {section === "appearance" && (
          <>
            <p className="text-sm text-muted-foreground">Customize the look and feel of {BRAND_NAME}.</p>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Mode</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Switch between light and dark appearance.</p>
                </div>
                <button
                  onClick={toggleMode}
                  className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                  {mode === "dark" ? "Light" : "Dark"}
                </button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-base font-semibold">Accent Color</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a primary accent color for the interface.</p>
              <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-12">
                {THEME_PRESETS.map((preset) => {
                  const color = getPresetColor(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => select(preset.id)}
                      className="group flex flex-col items-center gap-2 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                      title={preset.label}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full transition-all"
                        style={{
                          backgroundColor: color,
                          boxShadow: activeId === preset.id ? `0 0 0 2px var(--card), 0 0 0 4px ${color}` : "none",
                        }}
                      >
                        {activeId === preset.id && <Check size={14} className="text-background" strokeWidth={3} />}
                      </div>
                      <span className="text-xs text-muted-foreground">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {section === "ai-provider" && (
          <>
            <p className="text-sm text-muted-foreground">Configure the AI backend for the Agent Chat.</p>

            <Card className="p-6 space-y-3">
              <div>
                <h2 className="text-base font-semibold">Provider</h2>
                <p className="mt-1 text-sm text-muted-foreground">Select the AI provider for chat responses.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const updated = saveChatConfig({
                          providerId: p.id,
                          baseUrl: p.id === "custom" ? chatConfig.baseUrl : "",
                          modelId: p.models[0]?.id || chatConfig.modelId,
                        });
                        setChatConfigState(updated);
                      }}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                        chatConfig.providerId === p.id
                          ? "border-primary bg-muted text-foreground"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {(currentProvider?.apiKeyRequired || chatConfig.providerId === "custom") && (
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <Key size={16} /> API Key
                  </h2>
                  <div className="mt-2 flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={chatConfig.apiKey}
                        onChange={(e) => updateChat({ apiKey: e.target.value })}
                        placeholder="Enter your API key..."
                        className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        aria-label={showApiKey ? "Hide API key" : "Show API key"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {secretsBackend === "basic_text" && (
                    <p className="mt-1 text-xs text-warning-foreground" data-testid="keyring-warning">
                      No system keyring detected — the key is stored obfuscated, not encrypted. Unlock GNOME
                      Keyring/KWallet for real encryption.
                    </p>
                  )}
                  {chatConfig.providerId.startsWith("zai") && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Get your API key from <span className="text-primary">z.ai</span>
                    </p>
                  )}
                  {chatConfig.providerId === "openai" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Get your API key from <span className="text-primary">platform.openai.com</span>
                    </p>
                  )}
                </div>
              )}

              {chatConfig.providerId === "custom" && (
                <div>
                  <h2 className="text-base font-semibold">Base URL</h2>
                  <input
                    type="text"
                    value={chatConfig.baseUrl}
                    onChange={(e) => updateChat({ baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1/"
                    className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                  />
                  {!isValidBaseUrl(chatConfig.baseUrl) && (
                    <p className="mt-1 text-xs text-destructive">
                      Only https:// (or http://localhost) endpoints are allowed.
                    </p>
                  )}
                </div>
              )}

              <div>
                <h2 className="text-base font-semibold">Model</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose the model for generating responses.</p>
                <div className="mt-3 space-y-1.5">
                  {availableModels.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => updateChat({ modelId: m.id })}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                        chatConfig.modelId === m.id
                          ? "border-primary bg-muted text-foreground"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span>{m.name}</span>
                      <div className="flex gap-1">
                        {m.thinking && <Badge variant="primary">thinking</Badge>}
                        {m.streaming && <Badge variant="success">stream</Badge>}
                        {m.tools && <Badge variant="info">tools</Badge>}
                      </div>
                    </button>
                  ))}
                </div>

                {chatConfig.providerId === "custom" && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customModelId}
                      onChange={(e) => setCustomModelId(e.target.value)}
                      placeholder="Model ID"
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      type="text"
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      placeholder="Display name"
                      className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button onClick={addCustomModel} aria-label="Add custom model" className="btn-primary text-xs">
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {currentProvider?.models.find((m) => m.id === chatConfig.modelId)?.thinking && (
                <div>
                  <h2 className="text-base font-semibold">Thinking Mode</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Enable extended reasoning for complex problems.</p>
                  <button
                    onClick={() => updateChat({ thinkingEnabled: !chatConfig.thinkingEnabled })}
                    className={`mt-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      chatConfig.thinkingEnabled ? "bg-muted text-foreground" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {chatConfig.thinkingEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
              )}

              <div>
                <h2 className="text-base font-semibold">Parameters</h2>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Max Tokens</label>
                    <input
                      type="number"
                      value={chatConfig.maxTokens}
                      onChange={(e) => updateChat({ maxTokens: parseInt(e.target.value, 10) || 4096 })}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={chatConfig.temperature}
                      onChange={(e) => updateChat({ temperature: parseFloat(e.target.value) || 0.7 })}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold">System Prompt</h2>
                <textarea
                  value={chatConfig.systemPrompt}
                  onChange={(e) => updateChat({ systemPrompt: e.target.value })}
                  rows={8}
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring resize-y"
                />
              </div>
            </Card>
          </>
        )}

        {section === "about" && (
          <>
            <p className="text-sm text-muted-foreground">{BRAND_NAME} system information.</p>
            <Card className="p-6">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Version</span>
                  <span className="font-mono">{APP_VERSION}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stack</span>
                  <span className="font-mono">Electron + React + Vite + TW4</span>
                </div>
                <div className="flex justify-between">
                  <span>License</span>
                  <span className="font-mono">Private</span>
                </div>
                <div className="flex justify-between">
                  <span>Organization</span>
                  <a href={ORG_URL} target="_blank" rel="noopener" className="font-mono text-primary hover:underline">
                    {ORG_NAME}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span>Website</span>
                  <a href={BRAND_URL} target="_blank" rel="noopener" className="font-mono text-primary hover:underline">
                    {BRAND_URL}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span>AI Backend</span>
                  <span className="font-mono">{currentProvider?.name || "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model</span>
                  <span className="font-mono">{chatConfig.modelId}</span>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{BRAND_COPYRIGHT}</div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

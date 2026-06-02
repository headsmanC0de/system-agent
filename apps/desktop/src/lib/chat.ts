export interface ChatProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyRequired: boolean;
  models: ChatModel[];
}

export interface ChatModel {
  id: string;
  name: string;
  thinking: boolean;
  streaming: boolean;
  tools: boolean;
}

export interface ChatConfig {
  providerId: string;
  modelId: string;
  apiKey: string;
  baseUrl: string;
  thinkingEnabled: boolean;
  toolsEnabled: boolean;
  streamingEnabled: boolean;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export const PROVIDERS: ChatProvider[] = [
  {
    id: "zai",
    name: "Z.AI",
    baseUrl: "https://api.z.ai/api/coding/paas/v4/",
    apiKeyRequired: true,
    models: [
      { id: "glm-5.1", name: "GLM-5.1", thinking: true, streaming: true, tools: true },
      { id: "glm-5-turbo", name: "GLM-5-Turbo", thinking: true, streaming: true, tools: true },
      { id: "glm-4.7", name: "GLM-4.7", thinking: true, streaming: true, tools: true },
      { id: "glm-4.5-air", name: "GLM-4.5-Air", thinking: false, streaming: true, tools: true },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/",
    apiKeyRequired: true,
    models: [
      { id: "gpt-4o", name: "GPT-4o", thinking: false, streaming: true, tools: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", thinking: false, streaming: true, tools: true },
      { id: "o3", name: "o3", thinking: true, streaming: true, tools: true },
      { id: "o4-mini", name: "o4-mini", thinking: true, streaming: true, tools: true },
    ],
  },
  {
    id: "ollama",
    name: "Ollama",
    baseUrl: "http://localhost:11434/v1/",
    apiKeyRequired: false,
    models: [
      { id: "llama3.1:8b", name: "Llama 3.1 8B", thinking: false, streaming: true, tools: true },
      { id: "llama3.1:70b", name: "Llama 3.1 70B", thinking: false, streaming: true, tools: true },
      { id: "codellama:34b", name: "Code Llama 34B", thinking: false, streaming: true, tools: false },
      { id: "mistral:7b", name: "Mistral 7B", thinking: false, streaming: true, tools: true },
    ],
  },
  {
    id: "tesseract",
    name: "Tesseract MoE LLM",
    baseUrl: "http://localhost:8080/v1/",
    apiKeyRequired: false,
    models: [{ id: "tesseract-moe", name: "Tesseract MoE", thinking: true, streaming: true, tools: true }],
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    baseUrl: "",
    apiKeyRequired: false,
    models: [],
  },
];

const STORAGE_KEY = "lh-chat-config";

const DEFAULT_CONFIG: ChatConfig = {
  providerId: "zai",
  modelId: "glm-5.1",
  apiKey: "",
  baseUrl: "",
  thinkingEnabled: true,
  toolsEnabled: true,
  streamingEnabled: true,
  systemPrompt: `You are a Linux system administration assistant running on an Arch Linux workstation.
You help users diagnose and solve system problems. You have deep knowledge of:
- Arch Linux, pacman, systemd, journalctl, btrfs, snapper
- NVIDIA GPU management, sensors, power management
- OpenRGB, asusctl, KDE Plasma, PipeWire/WirePlumber
- Network, Bluetooth, USB debugging
- Zram, swap, memory management
- Kernel modules, boot parameters, initramfs

Give concise, actionable answers. When suggesting commands, explain what they do.
If a command needs sudo, mention it. Prefer safe commands first.`,
  maxTokens: 4096,
  temperature: 0.7,
};

export function getChatConfig(): ChatConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveChatConfig(config: Partial<ChatConfig>): ChatConfig {
  const current = getChatConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function getProvider(id: string): ChatProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getEffectiveBaseUrl(config: ChatConfig): string {
  if (config.baseUrl) return config.baseUrl;
  const provider = getProvider(config.providerId);
  return provider?.baseUrl || "";
}

export function getAvailableModels(config: ChatConfig): ChatModel[] {
  const provider = getProvider(config.providerId);
  return provider?.models || [];
}

export function buildRequestBody(cfg: ChatConfig, apiMessages: Record<string, unknown>[]): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: cfg.modelId,
    messages: apiMessages,
    max_tokens: cfg.maxTokens,
    temperature: cfg.temperature,
    stream: cfg.streamingEnabled,
  };

  if (cfg.providerId === "zai" && cfg.thinkingEnabled) {
    body.thinking = { type: "enabled", clear_thinking: false };
  }

  if (cfg.toolsEnabled && cfg.providerId === "zai") {
    body.tools = SYSTEM_TOOLS;
    body.tool_choice = "auto";
    body.tool_stream = cfg.streamingEnabled;
  }

  return body;
}

export interface ToolCallResult {
  tool_call_id: string;
  name: string;
  arguments: string;
  result: string;
}

export const SYSTEM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_system_info",
      description:
        "Get system overview: CPU, memory, uptime, kernel version, OS name. Use this when user asks about system status.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_gpu_status",
      description:
        "Get NVIDIA GPU status: temperature, utilization, fan speed, VRAM usage, power draw. Use when user asks about GPU.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_disk_usage",
      description:
        "Get disk usage information: mounted filesystems, total/used/available space, mount points. Use when user asks about disks or storage.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_service_status",
      description:
        "Get systemd service status. Use when user asks about services, daemons, or whether something is running.",
      parameters: {
        type: "object",
        properties: {
          service: { type: "string", description: "Service name, e.g. 'nginx', 'docker', 'NetworkManager'" },
        },
        required: ["service"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_network_info",
      description:
        "Get network information: interfaces, IP addresses, active connections, open ports. Use when user asks about networking.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_command",
      description:
        "Run a shell command and return its output. Use for diagnostics, reading config files, checking logs. DANGEROUS commands (rm, mkfs, dd, format) are blocked.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to run, e.g. 'journalctl -u nginx --no-pager -n 20'",
          },
          reason: { type: "string", description: "Why you are running this command" },
        },
        required: ["command", "reason"],
      },
    },
  },
];

export async function executeToolCall(name: string, args: Record<string, unknown>): Promise<string> {
  const api = await import("../api");

  switch (name) {
    case "get_system_info": {
      const overview = await api.system.overview();
      return JSON.stringify(overview, null, 2);
    }
    case "get_gpu_status": {
      const gpu = await api.system.gpu();
      return JSON.stringify(gpu, null, 2);
    }
    case "get_disk_usage": {
      const disks = await api.system.disk();
      return JSON.stringify(disks, null, 2);
    }
    case "get_service_status": {
      const service = String(args.service || "");
      const services = await api.system.services();
      const found = services.find(
        (s) => s.unit.toLowerCase() === service.toLowerCase() || s.unit.toLowerCase().includes(service.toLowerCase()),
      );
      return found
        ? JSON.stringify(found, null, 2)
        : `Service "${service}" not found. Use get_services to list all services.`;
    }
    case "get_network_info": {
      const net = await api.system.network();
      return JSON.stringify(net, null, 2);
    }
    case "run_command": {
      const rawCmd = String(args.command || "").trim();
      const ALLOWED_PREFIXES = [
        "journalctl",
        "systemctl status",
        "systemctl list",
        "cat /proc/",
        "free",
        "df",
        "uptime",
        "whoami",
        "hostname",
        "uname",
        "ls ",
        "ps ",
        "top -bn1",
        "nvidia-smi",
        "sensors",
        "ip addr",
        "ip link",
        "ip route",
        "ss ",
        "ping ",
        "pacman -Q",
        "pacman -Si",
        "which ",
        "echo ",
      ];
      const blocked =
        /\b(rm\s|mkfs|dd\s|format|chmod|chown|curl |wget |nc |ncat|bash |sh |python |node |crontab|shutdown|reboot|init\s|sudo |su )\b/i;
      if (blocked.test(rawCmd)) {
        return `BLOCKED: Command contains restricted operations. Run manually in terminal if needed.`;
      }
      const allowed = ALLOWED_PREFIXES.some((p) => rawCmd.startsWith(p));
      if (!allowed) {
        return `BLOCKED: Command not in allowlist. Allowed: ${ALLOWED_PREFIXES.slice(0, 8).join(", ")}...`;
      }
      try {
        const output = await api.system.journal(50);
        return `Note: Direct command execution is limited in this environment. Here are recent log entries instead:\n${output}`;
      } catch {
        return `Failed to execute: ${rawCmd}. This command may require sudo or may not exist in browser/mock mode.`;
      }
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

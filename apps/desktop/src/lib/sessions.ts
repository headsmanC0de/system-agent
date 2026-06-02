import type { ChatMessage } from "../types";

export interface ChatSession {
  id: string;
  name: string;
  topicId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  tokenStats: SessionTokenStats;
}

export interface ChatTopic {
  id: string;
  name: string;
  systemPrompt?: string;
  createdAt: number;
}

export interface SessionTokenStats {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCachedTokens: number;
  contextWindowSize: number;
  lastMessageTokens: number;
}

const TOPICS_KEY = "lh-chat-topics";
const SESSIONS_KEY = "lh-chat-sessions";
const ACTIVE_SESSION_KEY = "lh-chat-active-session";
const CONTEXT_WINDOW = 128000;

export function getTopics(): ChatTopic[] {
  try {
    const stored = localStorage.getItem(TOPICS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [DEFAULT_TOPIC];
}

export function saveTopics(topics: ChatTopic[]): void {
  localStorage.setItem(TOPICS_KEY, JSON.stringify(topics));
}

export function createTopic(name: string, systemPrompt?: string): ChatTopic {
  const topic: ChatTopic = {
    id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    systemPrompt,
    createdAt: Date.now(),
  };
  const topics = getTopics();
  topics.push(topic);
  saveTopics(topics);
  return topic;
}

export function updateTopic(id: string, updates: Partial<Pick<ChatTopic, "name" | "systemPrompt">>): void {
  const topics = getTopics();
  const idx = topics.findIndex((t) => t.id === id);
  if (idx >= 0) {
    topics[idx] = { ...topics[idx], ...updates };
    saveTopics(topics);
  }
}

export function deleteTopic(id: string): void {
  const topics = getTopics().filter((t) => t.id !== id);
  saveTopics(topics);
  const sessions = getSessions().filter((s) => s.topicId !== id);
  saveSessions(sessions);
}

export function getSessions(): ChatSession[] {
  try {
    const stored = localStorage.getItem(SESSIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function saveSessions(sessions: ChatSession[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSessionsByTopic(topicId: string): ChatSession[] {
  return getSessions().filter((s) => s.topicId === topicId);
}

export function createSession(topicId: string, name?: string): ChatSession {
  const _topic = getTopics().find((t) => t.id === topicId);
  const session: ChatSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name || "New chat",
    topicId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tokenStats: {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCachedTokens: 0,
      contextWindowSize: CONTEXT_WINDOW,
      lastMessageTokens: 0,
    },
  };
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
  return session;
}

export function updateSession(
  id: string,
  updates: Partial<Pick<ChatSession, "name" | "messages" | "tokenStats">>,
): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx >= 0) {
    sessions[idx] = { ...sessions[idx], ...updates, updatedAt: Date.now() };
    saveSessions(sessions);
  }
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  saveSessions(sessions);
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_SESSION_KEY);
}

export function setActiveSessionId(id: string): void {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}

export function calculateContextUsage(session: ChatSession): { used: number; total: number; percent: number } {
  let tokenCount = 0;
  for (const msg of session.messages) {
    tokenCount += Math.ceil(msg.content.length / 4);
    if (msg.reasoningContent) tokenCount += Math.ceil(msg.reasoningContent.length / 4);
    if (msg.toolCalls) {
      for (const tc of msg.toolCalls) {
        tokenCount += Math.ceil(tc.arguments.length / 4) + Math.ceil(tc.result.length / 4);
      }
    }
    if (msg.tokenUsage) {
      tokenCount = msg.tokenUsage.promptTokens + msg.tokenUsage.completionTokens;
    }
  }
  const total = session.tokenStats.contextWindowSize;
  return { used: tokenCount, total, percent: Math.min(100, Math.round((tokenCount / total) * 100)) };
}

export function getSessionTokenSummary(session: ChatSession): {
  prompt: number;
  completion: number;
  cached: number;
  cacheSavings: string;
} {
  let prompt = 0;
  let completion = 0;
  let cached = 0;
  for (const msg of session.messages) {
    if (msg.tokenUsage) {
      prompt += msg.tokenUsage.promptTokens;
      completion += msg.tokenUsage.completionTokens;
      cached += msg.tokenUsage.cachedTokens;
    }
  }
  const savings = prompt > 0 ? Math.round((cached / prompt) * 100) : 0;
  return { prompt, completion, cached, cacheSavings: `${savings}%` };
}

export const DEFAULT_TOPIC: ChatTopic = {
  id: "topic-default",
  name: "General",
  createdAt: Date.now(),
};

export const CONTEXT_COMPRESS_THRESHOLD = 75;

export function needsCompression(session: ChatSession): boolean {
  const { percent } = calculateContextUsage(session);
  return percent >= CONTEXT_COMPRESS_THRESHOLD;
}

export function compressSession(session: ChatSession): {
  compressed: ChatSession;
  continuation: ChatSession;
} {
  const summaryParts: string[] = [];
  for (const msg of session.messages) {
    if (msg.role === "user") summaryParts.push(`User: ${msg.content}`);
    else if (msg.role === "assistant") summaryParts.push(`Assistant: ${msg.content.slice(0, 300)}`);
    else if (msg.role === "tool") summaryParts.push(`Tool(${msg.content.slice(0, 100)})`);
  }

  const compressedSummary = summaryParts.join("\n");

  const compressed: ChatSession = {
    ...session,
    id: `${session.id}-archived`,
    name: `${session.name} (archived)`,
    messages: [
      {
        id: `${session.id}-summary`,
        role: "assistant",
        content: `[Compressed context from previous conversation]\n\n${compressedSummary}`,
        timestamp: Date.now(),
      },
    ],
    updatedAt: Date.now(),
  };

  const continuation: ChatSession = {
    ...session,
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${session.name} (cont.)`,
    messages: [
      {
        id: `summary-${Date.now()}`,
        role: "assistant",
        content: `Continuing from previous context. Summary:\n\n${compressedSummary.slice(0, 2000)}`,
        timestamp: Date.now(),
      },
    ],
    tokenStats: {
      ...session.tokenStats,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalCachedTokens: 0,
    },
    updatedAt: Date.now(),
  };

  return { compressed, continuation };
}

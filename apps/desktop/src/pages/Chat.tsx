import type { ChatMessage, ToolCallInfo } from "@project/types";
import { Bot, Brain, Cpu, Loader2, Send, Settings2, User, Wrench } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatToolbar } from "../components/ChatToolbar";
import { SessionSidebar } from "../components/SessionSidebar";
import { BRAND_NAME } from "../lib/branding";
import type { ChatConfig } from "../lib/chat";
import {
  buildRequestBody,
  executeToolCall,
  getChatConfig,
  getEffectiveBaseUrl,
  getProvider,
  isValidBaseUrl,
  loadApiKey,
} from "../lib/chat";
import type { ChatSession, ChatTopic } from "../lib/sessions";
import {
  compressSession,
  createSession,
  createTopic,
  DEFAULT_TOPIC,
  deleteSession,
  deleteTopic,
  getActiveSessionId,
  getSessions,
  getTopics,
  needsCompression,
  setActiveSessionId,
  updateSession,
  updateTopic,
} from "../lib/sessions";
import { parseSSEStream } from "../lib/sse";

export function ChatPage() {
  const [topics, setTopics] = useState<ChatTopic[]>([DEFAULT_TOPIC]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionIdState] = useState<string | null>(null);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set(["topic-default"]));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [streamingToolCalls, setStreamingToolCalls] = useState<ToolCallInfo[]>([]);
  const [showThinking, setShowThinking] = useState<Record<string, boolean>>({});
  const [showToolCalls, setShowToolCalls] = useState<Record<string, boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession?.messages || [];

  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const config = getChatConfig();
  const provider = getProvider(config.providerId);
  const isConfigured = !!(getEffectiveBaseUrl(config) && (provider && !provider.apiKeyRequired ? true : config.apiKey));

  const [, setApiKeyReady] = useState(false);

  useEffect(() => {
    setTopics(getTopics());
    setSessions(getSessions());
    const active = getActiveSessionId();
    if (active) setActiveSessionIdState(active);
    loadApiKey().then(() => setApiKeyReady(true));
  }, []);

  useEffect(() => {
    if (activeSessionId) setActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  const toggleThinking = (id: string) => setShowThinking((p) => ({ ...p, [id]: !p[id] }));
  const toggleToolCalls = (id: string) => setShowToolCalls((p) => ({ ...p, [id]: !p[id] }));

  const handleSelectSession = (id: string) => setActiveSessionIdState(id);

  const handleCreateSession = (topicId: string) => {
    const session = createSession(topicId);
    const updated = getSessions();
    setSessions(updated);
    setActiveSessionIdState(session.id);
    setExpandedTopics((prev) => new Set([...prev, topicId]));
  };

  const handleCreateTopic = () => {
    const name = prompt("Topic name:");
    if (!name?.trim()) return;
    const topic = createTopic(name.trim());
    setTopics(getTopics());
    setExpandedTopics((prev) => new Set([...prev, topic.id]));
    handleCreateSession(topic.id);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const updated = getSessions();
    setSessions(updated);
    if (activeSessionId === id) {
      const remaining = updated.filter((_s) => true);
      setActiveSessionIdState(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleDeleteTopic = (id: string) => {
    deleteTopic(id);
    setTopics(getTopics());
    setSessions(getSessions());
    const topicSessions = sessions.filter((s) => s.topicId === id);
    if (topicSessions.some((s) => s.id === activeSessionId)) {
      setActiveSessionIdState(null);
    }
  };

  const handleRenameSession = (id: string, name: string) => {
    updateSession(id, { name });
    setSessions(getSessions());
  };

  const handleRenameTopic = (id: string, name: string) => {
    updateTopic(id, { name });
    setTopics(getTopics());
  };

  const handleToggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    if (!activeSession) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };

    const updatedMessages = [...activeSession.messages, userMsg];
    const updatedSession: ChatSession = {
      ...activeSession,
      messages: updatedMessages,
      updatedAt: Date.now(),
      name: activeSession.messages.length === 0 ? input.slice(0, 40) : activeSession.name,
    };
    updateSession(updatedSession.id, { messages: updatedMessages, name: updatedSession.name });
    setSessions(getSessions());

    setInput("");
    setLoading(true);
    setStreamingContent("");
    setStreamingThinking("");
    setStreamingToolCalls([]);
    scrollToBottom();

    const cfg = getChatConfig();
    cfg.apiKey = await loadApiKey();
    const baseUrl = getEffectiveBaseUrl(cfg);

    if (!baseUrl || !isValidBaseUrl(baseUrl)) {
      const errMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: baseUrl
          ? "Invalid base URL: only https:// (or http://localhost) endpoints are allowed. Go to Settings → AI Provider."
          : "No provider configured. Go to Settings → AI Provider.",
        timestamp: Date.now(),
      };
      updateSession(updatedSession.id, { messages: [...updatedMessages, errMsg] });
      setSessions(getSessions());
      setLoading(false);
      return;
    }

    try {
      const topic = topics.find((t) => t.id === updatedSession.topicId);
      const topicPrompt = topic?.systemPrompt;
      const effectiveSystemPrompt = topicPrompt || cfg.systemPrompt;

      await runAgenticLoop(cfg, baseUrl, updatedSession, effectiveSystemPrompt);
    } catch (e) {
      const errMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Error: ${e instanceof Error ? e.message : "Unknown error"}. Check Settings → AI Provider.`,
        timestamp: Date.now(),
      };
      const current = getSessions().find((s) => s.id === updatedSession.id);
      if (current) {
        updateSession(current.id, { messages: [...current.messages, errMsg] });
        setSessions(getSessions());
      }
    } finally {
      setLoading(false);
      setStreamingContent("");
      setStreamingThinking("");
      setStreamingToolCalls([]);
      scrollToBottom();
    }
  }, [input, loading, activeSession, topics, scrollToBottom]);

  async function runAgenticLoop(
    cfg: ReturnType<typeof getChatConfig>,
    baseUrl: string,
    session: ChatSession,
    systemPrompt: string,
  ) {
    const MAX_TOOL_ROUNDS = 5;
    const currentSession = { ...session };

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const apiMessages = buildApiMessages(currentSession.messages, systemPrompt);
      const body = buildRequestBody(cfg, apiMessages);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

      const res = await fetch(`${baseUrl}chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`API error ${res.status}: ${errText.slice(0, 200)}`);
      }
      if (!res.body) throw new Error("No response body");

      const result = await parseSSEStream(res.body, {
        onThinking: (t) => {
          setStreamingThinking(t);
          scrollToBottom();
        },
        onContent: (c) => {
          setStreamingContent(c);
          scrollToBottom();
        },
        onToolCalls: (tcs) => {
          setStreamingToolCalls(tcs);
          scrollToBottom();
        },
      });

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-asst`,
        role: "assistant",
        content: result.content || "No response received.",
        timestamp: Date.now(),
        reasoningContent: result.thinking || undefined,
        tokenUsage: result.usage,
        toolCalls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
      };

      if (result.toolCalls.length === 0) {
        currentSession.messages = [...currentSession.messages, assistantMsg];
        updateSession(currentSession.id, { messages: currentSession.messages });
        setSessions(getSessions());
        return;
      }

      currentSession.messages = [...currentSession.messages, assistantMsg];
      updateSession(currentSession.id, { messages: currentSession.messages });
      setSessions(getSessions());

      for (const tc of result.toolCalls) {
        let toolResult: string;
        try {
          const args = JSON.parse(tc.arguments);
          toolResult = await executeToolCall(tc.name, args);
        } catch {
          toolResult = `Error executing tool ${tc.name}`;
        }

        const toolMsg: ChatMessage = {
          id: `${Date.now()}-tool-${tc.id}`,
          role: "tool",
          content: toolResult,
          timestamp: Date.now(),
        };
        currentSession.messages = [...currentSession.messages, toolMsg];
        updateSession(currentSession.id, { messages: currentSession.messages });
        setSessions(getSessions());
      }

      setStreamingContent("");
      setStreamingThinking("");
      setStreamingToolCalls([]);
    }
  }

  function buildApiMessages(msgs: ChatMessage[], systemPrompt: string): Record<string, unknown>[] {
    return [
      { role: "system", content: systemPrompt },
      ...msgs.slice(-30).map((m) => {
        const msg: Record<string, unknown> = { role: m.role, content: m.content };
        if (m.reasoningContent) msg.reasoning_content = m.reasoningContent;
        if (m.role === "tool" && m.id.includes("-tool-")) {
          msg.tool_call_id = m.id.split("-tool-")[1];
        }
        return msg;
      }),
    ];
  }

  const [chatConfig, setChatConfig] = useState<ChatConfig>(getChatConfig());

  useEffect(() => {
    if (activeSession && needsCompression(activeSession)) {
      const { compressed, continuation } = compressSession(activeSession);
      const allSessions = getSessions();
      const updated = allSessions.map((s) => {
        if (s.id === activeSession.id) return compressed;
        return s;
      });
      updated.push(continuation);
      const { saveSessions } = require("../lib/sessions");
      saveSessions(updated);
      setSessions(updated);
      setActiveSessionIdState(continuation.id);
    }
  }, [activeSession?.messages.length]);

  return (
    <div className="flex h-[calc(100vh-80px)]">
      <SessionSidebar
        topics={topics}
        sessions={sessions}
        activeSessionId={activeSessionId}
        expandedTopics={expandedTopics}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onCreateTopic={handleCreateTopic}
        onDeleteSession={handleDeleteSession}
        onDeleteTopic={handleDeleteTopic}
        onRenameSession={handleRenameSession}
        onRenameTopic={handleRenameTopic}
        onToggleTopic={handleToggleTopic}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <ChatToolbar config={chatConfig} session={activeSession} onConfigChange={setChatConfig} />
        {activeSession ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Bot size={14} />
                    </div>
                    <div className="max-w-[80%] rounded-xl bg-secondary px-3.5 py-2.5 text-sm text-foreground">
                      Hello! I'm the {BRAND_NAME} Agent. I can query your system directly — ask me to check services,
                      GPU, disks, or network status. What do you need?
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        m.role === "assistant"
                          ? "bg-primary/15 text-primary"
                          : m.role === "tool"
                            ? "bg-info/15 text-info"
                            : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <Bot size={14} />
                      ) : m.role === "tool" ? (
                        <Cpu size={14} />
                      ) : (
                        <User size={14} />
                      )}
                    </div>
                    <div className="max-w-[80%] space-y-1.5">
                      {m.reasoningContent && (
                        <div>
                          <button
                            onClick={() => toggleThinking(m.id)}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-muted transition-colors"
                          >
                            <Brain size={12} />
                            {showThinking[m.id] ? "Hide reasoning" : "Show reasoning"}
                          </button>
                          {showThinking[m.id] && (
                            <div className="mt-1 rounded-lg border border-border/50 bg-muted/50 p-3 text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed">
                              {m.reasoningContent}
                            </div>
                          )}
                        </div>
                      )}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div>
                          <button
                            onClick={() => toggleToolCalls(m.id)}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-muted transition-colors"
                          >
                            <Wrench size={12} />
                            {showToolCalls[m.id] ? "Hide tool calls" : `Tools (${m.toolCalls.length})`}
                          </button>
                          {showToolCalls[m.id] && (
                            <div className="mt-1 space-y-1">
                              {m.toolCalls.map((tc) => (
                                <div key={tc.id} className="rounded border border-info/30 bg-info/5 p-2 text-xs">
                                  <div className="font-medium text-info">
                                    {tc.name}({tc.arguments.slice(0, 100)})
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary/15 text-foreground"
                            : m.role === "tool"
                              ? "bg-info/10 border border-info/20 text-foreground text-xs"
                              : "bg-secondary text-foreground"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                      {m.tokenUsage && (
                        <div className="flex items-center gap-3 text-[10px] text-foreground/40">
                          <span>{m.tokenUsage.promptTokens} in</span>
                          <span>{m.tokenUsage.completionTokens} out</span>
                          {m.tokenUsage.cachedTokens > 0 && (
                            <span className="text-success">{m.tokenUsage.cachedTokens} cached</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(streamingThinking || streamingContent || streamingToolCalls.length > 0) && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Bot size={14} />
                    </div>
                    <div className="max-w-[80%] space-y-1.5">
                      {streamingToolCalls.length > 0 &&
                        streamingToolCalls.map((tc, i) => (
                          <div key={i} className="rounded-lg border border-primary/20 bg-primary/5 p-2 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Wrench size={12} className="text-primary" />
                              <span className="text-primary font-medium">Calling: {tc.name || "..."}</span>
                            </div>
                            {tc.arguments && (
                              <div className="mt-1 font-mono truncate text-foreground/60">
                                {tc.arguments.slice(0, 150)}
                              </div>
                            )}
                          </div>
                        ))}
                      {streamingThinking && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                          <div className="mb-1 flex items-center gap-1.5">
                            <Brain size={12} className="text-primary" />
                            <span className="font-medium text-primary">Thinking...</span>
                          </div>
                          {streamingThinking}
                        </div>
                      )}
                      {streamingContent && (
                        <div className="rounded-xl bg-secondary px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
                          <div className="whitespace-pre-wrap">{streamingContent}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {loading && !streamingContent && !streamingThinking && streamingToolCalls.length === 0 && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Bot size={14} />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" /> Connecting...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="flex gap-2 px-4 pb-3 pt-1">
              <input
                type="text"
                placeholder={isConfigured ? "Describe your problem..." : "Configure AI provider in Settings first..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                disabled={loading || !isConfigured}
                className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <button onClick={send} disabled={loading || !input.trim() || !isConfigured} className="btn-primary px-3">
                <Send size={16} />
              </button>
            </div>

            {!isConfigured && (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-1.5 text-xs text-warning-foreground">
                <Settings2 size={12} />
                <span>No AI provider configured. Go to Settings → AI Provider.</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            <div className="text-center space-y-2">
              <Bot size={32} className="mx-auto text-primary/40" />
              <p>Select a chat or create a new one</p>
              <button onClick={() => handleCreateSession("topic-default")} className="btn-primary px-4 py-1.5 text-xs">
                New chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

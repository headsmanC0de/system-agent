import type { ToolCallInfo } from "../types";

export interface StreamChunk {
  content?: string;
  reasoning_content?: string;
  tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
  finish_reason?: string;
}

export interface SSEUsage {
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
}

export interface SSEResult {
  content: string;
  thinking: string;
  toolCalls: ToolCallInfo[];
  usage?: SSEUsage;
}

export interface SSECallbacks {
  onContent?: (cumulative: string) => void;
  onThinking?: (cumulative: string) => void;
  onToolCalls?: (toolCalls: ToolCallInfo[]) => void;
}

export async function parseSSEStream(body: ReadableStream<Uint8Array>, cb: SSECallbacks = {}): Promise<SSEResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";
  let fullThinking = "";
  let buffer = "";
  const toolCallsMap = new Map<number, ToolCallInfo>();
  let usage: SSEUsage | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "data: [DONE]") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const chunk = JSON.parse(trimmed.slice(6)) as {
          choices?: { delta?: StreamChunk; finish_reason?: string }[];
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            prompt_tokens_details?: { cached_tokens?: number };
          };
        };

        if (chunk.usage) {
          usage = {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            cachedTokens: chunk.usage.prompt_tokens_details?.cached_tokens || 0,
          };
        }

        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.reasoning_content) {
          fullThinking += delta.reasoning_content;
          cb.onThinking?.(fullThinking);
        }
        if (delta.content) {
          fullContent += delta.content;
          cb.onContent?.(fullContent);
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (!toolCallsMap.has(tc.index)) {
              toolCallsMap.set(tc.index, { id: tc.id || "", name: "", arguments: "", result: "" });
            }
            const entry = toolCallsMap.get(tc.index)!;
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name = tc.function.name;
            if (tc.function?.arguments) entry.arguments += tc.function.arguments;
          }
          cb.onToolCalls?.(Array.from(toolCallsMap.values()));
        }
      } catch {
        // malformed event — skip it, keep the stream alive
      }
    }
  }

  return { content: fullContent, thinking: fullThinking, toolCalls: Array.from(toolCallsMap.values()), usage };
}

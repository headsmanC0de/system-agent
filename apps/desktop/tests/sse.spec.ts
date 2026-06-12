// Unit tests for the SSE stream parser (audit LH-081) — runs in the Playwright
// Node runner, no browser needed. Covers chunk-boundary splits, tool-call
// accumulation, usage extraction, [DONE], malformed events, and callbacks.
import { expect, test } from "@playwright/test";
import { parseSSEStream } from "../src/lib/sse";

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

const event = (delta: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  `data: ${JSON.stringify({ choices: [{ delta }], ...extra })}\n`;

test("happy path: content accumulates across events", async () => {
  const result = await parseSSEStream(streamOf(event({ content: "Hel" }), event({ content: "lo" }), "data: [DONE]\n"));
  expect(result.content).toBe("Hello");
  expect(result.thinking).toBe("");
  expect(result.toolCalls).toEqual([]);
  expect(result.usage).toBeUndefined();
});

test("an event split across chunk boundaries is reassembled", async () => {
  const full = event({ content: "split-safe" });
  const mid = Math.floor(full.length / 2);
  const result = await parseSSEStream(streamOf(full.slice(0, mid), full.slice(mid)));
  expect(result.content).toBe("split-safe");
});

test("multi-byte UTF-8 split across chunks survives (TextDecoder stream mode)", async () => {
  const bytes = new TextEncoder().encode(event({ content: "Привіт" }));
  const mid = 20; // lands inside the Cyrillic payload
  const result = await parseSSEStream(
    new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, mid));
        c.enqueue(bytes.slice(mid));
        c.close();
      },
    }),
  );
  expect(result.content).toBe("Привіт");
});

test("thinking (reasoning_content) accumulates separately from content", async () => {
  const result = await parseSSEStream(
    streamOf(event({ reasoning_content: "think " }), event({ reasoning_content: "hard" }), event({ content: "answer" })),
  );
  expect(result.thinking).toBe("think hard");
  expect(result.content).toBe("answer");
});

test("tool calls: id/name arrive once, arguments accumulate per index", async () => {
  const result = await parseSSEStream(
    streamOf(
      event({ tool_calls: [{ index: 0, id: "call_1", function: { name: "get_gpu_status", arguments: '{"a"' } }] }),
      event({ tool_calls: [{ index: 0, function: { arguments: ":1}" } }] }),
      event({ tool_calls: [{ index: 1, id: "call_2", function: { name: "run_command", arguments: "{}" } }] }),
    ),
  );
  expect(result.toolCalls).toEqual([
    { id: "call_1", name: "get_gpu_status", arguments: '{"a":1}', result: "" },
    { id: "call_2", name: "run_command", arguments: "{}", result: "" },
  ]);
});

test("usage is extracted including cached tokens", async () => {
  const result = await parseSSEStream(
    streamOf(
      event({ content: "x" }),
      `data: ${JSON.stringify({
        choices: [],
        usage: { prompt_tokens: 10, completion_tokens: 5, prompt_tokens_details: { cached_tokens: 7 } },
      })}\n`,
    ),
  );
  expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5, cachedTokens: 7 });
});

test("malformed JSON event is skipped without killing the stream", async () => {
  const result = await parseSSEStream(streamOf("data: {not-json\n", event({ content: "still alive" })));
  expect(result.content).toBe("still alive");
});

test("non-data lines, blank lines and CRLF are ignored/tolerated", async () => {
  const result = await parseSSEStream(streamOf(": comment\n\r\n", `data: {"choices":[{"delta":{"content":"crlf"}}]}\r\n`));
  expect(result.content).toBe("crlf");
});

test("callbacks fire with cumulative values", async () => {
  const seen: string[] = [];
  await parseSSEStream(streamOf(event({ content: "a" }), event({ content: "b" })), {
    onContent: (c) => seen.push(c),
  });
  expect(seen).toEqual(["a", "ab"]);
});

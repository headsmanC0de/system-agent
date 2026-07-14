import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import type { IpcErrorCode, IpcResponse } from "./channels.js";

type TraceContext = { channel: string; requestId: string };
type TelemetryLevel = "error" | "info" | "warn";
export type AppTelemetryEvent =
  | "child-gone"
  | "load-failed"
  | "preload-failed"
  | "renderer-gone"
  | "started"
  | "stopped"
  | "uncaught-exception"
  | "unhandled-rejection";

export type TelemetryRecord = {
  timestamp: string;
  level: TelemetryLevel;
  component: "app" | "ipc" | "process" | "repository";
  event: AppTelemetryEvent | "completed" | "failed";
  requestId?: string;
  channel?: string;
  operation?: string;
  durationMs: number;
  errorType?: string;
  errorCode?: string | number;
  detail?: string;
};

type TelemetrySink = (record: TelemetryRecord) => void;
const TRACE_ENV = "SYSTEM_AGENT_TRACE";
const TRACE_ENABLED_VALUE = "1";
const SLOW_OPERATION_MS = 500;
const LOG_DIRECTORY_MODE = 0o700;
const LOG_FILE_MODE = 0o600;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

function defaultSink(record: TelemetryRecord): void {
  if (!shouldPersist(record)) return;
  process.stderr.write(`${JSON.stringify(record)}\n`);
}

function shouldPersist(record: TelemetryRecord): boolean {
  return record.level !== "info" || process.env[TRACE_ENV] === TRACE_ENABLED_VALUE;
}

function errorFields(error: unknown): Pick<TelemetryRecord, "errorCode" | "errorType"> {
  if (!(error instanceof Error)) return { errorType: typeof error };
  const code =
    "code" in error && (typeof error.code === "string" || typeof error.code === "number") ? error.code : undefined;
  return { errorType: error.name, ...(code !== undefined && { errorCode: code }) };
}

export class StructuredTelemetry {
  readonly #context = new AsyncLocalStorage<TraceContext>();
  readonly #sinks: TelemetrySink[];

  constructor(sink: TelemetrySink = defaultSink) {
    this.#sinks = [sink];
  }

  addSink(sink: TelemetrySink): () => void {
    this.#sinks.push(sink);
    return () => {
      const index = this.#sinks.indexOf(sink);
      if (index >= 0) this.#sinks.splice(index, 1);
    };
  }

  runIpc<T>(channel: string, operation: () => T | Promise<T>): Promise<T> {
    const context = { channel, requestId: randomUUID() };
    return this.#context.run(context, () => this.#measure("ipc", channel, operation));
  }

  async runIpcResult<T>(channel: string, operation: () => T | Promise<T>): Promise<IpcResponse<T>> {
    const requestId = randomUUID();
    return this.#context.run({ channel, requestId }, async () => {
      try {
        const value = await this.#measure("ipc", channel, operation);
        return { ok: true, value, requestId };
      } catch (error) {
        const code = ipcErrorCode(error);
        return { ok: false, error: { code, retryable: code === "timeout" }, requestId };
      }
    });
  }

  runProcess<T>(operationName: string, operation: () => T | Promise<T>): Promise<T> {
    return this.#measure("process", operationName, operation);
  }

  runRepository<T>(operationName: string, operation: () => T | Promise<T>): Promise<T> {
    return this.#measure("repository", operationName, operation);
  }

  recordApp(event: AppTelemetryEvent, detail?: string | number): void {
    const failed = event.includes("failed") || event.includes("gone") || event.startsWith("un");
    const record: TelemetryRecord = {
      timestamp: new Date().toISOString(),
      level: failed ? "error" : "info",
      component: "app",
      event,
      durationMs: 0,
      ...(detail === undefined ? {} : { detail: String(detail) }),
    };
    for (const sink of this.#sinks) sink(record);
  }

  async #measure<T>(component: TelemetryRecord["component"], operationName: string, operation: () => T | Promise<T>) {
    const startedAt = performance.now();
    try {
      const result = await operation();
      this.#write(component, operationName, "completed", startedAt);
      return result;
    } catch (error) {
      this.#write(component, operationName, "failed", startedAt, error);
      throw error;
    }
  }

  #write(
    component: TelemetryRecord["component"],
    operationName: string,
    event: TelemetryRecord["event"],
    startedAt: number,
    error?: unknown,
  ): void {
    const context = this.#context.getStore();
    const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
    const record: TelemetryRecord = {
      timestamp: new Date().toISOString(),
      level: event === "failed" ? "error" : durationMs >= SLOW_OPERATION_MS ? "warn" : "info",
      component,
      event,
      ...(context && { requestId: context.requestId, channel: context.channel }),
      ...((component === "process" || component === "repository") && { operation: operationName }),
      durationMs,
      ...(error === undefined ? {} : errorFields(error)),
    };
    for (const sink of this.#sinks) sink(record);
  }
}

export const telemetry = new StructuredTelemetry();

export class IpcFault extends Error {
  readonly code: IpcErrorCode;

  constructor(code: IpcErrorCode) {
    super(code);
    this.name = "IpcFault";
    this.code = code;
  }
}

function ipcErrorCode(error: unknown): IpcErrorCode {
  if (error instanceof IpcFault) return error.code;
  if (error instanceof TypeError || error instanceof RangeError) return "invalid_argument";
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "ETIMEDOUT") return "timeout";
    if (error.code === "ENOENT") return "dependency_unavailable";
    if (typeof error.code === "string" && error.code.startsWith("SQLITE_")) return "persistence_failure";
  }
  return "internal";
}

export function installFileTelemetry(userDataPath: string): () => void {
  const directory = join(userDataPath, "logs");
  const path = join(directory, "main.jsonl");
  const rotatedPath = `${path}.1`;
  mkdirSync(directory, { recursive: true, mode: LOG_DIRECTORY_MODE });
  if (existsSync(path) && statSync(path).size >= MAX_LOG_BYTES) {
    rmSync(rotatedPath, { force: true });
    renameSync(path, rotatedPath);
  }
  const stream = createWriteStream(path, { flags: "a", mode: LOG_FILE_MODE });
  const removeSink = telemetry.addSink((record) => {
    if (shouldPersist(record)) stream.write(`${JSON.stringify(record)}\n`);
  });
  return () => {
    removeSink();
    stream.end();
  };
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { StructuredTelemetry } from "./telemetry.js";

type ExecutionOptions = { cwd?: string; maxBuffer: number; signal?: AbortSignal; timeout: number };
export type CommandExecutor = (
  executable: string,
  args: readonly string[],
  options: ExecutionOptions,
) => Promise<{ stdout: string }>;

export type CommandDescriptor = {
  operation: string;
  executable: string;
  args?: readonly string[];
  cwd?: string;
  timeoutMs?: number;
  maxBufferBytes?: number;
  allowedExitCodes?: readonly number[];
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BUFFER_BYTES = 1024 * 1024;
const DEFAULT_MAX_CONCURRENCY = 4;
const OPERATION_RE = /^[a-z][a-z0-9.-]+$/;
const executeFile = promisify(execFile) as unknown as CommandExecutor;

export class CommandRunner {
  readonly #telemetry: StructuredTelemetry;
  readonly #execute: CommandExecutor;
  readonly #maxConcurrency: number;
  #active = 0;
  readonly #waiting: Array<(release: () => void) => void> = [];

  constructor(
    telemetry: StructuredTelemetry,
    execute: CommandExecutor = executeFile,
    options: { maxConcurrency?: number } = {},
  ) {
    this.#telemetry = telemetry;
    this.#execute = execute;
    this.#maxConcurrency = options.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    if (!Number.isInteger(this.#maxConcurrency) || this.#maxConcurrency < 1) {
      throw new RangeError("maxConcurrency must be a positive integer");
    }
  }

  run(descriptor: CommandDescriptor): Promise<string> {
    if (!OPERATION_RE.test(descriptor.operation)) throw new TypeError("Invalid command operation ID");
    if (!descriptor.executable || descriptor.executable.includes("\0")) throw new TypeError("Invalid executable");
    return this.#runWithSlot(descriptor);
  }

  async #runWithSlot(descriptor: CommandDescriptor): Promise<string> {
    const release = await this.#acquire();
    try {
      return await this.#telemetry.runProcess(descriptor.operation, async () => {
        try {
          const { stdout } = await this.#execute(descriptor.executable, descriptor.args ?? [], {
            ...(descriptor.cwd && { cwd: descriptor.cwd }),
            ...(descriptor.signal && { signal: descriptor.signal }),
            timeout: descriptor.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            maxBuffer: descriptor.maxBufferBytes ?? DEFAULT_MAX_BUFFER_BYTES,
          });
          return stdout.trim();
        } catch (error) {
          const allowed =
            error !== null &&
            typeof error === "object" &&
            "code" in error &&
            typeof error.code === "number" &&
            descriptor.allowedExitCodes?.includes(error.code) &&
            "stdout" in error &&
            typeof error.stdout === "string";
          if (allowed) return error.stdout.trim();
          throw error;
        }
      });
    } finally {
      release();
    }
  }

  #acquire(): Promise<() => void> {
    if (this.#active < this.#maxConcurrency) {
      this.#active += 1;
      return Promise.resolve(() => this.#release());
    }
    return new Promise((resolve) => this.#waiting.push(resolve));
  }

  #release(): void {
    const next = this.#waiting.shift();
    if (next) {
      next(() => this.#release());
      return;
    }
    this.#active -= 1;
  }
}

import { expect, test } from "@playwright/test";
import { type CommandExecutor, CommandRunner } from "../src/main/command-runner";
import { StructuredTelemetry, type TelemetryRecord } from "../src/main/telemetry";

function harness(execute: CommandExecutor) {
  const records: TelemetryRecord[] = [];
  return { runner: new CommandRunner(new StructuredTelemetry((record) => records.push(record)), execute), records };
}

test("returns trimmed stdout and logs only the semantic operation", async () => {
  const { runner, records } = harness(async () => ({ stdout: " result \n" }));
  await expect(
    runner.run({ operation: "packages.list", executable: "private-binary", args: ["secret-argument"] }),
  ).resolves.toBe("result");
  expect(records[0]).toMatchObject({ component: "process", operation: "packages.list", event: "completed" });
  expect(JSON.stringify(records)).not.toContain("private-binary");
  expect(JSON.stringify(records)).not.toContain("secret-argument");
});

test("propagates ENOENT, timeout, and unexpected non-zero exits", async () => {
  for (const code of ["ENOENT", "ETIMEDOUT", 2] as const) {
    const failure = Object.assign(new Error("private stderr"), { code, stdout: "" });
    const { runner, records } = harness(async () => Promise.reject(failure));
    await expect(runner.run({ operation: "packages.query", executable: "tool" })).rejects.toBe(failure);
    expect(records[0]).toMatchObject({ event: "failed", errorCode: code });
    expect(JSON.stringify(records)).not.toContain("private stderr");
  }
});

test("accepts only explicitly declared no-match exit codes", async () => {
  const noMatches = Object.assign(new Error("no matches"), { code: 1, stdout: "" });
  const { runner } = harness(async () => Promise.reject(noMatches));
  await expect(
    runner.run({ operation: "packages.outdated", executable: "package-tool", allowedExitCodes: [1] }),
  ).resolves.toBe("");
});

test("rejects invalid operation IDs before process execution", async () => {
  let executed = false;
  const { runner } = harness(async () => {
    executed = true;
    return { stdout: "" };
  });
  expect(() => runner.run({ operation: "raw command", executable: "tool" })).toThrow("Invalid command operation ID");
  expect(executed).toBe(false);
});

test("forwards cancellation without exposing command details", async () => {
  const controller = new AbortController();
  const { runner } = harness(async (_executable, _args, options) => {
    expect(options.signal).toBe(controller.signal);
    controller.abort();
    throw Object.assign(new Error("aborted private command"), { code: "ABORT_ERR" });
  });
  await expect(
    runner.run({ operation: "packages.cancelable-query", executable: "tool", signal: controller.signal }),
  ).rejects.toMatchObject({ code: "ABORT_ERR" });
});

test("bounds concurrent child processes", async () => {
  let active = 0;
  let maximum = 0;
  const releases: Array<() => void> = [];
  const execute: CommandExecutor = async () => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise<void>((resolve) => releases.push(resolve));
    active -= 1;
    return { stdout: "done" };
  };
  const records: TelemetryRecord[] = [];
  const runner = new CommandRunner(new StructuredTelemetry((record) => records.push(record)), execute, {
    maxConcurrency: 1,
  });
  const first = runner.run({ operation: "test.first", executable: "tool" });
  const second = runner.run({ operation: "test.second", executable: "tool" });
  await expect.poll(() => releases.length).toBe(1);
  releases.shift()?.();
  await expect.poll(() => releases.length).toBe(1);
  releases.shift()?.();
  await expect(Promise.all([first, second])).resolves.toEqual(["done", "done"]);
  expect(maximum).toBe(1);
});

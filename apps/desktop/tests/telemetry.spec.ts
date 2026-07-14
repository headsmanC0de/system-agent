import { expect, test } from "@playwright/test";
import { StructuredTelemetry, type TelemetryRecord } from "../src/main/telemetry";

test("process spans inherit the IPC correlation ID without logging arguments", async () => {
  const records: TelemetryRecord[] = [];
  const telemetry = new StructuredTelemetry((record) => records.push(record));
  const result = await telemetry.runIpc("system:overview", () =>
    telemetry.runProcess("uname", async () => "Linux secret-argument"),
  );

  expect(result).toBe("Linux secret-argument");
  expect(records).toHaveLength(2);
  expect(records[0]).toMatchObject({ component: "process", event: "completed", operation: "uname" });
  expect(records[1]).toMatchObject({ component: "ipc", event: "completed", channel: "system:overview" });
  expect(records[0]?.requestId).toBe(records[1]?.requestId);
  expect(JSON.stringify(records)).not.toContain("secret-argument");
});

test("failed spans preserve the error while emitting safe error metadata", async () => {
  const records: TelemetryRecord[] = [];
  const telemetry = new StructuredTelemetry((record) => records.push(record));
  const failure = Object.assign(new Error("sensitive command output"), { code: "ETIMEDOUT" });

  await expect(
    telemetry.runIpc("system:overview", () => telemetry.runProcess("uname", async () => Promise.reject(failure))),
  ).rejects.toBe(failure);
  expect(records).toHaveLength(2);
  expect(records.every((record) => record.event === "failed" && record.level === "error")).toBe(true);
  expect(records[0]).toMatchObject({ errorType: "Error", errorCode: "ETIMEDOUT" });
  expect(JSON.stringify(records)).not.toContain("sensitive command output");
});

test("IPC result exposes only a safe code and the same correlation ID", async () => {
  const records: TelemetryRecord[] = [];
  const telemetry = new StructuredTelemetry((record) => records.push(record));
  const result = await telemetry.runIpcResult("system:overview", () =>
    telemetry.runProcess("uname", async () => {
      throw Object.assign(new Error("private output"), { code: "ETIMEDOUT" });
    }),
  );

  expect(result).toMatchObject({ ok: false, error: { code: "timeout", retryable: true } });
  expect(records.map((record) => record.requestId)).toEqual([result.requestId, result.requestId]);
  expect(JSON.stringify(result)).not.toContain("private output");
});

test("concurrent IPC operations retain isolated correlation contexts", async () => {
  const records: TelemetryRecord[] = [];
  const telemetry = new StructuredTelemetry((record) => records.push(record));
  const [first, second] = await Promise.all([
    telemetry.runIpcResult("system:overview", () => telemetry.runProcess("uname", async () => "first")),
    telemetry.runIpcResult("system:memory", () => telemetry.runProcess("free", async () => "second")),
  ]);

  expect(first.requestId).not.toBe(second.requestId);
  for (const record of records.filter((entry) => entry.channel === "system:overview")) {
    expect(record.requestId).toBe(first.requestId);
  }
  for (const record of records.filter((entry) => entry.channel === "system:memory")) {
    expect(record.requestId).toBe(second.requestId);
  }
});

test("repository spans are correlated and never record document values", async () => {
  const records: TelemetryRecord[] = [];
  const telemetry = new StructuredTelemetry((record) => records.push(record));
  const result = await telemetry.runIpcResult("docs:create", () =>
    telemetry.runRepository("docs.create", () => ({ title: "private title", content: "private content" })),
  );

  expect(result.ok).toBe(true);
  expect(records[0]).toMatchObject({ component: "repository", operation: "docs.create", event: "completed" });
  expect(records[0]?.requestId).toBe(result.requestId);
  expect(JSON.stringify(records)).not.toContain("private title");
  expect(JSON.stringify(records)).not.toContain("private content");
});

test("lifecycle records contain bounded metadata and no error bodies", () => {
  const records: TelemetryRecord[] = [];
  const telemetry = new StructuredTelemetry((record) => records.push(record));
  telemetry.recordApp("started", "runtime-version");
  telemetry.recordApp("load-failed", -3);
  telemetry.recordApp("uncaught-exception");
  telemetry.recordApp("stopped");

  expect(records.map((record) => record.event)).toEqual(["started", "load-failed", "uncaught-exception", "stopped"]);
  expect(records[1]).toMatchObject({ component: "app", level: "error", detail: "-3" });
  expect(JSON.stringify(records)).not.toContain("message");
});

import { expect, test } from "@playwright/test";
import { executeIfIdle } from "@project/hooks";

test("a slow polling task cannot overlap with its next tick", async () => {
  const lock = { current: false };
  let release: (() => void) | undefined;
  let calls = 0;
  const task = async () => {
    calls += 1;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
  };

  const first = executeIfIdle(lock, task);
  await expect.poll(() => calls).toBe(1);

  await expect(executeIfIdle(lock, task)).resolves.toBe(false);
  expect(calls).toBe(1);

  release?.();
  await expect(first).resolves.toBe(true);
  expect(lock.current).toBe(false);
});

test("a failed task releases the polling lock", async () => {
  const lock = { current: false };

  await expect(
    executeIfIdle(lock, async () => {
      throw new Error("telemetry unavailable");
    }),
  ).rejects.toThrow("telemetry unavailable");

  expect(lock.current).toBe(false);
  await expect(executeIfIdle(lock, async () => {})).resolves.toBe(true);
});

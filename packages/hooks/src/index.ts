import { useEffect, useRef, useState } from "react";
import type { CpuSample } from "@project/types";

// Exponential moving average for smoothing noisy real-time metrics (audit D-2).
// alpha in (0,1]: higher = more responsive, lower = smoother. prev=null seeds.
export function ema(prev: number | null, next: number, alpha = 0.3): number {
  if (prev === null || Number.isNaN(prev)) return next;
  return prev * (1 - alpha) + next * alpha;
}

// Runs once immediately, then every intervalMs. intervalMs <= 0 means "run once,
// don't poll" (NOT setInterval(fn, 0), which would hammer the callback every ~4ms).
// Rejections are captured into `error` instead of becoming unhandled; it clears on
// the next successful tick so pages can show a "live data unavailable" indicator.
export function usePolling(callback: () => Promise<void>, intervalMs: number) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    const tick = () => {
      Promise.resolve()
        .then(() => cbRef.current())
        .then(
          () => active && setError(null),
          (e) => active && setError(e instanceof Error ? e : new Error(String(e))),
        );
    };
    tick();
    if (intervalMs <= 0) {
      return () => {
        active = false;
      };
    }
    const id = setInterval(tick, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [intervalMs]);
  return { error };
}

export function useAsyncData(callback: () => Promise<void>) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => cbRef.current())
      .then(
        () => active && setError(null),
        (e) => active && setError(e instanceof Error ? e : new Error(String(e))),
      );
    return () => {
      active = false;
    };
  }, []);
  return { error };
}

export function useCpuUsage() {
  const [percent, setPercent] = useState(0);
  const prev = useRef<CpuSample | null>(null);

  const update = (cpu: CpuSample) => {
    if (prev.current && cpu.total > prev.current.total) {
      const diffIdle = cpu.idle - prev.current.idle;
      const diffTotal = cpu.total - prev.current.total;
      if (diffTotal > 0) {
        setPercent(Math.max(0, Math.min(100, Math.round(((diffTotal - diffIdle) / diffTotal) * 100))));
      }
    }
    prev.current = cpu;
  };

  return { cpuPercent: percent, updateCpu: update };
}

export function useCpuHistory(maxPoints = 60) {
  const [history, setHistory] = useState<number[]>([]);
  const prev = useRef<CpuSample | null>(null);
  const smoothed = useRef<number | null>(null);

  const update = (cpu: CpuSample) => {
    if (prev.current && cpu.total > prev.current.total) {
      const diffIdle = cpu.idle - prev.current.idle;
      const diffTotal = cpu.total - prev.current.total;
      if (diffTotal > 0) {
        const raw = Math.max(0, Math.min(100, ((diffTotal - diffIdle) / diffTotal) * 100));
        smoothed.current = ema(smoothed.current, raw);
        const pct = Math.round(smoothed.current);
        setHistory((h) => {
          const next = [...h, pct];
          return next.slice(-maxPoints);
        });
      }
    }
    prev.current = cpu;
  };

  return { cpuHistory: history, updateCpu: update };
}

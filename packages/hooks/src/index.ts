import { useEffect, useRef, useState } from "react";
import type { CpuSample } from "@project/types";

// Exponential moving average for smoothing noisy real-time metrics (audit D-2).
// alpha in (0,1]: higher = more responsive, lower = smoother. prev=null seeds.
export function ema(prev: number | null, next: number, alpha = 0.3): number {
  if (prev === null || Number.isNaN(prev)) return next;
  return prev * (1 - alpha) + next * alpha;
}

export function usePolling(callback: () => Promise<void>, intervalMs: number) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    cbRef.current();
    const id = setInterval(() => cbRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

export function useAsyncData(callback: () => Promise<void>) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  useEffect(() => {
    cbRef.current();
  }, []);
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

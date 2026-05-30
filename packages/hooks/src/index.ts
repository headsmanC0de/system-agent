import { useEffect, useRef, useState } from "react";
import type { CpuSample } from "@project/types";

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

  const update = (cpu: CpuSample) => {
    if (prev.current && cpu.total > prev.current.total) {
      const diffIdle = cpu.idle - prev.current.idle;
      const diffTotal = cpu.total - prev.current.total;
      if (diffTotal > 0) {
        const pct = Math.max(0, Math.min(100, Math.round(((diffTotal - diffIdle) / diffTotal) * 100)));
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

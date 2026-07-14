export type MetricHealthLevel = "fail" | "pass" | "warn";

export const HEALTH_THRESHOLDS = {
  diskUsagePercent: { warning: 75, critical: 90 },
  memoryUsagePercent: { warning: 75, critical: 90 },
} as const;

export function metricHealthLevel(value: number, thresholds: { warning: number; critical: number }): MetricHealthLevel {
  if (value >= thresholds.critical) return "fail";
  if (value >= thresholds.warning) return "warn";
  return "pass";
}

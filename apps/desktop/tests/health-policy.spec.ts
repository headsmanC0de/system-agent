import { expect, test } from "@playwright/test";
import { HEALTH_THRESHOLDS, metricHealthLevel } from "../src/health-policy";

test("health thresholds are inclusive and derive from one policy", () => {
  const thresholds = HEALTH_THRESHOLDS.diskUsagePercent;
  expect(metricHealthLevel(thresholds.warning - 1, thresholds)).toBe("pass");
  expect(metricHealthLevel(thresholds.warning, thresholds)).toBe("warn");
  expect(metricHealthLevel(thresholds.critical - 1, thresholds)).toBe("warn");
  expect(metricHealthLevel(thresholds.critical, thresholds)).toBe("fail");
});

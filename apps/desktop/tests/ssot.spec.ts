import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "@playwright/test";

function productionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "testing") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return productionSources(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

test("production source contains no manually maintained semantic versions", () => {
  const sourceRoot = join(import.meta.dirname, "..", "src");
  const violations = productionSources(sourceRoot).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    return [...source.matchAll(/["'`]\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?["'`]/g)].map(
      (match) => `${relative(sourceRoot, path)}:${match[0]}`,
    );
  });
  expect(violations).toEqual([]);
});

test("removed legacy and security-bypass literals cannot return", () => {
  const sourceRoot = join(import.meta.dirname, "..", "src");
  const forbidden = ["@electron-toolkit/preload", "GPU_WORKAROUND", "--no-sandbox"];
  const violations = productionSources(sourceRoot).flatMap((path) => {
    const source = readFileSync(path, "utf8");
    return forbidden.filter((token) => source.includes(token)).map((token) => `${relative(sourceRoot, path)}:${token}`);
  });
  expect(violations).toEqual([]);
});

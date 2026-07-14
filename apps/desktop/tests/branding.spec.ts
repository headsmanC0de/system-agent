import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(desktopRoot, "..", "..");
const branding = JSON.parse(readFileSync(join(repoRoot, "branding.json"), "utf8"));
const rootPackage = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
const builder = createRequire(import.meta.url)(join(desktopRoot, "electron-builder.config.cjs"));

test("branding metadata derives from the root SSOT", () => {
  expect(rootPackage.name).toBe(branding.id);
  expect(rootPackage.repository.url).toContain(`/${branding.id}.git`);
  expect(builder.appId).toBe(branding.appId);
  expect(builder.productName).toBe(branding.name);
  expect(builder.executableName).toBe(branding.id);
  expect(builder.pacman.packageName).toBe(branding.id);
  expect(builder.linux.syncDesktopName).toBe(true);
  expect(builder.artifactName).toBe(`${branding.id}-\${version}.\${ext}`);
});

test("HTML does not duplicate the branded application title", () => {
  const html = readFileSync(join(desktopRoot, "index.html"), "utf8");
  expect(html).not.toContain(branding.name);
});

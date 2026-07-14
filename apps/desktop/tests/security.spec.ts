import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import {
  APP_ORIGIN,
  isTrustedExternalUrl,
  isTrustedRendererUrl,
  resolveRendererAsset,
} from "../src/main/runtime-origin";

test("renderer trust uses exact branded origin", () => {
  expect(isTrustedRendererUrl(`${APP_ORIGIN}/index.html`)).toBe(true);
  expect(isTrustedRendererUrl(`${APP_ORIGIN}.evil/index.html`)).toBe(false);
  expect(isTrustedRendererUrl("file:///etc/passwd")).toBe(false);
  expect(isTrustedRendererUrl("https://moonrock.software")).toBe(false);
});

test("custom protocol resolver rejects hosts, traversal, malformed escapes, and null bytes", () => {
  const root = resolve("/application/renderer");
  expect(resolveRendererAsset(root, `${APP_ORIGIN}/index.html`)).toBe(resolve(root, "index.html"));
  expect(resolveRendererAsset(root, "system-agent://evil/index.html")).toBeNull();
  expect(resolveRendererAsset(root, `${APP_ORIGIN}/%2e%2e/%2e%2e/etc/passwd`)).toBeNull();
  expect(resolveRendererAsset(root, `${APP_ORIGIN}/%00index.html`)).toBeNull();
  expect(resolveRendererAsset(root, `${APP_ORIGIN}/%ZZ`)).toBeNull();
});

test("external URL allowlist requires HTTPS and an exact host", () => {
  expect(isTrustedExternalUrl("https://moonrock.software/docs")).toBe(true);
  expect(isTrustedExternalUrl("https://platform.openai.com/api-keys")).toBe(true);
  expect(isTrustedExternalUrl("http://moonrock.software")).toBe(false);
  expect(isTrustedExternalUrl("https://moonrock.software.evil.example")).toBe(false);
  expect(isTrustedExternalUrl("javascript:alert(1)")).toBe(false);
});

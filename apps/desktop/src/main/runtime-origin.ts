import { resolve, sep } from "node:path";
import { BRAND_ID, BRAND_URL, ORG_URL } from "../lib/branding.js";

export const APP_SCHEME = BRAND_ID;
export const APP_HOST = "bundle";
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
const TRUSTED_EXTERNAL_HOSTS = new Set([
  new URL(ORG_URL).hostname,
  new URL(BRAND_URL).hostname,
  "z.ai",
  "platform.openai.com",
]);

export function isTrustedRendererUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (devUrl) return url.origin === new URL(devUrl).origin;
    return url.protocol === `${APP_SCHEME}:` && url.hostname === APP_HOST;
  } catch {
    return false;
  }
}

export function isTrustedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && TRUSTED_EXTERNAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function resolveRendererAsset(rendererRoot: string, requestUrl: string): string | null {
  try {
    const authorityEnd = requestUrl.indexOf("/", requestUrl.indexOf("://") + 3);
    const rawPath = authorityEnd < 0 ? "/" : requestUrl.slice(authorityEnd).split(/[?#]/, 1)[0]!;
    const rawSegments = decodeURIComponent(rawPath).split("/");
    if (rawSegments.includes("..")) return null;
    const url = new URL(requestUrl);
    if (url.protocol !== `${APP_SCHEME}:` || url.hostname !== APP_HOST) return null;
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.includes("\0")) return null;
    const target = resolve(rendererRoot, `.${pathname}`);
    return target === rendererRoot || target.startsWith(`${rendererRoot}${sep}`) ? target : null;
  } catch {
    return null;
  }
}

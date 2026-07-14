import { STORAGE_PREFIX } from "./branding";

export const storageKey = (suffix: string): string => `${STORAGE_PREFIX}-${suffix}`;

export const STORAGE_KEYS = {
  activeSession: storageKey("chat-active-session"),
  chatConfig: storageKey("chat-config"),
  chatSessions: storageKey("chat-sessions"),
  chatTopics: storageKey("chat-topics"),
  fanCurves: storageKey("fan-curves"),
  manualSpecs: storageKey("manual-specs"),
  projects: storageKey("project-catalog"),
  theme: storageKey("theme"),
} as const;

export function getStorageItem(key: string): string | null {
  return localStorage.getItem(key);
}

export function setStorageItem(key: string, value: string): void {
  localStorage.setItem(key, value);
}

export function removeStorageItem(key: string): void {
  localStorage.removeItem(key);
}

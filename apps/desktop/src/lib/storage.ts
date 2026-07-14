import { LEGACY_STORAGE_PREFIXES, STORAGE_PREFIX } from "./branding";

export const storageKey = (suffix: string): string => `${STORAGE_PREFIX}-${suffix}`;

export const STORAGE_KEYS = {
  activeSession: storageKey("chat-active-session"),
  chatConfig: storageKey("chat-config"),
  chatSessions: storageKey("chat-sessions"),
  chatTopics: storageKey("chat-topics"),
  fanCurves: storageKey("fan-curves"),
  manualSpecs: storageKey("manual-specs"),
  projects: storageKey("projects"),
  theme: storageKey("theme"),
} as const;

const legacyKeysFor = (key: string): string[] => {
  const suffix = key.startsWith(`${STORAGE_PREFIX}-`) ? key.slice(STORAGE_PREFIX.length + 1) : key;
  return LEGACY_STORAGE_PREFIXES.map((prefix) => `${prefix}-${suffix}`);
};

export function getStorageItem(key: string): string | null {
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  for (const legacyKey of legacyKeysFor(key)) {
    const legacy = localStorage.getItem(legacyKey);
    if (legacy === null) continue;
    localStorage.setItem(key, legacy);
    localStorage.removeItem(legacyKey);
    return legacy;
  }
  return null;
}

export function setStorageItem(key: string, value: string): void {
  localStorage.setItem(key, value);
  for (const legacyKey of legacyKeysFor(key)) localStorage.removeItem(legacyKey);
}

export function removeStorageItem(key: string): void {
  localStorage.removeItem(key);
  for (const legacyKey of legacyKeysFor(key)) localStorage.removeItem(legacyKey);
}

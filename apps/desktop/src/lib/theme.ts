export type ThemeMode = "dark" | "light";

export interface ThemePreset {
  id: string;
  label: string;
  hue: number;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: "red", label: "Red", hue: 0 },
  { id: "orange", label: "Orange", hue: 25 },
  { id: "amber", label: "Amber", hue: 45 },
  { id: "yellow", label: "Yellow", hue: 55 },
  { id: "lime", label: "Lime", hue: 80 },
  { id: "emerald", label: "Emerald", hue: 155 },
  { id: "teal", label: "Teal", hue: 175 },
  { id: "cyan", label: "Cyan", hue: 190 },
  { id: "blue", label: "Blue", hue: 225 },
  { id: "indigo", label: "Indigo", hue: 250 },
  { id: "violet", label: "Violet", hue: 275 },
  { id: "rose", label: "Rose", hue: 340 },
  { id: "mono", label: "Mono", hue: -1 },
];

const DEFAULT_ACCENT = "orange";
const DEFAULT_MODE: ThemeMode = "dark";
const STORAGE_KEY = "lh-theme";

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function generatePalette(hue: number, mode: ThemeMode) {
  const isDark = mode === "dark";
  const isMono = hue === -1;
  const ms = isMono ? 0 : 1;
  const h = isMono ? 0 : hue;

  const primaryL = isMono ? (isDark ? 95 : 100) : isDark ? 62 : 48;
  const primaryS = 85 * ms;
  const primary = hsl(h, primaryS, primaryL);
  const primaryFg = isDark ? "hsl(0, 0%, 4%)" : "hsl(0, 0%, 4%)";

  const secondaryBase = hsl(h, (isDark ? 10 : 12) * ms, isDark ? 15 : 96);
  const mutedBase = hsl(h, (isDark ? 8 : 10) * ms, isDark ? 15 : 96);
  const accentBase = hsl(h, (isDark ? 10 : 12) * ms, isDark ? 15 : 96);
  const borderBase = hsl(h, (isDark ? 8 : 10) * ms, isDark ? 16 : 89);

  const ring = hsl(h, primaryS, primaryL);
  const input = borderBase;

  const sidebarBg = hsl(h, (isDark ? 8 : 10) * ms, isDark ? 5 : 98);
  const sidebarFg = isDark ? "hsl(0, 0%, 98%)" : "hsl(0, 0%, 4%)";
  const sidebarAccent = secondaryBase;
  const sidebarAccentFg = isDark ? "hsl(0, 0%, 98%)" : "hsl(0, 0%, 4%)";
  const sidebarBorder = borderBase;

  return {
    "--primary": primary,
    "--primary-foreground": primaryFg,
    "--color-primary": primary,
    "--color-primary-foreground": primaryFg,
    "--ring": ring,
    "--color-ring": ring,
    "--secondary": secondaryBase,
    "--secondary-foreground": isDark ? "hsl(0, 0%, 98%)" : "hsl(0, 0%, 4%)",
    "--color-secondary": secondaryBase,
    "--color-secondary-foreground": isDark ? "hsl(0, 0%, 98%)" : "hsl(0, 0%, 4%)",
    "--muted": mutedBase,
    "--muted-foreground": isDark ? `hsl(${h}, ${8 * ms}%, 65%)` : `hsl(${h}, ${8 * ms}%, 45%)`,
    "--color-muted": mutedBase,
    "--color-muted-foreground": isDark ? `hsl(${h}, ${8 * ms}%, 65%)` : `hsl(${h}, ${8 * ms}%, 45%)`,
    "--accent": accentBase,
    "--accent-foreground": isDark ? "hsl(0, 0%, 98%)" : "hsl(0, 0%, 4%)",
    "--color-accent": accentBase,
    "--color-accent-foreground": isDark ? "hsl(0, 0%, 98%)" : "hsl(0, 0%, 4%)",
    "--border": borderBase,
    "--input": input,
    "--color-border": borderBase,
    "--color-input": input,
    "--background": isDark ? "hsl(240, 10%, 4%)" : "hsl(0, 0%, 98%)",
    "--foreground": isDark ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 5%)",
    "--color-background": isDark ? "hsl(240, 10%, 4%)" : "hsl(0, 0%, 98%)",
    "--color-foreground": isDark ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 5%)",
    "--card": isDark ? "hsl(240, 6%, 7%)" : "hsl(0, 0%, 100%)",
    "--card-foreground": isDark ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 5%)",
    "--color-card": isDark ? "hsl(240, 6%, 7%)" : "hsl(0, 0%, 100%)",
    "--color-card-foreground": isDark ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 5%)",
    "--popover": isDark ? "hsl(240, 6%, 7%)" : "hsl(0, 0%, 100%)",
    "--popover-foreground": isDark ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 5%)",
    "--color-popover": isDark ? "hsl(240, 6%, 7%)" : "hsl(0, 0%, 100%)",
    "--color-popover-foreground": isDark ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 5%)",
    "--sidebar": sidebarBg,
    "--sidebar-foreground": sidebarFg,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": primaryFg,
    "--sidebar-accent": sidebarAccent,
    "--sidebar-accent-foreground": sidebarAccentFg,
    "--sidebar-border": sidebarBorder,
    "--sidebar-ring": ring,
  };
}

interface StoredTheme {
  accent: string;
  mode: ThemeMode;
}

function readStored(): StoredTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as StoredTheme;
    }
  } catch {}
  return { accent: DEFAULT_ACCENT, mode: DEFAULT_MODE };
}

function writeStored(theme: StoredTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {}
}

export function getStoredThemeId(): string {
  return readStored().accent;
}

export function getStoredMode(): ThemeMode {
  return readStored().mode;
}

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) || THEME_PRESETS[1]!;
}

export function getPresetColor(id: string): string {
  const p = getPreset(id);
  if (p.hue === -1) return "hsl(0, 0%, 62%)";
  return hsl(p.hue, 85, 62);
}

export function applyAccent(id: string): void {
  const preset = getPreset(id);
  const stored = readStored();
  const palette = generatePalette(preset.hue, stored.mode);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key, value);
  }
  writeStored({ ...stored, accent: id });
}

export function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === "light") {
    root.setAttribute("data-theme", "light");
  } else {
    root.removeAttribute("data-theme");
  }
  const stored = readStored();
  const preset = getPreset(stored.accent);
  const palette = generatePalette(preset.hue, mode);
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(key, value);
  }
  writeStored({ ...stored, mode });
}

export function initTheme(): void {
  const stored = readStored();
  applyMode(stored.mode);
  applyAccent(stored.accent);
}

export function applyTheme(id: string): void {
  applyAccent(id);
}

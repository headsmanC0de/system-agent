# Linux Helper — Desktop App

## Build & Run
All commands from `apps/desktop/`:
- `npm run dev` — electron-vite dev (HMR renderer + hot reload main)
- `npm run build` — electron-vite build
- `npm run preview` — test production build
- `npm run typecheck` — tsc --noEmit
- `npm run lint` — Biome check (scoped to src/main, src/pages, src/components, src/lib, App.tsx, api.ts)
- `npm run test` — Playwright (browser mode against mock layer; auto-starts vite :5173)

## Stack
Electron 42 + React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 + electron-vite 5 + Biome 2

## Architecture
```
src/main/main.ts       — Electron main (window, GPU fix, dev/prod URL detection)
src/main/preload.ts    — contextBridge via @electron-toolkit/preload
src/main/ipc.ts        — 40+ IPC handlers (pacman, systemctl, nvidia-smi, snapper, llm, etc.)
src/api.ts             — Typed IPC client + mock data layer (system.overview, system.gpu, llm.modelInfo, etc.)
src/types.ts           — All interfaces + PageId union type (18 pages)
src/App.tsx            — Collapsible sidebar (4 groups), page routing, theme init
src/lib/theme.ts       — 12 accent color presets, light/dark mode, localStorage persistence
src/lib/hooks.ts       — usePolling, useAsyncData, useCpuUsage (ref-based, safe)
src/lib/chat.ts        — Provider config (z.ai/OpenAI/Ollama/Tesseract/Custom), model registry
src/pages/*.tsx        — 18 page components
src/components/ui.tsx  — Card, StatCard, Bar, Badge, SearchInput, Output, PageHeader
src/index.css          — Tailwind v4 @theme inline, CSS variables, semantic colors, noise texture
```

Output: `out/main/main.js`, `out/preload/preload.mjs`, `out/renderer/`

## Key Conventions

### Component Rules
- ALL pages MUST import from `ui.tsx` — never define Card/StatCard/Bar/Badge/SearchInput/Output locally
- Use `PageHeader` for page titles instead of raw `<h1>`
- No inline `rounded-lg border border-border bg-card` — use `<Card>`
- No inline search inputs — use `<SearchInput>`
- No inline `<pre>` for command output — use `<Output>`
- No inline status spans — use `<Badge>` with semantic variants

### CSS Rules
- All colors via CSS semantic variables: `text-success-foreground`, `text-warning-foreground`, `text-info-foreground`, `text-destructive`, `bg-success`, `bg-warning`, `bg-info`
- NEVER hardcode `green-500`, `yellow-500`, `blue-500`, `red-500`, `orange-500` in components
- `purple` has no semantic token — keep Tailwind class for now
- No comments in code unless asked

### Hooks Rules
- `usePolling(fn, ms)` — for real-time pages (Dashboard, GPU, Hardware, Network)
- `useAsyncData(fn)` — for one-shot load pages (Packages, Services, Disks, etc.)
- `useCpuUsage()` — for pages that need CPU delta calculation (Dashboard, Hardware)
- Hooks are ref-based — safe with unmemoized callbacks (no infinite re-render risk)

### IPC Rules
- `ipcMain.handle("system:xxx")` in ipc.ts → `system.xxx()` in api.ts
- Shell commands: `execFile` for simple cmds, `bash -c` for pipes
- Mock data layer: `isElectron` check → falls back to `MOCK` record in api.ts
- Case-sensitivity: always `.toLowerCase()` on BOTH sides in search filters

### State Rules
- Cursor pointer on all interactive elements (set in CSS base layer)
- Provider config persisted in localStorage key `lh-chat-config`
- Theme persisted in localStorage key `lh-theme`
- Projects list persisted in localStorage key `lh-projects`

## Known Issues
- NVIDIA + Wayland GPU crash — workaround: software rendering (app.disableHardwareAcceleration)
- sudo pipes password via stdin — needs polkit later
- Zig native library (src/native/) pending Zig 0.16 API migration
- Dead deps: `class-variance-authority`, `clsx`, `tailwind-merge` — installed but unused, safe to remove

## Test Suite
135 Playwright tests (browser mode, mock data):
- `tests/renderer.spec.ts` — smoke tests (sidebar, navigation, page rendering)
- `tests/functional.spec.ts` — functional tests (data rendering, interactions, edge cases, security, mock-mode banner)
- `tests/projects.spec.ts` — project page tests (health, deps, checklist)
- `tests/screenshots.spec.ts` — page screenshots

Run: `npx playwright test` from `apps/desktop/` (config auto-starts vite at :5173).

NOTE: tests run in **browser mode** so they exercise the mock layer, not real IPC. The
renderer↔main contract (preload allowlist in `src/main/channels.ts` ↔ `ipcMain.handle` in
`src/main/ipc.ts`), CSP, and nav guards are NOT covered here — they need an Electron-mode e2e.

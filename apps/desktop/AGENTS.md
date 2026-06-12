# Linux Agent — Desktop App

## Build & Run
All commands from `apps/desktop/`:
- `npm run dev` — electron-vite dev (HMR renderer + hot reload main)
- `npm run build` — electron-vite build
- `npm run preview` — test production build
- `npm run typecheck` — tsc --noEmit
- `npm run lint` — Biome check (scoped to src/main, src/pages, src/components, src/lib, App.tsx, api.ts, main.tsx, types.ts)
- `npm run test` — Playwright (browser mode against mock layer; auto-starts vite :5173)
- `npm run test:e2e` — Electron-mode e2e (builds first, launches the real app)

## Stack
Electron 42 + React 19 + Vite 8 + TypeScript 6 + Tailwind CSS v4 + electron-vite 5 + Biome 2

## Architecture
```
src/main/main.ts       — Electron main (window, scoped GPU workaround, sandbox, CSP, nav guards)
src/main/preload.ts    — contextBridge via @electron-toolkit/preload + channel allowlist gate
src/main/channels.ts   — SSOT IPC channel allowlist (keep 1:1 with api.ts invokes)
src/main/ipc.ts        — 60+ IPC handlers (pacman, systemctl, nvidia-smi, snapper, llm, secrets, etc.)
src/api.ts             — Typed IPC client + mock data layer (system.*, llm.*, secrets.*, etc.)
src/types.ts           — re-exports @project/types (interfaces + PageId union, 18 pages)
src/App.tsx            — Collapsible sidebar (4 groups), page routing, theme init
src/lib/theme.ts       — 12 accent color presets, light/dark mode, localStorage persistence
src/lib/hooks.ts       — re-exports @project/hooks (usePolling, useAsyncData, useCpuUsage)
src/lib/chat.ts        — Provider config (z.ai/OpenAI/Ollama/Tesseract/Custom), API-key secrets, baseUrl validation
src/pages/*.tsx        — 18 page components
src/components/ui.tsx  — pure re-export from @project/ui (Card, StatCard, Bar, Badge, SearchInput, Output, PageHeader, Sparkline)
src/index.css          — Tailwind v4 @theme inline, CSS variables, semantic colors, noise texture
```

Output: `out/main/main.js`, `out/preload/preload.cjs` (CJS so the sandboxed renderer can load it — never switch back to ESM), `out/renderer/`

## Key Conventions

### Component Rules
- ALL pages MUST import from `ui.tsx` (re-export of `@project/ui`) — never define Card/StatCard/Bar/Badge/SearchInput/Output locally
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
- `ipcMain.handle("system:xxx")` in ipc.ts → `system.xxx()` in api.ts → entry in `channels.ts` allowlist → MOCK entry in api.ts. All four or the browser/tests break.
- Shell commands: `execFile` for simple cmds, `bash -c` for pipes — NEVER interpolate variables into shell strings (use arg arrays or node:fs APIs)
- Mock data layer: `isElectron` check → falls back to `MOCK` record in api.ts
- Case-sensitivity: always `.toLowerCase()` on BOTH sides in search filters

### Secrets
- API keys NEVER go to localStorage. Use `secrets:get`/`secrets:set` IPC (Electron `safeStorage`, encrypted file in userData, 0600). Renderer side: `loadApiKey()` in `lib/chat.ts`.
- Custom chat base URLs must pass `isValidBaseUrl()` (https-only; http allowed for localhost).

### State Rules
- Cursor pointer on all interactive elements (set in CSS base layer)
- Provider config persisted in localStorage key `lh-chat-config` (apiKey is stripped before persisting)
- Theme persisted in localStorage key `lh-theme`
- Projects list persisted in localStorage key `lh-projects`

## Known Issues
- NVIDIA + Wayland GPU crash — workaround scoped via `needsGpuSandboxWorkaround()` (software rendering + `--no-sandbox` only on that combo; `LH_GPU_WORKAROUND=1|0` override)
- Privilege escalation: pkexec (polkit GUI prompt) for snapper mutations; snapshot listing needs ALLOW_USERS in snapper config
- Zig native library (src/native/) pending Zig 0.16 API migration
- Compromised Z_AI key in git history — rotation + `git filter-repo` is a USER ops action (see AUDIT.md)

## Test Suite
151 browser-runner Playwright tests (incl. SSE unit + IPC contract specs) + 7 Electron-mode e2e:
- `tests/renderer.spec.ts` — smoke tests (sidebar, navigation, page rendering)
- `tests/functional.spec.ts` — functional tests (data rendering, interactions, edge cases, security, secrets/baseUrl validation, mock-mode banner)
- `tests/projects.spec.ts` — project page tests (health, deps, checklist)
- `tests/screenshots.spec.ts` — page screenshots
- `tests/sse.spec.ts` — unit tests for `src/lib/sse.ts` (chunk splits, UTF-8, tool calls, usage, malformed events)
- `tests/ipc-contract.spec.ts` — contract guard: ipc.ts handlers ↔ channels.ts allowlist ↔ MOCK fallbacks
- `tests/electron.spec.ts` — real built app: IPC allowlist, CSP, window.open denial, safeStorage secrets round-trip, recovered-sandbox launch (`npm run test:e2e`)

Run: `npm run test` (projects `unit`+`browser`) / `npm run test:e2e` (project `e2e`). Shared fixtures in `tests/fixtures.ts` (`gotoPage`, `seedStorage`). RULE: no `page.waitForTimeout` — use web-first assertions or `expect.poll` (enforced by review; sweep done in LH-111).

RULE: any change to `electron.vite.config.ts`, `main.ts` webPreferences, or the preload MUST be
verified with `npm run test:e2e` — browser tests cannot see this class of bug (BF-035/038/039).
CI (`.github/workflows/ci.yml`) runs typecheck, lint, build, browser tests, and the e2e on every push/PR.

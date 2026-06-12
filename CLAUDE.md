# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Linux Agent — an Electron desktop app for managing an Arch Linux system (packages, snapshots, services, hardware/GPU, network, RGB, password vault, cron, an AI agent chat, etc.). 19 pages, all backed by shell commands run in the Electron main process over a typed IPC bus. White-label: keep product/branding names out of `src/` logic (branding lives in `src/lib/branding.ts`).

## Monorepo layout

Turborepo + npm workspaces. Node >= 20.19, npm 11.

- `apps/desktop` — the Electron app (`@project/desktop`). All real work happens here.
- `packages/types` (`@project/types`) — shared pure-data interfaces, no logic.
- `packages/hooks` (`@project/hooks`) — shared React hooks.
- `packages/ui` (`@project/ui`) — shared React component library (Card, Badge, Button, StatCard, Bar, Sparkline, SearchInput, PageHeader, Output) + `globals.css`.
- `packages/config` (`@project/config`) — shared `tsconfig` bases.

`turbo.json` enforces dependency **boundaries**: `config` ← `types` ← `ui`/`hooks` ← `app`. The app may depend on types/ui/hooks; packages may not depend on the app or sideways across peers except as listed. Respect this when adding imports.

Note: `apps/desktop/src/components/ui.tsx` is a pure re-export from `@project/ui` (same for `src/lib/hooks.ts` → `@project/hooks`, `src/types.ts` → `@project/types`). Component changes belong in the shared packages.

## Commands

Root (runs across workspaces via turbo):
- `npm run dev` — start everything in dev (electron-vite dev for the app).
- `npm run build` / `npm run lint` / `npm run check-types`
- `npm run format` — prettier on md/ts at root.

Inside `apps/desktop/` (the common case):
- `npm run dev` — electron-vite dev (HMR renderer + hot-reload main).
- `npm run build` — electron-vite build. Outputs `out/main/main.js`, `out/preload/preload.cjs` (CJS so the sandboxed renderer can load it — do not switch back to ESM), `out/renderer/`.
- `npm run preview` — run the production build.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run lint` / `npm run lint:fix` / `npm run format` — **Biome monorepo** (root `biome.json` is the SSOT; package configs are `{"root": false, "extends": "//"}`). All workspaces lint via `turbo run lint`; prettier only formats markdown.
- `npm run test` — Playwright (browser mode); `npm run test:e2e` — real-Electron e2e (builds first). **Any change to `electron.vite.config.ts`, `main.ts` webPreferences, or the preload must be verified with `test:e2e`** — this class of bug (BF-035/038/039) is invisible to browser tests. CI (`.github/workflows/ci.yml`) runs both suites on push/PR.

### Tests

Playwright, **browser mode against the mock data layer** (not a real Electron run). Config: `apps/desktop/playwright.config.ts` — it auto-starts `vite --port 5173` and points `baseURL` at `http://127.0.0.1:5173`.

- `npm run test` from `apps/desktop/` runs all specs.
- Single file: `npx playwright test tests/functional.spec.ts`
- Single test: `npx playwright test -g "test name substring"`

Specs: `renderer.spec.ts` (smoke/nav), `functional.spec.ts` (data render, interactions, security), `projects.spec.ts`, `screenshots.spec.ts`.

## Architecture

### IPC bus (the core pattern)

The renderer never touches the OS directly. Every system action is a typed round trip:

```
src/main/ipc.ts     ipcMain.handle("system:overview", ...)   (~55 handlers: pacman, systemctl,
                                                               nvidia-smi, snapper, upower,
                                                               bluetoothctl, pass, llm, etc.)
        ↕ (contextBridge in src/main/preload.ts, via @electron-toolkit/preload)
src/api.ts          system.overview()  →  invokes "system:overview"
src/pages/*.tsx     call api methods through hooks
```

Convention: `ipcMain.handle("ns:action")` in `ipc.ts` maps to `api.ns.action()` in `api.ts`. In `ipc.ts`, use `execFile` for simple commands and `bash -c` for pipes; commands have timeout + buffer limits.

### Mock data layer

`api.ts` checks `isElectron = !!window.electronAPI`. Outside Electron (i.e. the Playwright/browser environment), each method falls back to a `MOCK` record instead of IPC. This is what lets all pages render and all tests run in a plain browser. **When you add an api method or IPC handler, add a matching MOCK entry** or browser/tests break.

### Renderer

- `src/main.tsx` → `src/App.tsx` — collapsible sidebar (4 nav groups), page routing via a `PageId` union, theme init.
- `src/types.ts` — all interfaces + the `PageId` union (one entry per page).
- `src/pages/*.tsx` — one component per page.
- `src/lib/theme.ts` — 12 accent presets, light/dark, persisted in `localStorage["lh-theme"]`.
- `src/lib/hooks.ts` — `usePolling(fn, ms)` for live pages (Dashboard/GPU/Hardware/Network), `useAsyncData(fn)` for one-shot loads, `useCpuUsage()` for CPU deltas. Hooks are ref-based — safe with unmemoized callbacks.
- `src/lib/chat.ts` + `src/lib/sessions.ts` — AI provider registry (z.ai / OpenAI / Ollama / Tesseract / Custom), SSE streaming, model picker; provider config persisted in `localStorage["lh-chat-config"]`.
- `src/index.css` — Tailwind v4 `@theme inline`, CSS variable semantic colors, noise texture.

### Native (incomplete)

`src/native/*.zig` is a planned native helper layer — **pending a Zig API migration, not wired in.** Ignore unless explicitly working on it.

## Conventions (renderer)

- **Shared components, not local re-definitions.** Pages must use `Card` / `StatCard` / `Bar` / `Badge` / `SearchInput` / `Output` / `PageHeader` — never inline `rounded-lg border border-border bg-card`, raw `<h1>`, ad-hoc search inputs, or `<pre>` for command output.
- **Semantic colors only.** Use CSS variables: `text-success-foreground`, `bg-warning`, `text-info-foreground`, `text-destructive`, etc. Never hardcode `green-500`/`yellow-500`/`blue-500`/`red-500`/`orange-500`. (`purple` has no token yet — Tailwind class is fine.)
- **Search filters: lowercase both sides.** `.toLowerCase()` on the query and the field — a past bug class on Services/Autostart.
- No code comments unless asked.

## Reference docs

- `BLUEPRINT.md` — architecture rationale; maps each pattern (IPC bus, command wrapper, runtime abstraction, build-target config) to its Ghostty source. Read before large structural changes.
- `KANBAN.md` — task board / what's done and planned.
- `docs/TESTING.md` — the testing standard (pyramid, invariants, turbo config, Playwright-MCP audit procedure). The `qa-audit` agent (`.claude/agents/qa-audit.md`) executes it.
- `apps/desktop/AGENTS.md` — per-app agent notes (refreshed 2026-06-12: Biome, CJS preload, secrets, e2e rule).

## Known issues / gotchas

- **NVIDIA + Wayland GPU crash** — worked around with `app.disableHardwareAcceleration()` (software rendering) in `main.ts`.
- Privilege escalation uses `pkexec` (polkit GUI prompt) for snapper mutations; snapshot listing runs unprivileged via snapperd (add your user to `ALLOW_USERS` in the snapper config to see data).
- Browser/test runs depend entirely on the mock layer; a missing MOCK entry shows up as a broken page only outside Electron.

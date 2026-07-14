# System Agent — Desktop App

## Build & Run
All commands from `apps/desktop/`:
- `npm run dev` — electron-vite dev (HMR renderer + hot reload main)
- `npm run build` — electron-vite build
- `npm run preview` — test production build
- `npm run typecheck` — tsc --noEmit
- `npm run lint` — Biome check for the desktop source
- `npm run test` — Playwright unit/repository plus explicit demo-mode renderer suites
- `npm run test:e2e` — Electron-mode e2e (builds first, launches the real app)
- `npm run package && npm run verify:package` — clean AppImage/pacman build plus metadata/file/fuse gate
- `npm run test:installed` — installed Arch package restart/persistence/log dogfood gate

## Stack
The current stack and embedded runtime versions are generated in `docs/reference/VERSIONS.md`.

## Architecture
```
src/main/main.ts       — Electron main (window, custom protocol, sandbox, CSP, nav guards)
src/main/preload.ts    — minimal native contextBridge exposing allowlisted invoke only
src/main/channels.ts   — typed IPC registry and preload allowlist SSOT
src/main/*-repository.ts — the only allowed persistence boundary; owns SQLite and SQL
src/main/command-runner.ts — bounded/cancelable commands with semantic operation IDs
src/main/telemetry.ts  — correlated IPC/process/repository/lifecycle spans and private rotating JSONL
src/main/ipc.ts        — IPC handlers (pacman, systemctl, nvidia-smi, snapper, llm, secrets, etc.)
src/api.ts             — thin typed IPC client; production fails closed without preload
src/testing/demo-api.ts — dev-only exhaustive adapter, excluded from production bundle
src/page-registry.ts   — SSOT for PageId, grouping, labels, titles, icons, and components
src/App.tsx            — registry-derived sidebar, page routing, theme init
src/lib/theme.ts       — 12 accent color presets, light/dark mode, localStorage persistence
src/lib/chat.ts        — Provider config (z.ai/OpenAI/Ollama/Tesseract/Custom), API-key secrets, baseUrl validation
src/pages/*.tsx        — 19 page components
src/index.css          — Tailwind v4 @theme inline, CSS variables, semantic colors, noise texture
```

Output: `out/main/main.js`, `out/preload/preload.cjs` (CJS so the sandboxed renderer can load it — never switch back to ESM), `out/renderer/`

## Key Conventions

### Component Rules
- Pages import shared primitives directly from `@project/ui` and hooks directly from `@project/hooks`
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
- Every main registration and renderer invocation is typed by `IpcChannel`; startup asserts all registry entries and the demo map is compile-time exhaustive
- All child processes go through `CommandRunner` with a semantic operation ID, timeout, concurrency bound, and explicit allowed exit codes; arguments never enter telemetry
- Demo data is available only with `DEV && VITE_DEMO_MODE=1`; production never falls back to it
- Case-sensitivity: always `.toLowerCase()` on BOTH sides in search filters

### Persistence Rules
- SQLite is accessed only through a domain repository in `src/main/*-repository.ts`
- IPC, pages, hooks, and services never import `node:sqlite`, open a database, or contain raw SQL
- Repository public methods use shared typed inputs/results; schema, transactions, limits, and prepared statements stay private
- Every repository needs contract tests for persistence, validation, corruption/schema failure, and the architecture boundary

### Secrets
- API keys NEVER go to localStorage. `secrets:get`/`secrets:set` use Electron `safeStorage` plus an atomic 0600 store and fail closed on corruption. Renderer side: `loadApiKey()` in `lib/chat.ts`.
- Custom chat base URLs must pass `isValidBaseUrl()` (https-only; http allowed for localhost).

### State Rules
- Cursor pointer on all interactive elements (set in CSS base layer)
- Provider config persisted in localStorage key `sa-chat-config` (apiKey is stripped before persisting)
- Theme persisted in localStorage key `sa-theme`
- Project catalog persisted in localStorage through `STORAGE_KEYS.projects`; project facts come from validated IPC inspection

## Known Issues
- Hardware acceleration is disabled for NVIDIA/Wayland stability; the Chromium sandbox remains mandatory in every production path
- Privilege escalation: pkexec (polkit GUI prompt) for snapper mutations; snapshot listing needs ALLOW_USERS in snapper config
- Compromised Z_AI key in git history — rotation + `git filter-repo` is a USER ops action (see AUDIT.md)

## Test Suite

The testing standard lives in `docs/TESTING.md` (root) — pyramid, invariants, and the Playwright-MCP audit procedure. Summary below.
The Playwright suite covers unit/repository contracts, renderer integration, built Electron, and the installed package:
- `tests/renderer.spec.ts` — smoke tests (sidebar, navigation, page rendering)
- `tests/functional-*.spec.ts` — renderer data/interactions, edge cases, security, and visible demo-mode behavior
- `tests/projects.spec.ts` — project page tests (health, deps, checklist)
- `tests/screenshots.spec.ts` — stable dark/light visual regression baselines
- `tests/sse.spec.ts` — unit tests for `src/lib/sse.ts` (chunk splits, UTF-8, tool calls, usage, malformed events)
- `tests/ecoflow.spec.ts` — unit tests for EcoFlow telemetry normalization (valid snapshot, malformed payloads, null defaults)
- `tests/ecoflow-cloud.spec.ts` — unit tests for EcoFlow Cloud read-only GET telemetry, env degrade, and no-control source guard
- `tests/ipc-contract.spec.ts` — exhaustive main/demo/allowlist contract guard
- `tests/electron.spec.ts` — real built app: IPC allowlist, CSP, custom protocol, truthful host data, SQLite and secrets
- `tests/installed.spec.ts` — installed pacman artifact over CDP: hardened launch, private logs, restart durability

Run: `npm run test` (projects `unit`+`browser`), `npm run test:e2e` (built app), and `npm run test:installed` after installing the pacman artifact. Shared fixtures live in `tests/fixtures.ts`. Never use `page.waitForTimeout`; use web-first assertions or `expect.poll`.

RULE: any change to `electron.vite.config.ts`, `main.ts` webPreferences, or the preload MUST be
verified with `npm run test:e2e`; packaging/fuse changes additionally require `npm run test:installed`.
RULE: visited pages stay mounted via <Activity mode="hidden"> — tests must NOT assume a
single page in the DOM; `text=` expect-locators use `.first()` (active page renders first in DOM).
CI (`.github/workflows/ci.yml`) runs typecheck, lint, build, browser tests, and the e2e on every push/PR.

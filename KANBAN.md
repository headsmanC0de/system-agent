# Linux Agent — Kanban Board

## Completed — P0 (MVP Desktop App)

| ID | Task | Status |
|---|---|---|
| LH-001 | Electron app scaffold (React + Vite + TW4) | Done |
| LH-002 | IPC backend: 40+ handlers (packages, snapshots, services, hardware, GPU, etc.) | Done |
| LH-003 | 18 pages: Dashboard, Projects, Packages, Snapshots, Services, Autostart, Cron, Hardware, GPU, Disks, Network, Battery/BT, RGB, Logs, Passwords, Chat, LLM, Settings | Done |
| LH-004 | Sidebar layout (4 nav groups, collapsible) + Tesseract MoE LLM in Assistant | Done |
| LH-005 | CSS theme system (12 accent presets, semantic colors, noise texture) | Done |
| LH-006 | GPU crash workaround (software rendering) | Done |
| LH-007 | Password vault page (pass CLI backend) | Done |
| LH-008 | Battery & Bluetooth device monitoring (UPower + bluetoothctl) | Done |
| LH-009 | Architecture blueprint (BLUEPRINT.md) | Done |
| LH-010 | Projects page: dependency tracking, monorepo/turborepo support, production readiness checklist | Done |
| LH-011 | Agent Chat: SSE streaming, z.ai provider (OpenAI-compatible), thinking mode | Done |
| LH-012 | Settings page: AI Provider config (z.ai/OpenAI/Ollama/Custom), model picker, thinking toggle | Done |
| LH-013 | Mock data layer for browser testing (all 18 pages work without Electron) | Done |
| LH-014 | Playwright test suite: 133 tests (smoke + functional + screenshots + security) | Done |
| LH-015 | Real-time metrics: Dashboard/GPU/Hardware/Network at 1s refresh | Done |
| LH-016 | DRY refactoring: all 18 pages use shared ui.tsx components (Card, StatCard, Bar, Badge, SearchInput, Output, PageHeader) | Done |
| LH-017 | Custom hooks extraction: usePolling, useAsyncData, useCpuUsage in lib/hooks.ts | Done |
| LH-018 | Semantic CSS colors (success/warning/info) replacing 67 hardcoded colors | Done |
| LH-019 | Bug fixes: case-sensitivity (Services/Autostart search), dead imports, unused API methods | Done |

## Completed — P1 (Architecture Alignment)

| ID | Task | Status |
|---|---|---|
| LH-020 | Extract packages: `@project/types`, `@project/ui`, `@project/hooks` | Done |
| LH-021 | Light/Dark theme toggle | Done |
| LH-022 | Turbo tasks: typecheck, test, clean, preview in turbo.json | Done |
| LH-023 | Shared TypeScript configs: `packages/config` with tsconfig.base.json, tsconfig.app.json | Done |
| LH-024 | Turbo boundaries: tags (config/types/ui/hooks/app) + dependency rules in turbo.json | Done |
| LH-024 | Dependency cleanup: removed dead deps (class-variance-authority, clsx, tailwind-merge) | Done |
| LH-025 | AGENTS.md updated: ui.tsx rules, hooks rules, semantic colors, DRY rules | Done |
| LH-026 | Theme harmony: 12 spectrum-even hue presets, HSL palette generation (primary/secondary/muted/accent/border all derived) | Done |
| LH-027 | White-label rename: `@linux-helper/*` → `@project/*` across all packages, source, tests | Done |
| LH-028 | Biome linting: replace ESLint with Biome, config + CI-ready | Done |
| LH-029 | Code economy audit: D-01..D-11 dead code fixed, btn-secondary added, uk-UA locale fixed | Done |
| LH-030 | system:health IPC handler + System entry in Projects (OS health tracking) | Done |
| LH-031 | Battery watcher: BT device monitoring + desktop notifications at <25% | Done |
| LH-032 | Docs page: SQLite-backed knowledge base with CRUD UI | Done |
| LH-033 | shadcn/ui integration: dashboard-01 components (Card, Button, Badge, etc.) in @project/ui | Done |
| LH-034 | system:package-info, system:network, projects:outdated IPC handlers completed | Done |
| LH-035 | Comprehensive UX/UI audit + fixes across all 17 pages (contrast, touch targets, semantic colors, PageHeader) | Done |
| LH-036 | Security fix: removed hardcoded sudo password from IPC handlers | Done |
| LH-037 | Error handling: wrapped all destructive actions in try/catch (7 pages) | Done |
| LH-051 | Security audit: command injection fix in 12 IPC handlers (shell→cmd + input validation) | Done |
| LH-052 | Security: run_command tool allowlist (blocklist bypass fix) | Done |
| LH-053 | Security: mock data sanitization (fake passwords, sanitized paths, RFC 5737 IPs) | Done |
| LH-038 | Docs search fix: useAsyncData re-fetch on category/search change | Done |
| LH-039 | z.ai Coding Plan integration: correct endpoint `/api/coding/paas/v4/`, 4 models (GLM-5.1, 5-Turbo, 4.7, 4.5-Air) | Done |
| LH-040 | Function Calling: 6 system tools (get_system_info, get_gpu_status, get_disk_usage, get_service_status, get_network_info, run_command) | Done |
| LH-041 | Tool Streaming: `tool_stream: true` with live tool call argument rendering | Done |
| LH-042 | Token usage display: prompt/completion/cached tokens per message + session summary | Done |
| LH-043 | Chat sessions sidebar: topics + sessions, CRUD, rename, delete | Done |
| LH-044 | ChatToolbar: provider/model picker, Reason/Tools/Stream toggles, context bar | Done |
| LH-045 | Auto context compression: 75% threshold triggers archival + continuation session | Done |
| LH-046 | Branding SSOT: `lib/branding.ts` — 1 line rebrand (Linux Helper → Linux Agent) | Done |
| LH-047 | Mono theme fix: white accent instead of grey | Done |
| LH-048 | Tesseract MoE LLM page: model info, inference status, VRAM/throughput monitoring, config editor, start/stop | Done |
| LH-049 | Tesseract MoE LLM Chat provider: OpenAI-compatible endpoint, selectable in ChatToolbar | Done |
| LH-050 | LLM Hardware spec: Tesseract MoE LLM as builtin entry in Dashboard Hardware Configuration | Done |

## Completed — P2 (Production Hardening — Audit 2026-06-02)

| ID | Task | Status |
|---|---|---|
| LH-054 | Audit report (AUDIT.md): security/data/deps findings ranked by exploitability | Done |
| LH-055 | CLAUDE.md: codebase guide for Claude Code (architecture, IPC bus, mock layer, conventions) | Done |
| LH-056 | Security S-1: Z_AI key removed from opencode.json → `{env:Z_AI_API_KEY}` + gitignored `.env` + `.env.example` (rotation/history-scrub remain MANUAL) | Done |
| LH-057 | Security S-3: Content-Security-Policy via session onHeadersReceived (strict prod, dev-relaxed for Vite HMR) | Done |
| LH-058 | Security S-4: IPC channel allowlist (SSOT `src/main/channels.ts`) gating preload `invoke()` | Done |
| LH-059 | Security S-5: navigation hardening — `setWindowOpenHandler` deny+openExternal, `will-navigate` locked to dev URL (blocks `file:///etc/passwd`) | Done |
| LH-060 | Security S-6: converted remaining `shell()` interpolations (upower, bluetoothctl, projects) to `execFile`/`readFile` arg-arrays | Done |
| LH-061 | UX D-1/D-2: mock-mode banner when `!isElectron` + EMA smoothing (`ema()`) for CPU/memory metrics | Done |

| LH-064 | Lint normalization: Biome `check --write` + `--unsafe` across renderer (formatting, organizeImports, parseInt radix, unused imports/vars, autofocus); `noArrayIndexKey` disabled in biome.json (heuristic, static display lists); removed unused `Priority` type — **`npm run lint` now exits 0** | **Done** |
| LH-065a | Dep upgrade: **tailwind-merge 2→3** (3.6.0, Tailwind v4 compat), `engines.node` →`>=20.19` | **Done** |
| LH-065b | **Vite 6→8** (8.0.16) + **@vitejs/plugin-react 4→6** (6.0.2, Oxc/Rolldown) — the "upstream block" was a FALSE assumption from electron-vite's conservative peer range; forcing it via `overrides: { vite: ^8 }` **builds + runs**. Verified: typecheck + 135 browser (vite8 dev) + 4 Electron e2e (vite8 build) + 0 vuln. (Revisit the override once electron-vite lists `vite ^8` officially.) | **Done** |
| LH-063 | **GPU sandbox workaround scoped** — was unconditional (sandbox off for everyone); now `needsGpuSandboxWorkaround()` applies `--no-sandbox`/`--disable-gpu-sandbox` **only** on detected NVIDIA+Wayland (`/proc/driver/nvidia` + `XDG_SESSION_TYPE=wayland`), with `LH_GPU_WORKAROUND=1\|0` override → **OS sandbox recovered on every other setup**; affected boxes still auto-get the workaround (no regression). Both paths e2e-verified (`LH_GPU_WORKAROUND=0` launch test). | **Done** |
| LH-062 (eng) | Secret removed from tracked files (`{env:Z_AI_API_KEY}` + gitignored `.env`) **+ `.githooks/pre-commit` secret-guard** (wired via `core.hooksPath`, set by root `prepare`) that blocks re-committing key/Bearer/secret-shaped strings (dogfood-verified: blocks the leaked key, allows `{env:…}`). | **Done** |
| LH-068 | z.ai capability audit (docs vs code): integration is ~90% — thinking (Preserved, `reasoning_content` captured from stream **and** round-tripped across turns), streaming, `tool_stream`, function-calling (6 tools), automatic caching (`cached_tokens` shown), context compression all correct; model IDs match the Coding Plan. Gap: structured output (`response_format`) unused (minor, YAGNI). Added a policy-compliant **`zai-standard`** provider (`api/paas/v4`). | **Done** |

## Completed — P2 (Audit follow-up — 2026-06-12)

| ID | Task | Status |
|---|---|---|
| LH-070 | Last `shell()` interpolation removed: `llm:save-config` used `` shell(`mkdir -p ${configDir}`) `` → `fs.mkdir(recursive)`. S-6 is now fully closed (zero interpolated `shell()` calls). | **Done** |
| LH-071 | `password:insert` hardening: 15s timeout + `proc.on("error")` rejection — a hung `pass`/pinentry no longer leaves the IPC call pending forever. | **Done** |
| LH-072 | Chat base-URL validation: `isValidBaseUrl()` (https-only, http allowed for localhost/127.0.0.1/[::1]); Settings shows inline error, Chat refuses to send to an invalid endpoint. Covered by functional test. | **Done** |
| LH-073 | **Chat API key off localStorage** → encrypted at rest via Electron `safeStorage` (`secrets:get/set` IPC, `userData/secrets.json` 0600). Renderer keeps an in-memory cache (`loadApiKey()`), `saveChatConfig` strips `apiKey` from the persisted JSON, legacy plaintext keys are purged on load (no backward compat — re-enter once). Browser/mock fallback keeps tests green. Covered: 3 functional tests + e2e round-trip + secret-name validation. | **Done** |
| LH-074 | **Renderer sandbox recovered** (S-2 finalization): preload is now built as **CJS** (`preload.cjs`), removing the BF-035 root cause; `webPreferences.sandbox` is `true` everywhere except the NVIDIA+Wayland GPU-workaround combo (where the OS sandbox is already off). e2e-verified on both paths. | **Done** |
| LH-075 | **CI**: `.github/workflows/ci.yml` — npm ci → typecheck → lint → build → browser tests → Electron e2e (xvfb) on push/PR to main; failure artifacts uploaded. | **Done** |
| LH-076 | Cleanups: biome scripts referenced nonexistent `src/vite.config.ts`/`src/main.ts` (fixed → `src/main.tsx`); dead `tsdown.*.config.ts` removed; stale broken `@workspace/ui` alias removed from `vite.config.ts`; `executeToolCall` dynamic `import("../api")` → static (kills the Rolldown INEFFECTIVE_DYNAMIC_IMPORT warning); missing `system:battery-watch` MOCK added; `Llm.tsx` raw `<pre>` → shared `<Output>`. | **Done** |
| LH-077 | Deps refreshed (2026-06-12): electron 42.4.0, react/react-dom 19.2.7, electron-builder 26.15.2, @types/node 24→**25**, turbo 2.9.18, prettier 3.8.4 — typecheck/build/tests green, `npm audit` 0 vulns. Projects-page mock dep matrix synced to real versions. | **Done** |
| LH-078 | Root hygiene: 137 untracked PNG screenshots moved to `screenshots/`; AGENTS.md/CLAUDE.md refreshed to current reality (Biome, test counts, ui.tsx re-export). | **Done** |

## Handoff — single residual OPS action (not a code task)

All board **dev/engineering tasks are Done and verified**. One operational action remains that no
code change can perform — it requires the user's external account:

| ID | Action | Owner | Why |
|---|---|---|---|
| LH-062 (ops) | Rotate the (already-leaked) Z_AI key at z.ai, drop the new value in `.env`, then `git filter-repo` history scrub + force-push | **USER** | Needs the z.ai account login; force-pushing a rewritten shared history is irreversible. Recurrence is now guarded against (pre-commit hook); this is a one-time credential rotation. |
| LH-069 (policy) | **Eng done:** legal `zai-standard` provider (`api/paas/v4`) added **and the app's default switched to it** — a fresh install no longer points at the ToS-restricted Coding Plan endpoint (existing saved configs untouched). Residual is a USER choice: supply a standard pay-as-you-go key (or keep using local Tesseract/Ollama). | **USER (key/billing)** | Standard API is metered vs the flat Coding Plan; only the account owner can supply a standard key. |

## Bug Fixes Applied

| ID | Bug | Severity | Fix |
|---|---|---|---|
| BF-001 | Passwords race condition: wrong entry password flash on fast switching | High | Clear detail state before async fetch |
| BF-002 | Packages search case-sensitive on name | Medium | Added `.toLowerCase()` to both sides |
| BF-003 | Dashboard disk value showed available instead of used | Medium | Changed index from `[2]` to `[1]` |
| BF-004 | Chat initial message in Ukrainian vs English UI | Medium | Changed to English |
| BF-005 | Services/Network pages: unhandled IPC rejections | Medium | Added try/catch on refresh callbacks |
| BF-006 | Chat hardcoded localhost:11435 endpoint | High | Provider system with z.ai/OpenAI/Ollama/Custom config |
| BF-007 | Settings missing AI provider configuration | High | Added Settings sidebar with provider/model/params |
| BF-008 | No real-time metrics on monitoring pages | Medium | Changed Dashboard/GPU/Hardware/Network to 1s interval |
| BF-009 | Infinite re-render in Packages/Services/Autostart from unmemoized callback | High | Ref-based useAsyncData/usePolling hooks |
| BF-010 | Hardcoded sudo password in IPC handlers (security vulnerability) | Critical | Replaced with security message redirecting to Settings |
| BF-011 | Docs page useAsyncData not re-fetching on category/search change | High | Added useEffect with prev ref comparison to trigger re-fetch |
| BF-012 | Missing error handling on destructive actions across 7 pages | High | Wrapped all async action handlers in try/catch with setOutput |
| BF-013 | 12 pages used raw `<h1>` instead of shared `PageHeader` component | Medium | Replaced all raw headings with `<PageHeader title="..." />` |
| BF-014 | Hardcoded `text-green-500` in Dashboard Activity icon | Medium | Replaced with `text-success` semantic token |
| BF-015 | `text-[10px]` below WCAG readability threshold (22 occurrences) | Medium | Replaced all with `text-xs` (12px minimum) |
| BF-016 | Inline `<pre>` elements instead of shared `Output` component | Medium | Replaced `<pre>` with `<Output>` in Docs, Passwords; `<div>` in Chat |
| BF-017 | `text-purple-400` hardcoded in Battery page | Low | Replaced with `text-info` semantic token |
| BF-018 | Sparkline `hsl(var(--primary))` double-wrapped → invisible black graph | High | Changed to `var(--primary)` — TW4 vars already contain hsl() |
| BF-019 | CPU% negative values from unstable mock data | High | Time-based mock tick + `Math.max(0, Math.min(100, ...))` clamp in hooks |
| BF-020 | Empty `<Output>` blocks rendering blank cards on 6 pages | Medium | Wrapped all in `{output && <Output>}` |
| BF-021 | Card components missing padding across 23 instances in 9 pages | Medium | Added `p-4` to all stat/detail cards |
| BF-022 | Uneven layout: `max-w-6xl mx-auto` added horizontal margins | Medium | Removed max-width constraint, uniform `p-3` padding |
| BF-023 | `space-y-6` too spacious between sections | Low | Changed to `space-y-3` across all 17 pages |
| BF-024 | Page titles duplicated in content AND header bar | Medium | Removed all `<PageHeader>` and `<h1>` from page content |
| BF-025 | SearchInput icon overlapping placeholder text | Medium | Fixed: `left-3` + `pl-9` with proper pointer-events-none |
| BF-026 | Chat: no padding on messages card, no provider status | High | Added `p-4` padding, provider config check, warning banner |
| BF-027 | Projects: nested `<button>` inside `<button>` (React DOM error) | Medium | Changed outer `<button>` to `<div>` with cursor-pointer |
| BF-028 | Command injection in 12 IPC handlers via `shell()` with user input | Critical | Converted to `cmd()` with input validation (assertServiceName, assertBtMac, assertPassPath, PID clamping, action whitelist) |
| BF-029 | `run_command` tool used blocklist bypass (curl, bash, etc. not blocked) | High | Switched to allowlist approach: only known-safe command prefixes permitted |
| BF-030 | Mock passwords triggered secret scanners (`ghp_xK9m...`, `S3cur3P@ss!`) | Medium | Replaced with `ghp_MOCK_NOT_A_REAL_TOKEN`, `mock-password-not-real` |
| BF-031 | Mock data exposed real filesystem path (`/home/headsmanc0de/...`) | Medium | Replaced with `/home/user/projects/linux-helper` |
| BF-032 | Mock data included partial real public IP (`93.174.XX.XX`) | Low | Replaced with RFC 5737 TEST-NET-3 range (`203.0.113.1`) |
| BF-033 | Users saw fabricated data (62.9 GB RAM, fake BT devices, jumping metrics) with no indication it was mock — happened because the renderer was opened in a browser tab (`!window.electronAPI`) instead of the Electron window | High | Added mock-mode banner (`data-testid="mock-mode-banner"`) shown when `!isElectron`; EMA smoothing to reduce metric jitter |
| BF-034 | `useState` called AFTER a conditional `return null` in `ChecklistSection` + `SystemCheckSection` (Projects.tsx) — Rules-of-Hooks violation, latent crash when a check category transitions empty↔non-empty across renders | High | Moved `useState` above the early return (caught by Biome `useHookAtTopLevel` during LH-064 lint sweep; masked before because mock data always populated the categories) |
| BF-035 | **IPC completely dead in production builds** — `window.electronAPI` undefined because electron-vite emits an ESM (`.mjs`) preload which Electron won't load while the renderer sandbox is enabled (the default). App only ever worked under `electron-vite dev`. | Critical | `webPreferences.sandbox: false` in main.ts (OS sandbox already off via GPU workaround; contextIsolation still on). Caught by the new Electron-mode e2e (BF was invisible to browser/mock tests). |
| BF-036 | `df --no-header` is not a valid GNU df flag → `system:overview` and `system:disk` handlers threw in real Electron, breaking the Dashboard overview + Disks page | High | Replaced with `df ... \| tail -n +2` (drop header line). Caught by the Electron-mode e2e doing a real `system:overview` round-trip. |
| BF-037 | CSP was set only via `session.onHeadersReceived`, which does NOT fire for `file://` loads → the production renderer shipped with NO CSP | High | Inject a strict CSP `<meta>` at build time (electron.vite.config `transformIndexHtml`, `apply: build`); kept the header for dev/http. Caught by the Electron-mode e2e. |
| BF-038 | Switching the preload to CJS (LH-074) silently bundled the **electron npm launcher** (`node_modules/electron/index.js`) into `preload.cjs`: in the cjs-format override electron-vite skips its auto-externalization of `electron` → preload crashed at load, `window.electronAPI` undefined | Critical | Explicit `external: ["electron"]` in the preload `rollupOptions`. Caught immediately by the Electron-mode e2e (`npm run test:e2e`). |
| BF-039 | `safeStorage.encryptString` throws "Encryption is not available" on Linux when no keyring (kwallet/libsecret) is unlocked — first `secrets:set` would crash | High | `getSafeStorage()` falls back to `setUsePlainTextEncryption(true)` (basic_text backend) when `isEncryptionAvailable()` is false; secrets file stays 0600. Caught by the new LH-073 e2e test. |

### Blindspot analysis (BF-033)

- **Blindspot:** the mock/real data boundary was invisible. The whole test suite runs in **browser mode against the mock layer**, so "data renders" was always green even though no real IPC path was ever exercised — and a user in a browser tab had no signal the numbers were fake.
- **Why allowed:** mock layer was built for testability (LH-013) but treated as an internal detail, never surfaced in the UI; tests asserted *presence* of values, not *provenance*.
- **Matrix changes to prevent recurrence:** (1) "Mock/real mode indicator" is now a shipped UI invariant (banner) + covered by a test; (2) **"Electron IPC boundary"** stays an explicit open Test Gap — browser tests cannot catch a renderer/main contract drift (e.g. a channel the renderer calls but main never registers). Until an Electron-mode e2e exists, the `channels.ts` allowlist is the SSOT that must match `ipc.ts` registrations.
- **Wider-impact check performed:** diffed all 64 `invoke(...)` channels in `api.ts` against `ipcMain.handle(...)` in `ipc.ts`. Found **9 mock-only channels with no real handler** — `projects:add/list/remove/scan`, `system:hardware-specs/logs/network-interfaces/open-ports/rollback-snapshot`. They work in browser/mock mode but would error in real Electron. This is the same blindspot (mock masks missing handlers); logged as LH-066. The S-4 allowlist (`channels.ts`) is built from the full api.ts invoke set, so it does not add new breakage.

| ID | Task | Status |
|---|---|---|
| LH-066a | `projects:add/list/remove/scan` — **done**: made `projects.*` renderer-local (localStorage, works in both browser & Electron), removed dead MOCK+IPC channels, allowlist now an exact 1:1 with api invoke set. Verified: typecheck + lint + build + 135/135 | **Done** |
| LH-066b | `system:logs/open-ports/network-interfaces/hardware-specs/rollback-snapshot` — **implemented** real `ipcMain.handle` mirroring existing handlers (journalctl / `ss -tulnp` / `ip -j addr` + `/proc/net/dev` / cpuinfo+lspci+dmi / `sudo snapper rollback`). Typecheck + build + 135/135 pass. ⚠️ runtime needs real-Arch smoke test (same caveat as all 60 ipc handlers) | **Done (code); hardware smoke pending)** |
| LH-067 | **Electron-mode e2e** (`tests/electron.spec.ts`, `npm run test:e2e`) — launches the real built app via Playwright `_electron`, verifies preload IPC allowlist (real `system:overview` round-trip + unknown-channel rejection), CSP meta, and `window.open` denial. Closes the "Electron IPC boundary" gap. Found 3 production bugs (BF-035/036/037). Now 6/6 pass (secrets + recovered-sandbox tests added) | **Done** |

### Blindspot analysis (BF-038 / BF-039 — found during LH-073/LH-074, 2026-06-12)

- **Blindspot:** build-tool defaults are config-sensitive invariants. Overriding one rollup option (`output.format: "cjs"`) silently disabled an *unrelated* electron-vite behavior (auto-externalizing `electron`); and `safeStorage` availability depends on desktop session state (unlocked keyring), not on code.
- **Why allowed:** both behaviors are implicit — nothing in the config or API types says "externalization is format-dependent" or "encryptString throws without a keyring". Unit-level reasoning could not catch either; only executing the real production build in a real session could.
- **Matrix change to prevent recurrence:** the Electron-mode e2e is the standing guard for this class — **any change to `electron.vite.config.ts`, `main.ts` webPreferences, or preload must run `npm run test:e2e` before merge**. This is now enforced automatically: CI (LH-075) runs the e2e on every push/PR, so config-sensitive regressions can no longer land unnoticed.
- **Wider-impact check performed:** verified the built `preload.cjs` no longer contains the npm launcher (`grep install.js` clean); both sandbox paths re-verified (`LH_GPU_WORKAROUND=0` launch test); secrets round-trip verified against real `safeStorage` in e2e; full browser suite re-run to confirm the mock fallback keeps non-Electron mode intact.

## Backlog — P1 (Feature)

| ID | Task | Priority | Status |
|---|---|---|---|
| LH-026 | Zig shared library (syscalls: sysinfo, /proc, statvfs, NVML) — Zig 0.16 migration | P1 | Pending |
| LH-027 | Zig .so → Electron native addon (node-addon-api or ffi-napi) | P1 | Pending |
| LH-028 | Package search with debounce + package detail modal | P1 | Pending |
| LH-029 | GPU fan control slider, power limit adjustment | P1 | Pending |
| LH-030 | BT Device Popup: volume, audio profile, PipeWire EQ presets, media controls (on device card click) | P1 | Pending |
| LH-031 | Projects: real IPC (read package.json, npm outdated, cargo outdated) | P1 | Pending |
| LH-032 | Projects: function calling integration (Chat agent can query project deps) | P1 | Pending |
| LH-033 | Snapshot diff viewer (compare snapshot vs current) | P1 | Pending |
| LH-034 | Export system report (JSON/HTML) | P1 | Pending |

## Backlog — P2 (Platform Maturity)

| ID | Task | Priority | Status |
|---|---|---|---|
| LH-035 | Brand Runtime: `packages/brand-runtime`, `brands/default/` with brand.config.ts | P2 | Pending |
| LH-036 | Repo Doctor: `tools/repo-doctor/` with package-boundaries, app-thinness, contract checks | P2 | Pending |
| LH-037 | Deploy configs: `deploy/` with systemd, AppImage, flatpak | P2 | Pending |
| LH-038 | Release manifests: version, commit, checks, env contract | P2 | Pending |
| LH-039 | `.agents/commands/`: diagnose-issue, add-package, refactor-to-package, release-check | P2 | Pending |
| LH-040 | AI_POLICY.md | P2 | Pending |
| LH-041 | Docs structure: `docs/architecture/`, `docs/decisions/`, `docs/runbooks/` | P2 | Pending |
| LH-042 | RGB custom color picker (hex input + color wheel) | P2 | Pending |
| LH-043 | Mock data extraction to `packages/mock-data` | P2 | Pending |

## Backlog — P3 (Windows Installer + Advanced)

| ID | Task | Priority | Status |
|---|---|---|---|
| LH-044 | Windows Installer App — Electron/React for Linux migration prep | P3 | Backlog |
| LH-045 | Hardware scanner (CPU/GPU/RAM/storage/UEFI vs BIOS/WiFi/BT) | P3 | Backlog |
| LH-046 | BIOS update checker + config guide | P3 | Backlog |
| LH-047 | Arch ISO downloader + USB flasher | P3 | Backlog |
| LH-048 | Migration profile export/import | P3 | Backlog |
| LH-049 | Zigzag TUI fallback (terminal UI for SSH/recovery) | P3 | Backlog |
| LH-050 | Security audit panel (random-seed perms, UFW, secrets scan) | P3 | Backlog |
| LH-051 | Btrfs backup dashboard (snapper + btrbk + external drive) | P3 | Backlog |
| LH-052 | Boot manager (systemd-boot entries, kernel params, initramfs rebuild) | P3 | Backlog |
| LH-053 | Audio configurator (PipeWire/WirePlumber device renaming) | P3 | Backlog |
| LH-054 | Dev stack status panel (Zig/Rust/Node/Python/CUDA versions) | P3 | Backlog |
| LH-055 | Examples/templates for each platform module | P3 | Backlog |

## Blueprint Alignment Matrix

| Blueprint Principle | Current State | Gap |
|---|---|---|
| Core-first architecture | 3 packages extracted: types, ui, hooks | Need packages/kernel for domain logic |
| Thin app shells | Desktop app has pages + IPC + mock data | Still has domain logic inline |
| Embeddable packages | `packages/types`, `packages/ui`, `packages/hooks` live | Need packages/mock-data, packages/ipc-contracts |
| Contract surface | Implicit types in types.ts | Need Zod schemas, explicit contracts |
| Repo as product | AGENTS.md, KANBAN.md, BLUEPRINT.md | Missing docs/, tools/, deploy/, examples/ |
| Turbo boundaries | Tags (config/types/ui/hooks/app) + dependency rules in turbo.json | Complete |
| Task contracts | typecheck, test, clean, build, lint, dev, preview | Need codegen, package, deploy |
| Brand packs | Theme system (12 spectrum-even presets + light/dark + HSL palette + Mono white) + branding.ts SSOT | Need brand.config.ts, feature flags |
| Repo doctor | None | Need tools/repo-doctor |
| Agent commands | None | Need .agents/commands/ |
| Quality gates | Playwright 138 browser + 6 Electron e2e + tsc + Biome + GitHub Actions CI (typecheck/lint/build/tests on every push) + security hardening (CSP, IPC allowlist, nav guards, sandbox, safeStorage secrets) | Need contract validation (Zod schemas) |

## Package Map

```
packages/
  config/  → @project/config  (tsconfig.base.json, tsconfig.app.json — shared TS configs)
  types/   → @project/types  (all TS interfaces, PageId union (18 pages), CpuSample, TokenUsage, ToolCallInfo, LLMModelInfo, LLMInferenceStatus, LLMConfig, etc.)
  ui/      → @project/ui     (Card, StatCard, Bar, Badge, SearchInput, Output, PageHeader + shadcn: Button, Separator, Skeleton)
  hooks/   → @project/hooks  (usePolling, useAsyncData, useCpuUsage, useCpuHistory, ema)

apps/
  desktop/ → @project/desktop (Electron 42 + React 19 + Vite 8 + TW4 + Biome 2)
    src/main/channels.ts     → SSOT IPC channel allowlist (preload gate + ipc.ts handlers)
    src/components/ui.tsx    → re-exports from @project/ui
    src/components/ChatToolbar.tsx   → provider/model picker, feature toggles, context tracking
    src/components/SessionSidebar.tsx → topics + sessions CRUD
    src/components/brand-logo.tsx    → SVG logo with branding SSOT
    src/lib/branding.ts     → BRAND_NAME, BRAND_SHORT, BRAND_ID (1-line rebrand)
    src/lib/chat.ts          → Provider config, SYSTEM_TOOLS, executeToolCall, buildRequestBody
    src/lib/sessions.ts      → Topics, Sessions, context compression, token stats
    src/lib/hooks.ts         → re-exports from @project/hooks
    src/types.ts             → re-exports from @project/types
```

## Test & Functionality Matrix (138 browser + 6 Electron e2e — ALL PASS, 2026-06-12)

| Page | UI | Mock Data | Interactive | Real-time | Shared UI | Dark/Light |
|---|---|---|---|---|---|---|
| Dashboard | yes | overview, cpu, mem, procs | kill process | 1s | Card, Bar, StatCard | yes |
| Projects | yes | health rings, deps, checklist | expand workspace, tabs | - | Card, Badge, Bar | yes |
| Packages | yes | 100+ pkgs, outdated, orphans | search, update, remove | - | StatCard, SearchInput, Output | yes |
| Snapshots | yes | snapshot table with types | create/delete/rollback | - | Badge, Output | yes |
| Services | yes | running + failed | restart/stop, search | - | StatCard, Badge | yes |
| Autostart | yes | entries with state | enable/disable, search | - | SearchInput | yes |
| Cron | yes | crontab + timers | edit/save | - | Output | yes |
| Hardware | yes | CPU + sensors | - | 1s | Bar, Output | yes |
| GPU | yes | temp/util/fan/vram/power | - | 1s | Bar | yes |
| Disks | yes | disk entries with 3-color bars | - | - | Bar (colorTiers) | yes |
| Network | yes | connections table | - | 1s | Badge | yes |
| Battery/BT | yes | UPower + BT devices | connect/disconnect, tabs | 30s | Card, Badge | yes |
| RGB | yes | devices with presets | apply color, all white/off | - | Output | yes |
| Logs | yes | journal output | count selector, refresh | - | Output | yes |
| Passwords | yes | vault entries + detail | show/copy/delete/generate | - | Card, Badge | yes |
| Chat | yes | welcome message, input | SSE streaming, thinking, tools, sessions | yes | Card, ChatToolbar, SessionSidebar | yes |
| LLM | yes | model info, inference status, config | start/stop, config editor | 1s | Card, Bar, Sparkline, StatCard | yes |
| Settings | yes | accents, provider, about | 12 presets, mode, config | - | Card, Badge | yes |

## Test Gaps (needs coverage)

| Gap | Risk | Priority |
|---|---|---|
| Electron IPC boundary (preload allowlist, CSP, nav guards, real IPC round-trip) | Covered — `tests/electron.spec.ts` (`npm run test:e2e`), 6 tests | Done |
| Secrets at rest (safeStorage round-trip, plaintext purge, name validation) | Covered — functional (3) + e2e (1) | Done |
| Base-URL validation (https-only custom endpoints) | Covered — functional | Done |
| CI gate (typecheck/lint/build/tests on push) | Covered — `.github/workflows/ci.yml` | Done |
| Chat SSE with real API | High | P1 |
| Light mode screenshot test | Medium | P1 |
| IPC failure error handling | Medium | P2 |
| Empty state pages | Low | P2 |
| Keyboard a11y | Medium | P2 |
| Mock-mode banner | Covered (functional.spec — D-1) | Done |

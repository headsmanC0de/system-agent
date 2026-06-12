# Linux Agent — Audit Report

**Date:** 2026-06-02 (follow-up audit & remediation: 2026-06-12)
**Scope:** `apps/desktop` (Electron app) + monorepo packages, dependency currency
**Threat model:** local single-user desktop app managing the user's own machine

---

## Remediation status — follow-up audit (2026-06-12)

| Item | Status |
|---|---|
| S-2 renderer sandbox (finalization) | **Done** — preload rebuilt as **CJS** (`preload.cjs`), removing the BF-035 ESM constraint; `webPreferences.sandbox: true` everywhere except the NVIDIA+Wayland workaround combo. Found+fixed BF-038 (electron npm launcher bundled into the CJS preload — explicit `external: ["electron"]`). e2e-verified on both paths. |
| S-6 (residual) | **Done** — last interpolated `shell()` (`llm:save-config` mkdir) → `fs.mkdir`. Zero interpolated shell calls remain (sudo-stdin S-7 still pending polkit). |
| API keys in localStorage | **Done (LH-073)** — chat API key now encrypted at rest via `safeStorage` (`secrets:get/set` IPC, 0600 file); plaintext purged from `lh-chat-config` on load; BF-039 (no-keyring Linux fallback) found+fixed via e2e. |
| Custom base-URL validation | **Done (LH-072)** — https-only (http allowed for localhost); enforced in Chat send path + Settings inline warning. |
| `password:insert` hang | **Done (LH-071)** — 15s timeout + error rejection. |
| CI | **Done (LH-075)** — GitHub Actions: typecheck/lint/build/browser tests/Electron e2e on push & PR. |
| Deps (2026-06-12) | **Done (LH-077)** — electron 42.4.0, react 19.2.7, electron-builder 26.15.2, @types/node 25, turbo 2.9.18; 0 vulns. |
| Hygiene | **Done (LH-076/078)** — biome script paths fixed, dead tsdown configs + stale alias removed, dynamic-import warning fixed, root PNGs → `screenshots/`, AGENTS.md refreshed. |
| S-1 key rotation | ⚠️ **STILL OPEN (USER ops)** — the compromised Z_AI key remains in `.env` and in pushed git history. Rotate at z.ai, then `git filter-repo` + force-push. Code-side guards (pre-commit hook) are in place. |

Verification (2026-06-12): `tsc --noEmit` clean, lint exit 0, **138 browser + 6 Electron e2e** pass, build PASS, `npm audit` 0 vulns.

---

## Remediation status (2026-06-02)

| Item | Status |
|---|---|
| S-1 key in opencode.json | **Done (eng)** — `{env:Z_AI_API_KEY}` + gitignored `.env` + **`.githooks/pre-commit` secret-guard** preventing recurrence (dogfood-verified). ⚠️ opencode does **not** auto-load `.env` — `set -a; source .env; set +a` (or export in `~/.zshrc`) before launching. ⚠️ **rotation + history scrub + force-push remain a USER ops action** (key still compromised in pushed history). |
| S-2 sandbox | **Done (scoped)** — the `--no-sandbox`/`--disable-gpu-sandbox` workaround is now applied **only** on detected NVIDIA+Wayland (`needsGpuSandboxWorkaround()`, `LH_GPU_WORKAROUND` override), so the OS sandbox is **recovered on all other setups**; affected boxes still auto-get it. Both paths e2e-verified. NOTE: `webPreferences.sandbox` stays `false` (ESM preload — BF-035); fully sandboxing the renderer additionally needs a CJS preload. contextIsolation is the active isolation boundary. |
| S-3 CSP | **Done** — `session.onHeadersReceived` (dev/http) **plus** a build-time strict CSP `<meta>` for the prod `file://` renderer (onHeadersReceived doesn't fire for file://, found via e2e — BF-037). Verified by Electron e2e. |
| S-4 IPC allowlist | **Done** — `src/main/channels.ts` SSOT gates preload `invoke()`. |
| S-5 nav guards | **Done** — `setWindowOpenHandler` + `will-navigate` locked to dev URL. |
| S-6 shell interpolation | **Done** — upower/bluetoothctl/projects now `execFile`/`readFile`. |
| D-1 mock-mode confusion | **Done** — banner + test. |
| D-2 metric jitter | **Done** — `ema()` smoothing. |
| deps / Vite upgrade | **Done** — Vite 6→**8.0.16** + @vitejs/plugin-react 4→**6.0.2** + tailwind-merge 2→**3.6.0** + `engines.node`→`>=20.19`. The Vite 8 "block" was a wrong inference from electron-vite's conservative peer range — empirically it builds+runs (forced via `overrides`). Verified: typecheck + 135 browser + 4 Electron e2e + 0 vuln. |
| lint | **Done** — `npm run lint` exits 0; found+fixed a real Rules-of-Hooks crash (BF-034). |
| IPC handlers | **Done** — 5 mock-only system channels implemented; `projects.*` made renderer-local; preload allowlist now 1:1 with the api invoke set. Runtime needs real-Arch smoke test. |

**Electron-mode e2e added** (`tests/electron.spec.ts`, `npm run test:e2e`) launches the real built app and verified the main-process security (CSP, IPC allowlist + real round-trip, nav guards) — closing the "untested in real Electron" gap. It surfaced 3 production bugs that browser/mock tests could never see:
- **BF-035 (Critical):** ESM `.mjs` preload + default renderer sandbox → `window.electronAPI` undefined → **all IPC dead in production builds** (app only worked under `electron-vite dev`). Fixed with `webPreferences.sandbox: false`.
- **BF-036 (High):** `df --no-header` (invalid GNU flag) crashed `system:overview` + `system:disk`. Fixed with `| tail -n +2`.
- **BF-037 (High):** CSP never reached the `file://` renderer. Fixed with a build-time CSP `<meta>`.

Verification: `tsc --noEmit` clean (all workspaces), `npm run lint` exit 0, **135 browser + 4 Electron e2e** pass, build PASS, 0 npm vulns, 2 reviewer passes.

---

## 0. Executive summary

Codebase is solid on the fundamentals: parameterized SQL, `execFile`+arg-arrays with a path-allowlist regex on the password vault, `contextIsolation: true` / `nodeIntegration: false`, no `eval`/`innerHTML`, `npm audit` = 0 vulnerabilities. 132/133 Playwright tests pass (the 1 stale failure was fixed).

Three things need action, in order:

1. **CRITICAL — leaked Z_AI API key is in pushed git history.** Rotate now.
2. **HIGH — Chromium sandbox is fully disabled** as a GPU workaround.
3. **Data confusion — the app is being viewed in browser/mock mode**, so every number on screen is fabricated (this is the "62.9 GB RAM", jumping metrics, and fake Bluetooth devices the user is seeing).

---

## 1. Security findings (ranked by exploitability)

### CRITICAL

**S-1 — Z_AI API key committed and pushed.**
`opencode.json` contained a z.ai key (`7171352f…` — full value redacted here; it lives in git history, see below) **reused in 4 places** (1× `zai-mcp-server.env.Z_AI_API_KEY`, 3× `Authorization: Bearer` headers for web-search-prime / web-reader / zread). The key is present in commit `efa0312` which is on `origin/main` (`github.com/headsmanC0de/linux-agent`). Removing it from the working file does **nothing** — it stays in history.
**Fix:** (a) rotate/revoke the key at z.ai immediately — treat as compromised; (b) scrub history (`git filter-repo` / BFG) and force-push, or if the repo is private and low-value, at minimum rotate; (c) move to env var `${Z_AI_API_KEY}` going forward, key in gitignored `.env`. All 4 occurrences are covered by one rotation but verify none is missed.

### HIGH

**S-2 — Chromium sandbox fully off.** `main.ts:7-8`: `--no-sandbox` + `--disable-gpu-sandbox` (on top of `disableHardwareAcceleration()` at `:6`). This removes the OS-level sandbox for the whole renderer, not just the GPU process. The GPU crash workaround may no longer need these flags now that HW accel is already off.
**Fix:** empirically test removing both `appendSwitch` lines while keeping `disableHardwareAcceleration()`. If the NVIDIA+Wayland crash stays gone, the sandbox is recovered for free. Don't assume — test.

### MEDIUM

**S-3 — No Content-Security-Policy.** No CSP meta tag in `index.html` and no `onHeadersReceived` CSP in main. There is **no current XSS vector** (no `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere), but the Chat page fetches remote LLM output and renders it — CSP is the missing backstop if a future render path injects HTML.
**Fix:** add a strict CSP (`default-src 'self'; connect-src 'self' <llm endpoints>; ...`).

**S-4 — Generic IPC passthrough, no allowlist.** `preload.ts` exposes `invoke(channel, ...args)` for **any** channel. The renderer can call every `ipcMain.handle` with arbitrary args. Combined with S-3, any future renderer XSS = arbitrary IPC (incl. `sudo`, `pass`, snapper). Renderer is trusted today, so this is defense-in-depth.
**Fix:** expose a typed, allowlisted API surface instead of raw `invoke`.

**S-5 — No navigation guards.** No `setWindowOpenHandler` / `will-navigate` handler in `main.ts`. Standard Electron hardening gap — a stray link/`window.open` could navigate the app frame or open arbitrary windows.
**Fix:** add `webContents.setWindowOpenHandler(() => ({ action: 'deny' }))` and a `will-navigate` guard pinned to the app origin.

### LOW

**S-6 — `shell()` string interpolation.** A few handlers interpolate values into `bash -c` strings:
- `ipc.ts:755` `cd "${dir}"` (dir from `find /home`)
- `ipc.ts:640` `upower -i "${p}"` (p from `upower -e`)
- `ipc.ts:685` `bluetoothctl info "${mac}"` (mac from device list)

Inputs are filesystem/system-derived, not direct user input, so exploiting needs local presence or a planted directory/device name containing `"` or `$()`. Real but low.
**Fix:** switch these to `cmd()`/`execFile` with arg arrays (as the password handlers already do), or validate/escape.

### INFO / known

- **S-7 — `sudo` password via stdin** (snapper/pacman). Known; polkit migration pending.

### Confirmed GOOD (no action)

- Password vault: `cmd("pass", [...])` with `assertPassPath()` regex (`ipc.ts:81`) — injection-safe.
- Docs DB: fully parameterized (`?` placeholders, incl. `LIKE` search) — no SQL injection.
- `contextIsolation: true`, `nodeIntegration: false`.
- No `eval` / `innerHTML` / `dangerouslySetInnerHTML` in `src/`.
- `npm audit --omit=dev`: **0 vulnerabilities**.

---

## 2. Data / UX findings

**D-1 — The app is running in browser/mock mode, so all data is fake.**
`api.ts:1` `const isElectron = !!window.electronAPI`. When false (renderer opened in a plain browser at `localhost:5173` instead of the Electron window), every API call falls back to the `MOCK` record. Evidence from the user's screen:
- "20.5 GB / 62.9 GB" RAM = mock constant `total: 67489812480` (62.85 GB) × `rand(0.28,0.35)` (`api.ts:23`).
- Jumping CPU / Load = `rand()`/`jitter()` regenerated every 1s poll.
- Bluetooth devices "WH-1000XM6 / Keychron K2 / DualSense / Xbox" = hardcoded mock array (`api.ts:367-415`), not the user's real devices.

`electronAPI` is only injected by the **preload of a real Electron window**. Run `cd apps/desktop && npm run dev` and use the Electron window it spawns (not a browser tab). If the window doesn't appear → NVIDIA+Wayland crash (see S-2).

**D-2 — Metric jitter, no smoothing.** Even in real Electron mode, CPU% is an instantaneous `/proc/stat` delta over 1s (`useCpuHistory`, `packages/hooks/src/index.ts`) with no smoothing → 0↔100 swings.
**Fix:** EMA smoothing in `useCpuHistory`/memory, e.g. `next = prev*0.7 + sample*0.3`.

---

## 3. Dependency currency (as of 2026-06-02)

SSOT = `package-lock.json`. Latest from registry/`npm outdated`; change notes from official docs.

| Package | Installed | Latest | Gap | Notes |
|---|---|---|---|---|
| electron | 42.3.0 | 42.3.1 | patch | trivial |
| react / react-dom | 19.2.6 | 19.2.7 | patch | trivial |
| @types/react | 19.2.15 | 19.2.16 | patch | trivial |
| @types/node | 24.12.4 | 25.9.1 | major | optional |
| vite | 6.4.2 | 8.0.16 | **2 major** | see V8 below |
| @vitejs/plugin-react | 4.7.0 | 6.0.2 | **2 major** | see below |
| tailwind-merge | 2.6.1 | 3.6.0 | **major** | v3 needed for Tailwind v4 (we're on TW v4) |
| electron-vite | 5.0.0 | 5.x | current | ok |
| @biomejs/biome | 2.4.16 | 2.x | current | ok |
| @playwright/test | 1.60.0 | 1.6x | ~current | ok |
| sql.js | 1.14.1 | 1.x | current | ok |
| turbo | 2.9.16 | 2.x | current | ok |

**Vite 8** ([announce](https://vite.dev/blog/announcing-vite8), [migration](https://vite.dev/guide/migration)): Rolldown+Oxc replace esbuild+Rollup (10–30× faster builds); **Node 20.19+ / 22.12+ required**; raised browser targets (Chrome 111, Firefox 114, Safari 16.4); rename `esbuild`→`oxc`, `build.rollupOptions`→`build.rolldownOptions`; dropped SystemJS/AMD output, object-form `manualChunks`, some Rollup hooks; CJS default-import interop tightened (`legacy.inconsistentCjsInterop` escape hatch). Compat layer auto-converts most config.

**@vitejs/plugin-react v6** ([releases](https://github.com/vitejs/vite-plugin-react/releases)): uses Oxc for React Refresh, **Babel dropped as a dependency** (smaller install); custom Babel plugins now go through separate `@rolldown/plugin-babel`; React Compiler via `reactCompilerPreset`; **drops support for Vite ≤7** (so plugin-react 6 ⇒ Vite 8).

**tailwind-merge v3** ([releases](https://github.com/dcastil/tailwind-merge/releases)): v3.x is the line that supports **Tailwind CSS v4** (incl. 4.3); v2.x is Tailwind v3 only. Project runs Tailwind v4 but `tailwind-merge` 2.6.1 → **version mismatch** (see D-3).

**D-3 — Dead / mismatched deps.** Per `AGENTS.md`, `class-variance-authority` / `clsx` / `tailwind-merge` are installed in the desktop app but unused. `packages/ui` does use `clsx` + `tailwind-merge`, but pins `tailwind-merge ^2.6.0` while the repo is on Tailwind v4 (wants v3.x). Either remove the dead desktop deps and bump `packages/ui` to `tailwind-merge@^3`, or confirm they're genuinely unused and drop them.

> Upgrade note: Vite 8 + plugin-react 6 move as a pair and require Node ≥20.19; `package.json engines` currently says `>=18`. Not urgent — defer behind the security items.

---

## 4. Repo hygiene

- **H-1 — AGENTS.md drift.** `apps/desktop/AGENTS.md` predates the monorepo split + Biome switch: says "eslint" (actual: **Biome**, `biome.json`), "Vite 8" (actual: **Vite 6**), and "110 tests" (actual: **133**). Trust `package.json`/`CLAUDE.md`.
- **H-2 — Tracked snapshot artifacts.** `snap-*.md` (18 files) committed at repo root. `*.png` screenshots are correctly gitignored, but the working tree has ~150 of them — clutter.
- **H-3 — `engines.node: >=18`** is below what current Vite/plugin-react majors require (20.19+); revisit when upgrading.

---

## 5. Recommended action order

1. **S-1** — rotate the Z_AI key now; scrub history; move to env var. *(blocking, do first)*
2. **D-1** — confirm you run the Electron window, not a browser tab, to see real data.
3. **S-2** — test removing `--no-sandbox`/`--disable-gpu-sandbox`; recover the sandbox if the crash stays fixed.
4. **S-3, S-4, S-5** — add CSP, allowlist IPC, add navigation guards. *(defense-in-depth batch)*
5. **D-2** — EMA-smooth the metrics.
6. **S-6** — convert remaining `shell()` interpolations to arg-array `cmd()`.
7. **D-3 / H-1 / H-3** — dep cleanup + doc fixes; plan the Vite 8 / plugin-react 6 / Node 20.19 upgrade as one unit.

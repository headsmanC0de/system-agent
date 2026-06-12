# Testing Standard — Linux Agent

SSOT for how this repo is tested. Agents and humans follow this document; the
`qa-audit` agent (`.claude/agents/qa-audit.md`) executes the audit procedure in §5.
Sources: official Electron automated-testing guide, Playwright docs/best-practices,
Turborepo 2.9 docs, microsoft/playwright-mcp README (researched 2026-06-12; see
KANBAN LH-118).

## 1. Test pyramid (what runs where)

| Layer | Files | Project | Runs against | Budget |
|---|---|---|---|---|
| Unit (pure logic) | `tests/sse.spec.ts` | `unit` | Node only, no browser | ms |
| Contract (IPC bus) | `tests/ipc-contract.spec.ts` | `unit` | source files (static) | ms |
| Renderer integration | `tests/renderer,functional,projects,screenshots.spec.ts` | `browser` | vite :5173 + **mock layer** | ~20 s total |
| Electron e2e (thin!) | `tests/electron.spec.ts` | `e2e` | real built app (`out/`) | ~10–20 tests max |

Commands (from `apps/desktop/`): `npm run test` = unit+browser; `npm run test:e2e` = build + e2e.
Monorepo: `turbo run test` (cached; `--affected` on PRs, full on main).

Rationale: Electron officially maintains no test driver; Playwright `_electron`
is experimental — so the e2e layer stays a thin smoke/security gate (launch,
preload exposure, IPC allowlist, CSP, sandbox paths, secrets round-trip), and
everything else lives below it. Main-process logic that grows complex should be
extracted into pure functions and unit-tested without Electron.

## 2. Invariants (every change must keep these true)

1. **IPC contract**: every channel exists in all four places — `ipcMain.handle`
   (via the sender-validating `handle()` wrapper), `channels.ts` allowlist,
   `api.ts` method, MOCK entry. Enforced by `ipc-contract.spec.ts` + the
   `IpcChannel` type on `invoke()`.
2. **e2e gate**: any change to `electron.vite.config.ts`, `main.ts`
   `webPreferences`, or the preload MUST be verified with `npm run test:e2e`.
   This class of bug (BF-035/038/039) is invisible to browser tests.
3. **No `page.waitForTimeout`** — web-first assertions (`toBeVisible`,
   `toHaveCount`) or `expect.poll`. The sleep sweep (LH-111) cut the suite from
   1.7 min to ~20 s; do not regress it.
4. **Multi-page DOM**: visited pages stay mounted via `<Activity mode="hidden">`
   (LH-114). Tests must not assume one page in the DOM: `text=` expect-locators
   use `.first()`; the app guarantees the ACTIVE page renders first in DOM order.
5. **Fixtures, not helpers**: navigation/seeding go through `tests/fixtures.ts`
   (`gotoPage`, `seedStorage`) — no per-spec `navigateTo` copies, no raw
   `page.goto` + click chains in new tests.
6. **Mock honesty & shape parity**: browser mode must visibly differ from real
   data (mock-mode banner test); every new IPC channel ships its MOCK entry in
   the same commit; and mock values must match the REAL command output in shape
   and units (unitless where the command is unitless, bytes where bytes) —
   otherwise magnitude/format bugs are invisible or false (BF-042/BF-043).

## 3. What new tests must cover

For every feature/bugfix add tests at the LOWEST layer that can catch the
regression: happy path, edge cases (empty/0/boundary — see BF-040: `intervalMs=0`),
error handling (rejections must surface, not hang), security cases (injection,
allowlist bypass, plaintext leaks), and a regression test named after the bug ID.

## 4. Turborepo specifics

- `turbo.json` `test` task: `dependsOn: ["build"]`, markdown excluded from
  `inputs` so docs edits don't bust the cache.
- PR loop: `turbo run lint typecheck test --affected` (CI needs
  `fetch-depth: 2`; on GitHub Actions `--affected` picks up `GITHUB_BASE_REF`
  automatically). Full `turbo run test` + e2e on main.
- Local watch: `turbo watch test`.

## 5. Agentic UI audit (Playwright MCP)

The official `@playwright/mcp` server is configured in `.mcp.json`. It drives
the app through **accessibility snapshots** (deterministic refs), not
screenshots — use `browser_take_screenshot` only for human-facing evidence.

Procedure (what the `qa-audit` agent does):

1. Start the mock-mode app: `cd apps/desktop && npx vite --port 5173 --host 127.0.0.1` (the host flag matters: bare vite binds IPv6-only `[::1]` while tests target 127.0.0.1) (or reuse
   a running instance).
2. `browser_navigate` → `http://127.0.0.1:5173`.
3. For EACH page in the sidebar (19): click its nav entry, `browser_snapshot`,
   and check: page renders (no empty main), mock-mode banner present, no
   obvious layout breakage, interactive elements reachable in the snapshot.
4. `browser_console_messages` after the full walk — zero uncaught errors
   (ignore `electronAPI`/`invoke`/`fetch` noise inherent to browser mode).
5. Exercise one critical flow per area: Packages search, Services tab switch,
   Settings provider switch + invalid base URL (warning must appear), Chat
   send-without-provider error path.
6. Report findings as a table (page → status → issues), each issue with the
   snapshot ref and a suggested spec to add.

Real-Electron audit (unofficial but supported by flags): launch the built app
with `--remote-debugging-port=9222`, start the MCP with
`--cdp-endpoint http://localhost:9222`. CI gates stay on the browser suite —
CDP attach is a manual/exploratory tool only.

Growing the suite agentically: `npx playwright init-agents --loop=claude`
installs the official planner/generator/healer agents; generated specs must
still satisfy §2 invariants before merge.

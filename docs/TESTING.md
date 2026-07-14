# Testing standard

Tests prove behavior and architectural invariants, not merely that code executes.

## Layers

| Layer | Playwright project | Purpose |
|---|---|---|
| Unit/repository/contract | `unit` | pure logic, parsers, repositories, IPC/source invariants |
| Renderer integration | `browser` | explicit demo adapter, interactions, accessibility, visual states |
| Built Electron | `e2e` | real preload, IPC, host payloads, custom protocol and security boundaries |
| Installed artifact | `installed` | hardened fuses, private logs and restart persistence through the pacman installation |

From `apps/desktop`: `npm test` runs unit and browser suites; `npm run test:e2e` builds and launches
the real Electron application under Xvfb. After packaging and installation, `npm run test:installed`
is the artifact release gate. Root `npm run smoke` covers source/build checks but does not install a package.

## Required invariants

1. IPC channel names are derived from `src/main/channels.ts`; shared payloads live in
   `packages/types` and mocks must match those types.
2. Production without `window.electronAPI` fails closed. Demo data is opt-in, visible, and cannot
   persist real secrets.
3. SQLite and raw SQL occur only in `src/main/*-repository.ts`; repository tests cover durability,
   limits, not-found behavior, lock contention without partial writes, malformed/corrupt input, and unsupported schemas.
4. Command failures remain explicit error/partial states. Tests reject error-to-zero, error-to-pass,
   fake timestamps, and fabricated hardware/service identities.
5. Polling does not overlap. Hidden pages do not create active polling load, and static data is not
   fetched at a telemetry cadence.
6. No `page.waitForTimeout`; use Playwright web-first assertions or `expect.poll`.
7. Main, preload, CSP, sandbox, packaging, and real-host contract changes require Electron E2E.
8. Every bug fix records its missed detection boundary and adds the lowest-layer regression test
   that would have caught it.
9. Visual shell changes update and review stable light/dark baselines; navigation changes use the
   page registry and retain a keyboard-only focus/activation test.
10. Secret tests use isolated temporary profiles and prove atomic 0600 persistence plus explicit
    corruption failure; they never write credentials into a developer profile.

## Scenario coverage

Each changed contract should cover happy path, empty/boundary input, command/transport failure,
security abuse, and regression impact on neighboring modules. Destructive operations are not run in
CI; verify their validation/authorization boundary with fakes and dogfood only in a safe rollback
environment.

## Playwright MCP audit

The pinned local server is configured with an isolated profile and normal Chromium sandboxing.
Use accessibility snapshots for navigation and interaction checks, screenshots for visual evidence,
and console inspection after the full route walk. For real Electron exploration, build the app,
start it with a deliberate CDP port, and attach the MCP with `--cdp-endpoint`; automated release
evidence remains the checked-in E2E suite.

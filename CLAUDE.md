# System Agent contributor guide

System Agent is a private Electron application for observing and administering this Arch Linux
workstation. Product identity is defined once in `branding.json`. Shared process-boundary data types
live in `packages/types`; reusable hooks and UI live in their corresponding workspace packages.

## Commands

Run from the repository root:

- `npm run check-types` — strict TypeScript checks across workspaces.
- `npm run lint` — Biome checks across workspaces.
- `npm run build` — production build through Turborepo.
- `npm run doctor` — pinned MCP/LSP configuration and version checks.
- `npm run smoke` — the complete release gate.
- `npm --workspace @project/desktop run package` — AppImage and pacman artifacts.

## Architecture invariants

- Renderer code never reads the operating system or filesystem directly. It uses the preload
  allowlist and typed IPC client.
- `apps/desktop/src/main/channels.ts` is the SSOT for IPC channel names.
- `packages/types` is the SSOT for payload contracts shared across processes.
- SQLite and raw SQL are allowed only inside `apps/desktop/src/main/*-repository.ts`. See
  `docs/architecture/persistence.md`.
- Browser demo data must be explicitly enabled for tests and visibly identified. A production build
  without the Electron bridge must fail closed, never fabricate system state.
- Errors and unavailable telemetry are shown as unknown/error with provenance; they are never
  converted to zero, healthy, online, or a current timestamp.
- API keys never enter localStorage. Electron `safeStorage` owns provider secrets.
- No compatibility migrations or historical prefixes are retained. Only current `sa-*` keys exist.
- String literals follow `docs/architecture/ssot.md`; external metadata and cross-module contracts
  are centralized, while unique presentation copy stays local.

## Change discipline

Prefer the smallest domain change that closes a verified outcome. Add a regression test for every
bug and test the lowest layer that can prove the behavior. Main/preload/security changes require the
real Electron E2E suite. Visual or cross-platform behavior additionally requires Playwright.

The active board is `KANBAN.md`; it contains unfinished work only. Current package/language/tooling
references and official sources are indexed at `docs/reference/INDEX.md`. App-specific details live
in `apps/desktop/AGENTS.md`; the testing contract lives in `docs/TESTING.md`.

## Current external security action

An old Z.AI credential appeared in previous Git history. It must be considered compromised: revoke
it in Z.AI and scrub/replace affected remote history. Repository configs contain no credential and
keep Z.AI MCP endpoints disabled until an environment-provided key is deliberately enabled.

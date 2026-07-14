# System Agent current audit

Last reconciled: 2026-07-14. This file records current facts and open risks; completed history stays
in Git rather than accumulating here.

## Confirmed architecture

- Electron renderer isolation, minimal preload allowlist, branded secure protocol, CSP, navigation
  guards, fuses, packaged launch, and installed restart are covered by real Playwright tests.
- Branding, application ID, package identity, and storage prefix derive from current SSOT files.
- Documentation persistence uses Electron's current `node:sqlite` through `DocsRepository` only:
  STRICT schema, WAL, prepared statements, bounded payloads, 0600 database, integrity checking, and
  fail-closed schema/corruption behavior.
- IPC and child-process spans share a request ID, omit arguments/error bodies, and persist failures or
  slow operations to bounded private JSONL. Full success tracing is explicit via `SYSTEM_AGENT_TRACE=1`.
- Lifecycle and repository spans use the same correlation context; command execution is bounded,
  cancelable, semantically named, and accepts non-zero results only by explicit operation policy.
- IPC failures expose only a safe code, retryability, and request ID. Secret persistence is atomic,
  private, and fails closed for malformed JSON or ciphertext rather than impersonating an empty value.
- The page registry derives PageId, groups, labels, titles, icons, components, and route tests. IPC
  registration is compile-time typed, startup-exhaustive, demo-exhaustive, and preload-derived.
- Pages import workspace UI, hooks, and types directly; the three app-local forwarding facades were
  removed. Stable dark/light screenshots plus keyboard focus/route tests guard the visible shell.
- MCP/LSP tools are exact local dependencies; the repository doctor rejects unpinned execution,
  redundant filesystem MCP, obsolete OpenCode fields, or disabled Playwright sandboxing.
- `docs/reference/INDEX.md` maps current direct packages, languages, frameworks, and tools to concise
  local guidance and official primary documentation.
- Zig is deliberately absent from the application build. Official stable Zig is 0.16.0, host `zig`
  and `zls` match at 0.16.0, generated caches are untracked, and reintroduction criteria live in
  `docs/architecture/zig.md`.

## Closure evidence

- Corrupt/legacy/locked SQLite cases fail without partial writes; CRUD persists across repository,
  Electron, application restart, and the installed Arch package.
- Electron regressions enforce CSP, exact custom-protocol origin/path resolution, permission denial,
  navigation/window denial, minimal preload, sandboxing, and all packaged fuse states.
- The clean pacman verifier checks identity, version, homepage, `/opt` binary, `/usr/bin` install hook,
  desktop entry, Moonrock icon, and fuses before installation. The installed artifact passes CDP
  Playwright with private telemetry and restart durability.
- Blind spots that caused this wave were success-shaped IPC fallbacks, environment-dependent tests,
  hand-synchronized page metadata, facade imports, and an incorrect assumption that pacman directly
  owned `/usr/bin/system-agent`. Regression tests now cover each boundary.

## Active risks

- The old Z.AI credential in prior Git history requires revocation and history remediation outside
  application code.
- Privileged mutations depend on polkit/system configuration and require deliberate live dogfooding;
  automated tests must remain non-destructive.
- EcoFlow and GPU write controls remain unavailable unless a safe physical rollback environment is
  provided. Read-only telemetry is the supported MVP boundary.

The active board contains no autonomous implementation work. External credential/hardware validation
gates are listed in `KANBAN.md` and become tasks only when their required input is available.

# System Agent

System Agent is an Electron desktop application for observing and managing an Arch Linux workstation. It provides typed IPC-backed pages for packages, snapshots, services, hardware, GPU, disks, networking, Bluetooth, logs, credentials, local LLMs, and system automation.

## Source of truth

- `branding.json` is the branding and application-identity SSOT.
- `apps/desktop/src/lib/branding.ts` exposes that data to the application.
- `apps/desktop/src/lib/storage.ts` owns namespaced browser storage and migrates legacy `lh-*`/`la-*` keys.
- `apps/desktop/src/main/channels.ts` is the IPC allowlist SSOT.
- `biome.json` is the lint and formatting SSOT.
- `docs/TESTING.md` is the testing standard.
- `KANBAN.md` is the delivery board.

Do not duplicate product identity or storage-key literals in application code. Packaging metadata is derived from `branding.json` by `apps/desktop/electron-builder.config.cjs`.

## Layout

- `apps/desktop` — Electron main, preload, React renderer, Playwright suites.
- `packages/types` — shared data contracts.
- `packages/hooks` — shared React hooks.
- `packages/ui` — shared UI components.
- `packages/config` — shared TypeScript configuration.
- `docs` — testing, integrations, designs, and implementation plans.

## Development

Requirements: Node.js 20.19 or newer and npm 11.

```bash
npm install
npm run dev
```

Useful root commands:

```bash
npm run check-types
npm run lint
npm run build
npm run smoke
```

Browser and Electron Playwright tests can also be run directly:

```bash
npm --workspace @project/desktop run test
npm --workspace @project/desktop run test:e2e
```

## Safety model

The renderer cannot access the OS directly. System operations cross a typed, sender-validated IPC boundary. Destructive privileged actions use explicit polkit flows; browser-mode tests use clearly labelled mock data.

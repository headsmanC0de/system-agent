# EcoFlow Battery BLE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add read-only EcoFlow DELTA 2 Max BLE telemetry to the existing Battery & Bluetooth page.

**Architecture:** Shared types define normalized telemetry; Electron main owns the helper execution and validation boundary; renderer API and mock layer expose the data; Battery page renders EcoFlow as a third tab. The implementation is local-only and read-only.

**Tech Stack:** Electron 42, React 19, TypeScript 6, Playwright, Biome, existing IPC allowlist and mock contract.

---

### File Map

- Modify `packages/types/src/index.ts`: add `EcoFlowDevice`, `EcoFlowExtraBattery`, `EcoFlowTelemetryResult`.
- Modify `apps/desktop/src/main/channels.ts`: add `battery:ecoflow-devices`.
- Modify `apps/desktop/src/main/ipc.ts`: add safe helper execution, JSON parsing, validation, and handler.
- Modify `apps/desktop/src/api.ts`: add mock EcoFlow telemetry and typed `battery.ecoflowDevices()`.
- Modify `apps/desktop/src/pages/Battery.tsx`: add EcoFlow tab, stats, search, unavailable state, and cards.
- Modify `apps/desktop/tests/ipc-contract.spec.ts`: existing tests should catch contract drift without code changes.
- Modify `apps/desktop/tests/functional.spec.ts`: add EcoFlow UI behavior tests.
- Modify `KANBAN.md`: update board and functionality matrix after implementation.

### Task 1: Types And Contract

- [ ] Add failing type/API contract expectations by adding `"battery:ecoflow-devices"` to `apps/desktop/src/main/channels.ts` only.
- [ ] Run `cd apps/desktop && npx playwright test tests/ipc-contract.spec.ts`.
- [ ] Expected: contract test fails because handler and mock are missing.
- [ ] Add `EcoFlowExtraBattery`, `EcoFlowDevice`, and `EcoFlowTelemetryResult` to `packages/types/src/index.ts`.
- [ ] Add mock and typed API method in `apps/desktop/src/api.ts`.
- [ ] Add IPC handler skeleton in `apps/desktop/src/main/ipc.ts` returning `{ devices: [], unavailableReason: "EcoFlow helper not configured" }`.
- [ ] Re-run the IPC contract test and `npm run typecheck`.

### Task 2: Backend Normalization

- [ ] Add focused tests for helper JSON normalization in a new browser/unit-compatible spec if the main helper can be exported safely; otherwise cover via IPC contract and Electron-safe pure functions colocated in `ipc.ts`.
- [ ] Implement validation that accepts only object payloads with a `devices` array.
- [ ] Normalize missing optional fields to `null` or empty arrays, never hardcoded device data.
- [ ] Execute helper with `execFile`, fixed args, timeout, and no shell interpolation.
- [ ] Log only bounded failure categories without serial numbers or credentials.
- [ ] Run `npm run typecheck` and the relevant Playwright spec.

### Task 3: Renderer EcoFlow Tab

- [ ] Add a failing functional test that opens Battery & BT, clicks EcoFlow, and expects the mock DELTA 2 Max device values.
- [ ] Add a failing functional test for the EcoFlow unavailable empty state by mocking an empty result if existing fixtures allow it; otherwise add a stable UI assertion for the default available mock.
- [ ] Implement the EcoFlow tab in `Battery.tsx` using existing shared `Card`, `Badge`, `SearchInput`, and semantic colors.
- [ ] Include aggregate battery SoC, input/output watts, AC/DC/USB port state, main battery, and extra battery rows.
- [ ] Make the existing search box filter EcoFlow by model and serial.
- [ ] Run `npx playwright test tests/functional.spec.ts -g "Battery"`.

### Task 4: Board, Matrix, And Docs

- [ ] Add a `LH-119` Kanban item for EcoFlow BLE read-only battery telemetry.
- [ ] Add backlog items for EcoFlow BLE controls and cloud/MQTT shutdown policy.
- [ ] Update the functionality matrix Battery/BT row with EcoFlow BLE read-only telemetry and 30s polling.
- [ ] Add a blindspot note if any bug is found during implementation.
- [ ] Run `npm run lint`, `npm run typecheck`, and targeted tests.

### Task 5: End-To-End Verification

- [ ] Run `cd apps/desktop && npm run test`.
- [ ] Run `cd apps/desktop && npm run build`.
- [ ] Use Playwright visual verification for Battery & BT if UI changed in a way screenshots/tests do not cover.
- [ ] If Electron main/preload/security-sensitive code behavior changes beyond adding an IPC handler, run `cd apps/desktop && npm run test:e2e`.
- [ ] Record any failed command, root cause, and follow-up in the final summary and Kanban if not fixed.

### Self-Review

- Spec coverage: local read-only BLE telemetry, no cloud credentials, no controls, IPC contract, UI, tests, docs, and board updates are all covered.
- Placeholder scan: no task relies on "TBD" or unspecified implementation.
- Type consistency: `EcoFlowDevice`, `EcoFlowExtraBattery`, `EcoFlowTelemetryResult`, and `battery:ecoflow-devices` are used consistently.

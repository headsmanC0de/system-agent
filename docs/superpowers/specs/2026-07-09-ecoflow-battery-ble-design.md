# EcoFlow Battery BLE Design

## Goal

Add EcoFlow DELTA 2 Max as a desktop power source in the existing Battery & Bluetooth page, starting with read-only BLE monitoring that treats the station and attached extra battery as battery devices for the desktop.

## Alternatives

### A. Local BLE read-only monitoring

Uses the local BLE protocol and Delta 2 Max packet mapping from `source/ha-ef-ble`. Strong points: works without cloud credentials, fits the existing Battery & BT page, exposes the station as local hardware, and keeps the first implementation low-risk because it does not send control packets.

### B. Local BLE monitoring plus controls

Adds AC/USB/DC output toggles, charge limit, energy backup, and AC charging speed. Strong points: complete device management from one app and direct use of known `ha-ef-ble` command mappings. Weak point: control packets raise safety and regression risk, so they should follow after read-only telemetry is verified on the real DELTA 2 Max.

### C. EcoFlow cloud/MQTT orchestrator

Uses `source/ecoflow-power-management` as a reference for Developer API credentials, EcoFlow cloud MQTT, local Mosquitto, normalized SoC, policy engine, and host-local shutdown agents. Strong points: good for multi-host shutdown and cross-platform orchestration. Weak point: requires cloud credentials, Mosquitto, and more moving parts than a desktop battery MVP.

## Final Approach

Build a hybrid roadmap with a local BLE read-only MVP now and cloud/MQTT policy as a later separate Kanban item. The MVP uses the best part of A: local telemetry and direct fit with the current app. It uses the best part of B only as a data-model boundary: the normalized telemetry shape leaves room for later controls without implementing them. It uses the best part of C as documentation for future shutdown policy, but no cloud dependency is added to the MVP.

## Architecture

`packages/types` owns the normalized EcoFlow data shape. `apps/desktop/src/main/ipc.ts` owns the IPC handler and process execution boundary. `apps/desktop/src/api.ts` owns the typed renderer API and browser mock. `apps/desktop/src/pages/Battery.tsx` renders a third tab next to UPower and Bluetooth.

The first backend implementation is a command boundary, not embedded Python. The app calls a local helper command if configured by environment or found on PATH, parses JSON, validates the result, and returns either normalized devices or a structured unavailable state. This keeps Electron code small and avoids vendoring the Home Assistant integration into production code. `source/ha-ef-ble` remains a local reference for packet fields and real fixture expectations.

## Normalized Data

The MVP shape covers:

- Device identity: `serial`, `model`, `source`.
- Connection state: `connected`, `lastSeen`, `error`.
- Battery: aggregate SoC, main battery SoC, up to two extra batteries with serial and SoC.
- Power flow: input watts, output watts, AC input/output watts, DC output watts, XT60 input watts, USB output watts.
- Ports: AC, USB, DC 12V booleans.
- Runtime: charge and discharge remaining time when available.

No control commands are exposed in the MVP.

## Error Handling

EcoFlow telemetry is optional. Missing helper, Bluetooth unavailable, device not paired, authentication failure, parse failure, timeout, and empty device list all render as explicit UI states instead of throwing. The existing UPower and Bluetooth tabs must continue to render if EcoFlow is unavailable.

## Testing

Add tests for:

- IPC contract parity: handler, allowlist, typed API, and mock entry.
- Parser normalization: valid JSON, missing optional fields, invalid JSON, non-array payload, timeout/error result.
- Battery page rendering: EcoFlow tab count, telemetry values, extra battery row, unavailable state, search filtering.
- Regression: existing UPower and Bluetooth tests still pass.

## Traces And Logs

Add bounded main-process diagnostic output only for failures: helper not found, helper timeout, non-zero exit, JSON parse failure, and normalized validation failure. Do not log serial numbers or credentials. UI should show short user-facing status, while logs keep technical cause.

## Security

Do not accept arbitrary shell strings. The helper path must be executed with `execFile` and fixed argument arrays. No credentials go to localStorage. No cloud API keys are introduced in this MVP. Serial numbers are display data only and must not be interpolated into shell commands.

## Documentation And Board Updates

Update `KANBAN.md` and the functionality matrix to show Battery/BT now includes EcoFlow BLE read-only telemetry when complete. Add separate backlog items for BLE controls and cloud/MQTT shutdown policy.

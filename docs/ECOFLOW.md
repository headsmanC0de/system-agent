# EcoFlow Read-Only Telemetry

This project treats EcoFlow stations as desktop battery sources. The active contract is telemetry-only: do not add AC/USB/DC toggles, charge-limit writes, reboot, shutdown, or any other control endpoint while the station can power the desktop.

## Wi-Fi / Cloud

EcoFlow Wi-Fi telemetry uses the EcoFlow Cloud API. The station must be online in the EcoFlow account, typically through the 2.4 GHz Wi-Fi setup in the official EcoFlow app.

Runtime configuration is environment-only:

```sh
export ECOFLOW_CLOUD_ACCESS_KEY="..."
export ECOFLOW_CLOUD_SECRET_KEY="..."
export ECOFLOW_DEVICE_SN="optional-station-serial"
export ECOFLOW_CLOUD_HOST="https://api-e.ecoflow.com"
```

`ECOFLOW_DEVICE_SN` is optional. When it is present, the app skips the device-list call and reads quota for that station only. When it is absent, the app lists cloud devices first and then reads quota for each discovered station. `ECOFLOW_CLOUD_HOST` defaults to the EU API host and can be overridden for accounts bound to another EcoFlow region.

Secrets are not stored by the app and must not be committed. The Cloud adapter signs GET-only requests and maps quota fields into the shared `EcoFlowTelemetryResult` used by the Battery page.

## BLE Fallback

Local BLE remains available through an explicit helper path:

```sh
export ECOFLOW_BLE_HELPER="/absolute/path/to/scripts/ecoflow_ble_helper.py"
```

The helper boundary is also read-only. It normalizes telemetry to JSON and sends no control packets.

## Verification

EcoFlow safety is guarded by:

- `apps/desktop/tests/ecoflow.spec.ts` — shared telemetry normalization.
- `apps/desktop/tests/ecoflow-helper.spec.ts` — BLE helper contract and no control packet calls.
- `apps/desktop/tests/ecoflow-cloud.spec.ts` — Cloud env degrade, signed GET telemetry, and no control endpoints.
- `apps/desktop/tests/ipc-contract.spec.ts` — IPC exposes only `battery:ecoflow-devices` for EcoFlow.

Live dogfood requires local credentials in the shell that launches Electron. Do not paste access keys into chat or docs.

#!/usr/bin/env python3
"""Read-only EcoFlow BLE telemetry helper.

The Electron app executes this script through an absolute ECOFLOW_BLE_HELPER
path. stdout is reserved for the JSON contract consumed by Electron; diagnostics
go to stderr and must not include credentials or device serials.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


DEFAULT_EFLIB_PATH = Path(__file__).resolve().parents[1] / "source" / "ha-ef-ble" / "custom_components" / "ef_ble"


def _number(value: Any) -> float | int | None:
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _bool(value: Any) -> bool | None:
    return value if isinstance(value, bool) else None


def _string(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def _extra_batteries(raw: dict[str, Any]) -> list[dict[str, Any]]:
    extras = raw.get("extraBatteries")
    if not isinstance(extras, list):
        return []

    normalized: list[dict[str, Any]] = []
    for index, item in enumerate(extras, start=1):
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "index": _number(item.get("index")) or index,
                "serial": _string(item.get("serial")),
                "batteryLevel": _number(item.get("batteryLevel")),
                "cellTemperature": _number(item.get("cellTemperature")),
            }
        )
    return normalized


def normalize_device(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "serial": _string(raw.get("serial")) or "unknown",
        "model": _string(raw.get("model")) or "EcoFlow device",
        "connected": _bool(raw.get("connected")) if _bool(raw.get("connected")) is not None else False,
        "source": "ble",
        "lastSeen": _string(raw.get("lastSeen")) or datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "batteryLevel": _number(raw.get("batteryLevel")),
        "mainBatteryLevel": _number(raw.get("mainBatteryLevel")),
        "extraBatteries": _extra_batteries(raw),
        "inputWatts": _number(raw.get("inputWatts")),
        "outputWatts": _number(raw.get("outputWatts")),
        "acInputWatts": _number(raw.get("acInputWatts")),
        "acOutputWatts": _number(raw.get("acOutputWatts")),
        "dcOutputWatts": _number(raw.get("dcOutputWatts")),
        "xt60InputWatts": _number(raw.get("xt60InputWatts")),
        "xt60_2InputWatts": _number(raw.get("xt60_2InputWatts")),
        "usbOutputWatts": _number(raw.get("usbOutputWatts")),
        "acInputVolts": _number(raw.get("acInputVolts")),
        "acInputAmps": _number(raw.get("acInputAmps")),
        "acOutputVolts": _number(raw.get("acOutputVolts")),
        "acOutputAmps": _number(raw.get("acOutputAmps")),
        "dcInputVolts": _number(raw.get("dcInputVolts")),
        "dcInputAmps": _number(raw.get("dcInputAmps")),
        "dc12vOutputVolts": _number(raw.get("dc12vOutputVolts")),
        "dc12vOutputAmps": _number(raw.get("dc12vOutputAmps")),
        "acPorts": _bool(raw.get("acPorts")),
        "usbPorts": _bool(raw.get("usbPorts")),
        "dc12vPort": _bool(raw.get("dc12vPort")),
        "chargeLimitMin": _number(raw.get("chargeLimitMin")),
        "chargeLimitMax": _number(raw.get("chargeLimitMax")),
        "acChargingSpeedWatts": _number(raw.get("acChargingSpeedWatts")),
        "maxAcChargingPowerWatts": _number(raw.get("maxAcChargingPowerWatts")),
        "energyBackup": _bool(raw.get("energyBackup")),
        "energyBackupBatteryLevel": _number(raw.get("energyBackupBatteryLevel")),
        "remainingTimeChargingMinutes": _number(raw.get("remainingTimeChargingMinutes")),
        "remainingTimeDischargingMinutes": _number(raw.get("remainingTimeDischargingMinutes")),
        "error": _string(raw.get("error")),
    }


def result(devices: list[dict[str, Any]] | None = None, unavailable_reason: str | None = None) -> dict[str, Any]:
    return {"devices": devices or [], "unavailableReason": unavailable_reason}


def _read_field(device: Any, field_name: str) -> Any:
    field = getattr(type(device), field_name, None)
    if field is None or not hasattr(device, "get_value"):
        return None
    try:
        return device.get_value(field)
    except Exception:
        return None


def _device_snapshot(device: Any) -> dict[str, Any]:
    extra_batteries = []
    for index in (1, 2):
        enabled = _read_field(device, f"battery_{index}_enabled")
        serial = _read_field(device, f"battery_{index}_sn")
        level = _read_field(device, f"battery_{index}_battery_level")
        temp = _read_field(device, f"battery_{index}_cell_temperature")
        if enabled or serial or level is not None or temp is not None:
            extra_batteries.append(
                {
                    "index": index,
                    "serial": serial,
                    "batteryLevel": level,
                    "cellTemperature": temp,
                }
            )

    return normalize_device(
        {
            "serial": getattr(device, "_sn", None),
            "model": f"EcoFlow {getattr(device, 'device', 'device')}",
            "connected": bool(getattr(device, "is_connected", False)),
            "batteryLevel": _read_field(device, "battery_level"),
            "mainBatteryLevel": _read_field(device, "battery_level_main"),
            "extraBatteries": extra_batteries,
            "inputWatts": _read_field(device, "input_power"),
            "outputWatts": _read_field(device, "output_power"),
            "acInputWatts": _read_field(device, "ac_input_power"),
            "acOutputWatts": _read_field(device, "ac_output_power"),
            "dcOutputWatts": _read_field(device, "dc_output_power"),
            "xt60InputWatts": _read_field(device, "xt60_1_input_power"),
            "xt60_2InputWatts": _read_field(device, "xt60_2_input_power"),
            "usbOutputWatts": sum(
                value or 0
                for value in (
                    _read_field(device, "usbc_output_power"),
                    _read_field(device, "usbc2_output_power"),
                    _read_field(device, "usba_output_power"),
                    _read_field(device, "usba2_output_power"),
                    _read_field(device, "qc_usb1_output_power"),
                    _read_field(device, "qc_usb2_output_power"),
                )
            ),
            "acInputVolts": _read_field(device, "ac_input_voltage"),
            "acInputAmps": _read_field(device, "ac_input_current"),
            "acOutputVolts": _read_field(device, "ac_output_voltage"),
            "acOutputAmps": _read_field(device, "ac_output_current"),
            "dcInputVolts": _read_field(device, "dc_input_voltage"),
            "dcInputAmps": _read_field(device, "dc_input_current"),
            "dc12vOutputVolts": _read_field(device, "dc12v_output_voltage"),
            "dc12vOutputAmps": _read_field(device, "dc12v_output_current"),
            "acPorts": _read_field(device, "ac_ports"),
            "usbPorts": _read_field(device, "usb_ports"),
            "dc12vPort": _read_field(device, "dc_12v_port"),
            "chargeLimitMin": _read_field(device, "battery_charge_limit_min"),
            "chargeLimitMax": _read_field(device, "battery_charge_limit_max"),
            "acChargingSpeedWatts": _read_field(device, "ac_charging_speed"),
            "maxAcChargingPowerWatts": _read_field(device, "max_ac_charging_power"),
            "energyBackup": _read_field(device, "energy_backup"),
            "energyBackupBatteryLevel": _read_field(device, "energy_backup_battery_level"),
            "remainingTimeChargingMinutes": _read_field(device, "remaining_time_charging"),
            "remainingTimeDischargingMinutes": _read_field(device, "remaining_time_discharging"),
        }
    )


async def read_ble(args: argparse.Namespace) -> dict[str, Any]:
    user_id = args.user_id or os.environ.get("ECOFLOW_USER_ID")
    if not user_id:
        return result(unavailable_reason="missing_user_id")

    eflib_path = Path(args.eflib_path or os.environ.get("ECOFLOW_EFLIB_PATH") or DEFAULT_EFLIB_PATH)
    if not eflib_path.exists():
        return result(unavailable_reason="missing_eflib")

    sys.path.insert(0, str(eflib_path))
    try:
        from bleak import BleakScanner
        import eflib
    except Exception:
        return result(unavailable_reason="missing_python_dependency")

    try:
        discovered = await BleakScanner.discover(timeout=args.scan_timeout, return_adv=True)
    except Exception:
        return result(unavailable_reason="ble_scan_failed")

    candidates = []
    for value in discovered.values() if isinstance(discovered, dict) else discovered:
        ble_dev, adv = value if isinstance(value, tuple) else (value, None)
        if args.address and getattr(ble_dev, "address", "").upper() != args.address.upper():
            continue
        try:
            device = eflib.NewDevice(ble_dev, adv)
        except Exception:
            continue
        if device is not None and not eflib.is_unsupported(device):
            candidates.append(device)

    snapshots = []
    for device in candidates:
        try:
            if hasattr(device, "with_disabled_reconnect"):
                device = device.with_disabled_reconnect()
            await asyncio.wait_for(device.connect(user_id=user_id, max_attempts=1), timeout=args.connect_timeout)
            state = await asyncio.wait_for(
                device.wait_until_authenticated_or_error(raise_on_error=False),
                timeout=args.connect_timeout,
            )
            if str(state).split(".")[-1] != "AUTHENTICATED":
                continue
            await asyncio.sleep(args.sample_seconds)
            snapshots.append(_device_snapshot(device))
        except Exception:
            continue
        finally:
            try:
                await device.disconnect()
            except Exception:
                pass

    return result(snapshots)


def main() -> int:
    parser = argparse.ArgumentParser(description="EcoFlow BLE read-only telemetry helper")
    parser.add_argument("--normalize-json", type=Path)
    parser.add_argument("--eflib-path")
    parser.add_argument("--user-id")
    parser.add_argument("--address")
    parser.add_argument("--scan-timeout", type=float, default=5)
    parser.add_argument("--connect-timeout", type=float, default=8)
    parser.add_argument("--sample-seconds", type=float, default=2)
    args = parser.parse_args()

    if args.normalize_json:
        payload = json.loads(args.normalize_json.read_text(encoding="utf-8"))
        devices = payload if isinstance(payload, list) else [payload]
        print(json.dumps(result([normalize_device(item) for item in devices if isinstance(item, dict)]), separators=(",", ":")))
        return 0

    print(json.dumps(asyncio.run(read_ble(args)), separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

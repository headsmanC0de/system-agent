# Python

**Repo role:** `scripts/ecoflow_ble_helper.py` is the read-only EcoFlow BLE adapter invoked by the desktop app. Python is host-provided rather than a package-managed project dependency, so code must probe required capabilities instead of duplicating a host version.

Keep stdout machine-readable and stderr diagnostic. Preserve timeouts, read-only behavior, and graceful handling when Bluetooth libraries or hardware are unavailable. Because no Python lock/toolchain exists, avoid adding third-party imports without first introducing an explicit environment and dependency lock.

Primary docs: [Python 3 documentation](https://docs.python.org/3/), [venv](https://docs.python.org/3/library/venv.html), [subprocess](https://docs.python.org/3/library/subprocess.html).

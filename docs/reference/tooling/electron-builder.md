# electron-builder

**Repo role:** packages Linux AppImage and pacman artifacts. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

Run `npm --workspace @project/desktop run package`. Configuration is in `electron-builder.config.cjs`; it owns app identity, files, fuses, Linux dependencies, and artifact names. Native dependencies require deliberate rebuild/asar-unpack handling. Validate the produced package—not just `out/`—with metadata inspection and installed-app smoke tests.

Primary docs/source: [electron-builder docs](https://www.electron.build/), [configuration](https://www.electron.build/configuration.html), [Linux targets](https://www.electron.build/linux.html), [repository](https://github.com/electron-userland/electron-builder).

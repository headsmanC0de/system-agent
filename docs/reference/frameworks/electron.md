# Electron

**Repo role:** desktop shell, native IPC, security boundary, system integrations, and packaging. Resolved package and embedded runtime versions are in [VERSIONS.md](../VERSIONS.md).

Use `npm --workspace @project/desktop run dev`, `build`, or `test:e2e`. Keep `contextIsolation: true`, `nodeIntegration: false`, a sandboxed renderer, sender validation, channel allowlisting, navigation guards, CSP, and fuses. Main/preload/config changes require real Electron E2E; browser-mode tests cannot validate them. Electron embeds its own Chromium/Node versions.

Primary docs: [Electron docs](https://www.electronjs.org/docs/latest/), [security checklist](https://www.electronjs.org/docs/latest/tutorial/security), [release table](https://releases.electronjs.org/), [Electron repository](https://github.com/electron/electron).

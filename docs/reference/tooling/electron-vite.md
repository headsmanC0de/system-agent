# electron-vite

**Repo role:** coordinates main, preload, and renderer development/build pipelines. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

Use the desktop `dev`, `build`, and `preview` scripts. Main dependencies are externalized by default. The preload output is intentionally CommonJS and keeps `electron` external so a sandboxed renderer can load it. Any config change requires build plus Electron E2E.

Primary docs/source: [electron-vite guide](https://electron-vite.org/guide/), [configuration](https://electron-vite.org/config/), [repository](https://github.com/alex8088/electron-vite).

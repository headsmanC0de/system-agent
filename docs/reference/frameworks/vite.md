# Vite

**Repo role:** renderer development server and production asset build. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

Desktop configuration is centralized in `electron.vite.config.ts`. Start through package scripts rather than invoking a floating `npx vite`. The current Vite line uses Rolldown-era configuration; review migration notes before changing build hooks. Test asset URLs and CSP in the packaged-style build.

Primary docs: [Vite guide](https://vite.dev/guide/), [configuration](https://vite.dev/config/), [Vite 8 announcement](https://vite.dev/blog/announcing-vite8), [Vite repository](https://github.com/vitejs/vite).

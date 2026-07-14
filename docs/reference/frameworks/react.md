# React

**Repo role:** renderer component and state model. `packages/hooks` declares React as a peer; the resolved version is generated in [VERSIONS.md](../VERSIONS.md).

The app uses current React APIs, including mounted-but-hidden page activity. Keep effects idempotent, do not copy server/IPC state into competing stores without a reason, and use shared components from `@project/ui`. Run browser tests for interaction changes and Electron E2E for process-boundary changes.

Primary docs: [React documentation](https://react.dev/), [React reference](https://react.dev/reference/react), [React repository](https://github.com/facebook/react).

# @project/types

**Repo role:** private workspace and SSOT for data contracts shared across renderer, preload-facing API, and main process.

Types do not validate IPC input at runtime. When a boundary is security- or persistence-sensitive, pair the TypeScript contract with explicit validation in the receiving process. Import the owning package directly; avoid duplicate local interfaces and re-export facades.

Local source: `packages/types/`. Primary references: [TypeScript object types](https://www.typescriptlang.org/docs/handbook/2/objects.html), [Electron IPC tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc).

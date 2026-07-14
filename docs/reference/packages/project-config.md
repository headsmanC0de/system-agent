# @project/config

**Repo role:** private workspace owning shared TypeScript configuration. Workspace resolution is lock-linked rather than registry-published.

`tsconfig.base.json` contains library defaults and `tsconfig.app.json` contains application defaults. Extend these files instead of copying compiler options into each package, while preserving context-specific renderer/Node differences.

Local source: `packages/config/`. Primary reference: [TSConfig reference](https://www.typescriptlang.org/tsconfig/), [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces).

# TypeScript

**Repo role:** primary language for the renderer, Electron main/preload code, Playwright tests, and workspace packages. The resolved compiler version is in [VERSIONS.md](../VERSIONS.md).

The current TypeScript line is the native Go implementation. `npx tsc` is the authoritative compiler and OpenCode uses its built-in LSP through `npx --no-install tsc --lsp --stdio`; do not add a legacy `tsserver` wrapper or compatibility alias.

Run `npm run check-types` from the root or `npm --workspace @project/desktop run typecheck`. Shared defaults live in `packages/config/tsconfig.base.json`; desktop renderer and Node contexts have separate project configs. Keep `strict`, `verbatimModuleSyntax`, and `erasableSyntaxOnly` behavior in mind; do not hide boundary errors with ambient declarations or `any`.

Primary docs: [TypeScript handbook](https://www.typescriptlang.org/docs/), [TSConfig reference](https://www.typescriptlang.org/tsconfig/), [TypeScript repository](https://github.com/microsoft/TypeScript).

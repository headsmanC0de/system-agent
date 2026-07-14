# Local technology reference

This catalog is a repository-specific map, not a copy of upstream documentation. Versions are the exact entries in `package-lock.json`; update the relevant card whenever the lock changes.

Current resolved package and embedded runtime versions are generated once in [VERSIONS.md](VERSIONS.md).

## Languages and runtime

- [TypeScript](languages/typescript.md) — application, Electron, tests, shared packages, and native LSP.
- [JavaScript and Node.js](languages/javascript-node.md) — configuration and runtime boundary.
- [HTML and CSS](languages/html-css.md) — renderer shell and Tailwind theme.
- [Python](languages/python.md) — EcoFlow BLE helper; host-provided, not project-pinned.

## Frameworks

- [Electron](frameworks/electron.md)
- [React](frameworks/react.md)
- [React DOM](frameworks/react-dom.md)
- [Tailwind CSS](frameworks/tailwind-css.md)
- [Vite](frameworks/vite.md)
- [Playwright Test](frameworks/playwright-test.md)

## Direct external packages

- [@biomejs/biome](tooling/biome.md)
- [@playwright/mcp](tooling/playwright-mcp.md)
- [@tailwindcss/language-server](tooling/tailwind-language-server.md)
- [@vitejs/plugin-react](packages/vite-plugin-react.md)
- [@z_ai/mcp-server](tooling/z-ai-mcp-server.md)
- [Prettier](tooling/prettier.md)
- [Turborepo](tooling/turborepo.md)
- [@electron-toolkit/utils](packages/electron-toolkit-utils.md)
- [@tailwindcss/vite](packages/tailwindcss-vite.md)
- [lucide-react](packages/lucide-react.md)
- [@types/node](packages/types-node.md)
- [@types/react](packages/types-react.md)
- [@types/react-dom](packages/types-react-dom.md)
- [electron-builder](tooling/electron-builder.md)
- [electron-vite](tooling/electron-vite.md)
- [clsx](packages/clsx.md)
- [tailwind-merge](packages/tailwind-merge.md)

## Local workspace packages

- [@project/config](packages/project-config.md)
- [@project/hooks](packages/project-hooks.md)
- [@project/types](packages/project-types.md)
- [@project/ui](packages/project-ui.md)

Use `npm ci` for a lock-exact install, `npm run docs:sync` after dependency changes, `npm run smoke` for the release gate, and `npm outdated --workspaces` only as discovery—not as an automatic upgrade command.

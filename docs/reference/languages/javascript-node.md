# JavaScript and Node.js

**Repo role:** Node APIs power Electron's main process and build configuration; CommonJS remains only where Electron tooling requires it. Host requirements stay in `package.json`; embedded runtime versions are generated in [VERSIONS.md](../VERSIONS.md).

Use `npm ci`, not `npm install`, for reproducible setup. Prefer `node:` imports, ESM application code, and explicit process-boundary validation. Do not assume a host Node feature exists inside Electron without checking Electron's embedded version.

Primary docs: [Node.js documentation](https://nodejs.org/docs/latest/api/), [Node releases](https://nodejs.org/en/about/previous-releases), [MDN JavaScript guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide).

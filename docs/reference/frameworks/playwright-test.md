# Playwright Test

**Repo role:** unit/browser suites and real Electron E2E. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

Run `npm --workspace @project/desktop test` for unit/browser projects and `test:e2e` for the built app. Use web-first assertions; never add fixed sleeps. Electron tests must isolate user data and prove IPC/security/persistence behavior, while browser fixtures must remain explicitly identified as test data. Browser binaries are separate install artifacts and must match the locked Playwright version.

Primary docs: [Playwright Test](https://playwright.dev/docs/intro), [Electron automation](https://playwright.dev/docs/api/class-electron), [best practices](https://playwright.dev/docs/best-practices), [repository](https://github.com/microsoft/playwright).

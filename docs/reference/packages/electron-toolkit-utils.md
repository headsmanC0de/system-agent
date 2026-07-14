# @electron-toolkit/utils

**Repo role:** Electron main-process helpers for app identity, environment detection, and window shortcut behavior. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

Used in `src/main/main.ts`. Keep these helpers in the main process and avoid letting convenience utilities obscure security-sensitive BrowserWindow configuration. Verify development and packaged paths independently.

Primary docs/source: [Electron Toolkit utils](https://github.com/alex8088/electron-toolkit/tree/master/packages/utils), [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model).

# React DOM

**Repo role:** mounts the React renderer into `apps/desktop/index.html`. Resolved versions in [VERSIONS.md](../VERSIONS.md) must keep React DOM aligned with React.

Keep `react` and `react-dom` on the same version. Electron owns the browser runtime, so do not introduce server-rendering assumptions. Renderer bootstrap belongs in `src/main.tsx`; production behavior must remain compatible with the strict branded custom-protocol CSP.

Primary docs: [React DOM client APIs](https://react.dev/reference/react-dom/client), [React DOM reference](https://react.dev/reference/react-dom), [React repository](https://github.com/facebook/react).

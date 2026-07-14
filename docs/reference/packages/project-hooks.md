# @project/hooks

**Repo role:** private workspace for React hooks shared by multiple pages. React is a peer dependency; the workspace manifest owns its package metadata.

It owns polling, async-data, and CPU sampling behavior. Keep hooks renderer-only, cancellation-safe, and stable with unmemoized callbacks according to their documented contract. Test timing/error behavior at the hook boundary rather than duplicating polling in pages.

Local source: `packages/hooks/`. Primary references: [React custom hooks](https://react.dev/learn/reusing-logic-with-custom-hooks), [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).

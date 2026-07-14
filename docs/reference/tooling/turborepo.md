# Turborepo

**Repo role:** workspace task graph and caching. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

Root scripts delegate build, lint, typecheck, test, and dev to `turbo.json`. Declare task inputs/outputs accurately; mutable `.env*` inputs affect build caching. Use `npm run smoke` for the release gate rather than assuming a cached task proves packaged behavior.

Primary docs/source: [Turborepo docs](https://turborepo.dev/docs), [configuration reference](https://turborepo.dev/docs/reference/configuration), [caching](https://turborepo.dev/docs/crafting-your-repository/caching), [repository](https://github.com/vercel/turborepo).

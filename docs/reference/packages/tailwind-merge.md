# tailwind-merge

**Repo role:** resolves conflicting Tailwind utility classes in `@project/ui`. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

The v3 line is the Tailwind v4-compatible line. Centralize its use in the shared `cn` helper; direct calls scattered across pages make class semantics harder to audit. Re-run component and visual tests after Tailwind upgrades.

Primary docs/source: [tailwind-merge documentation](https://github.com/dcastil/tailwind-merge), [configuration guide](https://github.com/dcastil/tailwind-merge/blob/main/docs/configuration.md).

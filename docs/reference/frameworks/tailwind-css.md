# Tailwind CSS

**Repo role:** utility CSS and design-token layer for the renderer/shared UI. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

Tailwind is integrated through `@tailwindcss/vite`; theme variables live in CSS, not a legacy JavaScript config. Prefer semantic tokens such as success/warning/info/destructive, and keep reusable class composition in `@project/ui`. Validate dark/light rendering and packaged CSS output after upgrades.

Primary docs: [Tailwind CSS docs](https://tailwindcss.com/docs), [Vite installation](https://tailwindcss.com/docs/installation/using-vite), [Tailwind repository](https://github.com/tailwindlabs/tailwindcss).

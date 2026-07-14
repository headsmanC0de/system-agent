# HTML and CSS

**Repo role:** `apps/desktop/index.html` is the renderer entry; CSS variables and Tailwind v4 directives define the visual system in `src/index.css` and `packages/ui/src/styles/globals.css`.

The production renderer runs from the branded secure custom protocol and receives the same strict CSP from HTML and Electron headers. Keep scripts external, use semantic CSS variables instead of raw palette colors, and validate visual changes in both light and dark themes. Biome intentionally excludes CSS; Vite and Tailwind own CSS processing.

Primary docs: [MDN HTML](https://developer.mozilla.org/en-US/docs/Web/HTML), [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS), [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP).

# @project/ui

**Repo role:** private workspace for shared React components, semantic styling, and the `cn` class helper. React is a peer; class composition helpers are direct dependencies.

Pages should consume these components instead of cloning cards, badges, searches, output panels, or tokens. Keep components accessible and data-agnostic. Validate reusable changes across all consuming pages and light/dark themes.

Local source: `packages/ui/`. Primary references: [React component composition](https://react.dev/learn/passing-props-to-a-component), [Tailwind responsive design](https://tailwindcss.com/docs/responsive-design), [WAI-ARIA practices](https://www.w3.org/WAI/ARIA/apg/).

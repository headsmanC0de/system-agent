import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// The production renderer is loaded over file://, where session.onHeadersReceived
// does NOT apply a CSP. Inject a strict CSP <meta> at build time only (a meta in the
// dev HTML would block Vite's inline React-refresh preamble). 'self' covers the
// bundled assets; omitting 'unsafe-eval' blocks eval; connect-src allows LLM providers.
const cspMetaPlugin = () => ({
  name: "inject-csp-meta",
  apply: "build" as const,
  transformIndexHtml(html: string) {
    const csp =
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http: https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
    return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
  },
});

export default defineConfig({
  // externalizeDepsPlugin() is deprecated in electron-vite 5 — dependency
  // externalization is the default via build.externalizeDeps.
  main: {
    build: {
      lib: {
        entry: resolve(__dirname, "src/main/main.ts"),
      },
    },
  },
  preload: {
    build: {
      lib: {
        entry: resolve(__dirname, "src/main/preload.ts"),
      },
      rollupOptions: {
        // CJS preload: Electron refuses to load ESM preloads in a sandboxed
        // renderer, and we want sandbox: true wherever the NVIDIA+Wayland GPU
        // workaround is not active (audit S-2 follow-up, BF-035 root cause).
        // "electron" must stay external explicitly: in the cjs-format override
        // electron-vite skips its auto-externalization and the npm launcher
        // (node_modules/electron/index.js) gets bundled into the preload.
        external: ["electron"],
        output: { format: "cjs", entryFileNames: "[name].cjs" },
      },
    },
  },
  renderer: {
    root: ".",
    plugins: [react(), tailwindcss(), cspMetaPlugin()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, "index.html"),
      },
    },
  },
});

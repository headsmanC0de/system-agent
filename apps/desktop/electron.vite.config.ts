import { createRequire } from "node:module";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import { PRODUCTION_CSP } from "./src/security-policy";

const applicationPackage = createRequire(import.meta.url)("./package.json") as { version: string };

// Inject a strict CSP <meta> at build time as defense in depth (a meta in the
// dev HTML would block Vite's inline React-refresh preamble). 'self' covers the
// bundled assets; omitting 'unsafe-eval' blocks eval; connect-src allows LLM providers.
const cspMetaPlugin = () => ({
  name: "inject-csp-meta",
  apply: "build" as const,
  transformIndexHtml(html: string) {
    return html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`,
    );
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
        // renderer while keeping the preload contract compatible with sandboxing.
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
    define: { "import.meta.env.APP_VERSION": JSON.stringify(applicationPackage.version) },
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

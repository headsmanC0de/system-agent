import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

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
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "src/main/main.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, "src/main/preload.ts"),
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

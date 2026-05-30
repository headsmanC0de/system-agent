import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

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
    plugins: [react(), tailwindcss()],
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

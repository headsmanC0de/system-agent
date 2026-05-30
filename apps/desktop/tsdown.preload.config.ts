import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main/preload.ts"],
  outDir: "dist/main",
  format: "esm",
  platform: "browser",
  deps: { neverBundle: ["electron"] },
  shims: true,
  clean: false,
});

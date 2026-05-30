import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main/main.ts"],
  outDir: "dist/main",
  format: "esm",
  platform: "node",
  deps: { neverBundle: ["electron"] },
  shims: true,
});

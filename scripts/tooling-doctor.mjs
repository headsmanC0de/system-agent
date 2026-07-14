import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const packageJson = readJson("package.json");
const desktopPackage = readJson("apps/desktop/package.json");
const mcp = readJson(".mcp.json");
const opencode = readJson("opencode.json");
const failures = [];

for (const name of ["@playwright/mcp", "@tailwindcss/language-server", "@z_ai/mcp-server"]) {
  const declared = packageJson.devDependencies[name];
  const installed = require(`${name}/package.json`).version;
  if (declared !== installed) failures.push(`${name} must be pinned exactly: declared=${declared}, installed=${installed}`);
}

const electron = require("electron");
const runtime = spawnSync(electron, ["-p", "JSON.stringify(process.versions)"], {
  encoding: "utf8",
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
});
if (runtime.status !== 0) {
  failures.push(`Electron runtime probe failed: ${runtime.stderr.trim()}`);
} else {
  const versions = JSON.parse(runtime.stdout);
  const nodeTypesMajor = require("@types/node/package.json").version.split(".")[0];
  const runtimeNodeMajor = versions.node.split(".")[0];
  if (nodeTypesMajor !== runtimeNodeMajor) {
    failures.push(`@types/node major ${nodeTypesMajor} does not match Electron Node ${versions.node}`);
  }
  if (!versions.sqlite) failures.push("Electron runtime does not expose embedded SQLite");
}

const dependencyTree = spawnSync("npm", ["ls", "--all", "--json"], { cwd: root, encoding: "utf8" });
if (dependencyTree.status !== 0) failures.push("npm dependency tree is invalid; run npm ls for details");

const serialized = JSON.stringify({ mcp, opencode });
if (serialized.includes("@latest") || serialized.includes('"-y"')) failures.push("unpinned npx execution detected");
if (serialized.includes("--no-sandbox")) failures.push("Playwright sandbox is disabled");
if (opencode.mcp.filesystem) failures.push("redundant filesystem MCP is enabled");
if ("env" in opencode.mcp["zai-mcp-server"]) failures.push("OpenCode uses obsolete mcp.env field");
if (!mcp.mcpServers.playwright.args.includes("--isolated")) failures.push("Playwright MCP is not isolated");
if (opencode.lsp.typescript.command.join(" ") !== "npx --no-install tsc --lsp --stdio") {
  failures.push("OpenCode is not using the native TypeScript LSP");
}

const biomeVersion = require("@biomejs/biome/package.json").version;
for (const path of ["biome.json", "apps/desktop/biome.json"]) {
  const schema = readJson(path).$schema;
  if (!schema.includes(`/${biomeVersion}/`)) failures.push(`${path} schema does not match installed Biome`);
}

const docs = spawnSync(process.execPath, ["scripts/sync-reference-versions.mjs", "--check"], {
  cwd: root,
  encoding: "utf8",
});
if (docs.status !== 0) failures.push(docs.stderr.trim() || docs.stdout.trim());

if (failures.length) {
  console.error(`Tooling doctor failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Tooling doctor: manifests, lock, installed tools, runtime alignment, configs, and docs are consistent.");
}

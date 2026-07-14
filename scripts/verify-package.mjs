import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { FuseState, FuseV1Options, getCurrentFuseWire } from "@electron/fuses";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
const branding = require("../branding.json");
const desktopPackage = require("../apps/desktop/package.json");
const fusePolicy = require("../apps/desktop/build/fuse-policy.cjs");
const binary = new URL("../apps/desktop/dist/linux-unpacked/system-agent", import.meta.url).pathname;
const archive = new URL(`../apps/desktop/dist/${branding.id}-${desktopPackage.version}.pacman`, import.meta.url).pathname;
const failures = [];

if (!existsSync(binary)) failures.push(`missing packaged binary: ${binary}`);
if (!existsSync(archive)) failures.push(`missing pacman archive: ${archive}`);

if (failures.length === 0) {
  const wire = await getCurrentFuseWire(binary);
  for (const [name, enabled] of Object.entries(fusePolicy.expected)) {
    const index = FuseV1Options[name];
    const expectedState = enabled ? FuseState.ENABLE : FuseState.DISABLE;
    if (wire[index] !== expectedState) failures.push(`fuse ${name} does not match policy`);
  }

  const info = spawnSync("pacman", ["-Qip", archive], { encoding: "utf8", cwd: root });
  if (info.status !== 0) failures.push(info.stderr.trim() || "pacman metadata read failed");
  if (!info.stdout.match(new RegExp(`^Name\\s+: ${branding.id}$`, "m"))) failures.push("pacman package name drift");
  if (!info.stdout.match(new RegExp(`^Version\\s+: ${desktopPackage.version}-1$`, "m"))) {
    failures.push("pacman package version drift");
  }
  if (!info.stdout.includes(`URL             : ${desktopPackage.homepage}`)) failures.push("pacman homepage drift");

  const files = spawnSync("pacman", ["-Qlp", archive], { encoding: "utf8", cwd: root });
  if (files.status !== 0) failures.push(files.stderr.trim() || "pacman file list read failed");
  for (const expected of [`opt/${branding.name}/${branding.id}`, `usr/share/applications/${branding.id}.desktop`]) {
    if (!files.stdout.includes(expected)) failures.push(`pacman archive is missing ${expected}`);
  }
  if (!files.stdout.includes("usr/share/icons/hicolor/")) failures.push("pacman archive is missing installed icons");

  const archiveText = (entry) => spawnSync("bsdtar", ["-xOf", archive, entry], { encoding: "utf8", cwd: root });
  const desktop = archiveText(`usr/share/applications/${branding.id}.desktop`);
  const install = archiveText(".INSTALL");
  if (desktop.status !== 0 || !desktop.stdout.includes(`Exec=\"/opt/${branding.name}/${branding.id}\" %U`)) {
    failures.push("desktop entry does not launch the packaged executable");
  }
  if (install.status !== 0 || !install.stdout.includes(`ln -sf '/opt/${branding.name}/${branding.id}' '/usr/bin/${branding.id}'`)) {
    failures.push("pacman install hook does not expose the executable on PATH");
  }
}

if (failures.length) {
  console.error(`Package verification failed:\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Package verification: identity, metadata, desktop entry, icons, and all Electron fuses match SSOT.");
}

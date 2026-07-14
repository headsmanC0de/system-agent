const branding = require("../../branding.json");

module.exports = {
  appId: "com.project.desktop",
  productName: branding.name,
  executableName: branding.id,
  directories: { output: "dist" },
  files: ["out/**", "package.json"],
  asar: true,
  electronFuses: {
    runAsNode: false,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    onlyLoadAppFromAsar: true,
  },
  linux: {
    target: ["AppImage", "pacman"],
    category: "System",
    maintainer: branding.organization.name,
  },
  npmRebuild: false,
  electronVersion: "42.4.0",
  artifactName: `${branding.id}-\${version}.\${ext}`,
};

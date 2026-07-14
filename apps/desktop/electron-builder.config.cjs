const branding = require("../../branding.json");
const electronVersion = require("electron/package.json").version;
const fusePolicy = require("./build/fuse-policy.cjs");

module.exports = {
  appId: branding.appId,
  productName: branding.name,
  executableName: branding.id,
  extraMetadata: { desktopName: branding.id },
  directories: { output: "dist" },
  files: ["out/**", "package.json"],
  asar: true,
  electronFuses: fusePolicy.builder,
  linux: {
    target: ["AppImage", "pacman"],
    category: "System",
    icon: "build/icon.png",
    maintainer: branding.organization.name,
    syncDesktopName: true,
  },
  pacman: {
    packageName: branding.id,
    depends: [
      "c-ares",
      "gcc-libs",
      "glibc",
      "gtk3",
      "libevent",
      "libffi",
      "libpulse",
      "nss",
      "zlib",
      "fontconfig",
      "brotli",
      "libjpeg-turbo",
      "flac",
      "libdrm",
      "libxml2",
      "minizip",
      "opus",
      "libxslt",
      "harfbuzz",
      "freetype2",
    ],
  },
  electronVersion,
  artifactName: `${branding.id}-\${version}.\${ext}`,
};

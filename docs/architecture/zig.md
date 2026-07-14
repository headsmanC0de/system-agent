# Zig status and reintroduction contract

As verified on 2026-07-14, Zig `0.16.0` is the latest stable release and both host `zig` and `zls`
report `0.16.0`. Zig is not part of the current System Agent implementation. The repository contains no Zig source,
build manifest, package manifest, native artifact, or Zig LSP configuration. The host has matching
`zig` and `zls` executables, but they are user-local tools rather than project dependencies.

This is intentional: the previous native helper had no measured advantage over the current Node and
Electron system APIs, was not part of the production build, and left generated cache in Git. Keeping
a dormant `build.zig` or ZLS entry would falsely claim a supported build surface.

If a measured native requirement appears, Zig can return only as a complete current slice:

1. Select the latest stable release from the official Learn/Download pages and make that selection a
   single toolchain source of truth; `zig` and `zls` must use the same language version.
2. Add real source plus `build.zig` and `build.zig.zon`; use `standardTargetOptions`,
   `standardOptimizeOption`, `b.path`, `installArtifact`, and explicit test/run steps.
3. Never hardcode output paths. `.zig-cache/` and `zig-out/` are generated and remain untracked.
4. Pin package hashes in `build.zig.zon`; prefer reproducible Zig dependencies, while Arch packaging
   should deliberately use system libraries where distribution policy requires them.
5. Gate the slice with `zig fmt --check`, `zig build test`, debug and release builds, sanitizer/error
   paths where applicable, and an integration test proving the Electron boundary.
6. Add ZLS configuration only after Zig files exist, then verify initialization against the selected
   compiler rather than maintaining a dormant LSP entry.

Official sources:

- Learn and current stable links: https://ziglang.org/learn/
- Downloads and signed release artifacts: https://ziglang.org/download/
- Build system guide: https://ziglang.org/learn/build-system/
- Stable language reference: follow the current stable link from the Learn page.

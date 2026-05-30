const std = @import("std");

pub fn build(b: *std.Build) void {
    const mod = b.createModule(.{
        .root_source_file = b.path("linux_helper.zig"),
        .target = b.resolveTargetQuery(.{
            .cpu_arch = .x86_64,
            .os_tag = .linux,
            .abi = .gnu,
        }),
        .optimize = .ReleaseFast,
    });
    mod.linkSystemLibrary("c", .{});

    const lib = b.addLibrary(.{
        .name = "linux_helper",
        .root_module = mod,
        .linkage = .dynamic,
    });
    b.installArtifact(lib);
}

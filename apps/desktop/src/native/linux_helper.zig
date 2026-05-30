const std = @import("std");

const sysinfo = @cImport(@cInclude("sys/sysinfo.h"));
const statvfs = @cImport(@cInclude("sys/statvfs.h"));

export fn get_memory_info() extern struct {
    total_ram: u64,
    free_ram: u64,
    shared_ram: u64,
    buffer_ram: u64,
    total_swap: u64,
    free_swap: u64,
    uptime: u64,
    procs: u16,
} {
    var info: sysinfo.struct_sysinfo = undefined;
    _ = sysinfo.sysinfo(&info);

    return .{
        .total_ram = info.totalram,
        .free_ram = info.freeram,
        .shared_ram = info.sharedram,
        .buffer_ram = info.bufferram,
        .total_swap = info.totalswap,
        .free_swap = info.freeswap,
        .uptime = info.uptime,
        .procs = info.procs,
    };
}

export fn get_cpu_usage(sample: *[2]u64) void {
    const stat = std.fs.openFileAbsolute("/proc/stat", .{}) catch return;
    defer stat.close();
    var buf: [512]u8 = undefined;
    const n = stat.readAll(&buf) catch return;
    const line = std.mem.sliceTo(&buf, '\n');

    var total: u64 = 0;
    var idle: u64 = 0;
    var i: usize = 0;
    var it = std.mem.splitScalar(u8, line, ' ');
    while (it.next()) |field| {
        if (field.len == 0) continue;
        const val = std.fmt.parseInt(u64, field, 10) catch 0;
        if (i == 3 or i == 4) idle += val;
        total += val;
        i += 1;
    }
    sample[0] = idle;
    sample[1] = total;
}

export fn get_load_avg() [3]f64 {
    var avg: [3]f64 = undefined;
    _ = std.c.getloadavg(&avg, 3);
    return avg;
}

export fn get_hostname(buf: [*]u8, max: usize) usize {
    const name = std.posix.gethostname(buf[0..max]) catch return 0;
    return name.len;
}

export fn get_disk_info(mount: [*:0]const u8) extern struct {
    total: u64,
    free: u64,
    available: u64,
    block_size: u64,
} {
    var vfs: statvfs.struct_statvfs = undefined;
    if (statvfs.statvfs(mount, &vfs) != 0) {
        return .{ .total = 0, .free = 0, .available = 0, .block_size = 0 };
    }
    return .{
        .total = vfs.f_blocks * vfs.f_bsize,
        .free = vfs.f_bfree * vfs.f_bsize,
        .available = vfs.f_bavail * vfs.f_bsize,
        .block_size = vfs.f_bsize,
    };
}

export fn get_uptime_seconds() u64 {
    var info: sysinfo.struct_sysinfo = undefined;
    _ = sysinfo.sysinfo(&info);
    return info.uptime;
}

const ProcessInfo = extern struct {
    pid: i32,
    uid: u32,
    state: u8,
    cpu_ticks: u64,
    rss_pages: u64,
    comm: [16]u8,
};

export fn get_process_list(allocator: *std.mem.Allocator, max_count: u32) ?[*]ProcessInfo {
    var procs = std.ArrayList(ProcessInfo).initCapacity(allocator.*, max_count) catch return null;
    defer procs.deinit();

    var dir = std.fs.openDirAbsolute("/proc", .{ .iterate = true }) catch return null;
    defer dir.close();
    var iter = dir.iterate();

    while (iter.next() catch null) |entry| {
        if (entry.kind != .directory) continue;
        const pid = std.fmt.parseInt(i32, entry.name, 10) catch continue;

        var stat_path: [64]u8 = undefined;
        const path = std.fmt.bufPrintZ(&stat_path, "/proc/{d}/stat", .{pid}) catch continue;

        const file = std.fs.openFileAbsolute(path, .{}) catch continue;
        defer file.close();

        var buf: [512]u8 = undefined;
        const n = file.readAll(&buf) catch continue;

        const content = buf[0..@min(n, buf.len)];
        const comm_end = std.mem.indexOfScalar(u8, content, ')') orelse continue;
        const after_comm = content[comm_end + 2 ..];

        var fields = std.mem.splitScalar(u8, after_comm, ' ');
        _ = fields.next();
        const state = if (fields.next()) |s| s[0] else '?';
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        const utime = std.fmt.parseInt(u64, fields.next() orelse "0", 10) catch 0;
        const stime = std.fmt.parseInt(u64, fields.next() orelse "0", 10) catch 0;
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        _ = fields.next();
        const rss = std.fmt.parseInt(u64, fields.next() orelse "0", 10) catch 0;

        const comm_start = std.mem.indexOfScalar(u8, content, '(') orelse 1;
        const comm = content[comm_start + 1 .. comm_end];

        var proc = ProcessInfo{
            .pid = pid,
            .uid = 0,
            .state = state,
            .cpu_ticks = utime + stime,
            .rss_pages = rss,
            .comm = std.mem.zeroes([16]u8),
        };
        @memcpy(proc.comm[0..@min(comm.len, 15)], comm[0..@min(comm.len, 15)]);

        procs.appendAssumeCapacity(proc);
        if (procs.items.len >= max_count) break;
    }

    const result = allocator.alloc(ProcessInfo, procs.items.len) catch return null;
    @memcpy(result, procs.items);
    return result.ptr;
}

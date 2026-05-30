# Blueprint — System Manager Desktop

Architecture reference document. White-label: no branding, no product names in code.

---

## 1. Pattern Source Matrix

| # | Pattern | Source | Where We Use It | Layer |
|---|---------|--------|-----------------|-------|
| P-01 | **Application Runtime Abstraction** (`apprt`) | Ghostty `src/apprt.zig` | `src/main/main.ts` (Electron main) + future: TUI runtime, lib mode | Core |
| P-02 | **Typed IPC Bus** (`ipcMain.handle` / channel-based) | Ghostty `src/apprt/ipc.zig` | `src/main/ipc.ts` ↔ `src/api.ts` | Core |
| P-03 | **Mailbox / Message Queue** | Ghostty `src/datastruct/blocking_queue.zig` → `App.Mailbox` | Zig native layer: `Future(T)`, `Group` for concurrent syscalls | Native |
| P-04 | **Config with Conditional State** | Ghostty `src/config/conditional.zig` | `src/lib/theme.ts` (light/dark + accent) + future: per-page config | UI |
| P-05 | **Comptime Build Config** | Ghostty `src/build_config.zig` | `electron.vite.config.ts` (define `BUILD_TARGET`: "desktop" \| "tui" \| "lib") | Build |
| P-06 | **Surface / Window Lifecycle** | Ghostty `src/Surface.zig` + `App.addSurface/deleteSurface` | `createWindow()` in `main.ts` — future: multi-window, tab model | Core |
| P-07 | **Renderer Backend Selection** | Ghostty `src/renderer.zig` `Backend` enum | GPU flags in `main.ts` (X11 vs Wayland, hardware vs software) | Core |
| P-08 | **Action System** (scoped to app/surface) | Ghostty `src/apprt/action.zig` | `api.ts` namespace: `system.*`, `passwords.*` — typed invoke pattern | API |
| P-09 | **Command Pattern** (subprocess wrapper) | Ghostty `src/Command.zig` | `ipc.ts` → `exec()` / `shell()` with timeout, buffer limits | IPC |
| P-10 | **Structs (shared value types)** | Ghostty `src/apprt/structs.zig` | `src/types.ts` — all interfaces as pure data, no logic | Types |
| P-11 | **Global State singleton** | Ghostty `src/global.zig` `GlobalState` | Future: Zig native `.so` exports single `state` struct | Native |
| P-12 | **File-type Convention** (one file = one struct/namespace) | Ghostty `src/App.zig`, `src/Command.zig` | `src/pages/*.tsx`, `src/native/linux_helper.zig` | Structural |

---

## 2. Borrowed Patterns

### P-01: Application Runtime Abstraction

**Ghostty:** `src/apprt.zig` selects at comptime between `.gtk`, `.none`, `.browser`, `.embedded`. Each runtime provides `App` + `Surface` with the same interface.

**Our adaptation:**
```
src/main/main.ts          — Electron runtime (current)
src/main/main-tui.ts      — Terminal runtime (future: blessed/ink)
src/main/main-lib.ts      — Headless library mode (future: for agents/API)
```
Runtime selection via `electron.vite.config.ts` → `BUILD_TARGET` define. Each runtime provides:
- `createWindow()` or `createInterface()`
- `initIpc()` or equivalent input/output bridge
- Same `api.ts` contract on the consumer side

### P-02: Typed IPC Bus

**Ghostty:** `App.Mailbox` with typed `Message` union — `open_config`, `new_window`, `surface_message`, `quit`. Thread-safe push with wakeup.

**Our adaptation:** `ipcMain.handle("namespace:method")` → typed `api.ts` namespaces. Each namespace is a typed object:
```ts
export const system = { overview, memory, cpuUsage, ... }
export const passwords = { list, show, generate, insert, delete, copy }
```
Future: same contract over WebSocket (lib mode) or stdio (TUI mode).

### P-03: Mailbox / Async Message Queue

**Ghostty:** `BlockingQueue(T, capacity)` — SPSC, fixed size, drain-based consumption, external wakeup via eventfd.

**Our adaptation:** In the Zig native layer (LH-010), use `std.Io.Group` / `Future(T)` for concurrent syscalls. Example: read `/proc/stat`, `nvidia-smi`, `sensors` in parallel, await all:
```zig
var group: std.Io.Group = .init;
group.async(io, readCpuStats, .{io});
group.async(io, readGpuData, .{io});
group.async(io, readSensors, .{io});
try group.await(io);
```

### P-04: Config with Conditional State

**Ghostty:** `config/conditional.zig` — `State { theme, os }` matched against `Conditional { key, op, value }`. Config entries can be conditional: `config = dark-theme if theme == dark`.

**Our adaptation:** `src/lib/theme.ts` stores `{ accentId, mode }`. CSS variables switch via `<html class="dark|light">`. Future: per-page conditional state (e.g., show GPU fan control only if NVIDIA detected).

### P-09: Command Pattern

**Ghostty:** `src/Command.zig` — subprocess with pre_exec/post_fork hooks, stdin/stdout/stderr pipe setup, env override, cwd control.

**Our adaptation:** `ipc.ts` wraps `execFile` and `shell()`:
```ts
function cmd(command, args)      // execFile — simple commands
function shell(script)            // bash -c — pipes, redirects
```
Future: migrate heavy commands to Zig native with `std.process.spawn(io, .{ .argv = argv })`.

---

## 3. Key Abstractions

### 3.1 Layer Architecture

```
┌─────────────────────────────────────┐
│  Renderer (React + TW4)             │  pages/*.tsx, components/ui.tsx
│  - Declarative UI                   │  App.tsx (routing, sidebar)
│  - CSS variables for theming        │  index.css (design tokens)
├─────────────────────────────────────┤
│  API Client (api.ts)                │  Typed invoke wrappers
│  - Namespace-based                  │  system.*, passwords.*
│  - Runtime-agnostic contract        │
├─────────────────────────────────────┤
│  IPC Bridge (preload.ts)            │  contextBridge.exposeInMainWorld
│  - Security boundary                │  ipcMain.handle → ipcRenderer.invoke
├─────────────────────────────────────┤
│  Main Process (main.ts + ipc.ts)    │  Shell execution, OS access
│  - Command execution                │  exec / shell helpers
│  - Native addon loading (future)    │  ffi-napi / node-addon-api
├─────────────────────────────────────┤
│  Native Library (src/native/)       │  Zig .so (LH-010)
│  - sysinfo, /proc, statvfs          │  export fn → C ABI
│  - NVML, sensors                    │  std.Io.Threaded backend
└─────────────────────────────────────┘
```

### 3.2 Type System

All data types are pure interfaces in `src/types.ts` — no methods, no logic. This mirrors Ghostty's `apprt/structs.zig` pattern where shared value types are separate from behavior.

| Category | Types | IPC Channel |
|----------|-------|-------------|
| System | `OverviewData`, `MemoryData`, `CpuSample`, `ProcessInfo` | `system:*` |
| Packages | `PackageInfo`, `OutdatedPackage` | `system:packages`, `system:outdated` |
| Storage | `SnapshotInfo`, `DiskInfo` | `system:snapshots`, `system:disk` |
| Services | `ServiceInfo`, `FailedService`, `AutostartEntry`, `TimerInfo` | `system:services`, etc. |
| Hardware | `GpuData`, `NetConnection` | `system:gpu`, `system:net-connections` |
| Security | `PasswordEntry`, `PasswordDetail` | `password:*` |
| Chat | `ChatMessage` | `chat:*` |
| Navigation | `PageId` (union of 15 page IDs) | — |

### 3.3 Page Architecture

Each page in `src/pages/*.tsx` follows the same contract:
```
export function XxxPage() {
  const [data, setData] = useState(...)
  const refresh = useCallback(async () => { ... })
  useEffect(() => { refresh() }, [refresh])
  return <div className="space-y-6">...</div>
}
```

Pages are registered in `App.tsx` via `PAGES: Record<PageId, React.FC>` and `PAGE_TITLES`. Adding a new page = 3 edits (types, page file, App registration).

---

## 4. Adapted Mechanisms

### 4.1 GPU/Wayland Compatibility (Adapted from Ghostty renderer selection)

Ghostty selects renderer backend at comptime: `metal | opengl | webgl`. We adapt this to runtime Chromium flag selection:

```ts
// main.ts — runtime GPU strategy selection
app.commandLine.appendSwitch("disable-gpu-sandbox")
app.commandLine.appendSwitch("disable-dev-shm-usage")
app.commandLine.appendSwitch("ozone-platform", "x11")  // Force X11 on NVIDIA+Wayland
app.disableHardwareAcceleration()
```

Future: detect `XDG_SESSION_TYPE`, GPU vendor (`lspci`), and select flags dynamically.

### 4.2 Security Boundary (Adapted from Ghostty embedded C API)

Ghostty's embedded mode exposes a C API with explicit callback function pointers (`wakeup`, `action`, `read_clipboard`). We use Electron's `contextBridge` as the security boundary:

- `preload.ts` exposes only `invoke(channel, ...args)` — no direct IPC access
- Main process validates all incoming channels
- `sudo` commands: future migration to polkit (pkexec) instead of stdin password piping

### 4.3 Theming System (Adapted from Ghostty conditional config)

Ghostty: `config.changeConditionalState({ theme: .dark })` → re-render all surfaces.

Our approach:
- `src/lib/theme.ts`: 12 accent presets + light/dark mode → stored in `localStorage`
- `src/index.css`: CSS custom properties `--primary`, `--background`, `--card`, etc.
- Toggle applies class on `<html>`, CSS variables cascade
- White-label: all color names are semantic, no brand references

---

## 5. Own Extensions

### 5.1 Multi-Backend Password Manager

First-party password vault using `pass` (password-store) as backend. Abstracted so future backends (Bitwarden CLI, KeePassXC CLI) can be added:

```ts
// api.ts — backend-agnostic interface
export const passwords = {
  list: ()     => invoke<PasswordEntry[]>("password:list"),
  show: (path) => invoke<PasswordDetail | null>("password:show", path),
  generate: (path, len) => invoke<string>("password:generate", path, len),
  insert: (path, content) => invoke<string>("password:insert", path, content),
  delete: (path) => invoke<string>("password:delete", path),
  copy: (path) => invoke<string>("password:copy", path),
}
```

IPC handlers in `ipc.ts` can be swapped: `pass` → `bw` → `keepassxc-cli` without touching the UI.

### 5.2 AI Agent Chat with System Context

`ChatPage` with context injection — the AI agent can access live system data (packages, sensors, GPU) on demand. This extends the Ghostty inspector concept: instead of inspecting terminal state, the agent inspects system state.

### 5.3 Preset-Based Migration System (P2 Roadmap)

Windows installer generates a migration profile JSON:
```json
{
  "hardware": { "cpu": "...", "gpu": "...", "ram": "..." },
  "preset": "gaming",
  "packages": ["steam", "wine", "mangohud"],
  "services": ["docker", "libvirt"]
}
```
Linux side imports this profile and validates against actual hardware.

### 5.4 Zig Native Shared Library

`src/native/linux_helper.zig` compiled to `.so`, loaded via FFI or node-addon-api. Provides:
- Direct syscall access (`sysinfo`, `/proc`, `statvfs`)
- NVML bindings for GPU data (no `nvidia-smi` subprocess)
- `sensors` library bindings (no `sensors` CLI)
- C ABI exports: `export fn sysinfo_get(...)`

Uses Zig 0.16 `std.Io.Threaded` for I/O backend (works from `.so` context).

---

## 6. Structural Conventions

### File Organization (from Ghostty's one-struct-per-file)

```
src/
  App.zig           →  App.tsx         (routing, layout, lifecycle)
  Surface.zig       →  main.ts         (window management)
  Command.zig       →  ipc.ts          (command execution)
  config/           →  lib/            (configuration modules)
  apprt/            →  main/           (runtime: main.ts, preload.ts, ipc.ts)
  terminal/         →  pages/          (user-facing modules)
  datastruct/       →  components/     (reusable building blocks)
  renderer/         →  index.css       (visual output layer)
```

### Naming Conventions

| Domain | Convention | Example |
|--------|-----------|---------|
| IPC channels | `namespace:method` | `system:overview`, `password:list` |
| API namespaces | camelCase object | `system`, `passwords` |
| Page components | PascalCase + "Page" suffix | `DashboardPage`, `PasswordsPage` |
| Types | PascalCase interfaces | `GpuData`, `PasswordEntry` |
| CSS variables | `--semantic-name` | `--primary`, `--background`, `--card` |
| File names | PascalCase for pages, camelCase for utils | `Gpu.tsx`, `theme.ts` |

### White-Label Rules

1. All user-facing strings come from a config file (future: i18n)
2. All colors are CSS variables, never hardcoded hex in components
3. No brand names in code — use `System Manager`, `Desktop App`, `Native Library`
4. Bundle ID configurable: `com.system-manager.desktop` (default)
5. Logo/branding is a single SVG replace: `public/favicon.svg`

---

## 7. Dependency Map

```
React ←── App.tsx ←── pages/*.tsx
  │           │           │
  │           ├── types.ts (shared interfaces)
  │           ├── lib/theme.ts (theming)
  │           └── components/ui.tsx (primitives)
  │
  └── api.ts ←── preload.ts ←── ipc.ts ←── OS commands
                                        └── native/*.so (future)

Build: electron-vite (main + preload + renderer)
Package: electron-builder
Native: Zig 0.16 → .so → FFI/node-addon-api
```

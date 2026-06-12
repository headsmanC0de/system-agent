import { existsSync } from "node:fs";
import { join } from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, session, shell } from "electron";
import { BRAND_URL, ORG_URL } from "../lib/branding.js";
import { initIpc } from "./ipc.js";

// Electron security checklist #15: shell.openExternal only for trusted URLs.
// Previously ANY http/https window.open was forwarded to the default browser —
// so even the e2e deny-test (window.open("https://example.com")) popped a real
// browser tab on every test run (BF-041). Hosts derive from branding (SSOT)
// plus the API-key providers linked from Settings.
const TRUSTED_EXTERNAL_HOSTS = new Set([
  new URL(ORG_URL).hostname,
  new URL(BRAND_URL).hostname,
  "z.ai",
  "platform.openai.com",
]);

function isTrustedExternal(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && TRUSTED_EXTERNAL_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

// audit S-2 / LH-063: the Chromium sandbox flags below are ONLY needed for the
// NVIDIA + Wayland GPU crash. Applying them unconditionally disabled the sandbox for
// every user. Instead, detect that exact combo and scope the workaround to it, so the
// OS sandbox is recovered on every other setup. `LH_GPU_WORKAROUND=1|0` force-overrides.
// Default-applies on the affected combo (no regression for affected users); the e2e
// covers the recovered-sandbox path.
function needsGpuSandboxWorkaround(): boolean {
  const forced = process.env.LH_GPU_WORKAROUND;
  if (forced === "1") return true;
  if (forced === "0") return false;
  if (process.platform !== "linux") return false;
  const isWayland = process.env.XDG_SESSION_TYPE === "wayland" || !!process.env.WAYLAND_DISPLAY;
  const isNvidia = existsSync("/proc/driver/nvidia") || existsSync("/dev/nvidia0");
  return isWayland && isNvidia;
}

app.disableHardwareAcceleration();
if (needsGpuSandboxWorkaround()) {
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-gpu-sandbox");
}
app.commandLine.appendSwitch("disable-dev-shm-usage");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("enable-features", "NetworkServiceInProcess");
app.commandLine.appendSwitch("disable-features", "VaapiVideoDecoder,VaapiVideoEncoder");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // The preload is built as CJS specifically so the sandbox can stay on:
      // Electron refuses ESM preloads in a sandboxed renderer (BF-035). Only the
      // NVIDIA+Wayland combo (where the OS sandbox is already off via --no-sandbox)
      // keeps sandbox: false. Caught by the Electron-mode e2e.
      sandbox: !needsGpuSandboxWorkaround(),
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  // Navigation hardening (audit S-5): deny all window.open / target=_blank;
  // only allowlisted https hosts are handed to the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedExternal(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  // The renderer is a SPA (client-side routing, no real navigations). Allow only
  // the dev server URL (for HMR full reloads) and block everything else — including
  // arbitrary file:// paths like file:///etc/passwd (audit S-5, review fix).
  win.webContents.on("will-navigate", (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (!devUrl || !url.startsWith(devUrl)) event.preventDefault();
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// Content-Security-Policy (audit S-3). Strict in production (bundled assets are
// same-origin); relaxed in dev so Vite HMR + React Refresh inline preamble work.
function installCsp() {
  const policy = is.dev
    ? "default-src 'self' 'unsafe-inline' data: blob: http://localhost:* ws://localhost:*; connect-src 'self' http: https: ws: wss:; img-src 'self' data: blob:"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http: https:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    });
  });
}

app.on("child-process-gone", (_e, details) => {
  if (details.type === "GPU") {
    console.error("GPU subprocess exited, running without GPU acceleration");
  }
});

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.project.desktop");
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  installCsp();
  initIpc();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

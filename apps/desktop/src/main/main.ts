import { join } from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, session, shell } from "electron";
import { initIpc } from "./ipc.js";

app.disableHardwareAcceleration();
// NOTE (audit S-2 / LH-063): these two sandbox flags are a NVIDIA+Wayland crash
// workaround. Empirically tested 2026-06-02: with the flags removed the app still
// launches and all 4 Electron e2e tests pass IN CI (a non-NVIDIA Linux env). They
// are kept anyway because that CI result does NOT prove the original NVIDIA+Wayland
// GPU crash stays fixed on the user's hardware — recovering the OS sandbox needs a
// real boot on that box. Removing them is a one-line change once confirmed there.
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-gpu-sandbox");
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
      preload: join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // electron-vite emits an ESM (.mjs) preload; Electron only loads ESM preloads
      // when the renderer sandbox is disabled. Without this the preload never runs and
      // window.electronAPI is undefined → all IPC silently dead in production builds.
      // (OS sandbox is already off via the --no-sandbox GPU workaround; contextIsolation
      // remains the active isolation boundary.) Caught by the Electron-mode e2e.
      sandbox: false,
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  // Navigation hardening (audit S-5): block in-app navigation away from the
  // app origin and deny all window.open / target=_blank — open externally instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) shell.openExternal(url);
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

import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, net, protocol, session, shell } from "electron";
import { BRAND_APP_ID } from "../lib/branding.js";
import { DEVELOPMENT_CSP, PRODUCTION_CSP } from "../security-policy.js";
import { closeIpcResources, initIpc } from "./ipc.js";
import {
  APP_ORIGIN,
  APP_SCHEME,
  isTrustedExternalUrl,
  isTrustedRendererUrl,
  resolveRendererAsset,
} from "./runtime-origin.js";
import { installFileTelemetry, telemetry } from "./telemetry.js";

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, codeCache: true },
  },
]);

// Electron security checklist #15: shell.openExternal only for trusted URLs.
// Previously ANY http/https window.open was forwarded to the default browser —
// so even the e2e deny-test (window.open("https://example.com")) popped a real
// browser tab during tests. Hosts derive from branding (SSOT)
// plus the API-key providers linked from Settings.
app.disableHardwareAcceleration();
app.enableSandbox();
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
      sandbox: true,
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });
  win.webContents.on("did-fail-load", (_event, errorCode) => telemetry.recordApp("load-failed", errorCode));
  win.webContents.on("preload-error", () => telemetry.recordApp("preload-failed"));
  win.webContents.on("render-process-gone", (_event, details) => telemetry.recordApp("renderer-gone", details.reason));

  // Navigation hardening (audit S-5): deny all window.open / target=_blank;
  // only allowlisted https hosts are handed to the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isTrustedExternalUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  // The renderer is a SPA (client-side routing, no real navigations). Allow only
  // the dev server URL (for HMR full reloads) and block everything else — including
  // arbitrary local paths.
  win.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadURL(`${APP_ORIGIN}/index.html`);
  }
}

// Content-Security-Policy (audit S-3). Strict in production (bundled assets are
// same-origin); relaxed in dev so Vite HMR + React Refresh inline preamble work.
function installCsp() {
  const policy = is.dev ? DEVELOPMENT_CSP : PRODUCTION_CSP;
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    });
  });
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
}

function installAppProtocol(): void {
  const rendererRoot = resolve(__dirname, "../renderer");
  protocol.handle(APP_SCHEME, (request) => {
    const target = resolveRendererAsset(rendererRoot, request.url);
    if (!target) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(target).toString());
  });
}

app.on("child-process-gone", (_e, details) => {
  telemetry.recordApp("child-gone", `${details.type}:${details.reason}`);
});

process.on("unhandledRejection", () => telemetry.recordApp("unhandled-rejection"));
process.on("uncaughtExceptionMonitor", () => telemetry.recordApp("uncaught-exception"));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const window = BrowserWindow.getAllWindows()[0];
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.whenReady().then(() => {
    const closeTelemetry = installFileTelemetry(app.getPath("userData"));
    telemetry.recordApp("started", process.versions.electron);
    app.once("will-quit", () => {
      telemetry.recordApp("stopped");
      closeTelemetry();
    });
    electronApp.setAppUserModelId(BRAND_APP_ID);
    app.on("browser-window-created", (_, window) => {
      optimizer.watchWindowShortcuts(window);
    });
    installCsp();
    installAppProtocol();
    initIpc();
    createWindow();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", closeIpcResources);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

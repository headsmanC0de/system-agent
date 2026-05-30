import { join } from "node:path";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow } from "electron";
import { initIpc } from "./ipc.js";

app.disableHardwareAcceleration();
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
    },
  });

  win.on("ready-to-show", () => {
    win.show();
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }
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
  initIpc();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

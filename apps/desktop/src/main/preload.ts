import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";

const api = {
  ...electronAPI,
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electronAPI", api);
  } catch (error) {
    console.error(error);
  }
} else {
  (window as any).electronAPI = api;
}

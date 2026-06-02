import { electronAPI } from "@electron-toolkit/preload";
import { contextBridge, ipcRenderer } from "electron";
import { isAllowedChannel } from "./channels.js";

const api = {
  ...electronAPI,
  invoke: (channel: string, ...args: unknown[]) => {
    if (!isAllowedChannel(channel)) {
      return Promise.reject(new Error(`Blocked IPC channel: ${channel}`));
    }
    return ipcRenderer.invoke(channel, ...args);
  },
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

import { contextBridge, ipcRenderer } from "electron";
import { type IpcErrorCode, type IpcResponse, isAllowedChannel } from "./channels.js";

export class IpcClientError extends Error {
  readonly code: IpcErrorCode;
  readonly requestId: string;
  readonly retryable: boolean;

  constructor(response: Extract<IpcResponse<never>, { ok: false }>) {
    super(`IPC request failed (${response.error.code}, request ${response.requestId})`);
    this.name = "IpcClientError";
    this.code = response.error.code;
    this.requestId = response.requestId;
    this.retryable = response.error.retryable;
  }
}

const api = Object.freeze({
  invoke: async (channel: string, ...args: unknown[]) => {
    if (!isAllowedChannel(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`);
    }
    const response = (await ipcRenderer.invoke(channel, ...args)) as IpcResponse<unknown>;
    if (response.ok) return response.value;
    throw new IpcClientError(response);
  },
});

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electronAPI", api);
  } catch (error) {
    console.error(error);
  }
} else {
  (globalThis as { electronAPI?: typeof api }).electronAPI = api;
}

import { contextBridge, ipcRenderer } from "electron";
import type { IpcChannel, IpcRequestMap, IpcResponseMap } from "@covenantpulse/shared";

const api = {
  invoke: async <C extends IpcChannel>(channel: C, payload: IpcRequestMap[C]) => {
    return ipcRenderer.invoke(channel, payload) as Promise<IpcResponseMap[C]>;
  }
};

contextBridge.exposeInMainWorld("covenantApi", api);

export type CovenantApi = typeof api;

import type { IpcChannel, IpcRequestMap, IpcResponseMap } from "@shared";

declare global {
  interface Window {
    covenantApi?: {
      invoke: <C extends IpcChannel>(
        channel: C,
        payload: IpcRequestMap[C]
      ) => Promise<IpcResponseMap[C]>;
    };
  }
}

export {};

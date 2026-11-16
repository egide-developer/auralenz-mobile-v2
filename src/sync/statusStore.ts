import { create } from "zustand";

export type SyncConnectionStatus = "online" | "connecting" | "offline";

interface SyncStatusState {
  status: SyncConnectionStatus;
  networkOnline: boolean;
  socketConnected: boolean;
  setNetworkOnline: (online: boolean) => void;
  setSocketConnected: (connected: boolean) => void;
}

function getStatus(networkOnline: boolean, socketConnected: boolean): SyncConnectionStatus {
  if (!networkOnline) return "offline";
  return socketConnected ? "online" : "connecting";
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  status: "connecting",
  networkOnline: true,
  socketConnected: false,
  setNetworkOnline: (networkOnline) =>
    set((state) => ({
      networkOnline,
      status: getStatus(networkOnline, state.socketConnected),
    })),
  setSocketConnected: (socketConnected) =>
    set((state) => ({
      socketConnected,
      status: getStatus(state.networkOnline, socketConnected),
    })),
}));

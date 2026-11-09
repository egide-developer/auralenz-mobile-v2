import { create } from "zustand";
import { Alert } from "react-native";
import { useAuthStore } from "./authStore";
import { connectSocket } from "../services/socket";
import {
  onLivePeers,
  onLivePeerJoined,
  onLivePeerLeft,
  onLiveOffer,
  onLiveAnswer,
  onLiveIce,
  onLiveError,
  onLiveEnded,
  joinLiveRoomSocket,
  leaveLiveRoomSocket,
  sendLiveOffer,
  sendLiveAnswer,
  sendLiveIce,
} from "../services/socket";
import { LiveRoomMesh, isLiveRoomAvailable } from "../services/liveRoomMesh";
import api from "../api/client";
import { API } from "../api/endpoints";
import { showToast } from "./toastStore";

export type LiveRoomKind = "audio" | "video";

export interface LiveRoomPreview {
  id: string;
  host: {
    id: string;
    username: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  title: string;
  topic?: string;
  status: "live" | "ended";
  maxParticipants: number;
  participantsCount: number;
  participants: Array<{
    id: string;
    username: string;
    avatarUrl?: string;
    isVerified?: boolean;
  }>;
  startedAt: string;
}

export interface LiveRoomMember {
  id: string;
  username: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isSpeaking?: boolean;
  hasLocalStream?: boolean;
  remoteStream?: any;
  connectionFailed?: boolean;
}

interface LiveRoomState {
  // Room list (discover)
  rooms: LiveRoomPreview[];
  roomsLoading: boolean;
  roomsError: string | null;

  // Active room state
  activeRoomId: string | null;
  roomTitle: string;
  roomTopic?: string;
  roomHostId: string | null;
  roomStatus: "live" | "ended" | null;
  roomMaxParticipants: number;
  members: LiveRoomMember[];
  localUserId: string | null;
  localKind: LiveRoomKind | null;
  localStream: any | null;
  localMuted: boolean;
  localCameraOff: boolean;
  isInRoom: boolean;

  // Actions
  fetchRooms: () => Promise<void>;
  createRoom: (title: string, topic?: string) => Promise<LiveRoomPreview | null>;
  joinRoom: (roomId: string, kind: LiveRoomKind) => Promise<void>;
  leaveRoom: () => Promise<void>;
  endRoom: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setCameraOff: (off: boolean) => void;
  /** Called when a peer's connection fails; UI can show a badge. */
  markPeerConnectionFailed: (userId: string) => void;

  // Internal
  _listenersInitialized: boolean;
  _initListeners: () => void;
  _cleanup: () => void;
}

const initialState = {
  rooms: [],
  roomsLoading: false,
  roomsError: null,
  activeRoomId: null,
  roomTitle: "",
  roomTopic: undefined,
  roomHostId: null,
  roomStatus: null,
  roomMaxParticipants: 8,
  members: [],
  localUserId: null,
  localKind: null,
  localStream: null,
  localMuted: false,
  localCameraOff: false,
  isInRoom: false,
  _listenersInitialized: false,
};

function unavailableAlert() {
  Alert.alert(
    "Live Rooms unavailable",
    "Audio/video rooms need a custom development build (react-native-webrtc isn't available in Expo Go). Build a dev client to use this."
  );
}

export const useLiveRoomStore = create<LiveRoomState>((set, get) => {
  let mesh: LiveRoomMesh | null = null;
  let listenersInitialized = false;

  const cleanup = async () => {
    // Disconnect socket room first.
    if (get().activeRoomId) {
      leaveLiveRoomSocket(get().activeRoomId!);
    }
    // Tear down mesh.
    await mesh?.cleanup();
    mesh = null;
    listenersInitialized = false;

    set({
      ...initialState,
      rooms: get().rooms, // preserve discovered rooms
      roomsError: get().roomsError,
    });
  };

  const initListeners = () => {
    if (listenersInitialized) return;
    listenersInitialized = true;
    set({ _listenersInitialized: true });

    // Peer list (after live_join)
    onLivePeers((data) => {
      // data.peers are IDs of peers already in the room.
      // The mesh service handles creating offers to them.
    });

    // New peer joined
    onLivePeerJoined((data) => {
      const { userId } = data;
      // Avoid duplicates
      const { members, localUserId } = get();
      if (userId === localUserId || members.some((m) => m.id === userId)) return;
      set({
        members: [
          ...members,
          { id: userId, username: "…", avatarUrl: "", isVerified: false },
        ],
      });
      // Mesh service will create an offer to this new peer.
      mesh?.createOfferFor?.(userId);
    });

    // Peer left
    onLivePeerLeft((data) => {
      const { userId } = data;
      mesh?.handlePeerLeft(userId);
      set({ members: get().members.filter((m) => m.id !== userId) });
    });

    // Signaling
    onLiveOffer(async (data) => {
      await mesh?.handleOffer(data.fromUserId, data.sdp);
    });
    onLiveAnswer(async (data) => {
      await mesh?.handleAnswer(data.fromUserId, data.sdp);
    });
    onLiveIce(async (data) => {
      await mesh?.handleIce(data.fromUserId, data.candidate);
    });

    // Errors / lifecycle
    onLiveError((data) => {
      showToast(data.message, "error");
    });
    onLiveEnded((data) => {
      if (data.roomId === get().activeRoomId) {
        cleanup();
        showToast("The host ended the room", "info");
      }
    });
  };

  return {
    ...initialState,

    // ─── Discover ───
    fetchRooms: async () => {
      set({ roomsLoading: true, roomsError: null });
      try {
        const { data } = await api.get(API.liveRooms.list);
        set({ rooms: data.rooms, roomsLoading: false });
      } catch (e: any) {
        set({ roomsError: e?.message || "Failed to load rooms", roomsLoading: false });
      }
    },

    createRoom: async (title, topic) => {
      try {
        const { data } = await api.post(API.liveRooms.create, { title, topic });
        await get().fetchRooms();
        return data.room;
      } catch (e: any) {
        showToast(e?.message || "Failed to create room", "error");
        return null;
      }
    },

    joinRoom: async (roomId, kind) => {
      if (!isLiveRoomAvailable()) {
        unavailableAlert();
        return;
      }
      const { user } = useAuthStore.getState();
      if (!user) {
        showToast("Please log in first", "error");
        return;
      }

      // Ensure socket is connected
      await connectSocket();

      // 1) REST join (adds user to room participants list)
      try {
        await api.post(API.liveRooms.join(roomId));
      } catch (e: any) {
        if (e?.message?.includes("full")) {
          showToast("Room is full (mesh caps at 8)", "error");
        } else {
          showToast(e?.message || "Failed to join room", "error");
        }
        return;
      }

      // 2) Initialize mesh service
      mesh = new LiveRoomMesh(
        sendLiveOffer,
        sendLiveAnswer,
        sendLiveIce,
        leaveLiveRoomSocket
      );
      mesh.setCallbacks({
        onRemoteStream: (peerId, stream) => {
          set((state) => ({
            members: state.members.map((m) =>
              m.id === peerId
                ? { ...m, remoteStream: stream, hasLocalStream: true }
                : m
            ),
          }));
        },
        onPeerLeft: (peerId) => {
          set((state) => ({
            members: state.members.filter((m) => m.id !== peerId),
          }));
        },
        onConnectionError: (peerId, err) => {
          set((state) => ({
            members: state.members.map((m) =>
              m.id === peerId ? { ...m, connectionFailed: true } : m
            ),
          }));
        },
      });

      // 3) Socket join + get peers
      initListeners();
      joinLiveRoomSocket(roomId);

      // 4) Start local media and mesh
      const localUserId = user.id;
      await mesh.joinRoom(roomId, localUserId, kind, []);
      const localStream = mesh.getLocalStream();

      set({
        activeRoomId: roomId,
        roomTitle: "",
        roomHostId: null,
        roomStatus: "live",
        roomMaxParticipants: 8,
        members: [],
        localUserId,
        localKind: kind,
        localStream,
        localMuted: false,
        localCameraOff: kind === "audio",
        isInRoom: true,
      });
    },

    leaveRoom: async () => {
      await cleanup();
    },

    endRoom: async () => {
      const { activeRoomId } = get();
      if (!activeRoomId) return;
      try {
        await api.post(API.liveRooms.end(activeRoomId));
      } catch (e: any) {
        showToast(e?.message || "Failed to end room", "error");
      }
      await cleanup();
    },

    setMuted: (muted) => {
      mesh?.setAudioMuted(muted);
      set({ localMuted: muted });
    },

    setCameraOff: (off) => {
      mesh?.setVideoMuted(off);
      set({ localCameraOff: off });
    },

    markPeerConnectionFailed: (userId) => {
      set((state) => ({
        members: state.members.map((m) =>
          m.id === userId ? { ...m, connectionFailed: true } : m
        ),
      }));
    },

    _initListeners: initListeners,
    _cleanup: cleanup,
  };
});
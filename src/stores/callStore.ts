import { create } from "zustand";
import { Alert } from "react-native";
import {
  sendCallOffer,
  sendCallAnswer,
  sendCallIce,
  sendCallEnd,
  sendCallDecline,
  onCallOffer,
  onCallAnswer,
  onCallIce,
  onCallEnd,
  onCallDecline,
} from "../services/socket";
import { getWebRTC, isCallingAvailable } from "../services/webrtc";
import type { UserPreview } from "../types";

export type CallKind = "audio" | "video";
export type CallStatus = "idle" | "outgoing" | "incoming" | "in_call";

interface CallState {
  status: CallStatus;
  kind: CallKind | null;
  callId: string | null;
  conversationId: string | null;
  remoteUser: UserPreview | null;
  isMuted: boolean;
  isCameraOff: boolean;
  /** react-native-webrtc MediaStream, kept as `any` — the type only exists once the native module loads. */
  localStream: any | null;
  remoteStream: any | null;
  startedAt: number | null;

  startCall: (input: { conversationId: string; kind: CallKind; remoteUser: UserPreview }) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  switchCamera: () => void;
  /** Attach the call-signal socket listeners. Call once, after connectSocket()
   * has resolved (a socket must exist for `.on()` to attach to anything) —
   * see authStore.ts. Safe to call more than once; only the first call does anything. */
  initListeners: () => void;
}

const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const createCallId = () => `call_${Date.now()}_${Math.random().toString(16).slice(2)}`;

// Mutable call-session handles that don't belong in Zustand state: a peer
// connection is a native object, not serializable UI state, and re-running
// selectors every time it mutates internally would be pointless churn.
let peerConnection: any = null;
let pendingOfferSdp: any = null;
let pendingIceQueue: any[] = [];
let listenersInitialized = false;

const initialState = {
  status: "idle" as CallStatus,
  kind: null as CallKind | null,
  callId: null as string | null,
  conversationId: null as string | null,
  remoteUser: null as UserPreview | null,
  isMuted: false,
  isCameraOff: false,
  localStream: null as any,
  remoteStream: null as any,
  startedAt: null as number | null,
};

function unavailableAlert() {
  Alert.alert(
    "Calling unavailable",
    "Audio/video calling needs a custom development build (react-native-webrtc isn't available in Expo Go). Build a dev client to use this."
  );
}

export const useCallStore = create<CallState>((set, get) => {
  const cleanup = () => {
    const rtc = getWebRTC();
    try {
      peerConnection?.getSenders?.().forEach((sender: any) => {
        try {
          sender.track?.stop();
        } catch {}
      });
      peerConnection?.close?.();
    } catch {}
    peerConnection = null;
    pendingOfferSdp = null;
    pendingIceQueue = [];

    const { localStream, remoteStream } = get();
    try {
      localStream?.getTracks?.().forEach((t: any) => t.stop());
    } catch {}
    try {
      remoteStream?.getTracks?.().forEach((t: any) => t.stop());
    } catch {}
    void rtc;

    set({ ...initialState });
  };

  const ensurePeer = (conversationId: string, callId: string) => {
    if (peerConnection) return peerConnection;
    const rtc = getWebRTC();
    if (!rtc) return null;
    const pc = new rtc.RTCPeerConnection(RTC_CONFIGURATION);
    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        sendCallIce({ conversationId, callId, candidate: event.candidate.toJSON?.() || event.candidate });
      }
    };
    pc.ontrack = (event: any) => {
      const stream = event.streams?.[0];
      if (stream) set({ remoteStream: stream });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanup();
      }
    };
    peerConnection = pc;
    return pc;
  };

  const startLocalStream = async (kind: CallKind) => {
    const rtc = getWebRTC();
    if (!rtc) return null;
    const stream = await rtc.mediaDevices.getUserMedia({
      audio: true,
      video: kind === "video" ? { facingMode: "user" } : false,
    });
    set({ localStream: stream });
    return stream;
  };

  const applyPendingIce = async () => {
    if (!peerConnection || pendingIceQueue.length === 0) return;
    const rtc = getWebRTC();
    if (!rtc) return;
    const queued = pendingIceQueue;
    pendingIceQueue = [];
    for (const candidate of queued) {
      try {
        await peerConnection.addIceCandidate(new rtc.RTCIceCandidate(candidate));
      } catch {}
    }
  };

  const initListeners = () => {
    if (listenersInitialized) return;
    listenersInitialized = true;

    onCallOffer((data) => {
      const state = get();
      if (state.status !== "idle") {
        if (data.conversationId && data.callId) {
          sendCallDecline({ conversationId: data.conversationId, callId: data.callId, reason: "busy" });
        }
        return;
      }
      pendingOfferSdp = data.sdp || null;
      set({
        status: "incoming",
        kind: data.kind || "audio",
        callId: data.callId || createCallId(),
        conversationId: data.conversationId,
        remoteUser: data.fromUser
          ? {
              id: data.fromUser.id,
              username: data.fromUser.username,
              avatarUrl: data.fromUser.avatarUrl,
              isVerified: false,
            }
          : data.fromUserId
            ? { id: data.fromUserId, username: "Unknown", isVerified: false }
            : null,
        isMuted: false,
        isCameraOff: data.kind === "audio",
      });
    });

    onCallAnswer(async (data) => {
      const state = get();
      if (!peerConnection || state.status !== "outgoing") return;
      if (data.callId && data.callId !== state.callId) return;
      if (!data.sdp) return;
      const rtc = getWebRTC();
      if (!rtc) return;
      await peerConnection.setRemoteDescription(new rtc.RTCSessionDescription(data.sdp));
      await applyPendingIce();
      set({ status: "in_call", startedAt: Date.now() });
    });

    onCallIce(async (data) => {
      const state = get();
      if (data.callId && state.callId && data.callId !== state.callId) return;
      if (!data.candidate) return;
      const rtc = getWebRTC();
      if (!rtc) return;
      if (!peerConnection) {
        pendingIceQueue.push(data.candidate);
        return;
      }
      try {
        await peerConnection.addIceCandidate(new rtc.RTCIceCandidate(data.candidate));
      } catch {}
    });

    onCallEnd((data) => {
      const state = get();
      if (data.callId && state.callId && data.callId !== state.callId) return;
      cleanup();
    });

    onCallDecline((data) => {
      const state = get();
      if (data.callId && state.callId && data.callId !== state.callId) return;
      cleanup();
    });
  };

  return {
    ...initialState,

    initListeners,

    startCall: async ({ conversationId, kind, remoteUser }) => {
      if (get().status !== "idle") return;
      if (!isCallingAvailable()) {
        unavailableAlert();
        return;
      }
      const callId = createCallId();
      set({
        status: "outgoing",
        kind,
        callId,
        conversationId,
        remoteUser,
        isMuted: false,
        isCameraOff: kind === "audio",
      });

      try {
        const pc = ensurePeer(conversationId, callId);
        const rtc = getWebRTC();
        if (!pc || !rtc) throw new Error("WebRTC unavailable");
        const stream = await startLocalStream(kind);
        stream?.getTracks().forEach((track: any) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendCallOffer({ conversationId, callId, kind, sdp: offer });
      } catch {
        cleanup();
        Alert.alert("Call failed", "Unable to start the call. Check microphone/camera permissions.");
      }
    },

    acceptCall: async () => {
      const state = get();
      if (state.status !== "incoming" || !state.callId || !state.conversationId || !state.kind) return;
      if (!pendingOfferSdp) return;
      if (!isCallingAvailable()) {
        unavailableAlert();
        cleanup();
        return;
      }

      try {
        const pc = ensurePeer(state.conversationId, state.callId);
        const rtc = getWebRTC();
        if (!pc || !rtc) throw new Error("WebRTC unavailable");
        const stream = await startLocalStream(state.kind);
        stream?.getTracks().forEach((track: any) => pc.addTrack(track, stream));

        await pc.setRemoteDescription(new rtc.RTCSessionDescription(pendingOfferSdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendCallAnswer({ conversationId: state.conversationId, callId: state.callId, sdp: answer });
        await applyPendingIce();

        set({ status: "in_call", startedAt: Date.now() });
      } catch {
        cleanup();
        Alert.alert("Call failed", "Unable to accept the call.");
      }
    },

    declineCall: () => {
      const state = get();
      if (state.conversationId && state.callId) {
        sendCallDecline({ conversationId: state.conversationId, callId: state.callId, reason: "declined" });
      }
      cleanup();
    },

    endCall: () => {
      const state = get();
      if (state.conversationId && state.callId) {
        sendCallEnd({ conversationId: state.conversationId, callId: state.callId });
      }
      cleanup();
    },

    toggleMute: () => {
      const { localStream, isMuted } = get();
      localStream?.getAudioTracks().forEach((track: any) => {
        track.enabled = isMuted; // was muted -> re-enable; was unmuted -> disable
      });
      set({ isMuted: !isMuted });
    },

    toggleCamera: () => {
      const { localStream, isCameraOff } = get();
      localStream?.getVideoTracks().forEach((track: any) => {
        track.enabled = isCameraOff; // was off -> re-enable; was on -> disable
      });
      set({ isCameraOff: !isCameraOff });
    },

    switchCamera: () => {
      const { localStream } = get();
      const videoTrack = localStream?.getVideoTracks?.()[0];
      videoTrack?._switchCamera?.();
    },
  };
});

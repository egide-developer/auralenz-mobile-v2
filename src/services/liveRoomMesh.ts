import { getWebRTC, isCallingAvailable } from "./webrtc";
import { showToast } from "../stores/toastStore";

const RTC_CONFIGURATION = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type TrackKind = "audio" | "video";

interface PeerConnectionState {
  pc: any;
  remoteStream: any;
  role: "offerer" | "answerer";
}

type OfferFn = (data: { roomId: string; toUserId: string; sdp: any }) => void;
type AnswerFn = (data: { roomId: string; toUserId: string; sdp: any }) => void;
type IceFn = (data: { roomId: string; toUserId: string; candidate: any }) => void;
type LeaveFn = (roomId: string) => void;

/**
 * Mesh RTC service for live rooms.
 * Each participant maintains a full-mesh of RTCPeerConnections to every
 * other participant. The NEWCOMER initiates offers to all existing peers
 * (avoids glare). ICE candidates are queued until the remote description
 * is set.
 *
 * This service does NOT maintain application state — it's a pure RTC
 * plumbing layer. The owning store decides what to do with streams.
 */
export class LiveRoomMesh {
  private roomId: string = "";
  private localUserId: string = "";
  private localStream: any = null;
  private kind: TrackKind = "audio";
  private peers = new Map<string, PeerConnectionState>();
  private pendingIce = new Map<string, any[]>();
  private onRemoteStream: ((userId: string, stream: any) => void) | null = null;
  private onPeerLeft: ((userId: string) => void) | null = null;
  private onConnectionError: ((userId: string, err: string) => void) | null = null;
  private cleanupDone = false;

  constructor(
    private sendOffer: OfferFn,
    private sendAnswer: AnswerFn,
    private sendIce: IceFn,
    private sendLeave: LeaveFn
  ) {}

  /** Set callbacks — called by the store. */
  setCallbacks(cb: {
    onRemoteStream?: (userId: string, stream: any) => void;
    onPeerLeft?: (userId: string) => void;
    onConnectionError?: (userId: string, err: string) => void;
  }) {
    this.onRemoteStream = cb.onRemoteStream ?? null;
    this.onPeerLeft = cb.onPeerLeft ?? null;
    this.onConnectionError = cb.onConnectionError ?? null;
  }

  /** Start a new room session (host creates room, then calls this). */
  async startRoom(roomId: string, localUserId: string, kind: TrackKind) {
    this.roomId = roomId;
    this.localUserId = localUserId;
    this.kind = kind;
    this.localStream = await this.getUserMedia(kind);
  }

  /** Join an existing room — called after REST join succeeds and after
   *  receiving `live_peers` (list of existing participant IDs). The NEWCOMER
   *  initiates offers to EVERY existing peer. */
  async joinRoom(
    roomId: string,
    localUserId: string,
    kind: TrackKind,
    existingPeerIds: string[]
  ) {
    await this.startRoom(roomId, localUserId, kind);
    // Initiate offers to all existing peers.
    for (const peerId of existingPeerIds) {
      if (peerId !== localUserId) {
        await this.createOfferFor(peerId);
      }
    }
  }

  /** Handle an incoming offer from a peer — we are the ANSWERER. */
  async handleOffer(fromUserId: string, sdp: any) {
    if (fromUserId === this.localUserId) return;
    const pc = await this.getOrCreatePeerConnection(fromUserId, "answerer");
    const rtc = getWebRTC();
    if (!rtc) return;

    await pc.setRemoteDescription(new rtc.RTCSessionDescription(sdp));

    // Drain queued ICE
    const queued = this.pendingIce.get(fromUserId) || [];
    this.pendingIce.delete(fromUserId);
    for (const cand of queued) {
      try {
        await pc.addIceCandidate(new rtc.RTCIceCandidate(cand));
      } catch {}
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.sendAnswer({ roomId: this.roomId, toUserId: fromUserId, sdp: answer });
  }

  /** Handle an incoming answer from a peer — we were the OFFERER. */
  async handleAnswer(fromUserId: string, sdp: any) {
    if (fromUserId === this.localUserId) return;
    const state = this.peers.get(fromUserId);
    if (!state || state.role !== "offerer") return;
    const rtc = getWebRTC();
    if (!rtc) return;

    await state.pc.setRemoteDescription(new rtc.RTCSessionDescription(sdp));

    // Drain queued ICE
    const queued = this.pendingIce.get(fromUserId) || [];
    this.pendingIce.delete(fromUserId);
    for (const cand of queued) {
      try {
        await state.pc.addIceCandidate(new rtc.RTCIceCandidate(cand));
      } catch {}
    }
  }

  /** Handle an incoming ICE candidate from a peer. */
  async handleIce(fromUserId: string, candidate: any) {
    if (fromUserId === this.localUserId) return;
    const state = this.peers.get(fromUserId);
    const rtc = getWebRTC();
    if (!rtc) return;

    if (state?.pc?.remoteDescription) {
      try {
        await state.pc.addIceCandidate(new rtc.RTCIceCandidate(candidate));
      } catch {}
    } else {
      // Remote description not set yet — queue for later.
      const q = this.pendingIce.get(fromUserId) || [];
      q.push(candidate);
      this.pendingIce.set(fromUserId, q);
    }
  }

  /** Handle a peer leaving the room — clean up their connection. */
  handlePeerLeft(userId: string) {
    if (userId === this.localUserId) return;
    this.destroyPeerConnection(userId);
    this.onPeerLeft?.(userId);
  }

  /** Get the local MediaStream (for self-view). */
  getLocalStream() {
    return this.localStream;
  }

  /** Toggle audio mute. */
  setAudioMuted(muted: boolean) {
    this.localStream?.getAudioTracks?.().forEach((t: any) => {
      t.enabled = !muted;
    });
  }

  /** Toggle video. */
  setVideoMuted(muted: boolean) {
    this.localStream?.getVideoTracks?.().forEach((t: any) => {
      t.enabled = !muted;
    });
  }

  /** Full cleanup — call when leaving/ending the room. */
  async cleanup() {
    if (this.cleanupDone) return;
    this.cleanupDone = true;

    // Notify all peers we're leaving (best-effort, fire-and-forget).
    for (const [peerId] of this.peers) {
      try {
        this.sendLeave(this.roomId);
      } catch {}
    }

    // Close all peer connections.
    for (const [peerId] of this.peers) {
      this.destroyPeerConnection(peerId);
    }
    this.peers.clear();
    this.pendingIce.clear();

    // Stop local tracks.
    this.localStream?.getTracks?.().forEach((t: any) => {
      try {
        t.stop();
      } catch {}
    });
    this.localStream = null;
  }

  // ─── Private ───

  private async getUserMedia(kind: TrackKind): Promise<any> {
    const rtc = getWebRTC();
    if (!rtc) return null;
    try {
      return await rtc.mediaDevices.getUserMedia({
        audio: true,
        video: kind === "video" ? { facingMode: "user" } : false,
      });
    } catch (e) {
      console.warn("[LiveRoomMesh] getUserMedia failed:", e);
      return null;
    }
  }

  private async getOrCreatePeerConnection(
    peerId: string,
    role: "offerer" | "answerer"
  ): Promise<any> {
    const rtc = getWebRTC();
    if (!rtc) throw new Error("WebRTC unavailable");

    const existing = this.peers.get(peerId);
    if (existing) return existing.pc;

    const pc = new rtc.RTCPeerConnection(RTC_CONFIGURATION);

    // Add local tracks.
    if (this.localStream) {
      this.localStream.getTracks?.().forEach((track: any) => {
        try {
          pc.addTrack(track, this.localStream);
        } catch {}
      });
    }

    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        this.sendIce({
          roomId: this.roomId,
          toUserId: peerId,
          candidate: event.candidate.toJSON?.() || event.candidate,
        });
      }
    };

    pc.ontrack = (event: any) => {
      const stream = event.streams?.[0];
      if (stream) {
        const state = this.peers.get(peerId);
        if (state) state.remoteStream = stream;
        this.onRemoteStream?.(peerId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        this.onConnectionError?.(peerId, pc.connectionState);
      }
    };

    this.peers.set(peerId, { pc, remoteStream: null, role });
    return pc;
  }

  /** Public: create an offer for a new peer (called when peer_joined). */
  async createOfferFor(peerId: string) {
    if (peerId === this.localUserId) return;
    const pc = await this.getOrCreatePeerConnection(peerId, "offerer");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.sendOffer({ roomId: this.roomId, toUserId: peerId, sdp: offer });
  }

  private destroyPeerConnection(peerId: string) {
    const state = this.peers.get(peerId);
    if (!state) return;
    try {
      state.pc?.getSenders?.().forEach((sender: any) => {
        try {
          sender.track?.stop();
        } catch {}
      });
      state.pc?.close?.();
    } catch {}
    this.peers.delete(peerId);
    this.pendingIce.delete(peerId);
  }
}

/** Helper: is native WebRTC available? */
export function isLiveRoomAvailable(): boolean {
  return isCallingAvailable();
}
import { create } from "zustand";
import {
  emptySpec,
  type EditSpec,
  type FilterId,
  type Overlay,
  type Speed,
  type AudioTrack,
} from "../types/videoEdit";

export interface EditorSource {
  /** Id of the media item being edited, so the composer can match the result back to the right clip. */
  id: string;
  uri: string;
  mimeType: string;
  fileName: string;
  durationMs: number;
  width: number;
  height: number;
}

interface VideoEditorState {
  source: EditorSource | null;
  spec: EditSpec;
  /**
   * Local path of the flattened overlay PNG produced on export. Uploaded
   * alongside the video so the server composites exactly what was previewed,
   * rather than re-deriving text and emoji layout with different fonts.
   */
  overlayImageUri: string | null;
  selectedOverlayId: string | null;

  begin: (source: EditorSource) => void;
  reset: () => void;

  setTrim: (startMs: number, endMs: number) => void;
  setSpeed: (speed: Speed) => void;
  setFilter: (filter: FilterId) => void;
  toggleMute: () => void;
  setAudio: (audio: AudioTrack | undefined) => void;

  addOverlay: (overlay: Overlay) => void;
  updateOverlay: (id: string, patch: Partial<Overlay>) => void;
  removeOverlay: (id: string) => void;
  selectOverlay: (id: string | null) => void;

  setOverlayImage: (uri: string | null) => void;
}

export const useVideoEditorStore = create<VideoEditorState>((set) => ({
  source: null,
  spec: emptySpec(),
  overlayImageUri: null,
  selectedOverlayId: null,

  begin: (source) =>
    set({
      source,
      spec: { ...emptySpec(), trim: { startMs: 0, endMs: source.durationMs } },
      overlayImageUri: null,
      selectedOverlayId: null,
    }),

  reset: () => set({ source: null, spec: emptySpec(), overlayImageUri: null, selectedOverlayId: null }),

  setTrim: (startMs, endMs) => set((s) => ({ spec: { ...s.spec, trim: { startMs, endMs } } })),
  setSpeed: (speed) => set((s) => ({ spec: { ...s.spec, speed } })),
  setFilter: (filter) => set((s) => ({ spec: { ...s.spec, filter } })),
  toggleMute: () => set((s) => ({ spec: { ...s.spec, mute: !s.spec.mute } })),
  setAudio: (audio) => set((s) => ({ spec: { ...s.spec, audio } })),

  addOverlay: (overlay) =>
    set((s) => ({
      spec: { ...s.spec, overlays: [...s.spec.overlays, overlay] },
      selectedOverlayId: overlay.id,
    })),

  updateOverlay: (id, patch) =>
    set((s) => ({
      spec: {
        ...s.spec,
        overlays: s.spec.overlays.map((o) => (o.id === id ? ({ ...o, ...patch } as Overlay) : o)),
      },
    })),

  removeOverlay: (id) =>
    set((s) => ({
      spec: { ...s.spec, overlays: s.spec.overlays.filter((o) => o.id !== id) },
      selectedOverlayId: s.selectedOverlayId === id ? null : s.selectedOverlayId,
    })),

  selectOverlay: (id) => set({ selectedOverlayId: id }),

  setOverlayImage: (uri) => set({ overlayImageUri: uri }),
}));

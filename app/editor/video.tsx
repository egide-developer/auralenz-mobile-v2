import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import * as VideoThumbnails from "expo-video-thumbnails";
import { Ionicons } from "@expo/vector-icons";

import { useVideoEditorStore } from "../../src/stores/videoEditorStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { showToast } from "../../src/stores/toastStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { FontFamily } from "../../src/theme/typography";
import {
  FILTER_IDS,
  FILTER_PREVIEW,
  SPEEDS,
  type FilterId,
  type Overlay,
  type Speed,
} from "../../src/types/videoEdit";

type Tool = "trim" | "filter" | "text" | "sticker" | "speed" | "audio";

const TOOLS: { id: Tool; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "trim", label: "Trim", icon: "cut-outline" },
  { id: "filter", label: "Filter", icon: "color-filter-outline" },
  { id: "text", label: "Text", icon: "text-outline" },
  { id: "sticker", label: "Sticker", icon: "happy-outline" },
  { id: "speed", label: "Speed", icon: "speedometer-outline" },
  { id: "audio", label: "Audio", icon: "musical-notes-outline" },
];

const TEXT_COLORS = ["#FFFFFF", "#000000", "#FF3B5C", "#FFD60A", "#32D74B", "#0A84FF", "#BF5AF2"];
const STICKERS = ["🔥", "✨", "❤️", "😂", "😍", "🎉", "👏", "💯", "🙌", "😎", "🥳", "⭐", "💀", "🤯", "👀", "🚀"];

const THUMB_COUNT = 8;
/** Caps the flattened overlay's longest edge; 4K text layers are needless upload weight. */
const MAX_OVERLAY_WIDTH = 1080;

const formatMs = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function VideoEditorScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const source = useVideoEditorStore((s) => s.source);
  const spec = useVideoEditorStore((s) => s.spec);
  const selectedOverlayId = useVideoEditorStore((s) => s.selectedOverlayId);
  const {
    setTrim, setSpeed, setFilter, toggleMute,
    addOverlay, updateOverlay, removeOverlay, selectOverlay, setOverlayImage,
  } = useVideoEditorStore();

  const [tool, setTool] = useState<Tool>("trim");
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [textDraft, setTextDraft] = useState<{ id: string | null; value: string; color: string } | null>(null);

  const overlayLayerRef = useRef<View>(null);

  // A source is required; arriving here directly (deep link, reload) has
  // nothing to edit, so bounce rather than render a broken screen.
  useEffect(() => {
    if (!source) router.back();
  }, [source]);

  const player = useVideoPlayer(source?.uri ?? null, (p) => {
    p.loop = true;
    p.muted = spec.mute;
    p.play();
  });

  useEffect(() => {
    if (player) player.muted = spec.mute;
  }, [player, spec.mute]);

  useEffect(() => {
    if (player) player.playbackRate = spec.speed;
  }, [player, spec.speed]);

  // Preview only the trimmed range, so what loops is what will be exported.
  useEffect(() => {
    if (!player || !spec.trim) return;
    const interval = setInterval(() => {
      const currentMs = (player.currentTime ?? 0) * 1000;
      if (currentMs < spec.trim!.startMs - 250 || currentMs > spec.trim!.endMs) {
        player.currentTime = spec.trim!.startMs / 1000;
      }
    }, 250);
    return () => clearInterval(interval);
  }, [player, spec.trim?.startMs, spec.trim?.endMs]);

  const previewSize = useMemo(() => {
    if (!source) return { width: screenWidth, height: screenWidth };
    const aspect = source.width && source.height ? source.width / source.height : 9 / 16;
    const maxHeight = 420;
    let width = screenWidth;
    let height = width / aspect;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }
    return { width, height };
  }, [source, screenWidth]);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;

    (async () => {
      const duration = source.durationMs || 1;
      const frames: string[] = [];
      for (let i = 0; i < THUMB_COUNT; i += 1) {
        if (cancelled) return;
        try {
          const at = (duration / THUMB_COUNT) * i;
          const { uri } = await VideoThumbnails.getThumbnailAsync(source.uri, { time: Math.round(at), quality: 0.4 });
          frames.push(uri);
        } catch {
          // A single unreadable frame shouldn't cost the whole filmstrip.
          frames.push("");
        }
      }
      if (!cancelled) setThumbnails(frames);
    })();

    return () => { cancelled = true; };
  }, [source]);

  const commitText = useCallback(() => {
    if (!textDraft) return;
    const value = textDraft.value.trim();
    if (!value) {
      if (textDraft.id) removeOverlay(textDraft.id);
      setTextDraft(null);
      return;
    }
    if (textDraft.id) {
      updateOverlay(textDraft.id, { text: value, color: textDraft.color } as Partial<Overlay>);
    } else {
      addOverlay({
        id: `t-${Date.now()}`,
        kind: "text",
        text: value,
        x: 0.5,
        y: 0.5,
        scale: 1,
        color: textDraft.color,
      });
    }
    setTextDraft(null);
  }, [textDraft, addOverlay, updateOverlay, removeOverlay]);

  const handleDone = useCallback(async () => {
    if (!source) return;
    setExporting(true);
    try {
      let overlayUri: string | null = null;

      if (spec.overlays.length > 0 && overlayLayerRef.current) {
        // Deselect first: the selection outline is editor chrome and must not
        // be baked into the exported frame.
        selectOverlay(null);
        await new Promise((resolve) => setTimeout(resolve, 80));

        const targetWidth = Math.min(source.width || MAX_OVERLAY_WIDTH, MAX_OVERLAY_WIDTH);
        const targetHeight = Math.round(targetWidth * (previewSize.height / previewSize.width));

        overlayUri = await captureRef(overlayLayerRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
          width: targetWidth,
          height: targetHeight,
        });
      }

      setOverlayImage(overlayUri);
      router.back();
    } catch (error: any) {
      // Losing the overlay layer shouldn't lose the rest of the edit — the
      // server still applies trim, speed, filter and audio from the spec.
      showToast("Couldn't flatten overlays; exporting without them", "error");
      setOverlayImage(null);
      router.back();
    } finally {
      setExporting(false);
    }
  }, [source, spec.overlays.length, previewSize, selectOverlay, setOverlayImage]);

  if (!source) return null;

  const filterPreview = FILTER_PREVIEW[spec.filter];

  return (
    <View style={[styles.screen, { backgroundColor: "#000", paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} hitSlop={10}>
          <Ionicons name="close" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit video</Text>
        <TouchableOpacity onPress={handleDone} disabled={exporting} style={styles.headerBtn} hitSlop={10}>
          {exporting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.doneText}>Done</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.previewArea}>
        <Pressable onPress={() => selectOverlay(null)} style={[previewSize, styles.previewBox]}>
          <VideoView
            player={player}
            style={previewSize}
            nativeControls={false}
            contentFit="contain"
          />

          {filterPreview.opacity > 0 ? (
            <View
              pointerEvents="none"
              style={[
                styles.filterTint,
                { backgroundColor: filterPreview.tint, opacity: filterPreview.opacity },
              ]}
            />
          ) : null}

          {/* Captured on export. Holds only user content — no chrome. */}
          <View ref={overlayLayerRef} collapsable={false} style={[styles.overlayLayer, previewSize]}>
            {spec.overlays.map((overlay) => (
              <DraggableOverlay
                key={overlay.id}
                overlay={overlay}
                bounds={previewSize}
                selected={selectedOverlayId === overlay.id}
                onSelect={() => selectOverlay(overlay.id)}
                onMove={(x, y) => updateOverlay(overlay.id, { x, y } as Partial<Overlay>)}
              />
            ))}
          </View>
        </Pressable>
      </View>

      {selectedOverlayId ? (
        <View style={styles.overlayActions}>
          <TouchableOpacity
            onPress={() => {
              const target = spec.overlays.find((o) => o.id === selectedOverlayId);
              if (!target) return;
              updateOverlay(selectedOverlayId, { scale: Math.max(0.3, target.scale - 0.15) } as Partial<Overlay>);
            }}
            style={styles.overlayActionBtn}
          >
            <Ionicons name="remove" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const target = spec.overlays.find((o) => o.id === selectedOverlayId);
              if (!target) return;
              updateOverlay(selectedOverlayId, { scale: Math.min(4, target.scale + 0.15) } as Partial<Overlay>);
            }}
            style={styles.overlayActionBtn}
          >
            <Ionicons name="add" size={18} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeOverlay(selectedOverlayId)} style={styles.overlayActionBtn}>
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.panel}>
        {tool === "trim" ? (
          <TrimPanel
            durationMs={source.durationMs}
            startMs={spec.trim?.startMs ?? 0}
            endMs={spec.trim?.endMs ?? source.durationMs}
            thumbnails={thumbnails}
            onChange={setTrim}
          />
        ) : null}

        {tool === "filter" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FILTER_IDS.map((id) => (
              <TouchableOpacity
                key={id}
                onPress={() => setFilter(id as FilterId)}
                style={[styles.filterChip, spec.filter === id && { borderColor: colors.primary, borderWidth: 2 }]}
              >
                <View style={[styles.filterSwatch, { backgroundColor: FILTER_PREVIEW[id].tint === "transparent" ? "#555" : FILTER_PREVIEW[id].tint }]} />
                <Text style={styles.chipLabel}>{FILTER_PREVIEW[id].label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {tool === "text" ? (
          <View style={styles.panelCenter}>
            <TouchableOpacity
              onPress={() => setTextDraft({ id: null, value: "", color: "#FFFFFF" })}
              style={[styles.primaryAction, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.primaryActionText}>Add text</Text>
            </TouchableOpacity>
            {spec.overlays.filter((o) => o.kind === "text").length > 0 ? (
              <Text style={styles.hint}>Tap a text layer in the preview to move or edit it.</Text>
            ) : null}
          </View>
        ) : null}

        {tool === "sticker" ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {STICKERS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() =>
                  addOverlay({ id: `s-${Date.now()}`, kind: "sticker", emoji, x: 0.5, y: 0.5, scale: 1 })
                }
                style={styles.stickerChip}
              >
                <Text style={styles.stickerGlyph}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {tool === "speed" ? (
          <View style={styles.chipRowStatic}>
            {SPEEDS.map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => setSpeed(value as Speed)}
                style={[styles.speedChip, spec.speed === value && { backgroundColor: colors.primary }]}
              >
                <Text style={styles.chipLabel}>{value}x</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {tool === "audio" ? (
          <View style={styles.panelCenter}>
            <TouchableOpacity onPress={toggleMute} style={styles.muteRow}>
              <Ionicons name={spec.mute ? "volume-mute" : "volume-high"} size={22} color="#FFF" />
              <Text style={styles.chipLabel}>{spec.mute ? "Original audio muted" : "Original audio on"}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>Add a music track from your library when posting.</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.toolbar, { paddingBottom: insets.bottom + 8 }]}>
        {TOOLS.map((t) => (
          <TouchableOpacity key={t.id} onPress={() => setTool(t.id)} style={styles.toolBtn}>
            <Ionicons name={t.icon} size={22} color={tool === t.id ? colors.primary : "#999"} />
            <Text style={[styles.toolLabel, { color: tool === t.id ? colors.primary : "#999" }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={!!textDraft} transparent animationType="fade" onRequestClose={() => setTextDraft(null)}>
        <Pressable style={styles.modalBackdrop} onPress={commitText}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <TextInput
              value={textDraft?.value ?? ""}
              onChangeText={(value) => setTextDraft((d) => (d ? { ...d, value } : d))}
              placeholder="Type something"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.modalInput, { color: textDraft?.color ?? "#FFF" }]}
              autoFocus
              multiline
              maxLength={200}
            />
            <View style={styles.colorRow}>
              {TEXT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setTextDraft((d) => (d ? { ...d, color } : d))}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    textDraft?.color === color && styles.colorDotActive,
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={commitText} style={[styles.primaryAction, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryActionText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function DraggableOverlay({
  overlay,
  bounds,
  selected,
  onSelect,
  onMove,
}: {
  overlay: Overlay;
  bounds: { width: number; height: number };
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const translateX = useSharedValue(overlay.x * bounds.width);
  const translateY = useSharedValue(overlay.y * bounds.height);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    translateX.value = overlay.x * bounds.width;
    translateY.value = overlay.y * bounds.height;
  }, [overlay.x, overlay.y, bounds.width, bounds.height]);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      runOnJS(onSelect)();
    })
    .onUpdate((event) => {
      // Clamped so a layer can't be dragged off-frame and lost.
      translateX.value = Math.min(Math.max(startX.value + event.translationX, 0), bounds.width);
      translateY.value = Math.min(Math.max(startY.value + event.translationY, 0), bounds.height);
    })
    .onEnd(() => {
      runOnJS(onMove)(translateX.value / bounds.width, translateY.value / bounds.height);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  const fontSize = bounds.height * 0.055 * overlay.scale;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.overlayItem, animatedStyle]}>
        <View style={selected ? styles.overlaySelected : undefined}>
          {overlay.kind === "text" ? (
            <Text style={[styles.overlayText, { color: overlay.color, fontSize }]}>{overlay.text}</Text>
          ) : (
            <Text style={{ fontSize }}>{overlay.emoji}</Text>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function TrimPanel({
  durationMs,
  startMs,
  endMs,
  thumbnails,
  onChange,
}: {
  durationMs: number;
  startMs: number;
  endMs: number;
  thumbnails: string[];
  onChange: (startMs: number, endMs: number) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const trackWidth = screenWidth - Spacing.lg * 2;
  const MIN_MS = 1000;

  const startRatio = durationMs > 0 ? startMs / durationMs : 0;
  const endRatio = durationMs > 0 ? endMs / durationMs : 1;

  const makeHandle = (which: "start" | "end") =>
    Gesture.Pan().onUpdate((event) => {
      const deltaMs = (event.translationX / trackWidth) * durationMs;
      if (which === "start") {
        const next = Math.min(Math.max(0, startMs + deltaMs), endMs - MIN_MS);
        runOnJS(onChange)(next, endMs);
      } else {
        const next = Math.max(Math.min(durationMs, endMs + deltaMs), startMs + MIN_MS);
        runOnJS(onChange)(startMs, next);
      }
    });

  return (
    <View style={styles.trimPanel}>
      <View style={[styles.trimTrack, { width: trackWidth }]}>
        {thumbnails.map((uri, i) => (
          <View key={i} style={[styles.trimThumb, { width: trackWidth / THUMB_COUNT }]}>
            {uri ? (
              <Animated.Image source={{ uri }} style={styles.trimThumbImage} resizeMode="cover" />
            ) : (
              <View style={[styles.trimThumbImage, { backgroundColor: "#222" }]} />
            )}
          </View>
        ))}

        <View pointerEvents="none" style={[styles.trimDim, { left: 0, width: trackWidth * startRatio }]} />
        <View
          pointerEvents="none"
          style={[styles.trimDim, { left: trackWidth * endRatio, width: trackWidth * (1 - endRatio) }]}
        />

        <GestureDetector gesture={makeHandle("start")}>
          <View style={[styles.trimHandle, { left: trackWidth * startRatio - 10 }]}>
            <View style={styles.trimHandleBar} />
          </View>
        </GestureDetector>

        <GestureDetector gesture={makeHandle("end")}>
          <View style={[styles.trimHandle, { left: trackWidth * endRatio - 10 }]}>
            <View style={styles.trimHandleBar} />
          </View>
        </GestureDetector>
      </View>

      <Text style={styles.trimLabel}>
        {formatMs(startMs)} – {formatMs(endMs)}  ({formatMs(endMs - startMs)})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerBtn: { minWidth: 56, alignItems: "center", justifyContent: "center", height: 36 },
  headerTitle: { color: "#FFF", fontFamily: FontFamily.semibold, fontSize: 16 },
  doneText: { color: "#FFF", fontFamily: FontFamily.semibold, fontSize: 16 },

  previewArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  previewBox: { position: "relative", overflow: "hidden", borderRadius: 12 },
  filterTint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  overlayLayer: { position: "absolute", top: 0, left: 0, backgroundColor: "transparent" },
  overlayItem: { position: "absolute", top: 0, left: 0, marginLeft: -60, marginTop: -20, width: 120, alignItems: "center" },
  overlaySelected: {
    borderWidth: 1,
    borderColor: "#FFFFFFAA",
    borderStyle: "dashed",
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  overlayText: { fontFamily: FontFamily.bold, textAlign: "center" },

  overlayActions: {
    flexDirection: "row",
    alignSelf: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  overlayActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF1A",
  },

  panel: { minHeight: 110, justifyContent: "center", paddingVertical: Spacing.sm },
  panelCenter: { alignItems: "center", gap: 10 },
  chipRow: { paddingHorizontal: Spacing.lg, gap: 10, alignItems: "center" },
  chipRowStatic: { flexDirection: "row", justifyContent: "center", gap: 10 },
  chipLabel: { color: "#FFF", fontFamily: FontFamily.medium, fontSize: 12 },
  hint: { color: "#999", fontSize: 12, textAlign: "center", paddingHorizontal: Spacing.lg },

  filterChip: { alignItems: "center", gap: 6, padding: 4, borderRadius: 10, borderWidth: 2, borderColor: "transparent" },
  filterSwatch: { width: 44, height: 44, borderRadius: 8 },
  stickerChip: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF14", borderRadius: 10 },
  stickerGlyph: { fontSize: 26 },
  speedChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, backgroundColor: "#FFFFFF14" },
  muteRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  primaryActionText: { color: "#FFF", fontFamily: FontFamily.semibold, fontSize: 14 },

  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FFFFFF1A",
  },
  toolBtn: { alignItems: "center", gap: 4, paddingHorizontal: 8 },
  toolLabel: { fontSize: 11, fontFamily: FontFamily.medium },

  trimPanel: { alignItems: "center", gap: 10 },
  trimTrack: { height: 54, flexDirection: "row", borderRadius: 8, overflow: "hidden", position: "relative" },
  trimThumb: { height: 54 },
  trimThumbImage: { width: "100%", height: "100%" },
  trimDim: { position: "absolute", top: 0, bottom: 0, backgroundColor: "#000000AA" },
  trimHandle: { position: "absolute", top: 0, bottom: 0, width: 20, alignItems: "center", justifyContent: "center" },
  trimHandleBar: { width: 4, height: 44, borderRadius: 2, backgroundColor: "#FFF" },
  trimLabel: { color: "#CCC", fontFamily: FontFamily.medium, fontSize: 12 },

  modalBackdrop: { flex: 1, backgroundColor: "#000000CC", alignItems: "center", justifyContent: "center", padding: Spacing.lg },
  modalCard: { width: "100%", borderRadius: 16, padding: Spacing.lg, gap: Spacing.md },
  modalInput: { fontFamily: FontFamily.bold, fontSize: 22, textAlign: "center", minHeight: 60 },
  colorRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "transparent" },
  colorDotActive: { borderColor: "#FFFFFF" },
});

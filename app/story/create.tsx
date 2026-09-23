// Full-screen Instagram-style story composer: pick one photo/video, add an
// optional text overlay, then share. Backend only accepts a single media
// item per story (models/Story.js), unlike posts.
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily, FontSize } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

interface PickedMedia {
  uri: string;
  type: "image" | "video";
  mimeType: string;
  fileName: string;
  thumbnailUri?: string;
}

type StickerType = "poll" | "quiz" | "question";
const STICKER_KINDS: { type: StickerType; label: string; icon: string }[] = [
  { type: "poll", label: "Poll", icon: "bar-chart-outline" },
  { type: "quiz", label: "Quiz", icon: "help-circle-outline" },
  { type: "question", label: "Question", icon: "chatbubble-ellipses-outline" },
];

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [text, setText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [closeFriendsOnly, setCloseFriendsOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickAttempted, setPickAttempted] = useState(false);

  // Story stickers — v1 caps composer at one sticker per story (schema
  // supports more, but keeping the picker scoped to one keeps this UI simple).
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerType, setStickerType] = useState<StickerType | null>(null);
  const [stickerQuestion, setStickerQuestion] = useState("");
  const [stickerOptions, setStickerOptions] = useState(["", ""]);
  const [stickerCorrectIndex, setStickerCorrectIndex] = useState<number | null>(null);

  const videoPlayer = useVideoPlayer(media?.type === "video" ? media.uri : null, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const pickMedia = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      router.back();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      videoMaxDuration: 60,
    });
    setPickAttempted(true);
    if (result.canceled || result.assets.length === 0) {
      router.back();
      return;
    }
    const a = result.assets[0];
    const picked: PickedMedia = {
      uri: a.uri,
      type: a.type === "video" ? "video" : "image",
      mimeType: a.mimeType || (a.type === "video" ? "video/mp4" : "image/jpeg"),
      fileName: a.fileName || `story_${Date.now()}.${a.type === "video" ? "mp4" : "jpg"}`,
    };
    setMedia(picked);
    if (picked.type === "video") {
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(picked.uri, { time: 300 });
        setMedia((prev) => (prev ? { ...prev, thumbnailUri: thumbUri } : prev));
      } catch {}
    }
  }, [router]);

  useEffect(() => {
    if (!pickAttempted) pickMedia();
  }, [pickAttempted, pickMedia]);

  const handleShare = useCallback(async () => {
    if (!media) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("media", { uri: media.uri, type: media.mimeType, name: media.fileName } as any);
      if (text.trim()) formData.append("text", text.trim());
      formData.append("visibility", closeFriendsOnly ? "close_friends" : "public");

      if (stickerType && stickerQuestion.trim()) {
        const options =
          stickerType === "question"
            ? []
            : stickerOptions
                .filter((o) => o.trim())
                .map((o, i) => ({ text: o.trim(), isCorrect: stickerType === "quiz" ? i === stickerCorrectIndex : undefined }));
        if (stickerType === "question" || options.length >= 2) {
          formData.append(
            "stickers",
            JSON.stringify([{ type: stickerType, position: { x: 0.5, y: 0.7 }, question: stickerQuestion.trim(), options }])
          );
        }
      }

      await api.post(API.stories.create, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      router.back();
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Error", e?.response?.data?.message || "Failed to share story");
    }
  }, [media, text, closeFriendsOnly, stickerType, stickerQuestion, stickerOptions, stickerCorrectIndex, router]);

  if (!media) {
    return (
      <View style={[styles.screen, { backgroundColor: "#000", alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: "#000" }]}>
      <Image
        source={{ uri: media.type === "video" ? media.thumbnailUri || media.uri : media.uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
      />
      {media.type === "video" ? (
        <VideoView
          player={videoPlayer}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
        />
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={StyleSheet.absoluteFill}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
            <Icon name="close-square" set="bold" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Your story</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={[styles.iconBtn, closeFriendsOnly && { backgroundColor: "#2ECC71" }]}
              onPress={() => setCloseFriendsOnly((v) => !v)}
              hitSlop={8}
            >
              <Icon name="star" set={closeFriendsOnly ? "bold" : "light"} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setShowTextInput((v) => !v)}
              hitSlop={8}
            >
              <Icon name="edit-square" set="bold" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setStickerPickerOpen((v) => !v)}
              hitSlop={8}
            >
              <Ionicons name="apps-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        {closeFriendsOnly ? (
          <View style={styles.closeFriendsBadge}>
            <Icon name="star" set="bold" size={12} color="#FFFFFF" />
            <Text style={styles.closeFriendsBadgeText}>Close Friends</Text>
          </View>
        ) : null}

        {showTextInput ? (
          <View style={styles.textOverlayEditRow}>
            <TextInput
              autoFocus
              value={text}
              onChangeText={setText}
              placeholder="Add text..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              maxLength={500}
              multiline
              style={styles.textInput}
              onBlur={() => setShowTextInput(false)}
            />
          </View>
        ) : text ? (
          <TouchableOpacity style={styles.textOverlayDisplay} onPress={() => setShowTextInput(true)} activeOpacity={0.85}>
            <Text style={styles.textOverlayText}>{text}</Text>
          </TouchableOpacity>
        ) : null}

        {stickerPickerOpen && !stickerType ? (
          <View style={styles.stickerChooser}>
            {STICKER_KINDS.map((k) => (
              <TouchableOpacity
                key={k.type}
                style={styles.stickerChooserItem}
                onPress={() => setStickerType(k.type)}
              >
                <Ionicons name={k.icon as any} size={22} color="#FFFFFF" />
                <Text style={styles.stickerChooserLabel}>{k.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {stickerPickerOpen && stickerType ? (
          <View style={styles.stickerEditor}>
            <TextInput
              autoFocus
              value={stickerQuestion}
              onChangeText={setStickerQuestion}
              placeholder={stickerType === "question" ? "Ask a question..." : "Ask something..."}
              placeholderTextColor="rgba(255,255,255,0.6)"
              maxLength={200}
              style={styles.stickerQuestionInput}
            />
            {stickerType !== "question" &&
              stickerOptions.map((opt, i) => (
                <View key={i} style={styles.stickerOptionRow}>
                  <TextInput
                    value={opt}
                    onChangeText={(v) => setStickerOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)))}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    maxLength={60}
                    style={styles.stickerOptionInput}
                  />
                  {stickerType === "quiz" ? (
                    <TouchableOpacity onPress={() => setStickerCorrectIndex(i)} hitSlop={8}>
                      <Ionicons
                        name={stickerCorrectIndex === i ? "checkmark-circle" : "checkmark-circle-outline"}
                        size={22}
                        color={stickerCorrectIndex === i ? "#2ECC71" : "rgba(255,255,255,0.6)"}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            {stickerType !== "question" && stickerOptions.length < 4 ? (
              <TouchableOpacity onPress={() => setStickerOptions((prev) => [...prev, ""])}>
                <Text style={styles.stickerAddOption}>+ Add option</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.stickerEditorActions}>
              <TouchableOpacity
                onPress={() => {
                  setStickerType(null);
                  setStickerQuestion("");
                  setStickerOptions(["", ""]);
                  setStickerCorrectIndex(null);
                  setStickerPickerOpen(false);
                }}
              >
                <Text style={styles.stickerRemoveText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStickerPickerOpen(false)}>
                <Text style={styles.stickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!stickerPickerOpen && stickerType && stickerQuestion.trim() ? (
          <TouchableOpacity style={styles.stickerPreviewChip} onPress={() => setStickerPickerOpen(true)}>
            <Ionicons
              name={STICKER_KINDS.find((k) => k.type === stickerType)?.icon as any}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.stickerPreviewText} numberOfLines={1}>
              {stickerQuestion}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.shareBtnText, { color: colors.primaryForeground }]}>Share to story</Text>
                <Icon name="send" set="bold" size={16} color={colors.primaryForeground} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topTitle: {
    ...Typography.h4,
    color: "#FFFFFF",
  },
  closeFriendsBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    backgroundColor: "#2ECC71",
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  closeFriendsBadgeText: {
    ...Typography.caption,
    color: "#FFFFFF",
    fontFamily: FontFamily.semibold,
  },
  textOverlayEditRow: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    top: "45%",
  },
  textInput: {
    ...Typography.h4,
    color: "#FFFFFF",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  textOverlayDisplay: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    top: "45%",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  textOverlayText: {
    ...Typography.h4,
    color: "#FFFFFF",
    textAlign: "center",
  },
  stickerChooser: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    top: "35%",
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  stickerChooserItem: {
    alignItems: "center",
    gap: 6,
  },
  stickerChooserLabel: {
    ...Typography.caption,
    color: "#FFFFFF",
  },
  stickerEditor: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    top: "30%",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 10,
  },
  stickerQuestionInput: {
    ...Typography.h4,
    color: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.3)",
    paddingBottom: 6,
  },
  stickerOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stickerOptionInput: {
    flex: 1,
    ...Typography.bodySmall,
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stickerAddOption: {
    ...Typography.bodySmall,
    color: "rgba(255,255,255,0.8)",
  },
  stickerEditorActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  stickerRemoveText: {
    ...Typography.bodySmall,
    color: "#FF6B6B",
    fontFamily: FontFamily.semibold,
  },
  stickerDoneText: {
    ...Typography.bodySmall,
    color: "#2ECC71",
    fontFamily: FontFamily.semibold,
  },
  stickerPreviewChip: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    top: "35%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "center",
  },
  stickerPreviewText: {
    ...Typography.bodySmall,
    color: "#FFFFFF",
    flexShrink: 1,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.base,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: Radius.pill,
  },
  shareBtnText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
  },
});

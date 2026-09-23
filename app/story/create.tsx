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

export default function CreateStoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [text, setText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickAttempted, setPickAttempted] = useState(false);

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

      await api.post(API.stories.create, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      router.back();
    } catch (e: any) {
      setLoading(false);
      Alert.alert("Error", e?.response?.data?.message || "Failed to share story");
    }
  }, [media, text, router]);

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
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowTextInput((v) => !v)}
            hitSlop={8}
          >
            <Icon name="edit-square" set="bold" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

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

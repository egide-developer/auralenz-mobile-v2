// AuraLenz post creation — Instagram-style 2-step flow:
// 1. Select media (gallery picker, reorderable strip, remove, live preview)
// 2. Details (caption, location, tags) -> Share
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily, FontSize } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { MentionSuggestions, useMentionQuery, applyMentionSelection } from "../../src/components/ui/MentionSuggestions";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

const MAX_ITEMS = 10;

interface MediaItem {
  id: string;
  uri: string;
  type: "image" | "video";
  mimeType: string;
  fileName: string;
  /** Generated separately for videos — Image can't render a video file directly. */
  thumbnailUri?: string;
}

type Step = "select" | "details";

export default function CreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>("select");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const mentionQuery = useMentionQuery(caption);
  const [location, setLocation] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeMedia = media[activeIndex] || media[0];

  const generateThumbnail = useCallback(async (id: string, uri: string) => {
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 300 });
      setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, thumbnailUri: thumbUri } : m)));
    } catch {
      // Leave the play-icon placeholder if a thumbnail can't be generated.
    }
  }, []);

  const pickMedia = useCallback(async () => {
    if (media.length >= MAX_ITEMS) {
      Alert.alert("Limit reached", `You can only add up to ${MAX_ITEMS} photos or videos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to create a post.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_ITEMS - media.length,
      quality: 0.85,
      videoMaxDuration: 90,
    });
    if (result.canceled) return;

    const picked: MediaItem[] = result.assets.slice(0, MAX_ITEMS - media.length).map((a, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
      uri: a.uri,
      type: a.type === "video" ? "video" : "image",
      mimeType: a.mimeType || (a.type === "video" ? "video/mp4" : "image/jpeg"),
      fileName: a.fileName || `media_${Date.now()}_${i}.${a.type === "video" ? "mp4" : "jpg"}`,
    }));

    setMedia((prev) => {
      const wasEmpty = prev.length === 0;
      const next = [...prev, ...picked];
      if (wasEmpty && next.length > 0) setActiveIndex(0);
      return next;
    });

    picked.filter((m) => m.type === "video").forEach((m) => generateThumbnail(m.id, m.uri));
  }, [media.length, generateThumbnail]);

  const removeMedia = useCallback((id: string) => {
    setMedia((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      const next = prev.filter((m) => m.id !== id);
      setActiveIndex((current) => {
        if (next.length === 0) return 0;
        return Math.min(current >= idx ? Math.max(0, current - 1) : current, next.length - 1);
      });
      return next;
    });
  }, []);

  const hasContent = media.length > 0 || caption.trim().length > 0;

  const handleClose = useCallback(() => {
    if (!hasContent) {
      router.back();
      return;
    }
    Alert.alert("Discard post?", "If you leave now, your changes won't be saved.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }, [hasContent, router]);

  const handleShare = useCallback(async () => {
    if (media.length === 0 && !caption.trim()) {
      Alert.alert("Add something", "Add a photo/video or write a caption first.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      if (caption.trim()) formData.append("caption", caption.trim());
      if (location.trim()) formData.append("location", location.trim());
      const tags = tagsInput
        .split(/[,\s]+/)
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean);
      tags.forEach((t) => formData.append("tags", t));
      media.forEach((m) => {
        formData.append("media", { uri: m.uri, type: m.mimeType, name: m.fileName } as any);
      });

      await api.post(API.posts.list, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  }, [media, caption, location, tagsInput, router]);

  // This screen lives inside the (tabs) group, which Expo Router keeps
  // mounted across visits (it's pushed/popped via the Create FAB, not
  // remounted) — so state from a previous post must be cleared on the way
  // out, or the next visit reopens with stale media/caption still attached.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setStep("select");
        setMedia([]);
        setActiveIndex(0);
        setCaption("");
        setLocation("");
        setTagsInput("");
      };
    }, [])
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity
          onPress={step === "details" ? () => setStep("select") : handleClose}
          style={styles.headerIconBtn}
          hitSlop={8}
        >
          <Icon
            name={step === "details" ? "arrow-left" : "close-square"}
            set="light"
            size={step === "details" ? 22 : 24}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {step === "select" ? "New post" : "Share"}
        </Text>
        {step === "select" ? (
          <TouchableOpacity onPress={() => setStep("details")} disabled={media.length === 0} style={styles.headerTextBtn}>
            <Text
              style={[
                styles.headerActionText,
                { color: colors.primary, opacity: media.length === 0 ? 0.35 : 1 },
              ]}
            >
              Next
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleShare} disabled={loading} style={styles.headerTextBtn}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.headerActionText, { color: colors.primary }]}>Share</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {step === "select" ? (
        <View style={styles.selectStep}>
          {media.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="image" set="light" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Select photos and videos</Text>
              <PressableScale
                onPress={pickMedia}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Select from gallery</Text>
              </PressableScale>
            </View>
          ) : (
            <>
              <View style={[styles.previewWrap, { backgroundColor: colors.muted }]}>
                {activeMedia && (
                  <Image
                    source={{ uri: activeMedia.type === "video" ? activeMedia.thumbnailUri : activeMedia.uri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
                {activeMedia?.type === "video" && (
                  <View style={styles.previewPlayBadge}>
                    <Icon name="play" set="bold" size={22} color="#fff" />
                  </View>
                )}
                {media.length > 1 && (
                  <View style={styles.previewCounter}>
                    <Text style={styles.previewCounterText}>
                      {activeIndex + 1}/{media.length}
                    </Text>
                  </View>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stripContent}
                style={styles.strip}
              >
                {media.map((m, i) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setActiveIndex(i)}
                    activeOpacity={0.85}
                    style={[
                      styles.stripThumbWrap,
                      { borderColor: i === activeIndex ? colors.primary : "transparent" },
                    ]}
                  >
                    <Image
                      source={{ uri: m.type === "video" ? m.thumbnailUri : m.uri }}
                      style={[styles.stripThumb, { backgroundColor: colors.muted }]}
                      resizeMode="cover"
                    />
                    {m.type === "video" && (
                      <View style={styles.stripPlayBadge}>
                        <Icon name="play" set="bold" size={11} color="#fff" />
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => removeMedia(m.id)}
                      hitSlop={6}
                      style={[styles.stripRemove, { backgroundColor: colors.foreground + "CC" }]}
                    >
                      <Icon name="close-square" set="bold" size={12} color={colors.background} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
                {media.length < MAX_ITEMS && (
                  <TouchableOpacity
                    onPress={pickMedia}
                    style={[styles.stripAddBtn, { borderColor: colors.border + "66" }]}
                  >
                    <Icon name="plus" set="light" size={24} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.detailsStep} keyboardShouldPersistTaps="handled">
          <View style={styles.detailsHeaderRow}>
            <View style={[styles.detailsThumbWrap, { backgroundColor: colors.muted }]}>
              {media[0] && (
                <Image
                  source={{ uri: media[0].type === "video" ? media[0].thumbnailUri : media[0].uri }}
                  style={styles.detailsThumb}
                  resizeMode="cover"
                />
              )}
              {media.length > 1 && (
                <View style={styles.detailsThumbBadge}>
                  <Text style={styles.detailsThumbBadgeText}>{media.length}</Text>
                </View>
              )}
            </View>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="Write a caption..."
              placeholderTextColor={colors.mutedForeground + "80"}
              multiline
              maxLength={2200}
              style={[styles.captionInput, { color: colors.foreground }]}
            />
          </View>

          <MentionSuggestions
            query={mentionQuery}
            colors={colors}
            onSelect={(username) => setCaption((c) => applyMentionSelection(c, username))}
          />

          <View style={[styles.divider, { backgroundColor: colors.border + "40" }]} />

          <View style={styles.fieldRow}>
            <Icon name="location" set="light" size={20} color={colors.mutedForeground} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Add location"
              placeholderTextColor={colors.mutedForeground + "80"}
              style={[styles.fieldInput, { color: colors.foreground }]}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border + "40" }]} />

          <View style={styles.fieldRow}>
            <Icon name="edit-square" set="light" size={20} color={colors.mutedForeground} />
            <TextInput
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="Add tags (comma separated)"
              placeholderTextColor={colors.mutedForeground + "80"}
              style={[styles.fieldInput, { color: colors.foreground }]}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border + "40" }]} />

          <View style={styles.postingAsRow}>
            <View style={[styles.postingAsAvatar, { backgroundColor: colors.muted }]}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.postingAsAvatarImg} />
              ) : (
                <Icon name="user" set="light" size={14} color={colors.mutedForeground} />
              )}
            </View>
            <Text style={[styles.postingAsText, { color: colors.mutedForeground }]}>
              Posting as <Text style={{ color: colors.foreground, fontFamily: FontFamily.semibold }}>{user?.username || "you"}</Text>
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerIconBtn: { width: 40, height: 36, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: { ...Typography.h4 },
  headerTextBtn: { minWidth: 48, alignItems: "flex-end", justifyContent: "center" },
  headerActionText: { fontFamily: FontFamily.semibold, fontSize: FontSize.base, lineHeight: 21 },

  selectStep: { flex: 1 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontFamily: FontFamily.semibold, fontSize: FontSize.md, lineHeight: 22, marginTop: 4 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: Radius.pill },
  emptyBtnText: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, lineHeight: 20 },

  previewWrap: { width: "100%", aspectRatio: 1, position: "relative" },
  previewImage: { width: "100%", height: "100%" },
  previewPlayBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -22,
    marginLeft: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCounter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#00000099",
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewCounterText: { color: "#fff", fontFamily: FontFamily.semibold, fontSize: 12 },

  strip: { flexGrow: 0 },
  stripContent: { padding: Spacing.md, gap: 8 },
  stripThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 2,
    position: "relative",
  },
  stripThumb: { width: "100%", height: "100%", borderRadius: Radius.md - 2 },
  stripPlayBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#00000099",
    alignItems: "center",
    justifyContent: "center",
  },
  stripRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stripAddBtn: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },

  detailsStep: { padding: Spacing.base },
  detailsHeaderRow: { flexDirection: "row", gap: 12 },
  detailsThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    overflow: "hidden",
    position: "relative",
  },
  detailsThumb: { width: "100%", height: "100%" },
  detailsThumbBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#00000099",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  detailsThumbBadgeText: { color: "#fff", fontSize: 10, fontFamily: FontFamily.semibold },
  captionInput: {
    flex: 1,
    minHeight: 56,
    maxHeight: 140,
    ...Typography.body,
    textAlignVertical: "top",
  },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.base },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  fieldInput: { flex: 1, ...Typography.body, paddingVertical: 6 },
  postingAsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  postingAsAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  postingAsAvatarImg: { width: 24, height: 24, borderRadius: 12 },
  postingAsText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 20 },
});

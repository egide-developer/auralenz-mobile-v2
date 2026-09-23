// Single-post detail viewer — the app had no way to open an image post at
// full size or edit its caption/location; reels covers video, this covers
// everything (image or video), plus inline caption/location editing for
// your own posts (PUT /api/posts/:id already existed on the backend but was
// never called from anywhere in the mobile app).
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { UserLink } from "../../src/components/ui/UserLink";
import { renderRichText } from "../../src/components/ui/RichText";
import { CommentSheet } from "../(tabs)/index";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Post } from "../../src/types";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function PostDetailScreen() {
  const { postId, initialPost: initialPostParam } = useLocalSearchParams<{
    postId: string;
    initialPost?: string;
  }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUserId = useAuthStore((s) => s.user?.id);

  const parsedInitial: Post | null = (() => {
    if (!initialPostParam) return null;
    try {
      return JSON.parse(initialPostParam);
    } catch {
      return null;
    }
  })();

  const [post, setPost] = useState<Post | null>(parsedInitial);
  const [loading, setLoading] = useState(!parsedInitial);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(parsedInitial?.caption || "");
  const [locationDraft, setLocationDraft] = useState(parsedInitial?.location || "");
  const [saving, setSaving] = useState(false);

  const isOwnPost = !!post?.author?.id && post.author.id === currentUserId;
  const media = post?.media?.[0];
  const isVideo = media?.type === "video";

  const videoPlayer = useVideoPlayer(isVideo && media ? media.url : null, (player) => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    if (!parsedInitial && postId) {
      (async () => {
        try {
          const { data } = await api.get(API.posts.byId(postId));
          setPost(data.post || data);
        } catch {
          setPost(null);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [postId]);

  const toggleLike = useCallback(async () => {
    if (!post) return;
    const wasLiked = post.isLiked;
    const wasCount = post.likesCount;
    setPost({ ...post, isLiked: !wasLiked, likesCount: wasLiked ? wasCount - 1 : wasCount + 1 });
    try {
      const { data } = await api.post(API.posts.like(post.id));
      setPost((p) => (p ? { ...p, isLiked: data.isLiked, likesCount: data.post?.likesCount ?? p.likesCount } : p));
    } catch {
      setPost((p) => (p ? { ...p, isLiked: wasLiked, likesCount: wasCount } : p));
    }
  }, [post]);

  const toggleSave = useCallback(async () => {
    if (!post) return;
    const wasSaved = post.isSaved;
    setPost({ ...post, isSaved: !wasSaved });
    try {
      const { data } = await api.post(API.posts.save(post.id));
      setPost((p) => (p ? { ...p, isSaved: data.isSaved } : p));
    } catch {
      setPost((p) => (p ? { ...p, isSaved: wasSaved } : p));
    }
  }, [post]);

  const startEdit = useCallback(() => {
    if (!post) return;
    setCaptionDraft(post.caption || "");
    setLocationDraft(post.location || "");
    setEditing(true);
  }, [post]);

  const saveEdit = useCallback(async () => {
    if (!post) return;
    setSaving(true);
    try {
      const { data } = await api.put(API.posts.byId(post.id), {
        caption: captionDraft.trim(),
        location: locationDraft.trim(),
      });
      setPost((p) => (p ? { ...p, caption: data.post?.caption ?? captionDraft.trim(), location: data.post?.location ?? locationDraft.trim() } : p));
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to update post");
    } finally {
      setSaving(false);
    }
  }, [post, captionDraft, locationDraft]);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12 }]}>
        <Text style={{ color: colors.foreground }}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        {post.author ? (
          <UserLink user={post.author} colors={colors} avatarSize={32} usernameStyle={styles.headerUsername} />
        ) : null}
        {isOwnPost ? (
          <TouchableOpacity onPress={editing ? saveEdit : startEdit} style={styles.backBtn} hitSlop={8} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontFamily: FontFamily.semibold }}>{editing ? "Save" : "Edit"}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {media ? (
        <View style={[styles.mediaWrap, { backgroundColor: colors.muted }]}>
          <Image source={{ uri: media.url }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          {isVideo ? (
            <VideoView player={videoPlayer} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={24} color={post.isLiked ? Colors.light.destructive : colors.foreground} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>{post.likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentsVisible(true)}>
          <Icon name="chat" set="light" size={22} color={colors.foreground} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>{post.commentsCount}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={toggleSave}>
          <Icon name="bookmark" set={post.isSaved ? "bold" : "light"} size={22} color={post.isSaved ? colors.primary : colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.captionSection}>
        {editing ? (
          <>
            <TextInput
              value={captionDraft}
              onChangeText={setCaptionDraft}
              placeholder="Write a caption..."
              placeholderTextColor={colors.mutedForeground + "80"}
              multiline
              maxLength={2200}
              style={[styles.captionInput, { color: colors.foreground, borderColor: colors.border }]}
            />
            <TextInput
              value={locationDraft}
              onChangeText={setLocationDraft}
              placeholder="Add location"
              placeholderTextColor={colors.mutedForeground + "80"}
              style={[styles.locationInput, { color: colors.foreground, borderColor: colors.border }]}
            />
          </>
        ) : (
          <>
            {post.caption ? (
              <Text style={[styles.caption, { color: colors.foreground }]}>
                <Text style={{ fontFamily: FontFamily.bold }}>{post.author?.username} </Text>
                {renderRichText(post.caption, colors.primary, `post-cap-${post.id}`)}
              </Text>
            ) : null}
            {post.location ? (
              <View style={styles.locationRow}>
                <Icon name="location" set="light" size={14} color={colors.mutedForeground} />
                <Text style={[styles.locationText, { color: colors.mutedForeground }]}>{post.location}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      <CommentSheet
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        postId={post.id}
        colors={colors}
        isDark={isDark}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 60, height: 32, alignItems: "flex-start", justifyContent: "center" },
  headerUsername: { fontSize: 14 },
  mediaWrap: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, position: "relative" },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 20,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  captionSection: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: 8 },
  caption: { ...Typography.bodySmall, lineHeight: 20 },
  captionInput: {
    ...Typography.bodySmall,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minHeight: 70,
    textAlignVertical: "top",
  },
  locationInput: {
    ...Typography.bodySmall,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { ...Typography.caption },
});

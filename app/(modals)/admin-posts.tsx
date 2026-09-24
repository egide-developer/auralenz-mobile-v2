import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { showToast } from "../../src/stores/toastStore";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

interface AdminPost {
  _id: string;
  caption?: string;
  media?: { url: string; type?: string }[];
  author?: { _id: string; username: string; avatarUrl?: string; isVerified?: boolean };
  likesCount?: number;
  commentsCount?: number;
  archived?: boolean;
  isDraft?: boolean;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function AdminPostsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, search: string) => {
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data } = await api.get(API.admin.posts, {
        params: { page: nextPage, limit: PAGE_SIZE, ...(search.trim() ? { q: search.trim() } : {}) },
      });
      const incoming: AdminPost[] = data.posts || [];
      setPosts((prev) => (nextPage === 1 ? incoming : [...prev, ...incoming]));
      setHasMore(Boolean(data.pagination?.hasMore));
      setPage(nextPage);
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not load posts", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(1, query), 350);
    return () => clearTimeout(timer);
  }, [query, load]);

  const deletePost = (post: AdminPost) => {
    Alert.alert(
      "Delete this post?",
      `This permanently removes ${post.author?.username ? `@${post.author.username}'s` : "the"} post, its media, likes and comments. It cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(post._id);
            try {
              await api.delete(API.admin.deletePost(post._id));
              setPosts((prev) => prev.filter((p) => p._id !== post._id));
              showToast("Post deleted", "success");
            } catch (e: any) {
              showToast(e?.response?.data?.message || "Could not delete that post", "error");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: { item: AdminPost }) => {
    const thumbnail = item.media?.[0];
    const isVideo = thumbnail?.type === "video";

    return (
      <View style={[styles.row, { borderBottomColor: colors.border + "40" }]}>
        <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
          {thumbnail?.url && !isVideo ? (
            <CachedImage source={{ uri: thumbnail.url }} style={styles.thumbImage} contentFit="cover" />
          ) : (
            <Ionicons
              name={isVideo ? "videocam" : "image-outline"}
              size={20}
              color={colors.mutedForeground}
            />
          )}
        </View>

        <View style={styles.rowBody}>
          <Text style={[styles.author, { color: colors.foreground }]} numberOfLines={1}>
            @{item.author?.username || "unknown"}
          </Text>
          <Text style={[styles.caption, { color: colors.mutedForeground }]} numberOfLines={2}>
            {item.caption?.trim() || "No caption"}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {item.likesCount || 0} likes · {item.commentsCount || 0} comments
            </Text>
            {item.archived ? (
              <Text style={[styles.badge, { color: colors.warning, borderColor: colors.warning }]}>ARCHIVED</Text>
            ) : null}
            {item.isDraft ? (
              <Text style={[styles.badge, { color: colors.mutedForeground, borderColor: colors.border }]}>
                DRAFT
              </Text>
            ) : null}
          </View>
        </View>

        {deletingId === item._id ? (
          <ActivityIndicator size="small" color={colors.destructive} />
        ) : (
          <TouchableOpacity onPress={() => deletePost(item)} hitSlop={8} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Manage Posts</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search captions"
          placeholderTextColor={colors.mutedForeground + "80"}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoCapitalize="none"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item._id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !loadingMore) load(page + 1, query);
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: colors.mutedForeground }}>
                {query ? "No posts match that search" : "No posts yet"}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={colors.primary} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: Spacing.md,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: Radius.pill,
  },
  searchInput: { flex: 1, ...Typography.bodySmall, paddingVertical: 0 },
  centered: { paddingVertical: 60, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: Spacing.base, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: { width: 52, height: 52 },
  rowBody: { flex: 1, gap: 2 },
  author: { fontFamily: FontFamily.semibold, fontSize: 14 },
  caption: { fontSize: 12, lineHeight: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  meta: { fontSize: 11 },
  badge: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: "hidden",
  },
  deleteBtn: { padding: 6 },
  footerSpinner: { paddingVertical: 20 },
});

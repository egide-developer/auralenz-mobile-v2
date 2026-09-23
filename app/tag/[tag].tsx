import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Post } from "../../src/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * 2) / 3;

export default function TagResultsScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(
        `${API.posts.search}?tags=${encodeURIComponent(tag)}`,
      );
      const list = data.posts || data.data || [];
      setPosts(Array.isArray(list) ? list : []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    load();
  }, [load]);

  const openPost = useCallback((post: Post) => {
    const hasVideo = post.media?.some((m) => m.type === "video");
    if (hasVideo) {
      router.push({
        pathname: "/reels/[postId]",
        params: { postId: post.id, initialPost: JSON.stringify(post) },
      });
    } else {
      router.push({
        pathname: "/post/[postId]",
        params: { postId: post.id, initialPost: JSON.stringify(post) },
      });
    }
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>#{tag}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          columnWrapperStyle={{ gap: GRID_GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Ionicons name="pricetag-outline" size={40} color={colors.mutedForeground + "60"} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No posts tagged #{tag} yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const thumb = item.media?.[0];
            return (
              <TouchableOpacity style={styles.gridItem} onPress={() => openPost(item)} activeOpacity={0.85}>
                {thumb ? (
                  <Image source={{ uri: thumb.url }} style={styles.gridImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.gridImage, { backgroundColor: colors.muted }]} />
                )}
                {thumb?.type === "video" ? (
                  <View style={styles.gridVideoBadge}>
                    <Icon name="video" set="bold" size={12} color="#FFFFFF" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
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
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100, gap: 10 },
  emptyText: { ...Typography.bodySmall, textAlign: "center", paddingHorizontal: Spacing.lg },
  gridItem: { width: GRID_ITEM_SIZE, height: GRID_ITEM_SIZE, position: "relative" },
  gridImage: { width: "100%", height: "100%" },
  gridVideoBadge: { position: "absolute", top: 6, right: 6 },
});

import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Post } from "../../src/types";

export default function ExploreScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await api.get(API.posts.trending);
      setPosts(data.data || data.posts || data);
    } catch {} finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Explore</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={posts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="discovery" set="light" size={48} color={colors.mutedForeground + "60"} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No trending posts</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border + "30" }, Shadows[isDark ? "dark" : "light"]["soft"]]}
            onPress={() => router.push({ pathname: "/post/[id]", params: { id: item.id } })}
          >
            <View style={[styles.gridImage, { backgroundColor: colors.muted }]}>
              <Icon name="image" set="light" size={24} color={colors.mutedForeground + "60"} />
            </View>
            <View style={styles.gridInfo}>
              <Text style={[styles.gridCaption, { color: colors.foreground }]} numberOfLines={2}>
                {item.caption || "Post"}
              </Text>
              <View style={styles.gridStats}>
                <Icon name="heart" set="light" size={12} color={colors.mutedForeground} />
                <Text style={[styles.gridLikes, { color: colors.mutedForeground }]}>{item.likesCount}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
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
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: { ...Typography.h3 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  columnWrapper: { gap: 8, paddingHorizontal: Spacing.lg },
  listContent: { paddingBottom: 20 },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { ...Typography.body },
  gridItem: {
    flex: 1,
    marginBottom: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  gridImage: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridInfo: { padding: 10 },
  gridCaption: { ...Typography.caption, fontWeight: "600" },
  gridStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  gridLikes: { ...Typography.caption },
});

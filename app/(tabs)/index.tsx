import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { Icon } from "../../src/components/ui/Icon";
import type { Post } from "../../src/types";

export default function FeedScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await api.get(API.posts.list);
      setPosts(data.data || data.items || data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, ...Typography.body }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AuraLenz</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={[styles.headerBtn, { backgroundColor: colors.card + "80" }]}
          >
            <Icon name="search" set="light" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={[styles.headerBtn, { backgroundColor: colors.card + "80" }]}
          >
            <Icon name="notification" set="light" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="image" set="light" size={48} color={colors.mutedForeground + "60"} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No posts yet
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border + "30" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
              <View style={styles.postHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
                </View>
                <View style={styles.postMeta}>
                  <Text style={[styles.username, { color: colors.foreground }]}>
                    {item.user?.username || "User"}
                  </Text>
                </View>
                <TouchableOpacity style={styles.moreBtn}>
                  <Icon name="more-circle" set="light" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {item.caption && (
                <Text style={[styles.caption, { color: colors.foreground }]}>
                  {item.caption}
                </Text>
              )}

              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Icon name="heart" set="light" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                    {item.likesCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Icon name="chat" set="light" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
                    {item.commentsCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Icon name="send" set="light" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                  <Icon name="bookmark" set="light" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    ...Typography.body,
  },
  postCard: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  postMeta: {
    flex: 1,
  },
  username: {
    ...Typography.bodySmall,
    fontWeight: "600",
  },
  moreBtn: {
    padding: 4,
  },
  caption: {
    ...Typography.bodySmall,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    ...Typography.caption,
  },
});

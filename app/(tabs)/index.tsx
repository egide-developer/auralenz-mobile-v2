import { View, Text, FlatList, RefreshControl } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 15 }}>
              No posts yet
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 0.5,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.muted,
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 14 }}>
                    {item.user?.username || "User"}
                  </Text>
                </View>
              </View>
              {item.caption && (
                <Text style={{ color: colors.foreground, fontSize: 14, lineHeight: 20 }}>
                  {item.caption}
                </Text>
              )}
              <View style={{ flexDirection: "row", marginTop: 12, gap: 16 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  ❤ {item.likesCount}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  💬 {item.commentsCount}
                </Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

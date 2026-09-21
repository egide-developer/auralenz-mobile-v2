import { View, Text, FlatList, RefreshControl } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>
          Explore
        </Text>
      </View>
      <FlatList
        data={posts}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 8, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <Text style={{ color: colors.mutedForeground }}>No trending posts</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flex: 1,
              marginBottom: 8,
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: 0.5,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            <View style={{ aspectRatio: 1, backgroundColor: colors.muted }} />
            <View style={{ padding: 10 }}>
              <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>
                {item.caption || "Post"}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
                ❤ {item.likesCount}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

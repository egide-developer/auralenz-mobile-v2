// Shared followers/following list — Instagram shows both as the same kind
// of screen (avatar, username, verified badge, tap-through to profile), just
// sourced from a different endpoint, so one screen covers both instead of
// duplicating the list UI per mode.
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { UserLink } from "../../src/components/ui/UserLink";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { UserPreview } from "../../src/types";

export default function FollowListScreen() {
  const { userId, mode, title } = useLocalSearchParams<{
    userId: string;
    mode: "followers" | "following";
    title?: string;
  }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [users, setUsers] = useState<UserPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const endpoint = mode === "following" ? API.users.following(userId) : API.users.followers(userId);
        const { data } = await api.get(endpoint);
        const list = data.followers || data.following || data.data || [];
        setUsers(Array.isArray(list) ? list : []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, mode]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {title || (mode === "following" ? "Following" : "Followers")}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Text style={{ color: colors.mutedForeground }}>
                {mode === "following" ? "Not following anyone yet" : "No followers yet"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { borderBottomColor: colors.border + "20" }]}>
              <UserLink user={item} colors={colors} avatarSize={44} usernameStyle={styles.username} />
            </View>
          )}
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
  headerTitle: { ...Typography.h4, flex: 1, textAlign: "center" },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  row: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  username: { fontSize: 15 },
});

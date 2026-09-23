// Close Friends management — pick from the people you follow who should see
// your "close friends only" stories. Candidate list reuses the same
// following-list data as profile/follow-list.tsx; membership comes from the
// dedicated close-friends endpoints.
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { UserLink } from "../../src/components/ui/UserLink";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { UserPreview } from "../../src/types";

export default function CloseFriendsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const user = useAuthStore((s) => s.user);

  const [candidates, setCandidates] = useState<UserPreview[]>([]);
  const [closeFriendIds, setCloseFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [followingRes, closeFriendsRes] = await Promise.all([
          api.get(API.users.following(user.id)),
          api.get(API.users.closeFriends),
        ]);
        const followingList = followingRes.data.following || followingRes.data.data || [];
        const closeFriendsList = closeFriendsRes.data.users || [];
        setCandidates(Array.isArray(followingList) ? followingList : []);
        setCloseFriendIds(new Set(closeFriendsList.map((u: UserPreview) => u.id)));
      } catch {
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const toggle = useCallback(async (targetId: string) => {
    const isMember = closeFriendIds.has(targetId);
    setCloseFriendIds((prev) => {
      const next = new Set(prev);
      if (isMember) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
    try {
      if (isMember) await api.delete(API.users.closeFriend(targetId));
      else await api.post(API.users.closeFriend(targetId));
    } catch {
      setCloseFriendIds((prev) => {
        const next = new Set(prev);
        if (isMember) next.add(targetId);
        else next.delete(targetId);
        return next;
      });
    }
  }, [closeFriendIds]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          Close Friends
        </Text>
        <View style={styles.backBtn} />
      </View>

      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Add people from your following list to share close-friends-only stories with them.
      </Text>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <Text style={{ color: colors.mutedForeground }}>You aren't following anyone yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMember = closeFriendIds.has(item.id);
            return (
              <View style={[styles.row, { borderBottomColor: colors.border + "20" }]}>
                <UserLink user={item} colors={colors} avatarSize={44} usernameStyle={styles.username} />
                <TouchableOpacity
                  onPress={() => toggle(item.id)}
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: isMember ? "#2ECC71" : colors.muted, borderColor: isMember ? "#2ECC71" : colors.border },
                  ]}
                >
                  <Icon
                    name="star"
                    set={isMember ? "bold" : "light"}
                    size={16}
                    color={isMember ? "#FFFFFF" : colors.mutedForeground}
                  />
                </TouchableOpacity>
              </View>
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
  headerTitle: { ...Typography.h4, flex: 1, textAlign: "center" },
  hint: { ...Typography.bodySmall, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  username: { fontSize: 15 },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

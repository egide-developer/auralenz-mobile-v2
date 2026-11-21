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
import { AppIcon } from "../../src/components/ui/AppIcon";
import { icons } from "../../src/constants/icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { showToast } from "../../src/stores/toastStore";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { SafeAreaScreen } from "../../src/components/layout";

interface AdminUser {
  _id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  role: "user" | "admin";
  isVerified?: boolean;
  isSuspended?: boolean;
  isOnline?: boolean;
  postsCount?: number;
}

const PAGE_SIZE = 20;

export default function AdminUsersScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage: number, search: string) => {
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const { data } = await api.get(API.admin.users, {
          params: { page: nextPage, limit: PAGE_SIZE, ...(search.trim() ? { q: search.trim() } : {}) },
        });
        const incoming: AdminUser[] = data.users || [];
        setUsers((prev) => (nextPage === 1 ? incoming : [...prev, ...incoming]));
        setHasMore(Boolean(data.pagination?.hasMore));
        setPage(nextPage);
      } catch (e: any) {
        showToast(e?.response?.data?.message || "Could not load users", "error");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    // Debounced so typing a name doesn't fire a request per keystroke.
    const timer = setTimeout(() => load(1, query), 350);
    return () => clearTimeout(timer);
  }, [query, load]);

  const patchUser = async (id: string, url: string, body: object, successMessage: string) => {
    setBusyId(id);
    try {
      const { data } = await api.patch(url, body);
      const updated = data.user || {};
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, ...updated, _id: u._id } : u))
      );
      showToast(successMessage, "success");
    } catch (e: any) {
      showToast(e?.response?.data?.message || "That change didn't stick", "error");
    } finally {
      setBusyId(null);
    }
  };

  const confirm = (title: string, message: string, onConfirm: () => void, destructive = false) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", style: destructive ? "destructive" : "default", onPress: onConfirm },
    ]);

  const toggleRole = (user: AdminUser) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    confirm(
      nextRole === "admin" ? "Grant admin access?" : "Revoke admin access?",
      nextRole === "admin"
        ? `${user.username} will be able to moderate content and manage other accounts.`
        : `${user.username} will lose all moderation access.`,
      () => patchUser(user._id, API.admin.setUserRole(user._id), { role: nextRole }, `${user.username} is now ${nextRole}`),
      nextRole === "user"
    );
  };

  const toggleVerified = (user: AdminUser) => {
    const next = !user.isVerified;
    patchUser(
      user._id,
      API.admin.setVerified(user._id),
      { isVerified: next },
      next ? `${user.username} verified` : `Removed ${user.username}'s badge`
    );
  };

  const toggleSuspended = (user: AdminUser) => {
    const next = !user.isSuspended;
    confirm(
      next ? "Suspend account?" : "Restore account?",
      next
        ? `${user.username} will be signed out and blocked from using the app.`
        : `${user.username} will regain access immediately.`,
      () =>
        patchUser(
          user._id,
          API.admin.setAccess(user._id),
          { isSuspended: next, suspensionReason: next ? "Suspended by an administrator" : "" },
          next ? `${user.username} suspended` : `${user.username} restored`
        ),
      next
    );
  };

  const renderUser = ({ item }: { item: AdminUser }) => {
    const isSelf = currentUser?.id === item._id;
    const busy = busyId === item._id;

    return (
      <View style={[styles.row, { borderBottomColor: colors.border + "40" }]}>
        <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
          {item.avatarUrl ? (
            <CachedImage source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <AppIcon icon={icons.person} size={18} color={colors.mutedForeground}  />
          )}
        </View>

        <View style={styles.rowBody}>
          <View style={styles.nameLine}>
            <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
              {item.username}
            </Text>
            {item.isVerified ? <AppIcon icon={icons.checkmarkCircle} size={14} color={colors.verified}  /> : null}
          </View>
          <Text style={[styles.email, { color: colors.mutedForeground }]} numberOfLines={1}>
            {item.email || "No email on file"}
          </Text>
          <View style={styles.badgeRow}>
            {item.role === "admin" ? (
              <Text style={[styles.badge, { color: colors.primary, borderColor: colors.primary }]}>ADMIN</Text>
            ) : null}
            {item.isSuspended ? (
              <Text style={[styles.badge, { color: colors.destructive, borderColor: colors.destructive }]}>
                SUSPENDED
              </Text>
            ) : null}
          </View>
        </View>

        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : isSelf ? (
          // Guards against an admin locking themselves out; the server
          // refuses self-suspension too, this just avoids offering it.
          <Text style={[styles.youLabel, { color: colors.mutedForeground }]}>You</Text>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => toggleVerified(item)} hitSlop={8} style={styles.actionBtn}>
              <AppIcon
                icon={item.isVerified ? icons.checkmarkCircle : icons.circle}
                size={22}
                color={item.isVerified ? colors.verified : colors.mutedForeground}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleRole(item)} hitSlop={8} style={styles.actionBtn}>
              <AppIcon
                icon={item.role === "admin" ? icons.shield : icons.shieldOutline}
                size={22}
                color={item.role === "admin" ? colors.primary : colors.mutedForeground}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSuspended(item)} hitSlop={8} style={styles.actionBtn}>
              <AppIcon
                icon={item.isSuspended ? icons.lockClosed : icons.lockOpen}
                size={22}
                color={item.isSuspended ? colors.destructive : colors.mutedForeground}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaScreen style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <AppIcon icon={icons.chevronBack} size={24} color={colors.foreground}  />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Manage Users</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <AppIcon icon={icons.search} size={16} color={colors.mutedForeground}  />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search username or email"
          placeholderTextColor={colors.mutedForeground + "80"}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
            <AppIcon icon={icons.closeCircle} size={16} color={colors.mutedForeground}  />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !loadingMore) load(page + 1, query);
          }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: colors.mutedForeground }}>
                {query ? "No users match that search" : "No users yet"}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={styles.footerSpinner} color={colors.primary} /> : null
          }
        />
      )}
    </SafeAreaScreen>
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 42, height: 42 },
  rowBody: { flex: 1, gap: 2 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  username: { fontFamily: FontFamily.semibold, fontSize: 15, flexShrink: 1 },
  email: { fontSize: 12 },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
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
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { padding: 2 },
  youLabel: { fontSize: 12, fontFamily: FontFamily.medium },
  footerSpinner: { paddingVertical: 20 },
});

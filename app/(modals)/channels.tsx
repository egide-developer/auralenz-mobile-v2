import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Channel } from "../../src/types";

export default function ChannelsModal() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [discover, setDiscover] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"mine" | "discover">("mine");

  const fetchChannels = useCallback(async () => {
    try {
      const { data } = await api.get(API.channels.list);
      setChannels(data.channels || data.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (tab !== "discover") return;
    let active = true;
    setDiscovering(true);
    const query = discoverQuery.trim();
    const url = query ? `${API.channels.discover}?q=${encodeURIComponent(query)}` : API.channels.discover;
    api
      .get(url)
      .then(({ data }) => {
        if (active) setDiscover(data.channels || data.data || []);
      })
      .catch(() => {
        if (active) setDiscover([]);
      })
      .finally(() => {
        if (active) setDiscovering(false);
      });
    return () => {
      active = false;
    };
  }, [tab, discoverQuery]);

  const joinChannel = useCallback(
    async (id: string) => {
      try {
        const { data } = await api.post(API.channels.join(id));
        const joined: Channel = data.channel;
        setDiscover((prev) => prev.map((c) => (c.id === id ? { ...joined } : c)));
        setChannels((prev) => {
          if (prev.some((c) => c.id === id)) return prev;
          return [joined, ...prev];
        });
      } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.message || "Could not join channel");
      }
    },
    []
  );

  const openChannel = useCallback((id: string) => {
    router.push({ pathname: "/channels/[id]", params: { id } });
  }, []);

  const createChannel = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post(API.channels.create, {
        name: name.trim(),
        description: description.trim(),
      });
      setCreateOpen(false);
      setName("");
      setDescription("");
      fetchChannels();
      openChannel(data.channel.id);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Could not create channel");
    } finally {
      setCreating(false);
    }
  }, [name, description, fetchChannels, openChannel]);

  const renderChannel = useCallback(
    ({ item }: { item: Channel }) => {
      const amOwner = item.myRole === "owner" || item.myRole === "admin";
      return (
        <PressableScale scaleTo={0.98} style={styles.row} onPress={() => openChannel(item.id)}>
          <View
            style={[
              styles.avatar,
              item.avatarUrl ? undefined : { backgroundColor: colors.primary + "18" },
            ]}
          >
            {item.avatarUrl ? (
              <CachedImage source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="megaphone" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.rowMeta}>
            <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {amOwner ? "You post · " : ""}
              {item.memberCount} member{item.memberCount === 1 ? "" : "s"}
            </Text>
          </View>
          <View style={styles.rowActions}>
            {!item.isJoined ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => joinChannel(item.id)}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Join</Text>
              </TouchableOpacity>
            ) : (
              <Icon name="arrow-right" set="light" size={18} color={colors.mutedForeground} />
            )}
          </View>
        </PressableScale>
      );
    },
    [colors, joinChannel, openChannel]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Broadcast Channels</Text>
        <TouchableOpacity onPress={() => setCreateOpen(true)} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="add-circle-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(["mine", "discover"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {t === "mine" ? "My channels" : "Discover"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "discover" && (
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Icon name="search" set="light" size={17} color={colors.mutedForeground} />
          <TextInput
            value={discoverQuery}
            onChangeText={setDiscoverQuery}
            placeholder="Search channels"
            placeholderTextColor={colors.mutedForeground + "90"}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {discoverQuery.length > 0 && (
            <TouchableOpacity onPress={() => setDiscoverQuery("")} hitSlop={8}>
              <Icon name="close-square" set="bold" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={tab === "mine" ? channels : discover}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchChannels();
        }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          discovering ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : loading && tab === "mine" ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={44} color={colors.mutedForeground + "60"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {tab === "mine" ? "No channels yet" : "No channels found"}
              </Text>
              {tab === "mine" && (
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Discover channels to follow, or start one of your own.
                </Text>
              )}
            </View>
          )
        }
        renderItem={renderChannel}
      />

      <Modal visible={createOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCreateOpen(false)} />
          <View style={[styles.createCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>Start a channel</Text>
            <Text style={[styles.createSub, { color: colors.mutedForeground }]}>
              Only you (and admins you promote) can post. Everyone else subscribes.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Channel name"
              placeholderTextColor={colors.mutedForeground + "80"}
              maxLength={60}
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this channel about?"
              placeholderTextColor={colors.mutedForeground + "80"}
              maxLength={300}
              multiline
              style={[
                styles.input,
                { backgroundColor: colors.background, color: colors.foreground, minHeight: 84, textAlignVertical: "top" },
              ]}
            />
            <View style={styles.createActions}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => setCreateOpen(false)}
              >
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={createChannel}
                disabled={creating || !name.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h3, flex: 1, textAlign: "center" },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: { flex: 1, ...Typography.bodySmall, paddingVertical: 0 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  emptyState: { paddingVertical: 60, alignItems: "center", gap: 8 },
  emptyTitle: { ...Typography.body, fontFamily: FontFamily.semibold },
  emptySub: { ...Typography.caption },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  rowMeta: { flex: 1 },
  rowName: { ...Typography.body, fontFamily: FontFamily.semibold },
  rowSub: { ...Typography.caption, marginTop: 2 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#00000066" },
  createCard: {
    borderRadius: Radius["2xl"],
    padding: Spacing.lg,
    gap: 12,
  },
  createTitle: { ...Typography.h4 },
  createSub: { ...Typography.caption },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Typography.body,
  },
  createActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1 },
  secondaryBtnText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
});
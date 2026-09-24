import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { COMMUNITY_CATEGORIES } from "../../src/types";
import type { Community } from "../../src/types";

export default function CommunitiesModal() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [communities, setCommunities] = useState<Community[]>([]);
  const [discover, setDiscover] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [rules, setRules] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"mine" | "discover">("mine");

  const fetchCommunities = useCallback(async () => {
    try {
      const { data } = await api.get(API.communities.list);
      setCommunities(data.communities || data.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  useEffect(() => {
    if (tab !== "discover") return;
    let active = true;
    setDiscovering(true);
    const query = discoverQuery.trim();
    const url = query
      ? `${API.communities.discover}?q=${encodeURIComponent(query)}`
      : API.communities.discover;
    api
      .get(url)
      .then(({ data }) => {
        if (active) setDiscover(data.communities || data.data || []);
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

  const joinCommunity = useCallback(
    async (id: string) => {
      try {
        const { data } = await api.post(API.communities.join(id));
        const joined: Community = data.community;
        setDiscover((prev) => prev.map((c) => (c.id === id ? { ...joined } : c)));
        setCommunities((prev) => (prev.some((c) => c.id === id) ? prev : [joined, ...prev]));
      } catch (e: any) {
        Alert.alert("Error", e?.response?.data?.message || "Could not join community");
      }
    },
    []
  );

  const openCommunity = useCallback((id: string) => {
    router.push({ pathname: "/communities/[id]", params: { id } });
  }, []);

  const createCommunity = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post(API.communities.create, {
        name: name.trim(),
        description: description.trim(),
        category,
        rules: rules
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
      });
      setCreateOpen(false);
      setName("");
      setDescription("");
      setRules("");
      fetchCommunities();
      openCommunity(data.community.id);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Could not create community");
    } finally {
      setCreating(false);
    }
  }, [name, description, category, rules, fetchCommunities, openCommunity]);

  const renderCommunity = useCallback(
    ({ item }: { item: Community }) => {
      const amOwner = item.myRole === "owner" || item.myRole === "admin";
      return (
        <PressableScale scaleTo={0.98} style={styles.row} onPress={() => openCommunity(item.id)}>
          <View
            style={[
              styles.avatar,
              item.avatarUrl ? undefined : { backgroundColor: colors.primary + "18" },
            ]}
          >
            {item.avatarUrl ? (
              <CachedImage source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="people" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.rowMeta}>
            <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {amOwner ? "You manage · " : ""}
              {item.memberCount} member{item.memberCount === 1 ? "" : "s"}
              {item.category ? ` · ${item.category}` : ""}
            </Text>
          </View>
          <View style={styles.rowActions}>
            {!item.isJoined ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => joinCommunity(item.id)}
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
    [colors, joinCommunity, openCommunity]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Communities</Text>
        <TouchableOpacity onPress={() => setCreateOpen(true)} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="add-circle-outline" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(["mine", "discover"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              tab === t && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {t === "mine" ? "My communities" : "Discover"}
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
            placeholder="Search communities"
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
        data={tab === "mine" ? communities : discover}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          discovering || (loading && tab === "mine") ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={44} color={colors.mutedForeground + "60"} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {tab === "mine" ? "No communities yet" : "No communities found"}
              </Text>
              {tab === "mine" && (
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Join a community or start one around a topic you love.
                </Text>
              )}
            </View>
          )
        }
        renderItem={renderCommunity}
      />

      <Modal visible={createOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setCreateOpen(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCreateOpen(false)} />
          <ScrollView style={[styles.createCardWrap, { backgroundColor: colors.card }]} contentContainerStyle={styles.createCard}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>Start a community</Text>
            <Text style={[styles.createSub, { color: colors.mutedForeground }]}>
              A shared space where members post and a few admins keep things on-topic.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Community name"
              placeholderTextColor={colors.mutedForeground + "80"}
              maxLength={40}
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this community about?"
              placeholderTextColor={colors.mutedForeground + "80"}
              maxLength={600}
              multiline
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, minHeight: 72, textAlignVertical: "top" }]}
            />
            <View style={styles.chips}>
              {COMMUNITY_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.chip,
                    {
                      borderColor: category === c ? colors.primary : colors.border,
                      backgroundColor: category === c ? colors.primary + "12" : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: category === c ? colors.primary : colors.mutedForeground }]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={rules}
              onChangeText={setRules}
              placeholder="Rules (one per line)"
              placeholderTextColor={colors.mutedForeground + "80"}
              multiline
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, minHeight: 64, textAlignVertical: "top" }]}
            />
            <View style={styles.createActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setCreateOpen(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={createCommunity}
                disabled={creating || !name.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: "transparent" },
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
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  rowMeta: { flex: 1 },
  rowName: { ...Typography.body, fontFamily: FontFamily.semibold },
  rowSub: { ...Typography.caption, marginTop: 2 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  primaryBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000066" },
  createCardWrap: { borderTopLeftRadius: Radius["2xl"], borderTopRightRadius: Radius["2xl"], maxHeight: "85%" },
  createCard: { padding: Spacing.lg, gap: 12, paddingBottom: 40 },
  createTitle: { ...Typography.h4 },
  createSub: { ...Typography.caption },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, ...Typography.body },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1 },
  chipText: { ...Typography.caption },
  createActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1 },
  secondaryBtnText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
});
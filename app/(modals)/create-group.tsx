import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { UserPreview } from "../../src/types";

export default function CreateGroupScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPreview[]>([]);
  const [selected, setSelected] = useState<UserPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .get(`${API.users.search}?q=${encodeURIComponent(query.trim())}`)
        .then(({ data }) => {
          if (active) setResults(data.data || data.users || data || []);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  const toggleUser = (user: UserPreview) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id) ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
  };

  const create = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give your group a name.");
      return;
    }
    if (selected.length === 0) {
      Alert.alert("Add members", "Pick at least one person to add.");
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post(API.groups.list, {
        name: name.trim(),
        participantIds: selected.map((u) => u.id),
      });
      const groupId = data.group?.id;
      router.replace(groupId ? { pathname: "/messages/group/[groupId]", params: { groupId } } : "/(modals)/groups");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="close-square" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New group</Text>
        <TouchableOpacity onPress={create} style={styles.backBtn} hitSlop={8} disabled={creating}>
          {creating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontFamily: FontFamily.semibold }}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Group name"
        placeholderTextColor={colors.mutedForeground + "80"}
        style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border }]}
      />

      {selected.length > 0 ? (
        <FlatList
          data={selected}
          horizontal
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.chipsRow}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.chip, { backgroundColor: colors.card }]} onPress={() => toggleUser(item)}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>{item.username}</Text>
              <Icon name="close-square" set="bold" size={12} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        />
      ) : null}

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search people to add"
        placeholderTextColor={colors.mutedForeground + "80"}
        style={[styles.searchInput, { color: colors.foreground, borderColor: colors.border }]}
      />

      {searching ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => {
            const isSelected = selected.some((u) => u.id === item.id);
            return (
              <TouchableOpacity style={styles.resultRow} onPress={() => toggleUser(item)}>
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
                  )}
                </View>
                <Text style={[styles.resultName, { color: colors.foreground }]}>{item.username}</Text>
                <Icon
                  name={isSelected ? "tick-square" : "plus"}
                  set={isSelected ? "bold" : "light"}
                  size={20}
                  color={isSelected ? colors.primary : colors.mutedForeground}
                />
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
  backBtn: { width: 60, height: 32, justifyContent: "center" },
  headerTitle: { ...Typography.h4 },
  nameInput: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  chipsRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  chipText: { ...Typography.bodySmall },
  searchInput: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 40, height: 40 },
  resultName: { flex: 1, ...Typography.body },
});

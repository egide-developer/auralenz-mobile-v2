import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useCallback, useState } from "react";
import { router } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

export default function SearchScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const { data } = await api.get(`${API.users.search}?q=${encodeURIComponent(q)}`);
      setResults(data.data || data.users || data);
    } catch {}
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card + "80", borderColor: colors.border + "4D" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
          <Icon name="search" set="light" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              search(t);
            }}
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setResults([]); }}>
              <Icon name="close-square" set="light" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          query.length >= 2 ? (
            <View style={styles.emptyState}>
              <Icon name="search" set="light" size={48} color={colors.mutedForeground + "60"} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="search" set="light" size={48} color={colors.mutedForeground + "40"} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Type to search for users
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.resultRow, { borderBottomColor: colors.border + "30" }]}
            onPress={() => router.push({ pathname: "/user/[id]", params: { id: item.id } })}
          >
            <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
              <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
            </View>
            <View style={styles.resultMeta}>
              <Text style={[styles.username, { color: colors.foreground }]}>{item.username}</Text>
              {item.displayName && (
                <Text style={[styles.displayName, { color: colors.mutedForeground }]}>{item.displayName}</Text>
              )}
            </View>
            <Icon name="arrow-right" set="light" size={16} color={colors.mutedForeground} />
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    ...Typography.body,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultMeta: { flex: 1 },
  username: { ...Typography.body, fontWeight: "600" },
  displayName: { ...Typography.caption, marginTop: 2 },
});

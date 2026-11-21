import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "../../src/components/ui/AppIcon";
import { icons } from "../../src/constants/icons";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";

interface SearchHit {
  id: string;
  conversationId?: string;
  groupId?: string;
  text: string;
  createdAt: string;
  sender?: { username?: string; avatarUrl?: string };
}

const MIN_QUERY = 2;

export default function MessageSearchScreen() {
  // Passed when opened from inside a thread, which scopes the search to it.
  const { conversationId, groupId, title, q } = useLocalSearchParams<{
    conversationId?: string;
    groupId?: string;
    title?: string;
    q?: string;
  }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  // Seeded when arriving from the conversation list, so the query the user
  // already typed there carries over instead of starting blank.
  const [query, setQuery] = useState(q ?? "");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const requestIdRef = useRef(0);

  const runSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length < MIN_QUERY) {
        setResults([]);
        setSearched(false);
        return;
      }

      // Responses can land out of order; only the newest one may write state.
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const { data } = await api.get(API.messages.search, {
          params: { q: trimmed, conversationId, groupId, limit: 30 },
        });
        if (requestId !== requestIdRef.current) return;
        setResults(data.messages || []);
        setSearched(true);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setSearched(true);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [conversationId, groupId]
  );

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const openHit = useCallback((hit: SearchHit) => {
    if (hit.groupId) router.push(`/messages/group/${hit.groupId}`);
    else if (hit.conversationId) router.push(`/messages/${hit.conversationId}`);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <AppIcon icon={icons.back} size={24} color={colors.foreground}  />
        </TouchableOpacity>
        <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
          <AppIcon icon={icons.search} size={18} color={colors.mutedForeground}  />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={title ? `Search in ${title}` : "Search all messages"}
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <AppIcon icon={icons.closeCircle} size={18} color={colors.mutedForeground}  />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading && results.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => openHit(item)}>
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                {item.sender?.avatarUrl ? (
                  <CachedImage source={{ uri: item.sender.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <AppIcon icon={icons.person} size={16} color={colors.mutedForeground}  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  <Text style={[styles.sender, { color: colors.foreground }]} numberOfLines={1}>
                    {item.sender?.username || "Unknown"}
                  </Text>
                  <Text style={[styles.date, { color: colors.mutedForeground }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.snippet, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.text}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: colors.mutedForeground, textAlign: "center" }}>
                {query.trim().length < MIN_QUERY
                  ? `Type at least ${MIN_QUERY} characters to search`
                  : searched
                    ? "No messages found"
                    : ""}
              </Text>
            </View>
          }
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
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, ...Typography.body, paddingVertical: 0 },
  centered: { paddingTop: 80, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 40, height: 40 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  sender: { ...Typography.bodySmall, fontFamily: FontFamily.semibold, flex: 1 },
  date: { fontSize: 11 },
  snippet: { ...Typography.bodySmall, marginTop: 2 },
});

import { View, Text, TextInput, FlatList } from "react-native";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.muted,
            borderRadius: 12,
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              search(t);
            }}
            placeholder="Search users..."
            placeholderTextColor={colors.mutedForeground}
            style={{ flex: 1, marginLeft: 8, color: colors.foreground, fontSize: 15 }}
          />
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          query.length >= 2 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground }}>No results</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.muted,
                marginRight: 12,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }}>
                {item.username}
              </Text>
              {item.displayName && (
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  {item.displayName}
                </Text>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

import { View, Text, TouchableOpacity, Image, FlatList } from "react-native";
import { useEffect, useState } from "react";
import api from "../../api/client";
import { API } from "../../api/endpoints";

// Matches a trailing "@partialname" at the cursor-less end of the text —
// composers here don't track cursor position, so this only triggers
// autocomplete while actively typing a mention at the end of the text,
// which covers the overwhelming majority of real usage.
const MENTION_TRIGGER = /(^|\s)@([a-zA-Z0-9_.]{1,30})$/;

export function useMentionQuery(text: string): string | null {
  const match = text.match(MENTION_TRIGGER);
  return match ? match[2] : null;
}

export function applyMentionSelection(text: string, username: string): string {
  return text.replace(MENTION_TRIGGER, (_m, lead) => `${lead}@${username} `);
}

export function MentionSuggestions({
  query,
  colors,
  onSelect,
}: {
  query: string | null;
  colors: any;
  onSelect: (username: string) => void;
}) {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      api
        .get(`${API.users.search}?q=${encodeURIComponent(query)}`)
        .then(({ data }) => {
          if (active) setResults((data.data || data.users || data || []).slice(0, 6));
        })
        .catch(() => {
          if (active) setResults([]);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  if (!query || results.length === 0) return null;

  return (
    <View
      style={{
        maxHeight: 200,
        backgroundColor: colors.card,
        borderTopWidth: 0.5,
        borderTopColor: colors.border + "40",
      }}
    >
      <FlatList
        data={results}
        keyExtractor={(item) => item.id || item._id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, gap: 10 }}
            onPress={() => onSelect(item.username)}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.muted,
                overflow: "hidden",
              }}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={{ width: 30, height: 30 }} />
              ) : null}
            </View>
            <Text style={{ color: colors.foreground, fontSize: 14 }}>{item.username}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

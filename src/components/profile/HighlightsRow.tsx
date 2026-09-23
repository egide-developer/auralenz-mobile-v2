import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import api from "../../api/client";
import { API } from "../../api/endpoints";
import { FontFamily } from "../../theme/typography";
import type { HighlightSummary } from "../../types";

export function HighlightsRow({ userId, colors }: { userId: string; colors: any }) {
  const [highlights, setHighlights] = useState<HighlightSummary[]>([]);

  useEffect(() => {
    let active = true;
    api
      .get(API.highlights.byUser(userId))
      .then(({ data }) => {
        if (active) setHighlights(data.highlights || []);
      })
      .catch(() => {
        if (active) setHighlights([]);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (highlights.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {highlights.map((h) => (
        <TouchableOpacity
          key={h.id}
          style={styles.item}
          onPress={() => router.push(`/highlight/${h.id}`)}
          activeOpacity={0.8}
        >
          <View style={[styles.circle, { borderColor: colors.border, backgroundColor: colors.muted }]}>
            {h.coverImage ? <Image source={{ uri: h.coverImage }} style={styles.circleImg} /> : null}
          </View>
          <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>
            {h.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 16, paddingVertical: 12 },
  item: { alignItems: "center", width: 64 },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
  circleImg: { width: 60, height: 60 },
  label: { fontSize: 11, fontFamily: FontFamily.medium, marginTop: 4, textAlign: "center" },
});

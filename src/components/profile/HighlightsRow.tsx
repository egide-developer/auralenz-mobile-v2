import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import api from "../../api/client";
import { API } from "../../api/endpoints";
import { CachedImage } from "../ui/CachedImage";
import { FontFamily } from "../../theme/typography";
import { Spacing, Radius, Gap } from "../../theme/spacing";
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
            {h.coverImage ? <CachedImage source={{ uri: h.coverImage }} style={styles.circleImg} /> : null}
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
  row: { paddingHorizontal: Spacing.lg, gap: Gap.lg, paddingVertical: Spacing.md },
  item: { alignItems: "center", width: 64 },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  circleImg: { width: 56, height: 56 },
  label: { fontSize: 13, fontFamily: FontFamily.medium, marginTop: Spacing.xs, textAlign: "center" },
});

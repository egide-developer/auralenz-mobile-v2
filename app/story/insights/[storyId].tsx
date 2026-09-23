import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../../src/stores/themeStore";
import { Colors } from "../../../src/theme/colors";
import { Spacing } from "../../../src/theme/spacing";
import { Typography, FontFamily } from "../../../src/theme/typography";
import api from "../../../src/api/client";
import { API } from "../../../src/api/endpoints";

interface StoryInsights {
  stats: { views: number; reactions: number; replies: number; totalEngagement: number; engagementRate: number };
  topReactions: { emoji: string; count: number }[];
  viewersData: { total: number; list: { username: string; avatarUrl?: string; viewedAt: string }[] };
  timing: { hoursRemaining: number };
}

export default function StoryInsightsScreen() {
  const { storyId } = useLocalSearchParams<{ storyId: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [insights, setInsights] = useState<StoryInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(API.stories.insights(storyId));
        setInsights(data.insights || data);
      } catch {
        setInsights(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [storyId]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="close" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Story insights</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !insights ? (
        <View style={styles.center}>
          <Text style={{ color: colors.mutedForeground }}>Couldn't load insights</Text>
        </View>
      ) : (
        <FlatList
          data={insights.viewersData.list}
          keyExtractor={(item, i) => `${item.username}-${i}`}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatBlock label="Views" value={insights.stats.views} colors={colors} />
              <StatBlock label="Reactions" value={insights.stats.reactions} colors={colors} />
              <StatBlock label="Replies" value={insights.stats.replies} colors={colors} />
              <StatBlock label="Engagement" value={`${insights.stats.engagementRate}%`} colors={colors} />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.viewerRow}
              onPress={() => item.username && router.push(`/profile/${item.username}`)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <Ionicons name="person" size={16} color={colors.mutedForeground} />
                )}
              </View>
              <Text style={[styles.viewerName, { color: colors.foreground }]}>{item.username}</Text>
              <Text style={[styles.viewerTime, { color: colors.mutedForeground }]}>
                {new Date(item.viewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 24 }}>
              No views yet
            </Text>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        />
      )}
    </View>
  );
}

function StatBlock({ label, value, colors }: { label: string; value: number | string; colors: any }) {
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
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
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: FontFamily.semibold, fontSize: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    gap: 12,
    marginBottom: Spacing.lg,
  },
  statBlock: { width: "47%" },
  statValue: { fontFamily: FontFamily.bold, fontSize: 24 },
  statLabel: { ...Typography.caption, marginTop: 2 },
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    gap: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: 36, height: 36 },
  viewerName: { flex: 1, ...Typography.bodySmall, fontFamily: FontFamily.medium },
  viewerTime: { fontSize: 12 },
});

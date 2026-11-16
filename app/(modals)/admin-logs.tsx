import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/themeStore";
import { showToast } from "../../src/stores/toastStore";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { SafeAreaScreen } from "../../src/components/layout";

/** Matches the entries produced by backend/services/logBufferService.js#append. */
interface LogRecord {
  id: number;
  timestamp: string;
  level?: string;
  message?: string;
  module?: string;
  meta?: Record<string, unknown>;
}

export default function AdminLogsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [activeLevel, setActiveLevel] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const levelColor = (level?: string) => {
    switch (level) {
      case "error":
        return colors.destructive;
      case "warn":
        return colors.warning;
      case "debug":
        return colors.mutedForeground;
      default:
        return colors.primary;
    }
  };

  const load = useCallback(
    async (level: string, term: string) => {
      try {
        const { data } = await api.get(API.admin.logs, {
          params: { limit: 300, ...(level ? { level } : {}), ...(term.trim() ? { search: term.trim() } : {}) },
        });
        // The buffer hands back oldest-first; a log viewer wants the most
        // recent line at the top.
        setLogs([...(data.logs || [])].reverse());
        if (Array.isArray(data.levels) && data.levels.length > 0) setLevels(data.levels);
      } catch (e: any) {
        showToast(e?.response?.data?.message || "Could not load logs", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => load(activeLevel, search), 350);
    return () => clearTimeout(timer);
  }, [activeLevel, search, load]);

  const renderLog = ({ item }: { item: LogRecord }) => {
    const accent = levelColor(item.level);
    const expanded = expandedId === item.id;
    const hasMeta = item.meta && Object.keys(item.meta).length > 0;

    return (
      <TouchableOpacity
        activeOpacity={hasMeta ? 0.7 : 1}
        onPress={() => hasMeta && setExpandedId(expanded ? null : item.id)}
        style={[styles.logRow, { backgroundColor: colors.card, borderLeftColor: accent }]}
      >
        <View style={styles.logHeader}>
          <Text style={[styles.level, { color: accent }]}>{(item.level || "info").toUpperCase()}</Text>
          <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
          {item.module ? (
            <Text style={[styles.module, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.module}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.message, { color: colors.foreground }]}>{item.message || "(no message)"}</Text>

        {hasMeta ? (
          expanded ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {JSON.stringify(item.meta, null, 2)}
            </Text>
          ) : (
            <Text style={[styles.metaHint, { color: colors.mutedForeground }]}>Tap to show details</Text>
          )
        ) : null}
      </TouchableOpacity>
    );
  };

  const filterChips = ["", ...levels];

  return (
    <SafeAreaScreen style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>System Logs</Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search messages"
          placeholderTextColor={colors.mutedForeground + "80"}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoCapitalize="none"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {filterChips.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {filterChips.map((level) => {
            const active = activeLevel === level;
            return (
              <TouchableOpacity
                key={level || "all"}
                onPress={() => setActiveLevel(level)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? levelColor(level || undefined) + "22" : colors.card,
                    borderColor: active ? levelColor(level || undefined) : colors.border + "60",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? levelColor(level || undefined) : colors.mutedForeground },
                  ]}
                >
                  {level ? level.toUpperCase() : "ALL"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLog}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(activeLevel, search);
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: colors.mutedForeground }}>
                {search || activeLevel ? "No logs match those filters" : "No logs buffered yet"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: Spacing.md,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: Spacing.base,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: Radius.pill,
  },
  searchInput: { flex: 1, ...Typography.bodySmall, paddingVertical: 0 },
  chipScroll: { maxHeight: 56 },
  chipRow: { paddingHorizontal: Spacing.base, paddingVertical: 12, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  chipText: { fontFamily: FontFamily.semibold, fontSize: 11, letterSpacing: 0.5 },
  centered: { paddingVertical: 60, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: Spacing.base, paddingBottom: 40, gap: 8 },
  logRow: {
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    padding: 10,
    gap: 4,
  },
  logHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  level: { fontFamily: FontFamily.bold, fontSize: 10, letterSpacing: 0.5 },
  timestamp: { fontSize: 10 },
  module: { fontSize: 10, flexShrink: 1 },
  message: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 11, fontFamily: "monospace", marginTop: 4 },
  metaHint: { fontSize: 10, fontStyle: "italic" },
});

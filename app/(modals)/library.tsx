import { View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { LibraryAsset } from "../../src/types";

export default function LibraryScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      const { data } = await api.get(API.library.list);
      setAssets(data.data || data.assets || data);
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAssets(); }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Library</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={assets}
        numColumns={3}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAssets(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="folder" set="light" size={48} color={colors.mutedForeground + "60"} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No media yet</Text>
          </View>
        }
        renderItem={() => (
          <View style={[styles.gridItem, { backgroundColor: colors.muted }]} />
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
    paddingTop: 12,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: { ...Typography.h4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  columnWrapper: { gap: 2, paddingHorizontal: Spacing.lg },
  listContent: { paddingBottom: 20 },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: { ...Typography.body },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    marginBottom: 2,
  },
});

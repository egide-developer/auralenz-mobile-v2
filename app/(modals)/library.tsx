import { View, Text, FlatList, RefreshControl } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { LibraryAsset } from "../../src/types";

export default function LibraryScreen() {
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.foreground }}>Library</Text>
      </View>
      <FlatList data={assets} numColumns={3} keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap: 2, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAssets(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={{ paddingVertical: 60, alignItems: "center" }}><Text style={{ color: colors.mutedForeground }}>No media yet</Text></View>}
        renderItem={() => (
          <View style={{ flex: 1, aspectRatio: 1, backgroundColor: colors.muted, marginBottom: 2 }} />
        )} />
    </View>
  );
}

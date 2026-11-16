import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { LISTING_CATEGORIES } from "../../src/types";
import type {
  MarketplaceListing,
  ListingCategory,
  ListingSellerRef,
} from "../../src/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - GRID_GAP) / 2;

const CATEGORY_FILTERS: (ListingCategory | "All")[] = ["All", ...LISTING_CATEGORIES];

function resolveSeller(listing: MarketplaceListing): ListingSellerRef {
  return typeof listing.seller === "string"
    ? { id: listing.seller, username: "Unknown seller" }
    : listing.seller;
}

export default function MarketplaceModal() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [mine, setMine] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [category, setCategory] = useState<ListingCategory | "All">("All");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [draftCategory, setDraftCategory] = useState<ListingCategory>("Art");

  const fetchAll = useCallback(async () => {
    try {
      const [browseRes, mineRes] = await Promise.all([
        api.get(API.marketplace.list),
        api.get(API.marketplace.mine),
      ]);
      setListings(browseRes.data.listings || browseRes.data.data || []);
      setMine(mineRes.data.listings || mineRes.data.data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const visible = useMemo(() => {
    const base = tab === "mine" ? mine : listings;
    if (tab !== "browse" || category === "All") return base;
    return base.filter((l) => l.category === category);
  }, [tab, listings, mine, category]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [fetchAll]);

  const openListing = useCallback((id: string) => {
    router.push({ pathname: "/marketplace/[id]", params: { id } });
  }, []);

  const confirmRemove = useCallback((id: string) => {
    Alert.alert("Remove listing", "Remove this listing from the marketplace?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(API.marketplace.remove(id));
            fetchAll();
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.message || "Could not remove listing");
          }
        },
      },
    ]);
  }, [fetchAll]);

  const publish = useCallback(async () => {
    const parsed = Number(price);
    if (!title.trim()) return;
    if (!Number.isInteger(parsed) || parsed < 1) {
      Alert.alert("Invalid price", "Price must be a whole number of at least 1 Star");
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post(API.marketplace.create, {
        title: title.trim(),
        description: description.trim(),
        images: [],
        priceStars: parsed,
        category: draftCategory,
      });
      const created = data.listing || data.data;
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setPrice("");
      fetchAll();
      if (created?.id) openListing(created.id);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Could not publish listing");
    } finally {
      setCreating(false);
    }
  }, [title, description, price, draftCategory, fetchAll, openListing]);

  const renderListing = useCallback(
    ({ item }: { item: MarketplaceListing }) => {
      const image = item.images?.[0];
      const sold = item.status === "sold";
      return (
        <PressableScale
          scaleTo={0.97}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => openListing(item.id)}
        >
          <View style={styles.imageWrap}>
            {image ? (
              <CachedImage source={{ uri: image }} style={styles.image} contentFit="cover" />
            ) : (
              <View style={[styles.image, { backgroundColor: colors.muted }]} />
            )}
            {sold && (
              <View style={[styles.soldBadge, { backgroundColor: colors.destructive }]}>
                <Text style={[styles.soldText, { color: colors.destructiveForeground }]}>Sold</Text>
              </View>
            )}
            {item.isMine && tab === "mine" && (
              <TouchableOpacity
                style={[styles.cardDelete, { backgroundColor: colors.background + "CC" }]}
                onPress={() => confirmRemove(item.id)}
                hitSlop={8}
                accessibilityLabel="Remove listing"
              >
                <Ionicons name="trash-outline" size={15} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.cardPriceRow}>
              <Icon name="star" set="bold" size={13} color={colors.primary} />
              <Text style={[styles.cardPrice, { color: colors.foreground }]}>{item.priceStars}</Text>
            </View>
            <Text style={[styles.cardSeller, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.isMine ? "You" : resolveSeller(item).username}
            </Text>
          </View>
        </PressableScale>
      );
    },
    [colors, openListing, tab, confirmRemove]
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Marketplace</Text>
        <TouchableOpacity
          onPress={() => setCreateOpen((v) => !v)}
          hitSlop={10}
          style={styles.headerBtn}
          accessibilityLabel="Sell an item"
        >
          <Ionicons
            name={createOpen ? "close-circle-outline" : "add-circle-outline"}
            size={22}
            color={createOpen ? colors.destructive : colors.foreground}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(["browse", "mine"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              tab === t && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: tab === t ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {t === "browse" ? "Browse" : "My listings"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "browse" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroller}
          contentContainerStyle={styles.chips}
        >
          {CATEGORY_FILTERS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategory(c)}
              style={[
                styles.chip,
                {
                  borderColor: category === c ? colors.primary : colors.border,
                  backgroundColor: category === c ? colors.primary + "12" : "transparent",
                },
              ]}
            >
              <Text
                style={[styles.chipText, { color: category === c ? colors.primary : colors.mutedForeground }]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {createOpen && (
          <View style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>Sell something</Text>
            <Text style={[styles.createSub, { color: colors.mutedForeground }]}>
              List an item and get paid in Stars.
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Item title"
              placeholderTextColor={colors.mutedForeground + "80"}
              maxLength={80}
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground }]}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the item (optional)"
              placeholderTextColor={colors.mutedForeground + "80"}
              maxLength={1000}
              multiline
              style={[
                styles.input,
                { backgroundColor: colors.background, color: colors.foreground, minHeight: 68, textAlignVertical: "top" },
              ]}
            />
            <View style={[styles.priceInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Icon name="star" set="bold" size={16} color={colors.primary} />
              <TextInput
                value={price}
                onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ""))}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground + "60"}
                keyboardType="number-pad"
                style={[styles.priceInput, { color: colors.foreground }]}
              />
              <Text style={[styles.priceSuffix, { color: colors.mutedForeground }]}>Stars</Text>
            </View>
            <View style={styles.chips}>
              {LISTING_CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setDraftCategory(c)}
                  style={[
                    styles.chip,
                    {
                      borderColor: draftCategory === c ? colors.primary : colors.border,
                      backgroundColor: draftCategory === c ? colors.primary + "12" : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: draftCategory === c ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.createActions}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={() => setCreateOpen(false)}>
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={publish}
                disabled={creating || !title.trim() || !(Number(price) >= 1)}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Publish listing</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading && !refreshing ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            numColumns={2}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={{ gap: GRID_GAP }}
            ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="storefront-outline" size={44} color={colors.mutedForeground + "60"} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {tab === "mine" ? "No listings yet" : "No listings found"}
                </Text>
                {tab === "mine" && (
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                    List something and earn Stars when it sells.
                  </Text>
                )}
              </View>
            }
            renderItem={renderListing}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h3, flex: 1, textAlign: "center" },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: 1, borderColor: "transparent" },
  tabText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  chipScroller: { flexGrow: 0 },
  chips: { flexDirection: "row", gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1 },
  chipText: { ...Typography.caption },
  createCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 10,
  },
  createTitle: { ...Typography.h4 },
  createSub: { ...Typography.caption },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, ...Typography.body },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
  },
  priceInput: { flex: 1, ...Typography.body, paddingVertical: 0 },
  priceSuffix: { ...Typography.bodySmall },
  createActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 2 },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1 },
  secondaryBtnText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  primaryBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: Radius.pill, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
  gridContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 32 },
  card: { width: CARD_WIDTH, borderRadius: Radius.lg, borderWidth: 1, overflow: "hidden" },
  imageWrap: { width: "100%", aspectRatio: 1, position: "relative" },
  image: { width: "100%", height: "100%" },
  soldBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  soldText: { ...Typography.caption, fontFamily: FontFamily.semibold },
  cardDelete: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { padding: Spacing.sm, gap: 4 },
  cardTitle: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  cardPriceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardPrice: { ...Typography.bodySmall, fontFamily: FontFamily.bold },
  cardSeller: { ...Typography.caption },
  emptyState: { paddingVertical: 60, alignItems: "center", gap: 8 },
  emptyTitle: { ...Typography.body, fontFamily: FontFamily.semibold },
  emptySub: { ...Typography.caption, textAlign: "center", paddingHorizontal: Spacing.lg },
});
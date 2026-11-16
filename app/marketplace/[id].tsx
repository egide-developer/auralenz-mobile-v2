import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Icon } from "../../src/components/ui/Icon";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
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

function resolveSeller(listing: MarketplaceListing): ListingSellerRef {
  return typeof listing.seller === "string"
    ? { id: listing.seller, username: "Unknown seller" }
    : listing.seller;
}

export default function MarketplaceListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [buying, setBuying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState<ListingCategory>("Other");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get(API.marketplace.byId(id));
      setListing(data.listing || data.data || null);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        Alert.alert("Not found", "This listing no longer exists");
        router.back();
      }
      setListing(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const seller = listing ? resolveSeller(listing) : null;
  const images = listing?.images || [];
  const isActive = listing?.status === "active";
  const canBuy = !!listing && isActive && !listing.isMine;
  const sellerUsername = listing?.isMine
    ? currentUser?.username || seller?.username || ""
    : seller?.username || "";

  const openSeller = useCallback(() => {
    if (!sellerUsername) return;
    router.push(`/profile/${sellerUsername}`);
  }, [sellerUsername]);

  const startEdit = useCallback(() => {
    if (!listing) return;
    setEditTitle(listing.title || "");
    setEditDescription(listing.description || "");
    setEditPrice(String(listing.priceStars || ""));
    setEditCategory(listing.category);
    setEditing(true);
  }, [listing]);

  const saveEdit = useCallback(async () => {
    if (!listing) return;
    const parsed = Number(editPrice);
    if (!Number.isInteger(parsed) || parsed < 1) {
      Alert.alert("Invalid price", "Price must be a whole number of at least 1 Star");
      return;
    }
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.patch(API.marketplace.update(id), {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priceStars: parsed,
        category: editCategory,
      });
      const updated = data.listing || data.data;
      setListing(
        updated
          ? { ...listing, ...updated }
          : { ...listing, title: editTitle.trim(), description: editDescription.trim(), priceStars: parsed, category: editCategory }
      );
      setEditing(false);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Could not update listing");
    } finally {
      setSaving(false);
    }
  }, [id, listing, editTitle, editDescription, editPrice, editCategory]);

  const buy = useCallback(async () => {
    if (!listing || buying) return;
    setBuying(true);
    try {
      const { data } = await api.post(API.marketplace.buy(id));
      const updated = data.listing || data.data;
      setListing((prev) => (prev ? { ...prev, ...updated } : prev));
      if (typeof data.senderBalance === "number") {
        Alert.alert("Purchase complete", `You now have ${data.senderBalance} Stars left.`);
      } else {
        Alert.alert("Purchase complete", "The item is yours.");
      }
    } catch (e: any) {
      if (e?.response?.status === 402) {
        Alert.alert(
          "Insufficient Stars",
          e?.response?.data?.message || "You don't have enough Stars for this purchase."
        );
      } else {
        Alert.alert("Error", e?.response?.data?.message || "Could not complete the purchase.");
      }
    } finally {
      setBuying(false);
    }
  }, [id, listing, buying]);

  const confirmRemove = useCallback(() => {
    Alert.alert("Remove listing", "Remove this listing from the marketplace? This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setRemoving(true);
          try {
            await api.delete(API.marketplace.remove(id));
            router.back();
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.message || "Could not remove listing");
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background, gap: 12 }]}>
        <Text style={{ color: colors.foreground }}>Listing not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontFamily: FontFamily.semibold }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const soldDate = listing.soldAt || listing.createdAt;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {listing.isMine ? "Your listing" : "Listing"}
        </Text>
        <View style={styles.headerActions}>
          {listing.isMine && (
            <>
              <TouchableOpacity
                onPress={editing ? saveEdit : startEdit}
                hitSlop={10}
                style={styles.headerBtn}
                disabled={saving}
                accessibilityLabel="Edit listing"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.editText, { color: colors.primary }]}>{editing ? "Save" : "Edit"}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmRemove}
                hitSlop={10}
                style={styles.headerBtn}
                accessibilityLabel="Remove listing"
              >
                {removing ? (
                  <ActivityIndicator size="small" color={colors.destructive} />
                ) : (
                  <Ionicons name="trash-outline" size={21} color={colors.destructive} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, canBuy && styles.scrollContentWithBar]}
          keyboardShouldPersistTaps="handled"
        >
          {images.length > 1 ? (
            <View style={[styles.mediaWrap, { backgroundColor: colors.muted }]}>
              <FlatList
                data={images}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(uri, i) => `${uri}-${i}`}
                renderItem={({ item }) => (
                  <CachedImage source={{ uri: item }} style={styles.pageImage} contentFit="cover" />
                )}
                onMomentumScrollEnd={(e) =>
                  setImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
                }
              />
              <View style={styles.dots}>
                {images.map((uri, i) => (
                  <View
                    key={`${uri}-${i}`}
                    style={[
                      styles.dot,
                      { backgroundColor: i === imageIndex ? colors.primary : colors.mutedForeground + "55" },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={[styles.mediaWrap, { backgroundColor: colors.muted }]}>
              {images[0] ? (
                <CachedImage source={{ uri: images[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Ionicons name="image-outline" size={40} color={colors.mutedForeground + "60"} />
                </View>
              )}
            </View>
          )}

          <View style={styles.body}>
            <View style={styles.sellerRow}>
              <TouchableOpacity onPress={openSeller} style={styles.sellerTouch} activeOpacity={0.7}>
                <View style={[styles.sellerAvatar, { backgroundColor: colors.muted }]}>
                  {seller?.avatarUrl ? (
                    <CachedImage source={{ uri: seller.avatarUrl }} style={styles.sellerAvatarImg} />
                  ) : (
                    <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
                  )}
                </View>
                <Text style={[styles.sellerName, { color: colors.foreground }]}>
                  {listing.isMine ? "You" : seller?.username}
                </Text>
              </TouchableOpacity>
            </View>

            {editing ? (
              <View style={styles.editForm}>
                <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Title</Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Item title"
                  placeholderTextColor={colors.mutedForeground + "80"}
                  maxLength={80}
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                />
                <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Description</Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Describe the item (optional)"
                  placeholderTextColor={colors.mutedForeground + "80"}
                  maxLength={1000}
                  multiline
                  style={[
                    styles.input,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, minHeight: 80, textAlignVertical: "top" },
                  ]}
                />
                <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Price</Text>
                <View style={[styles.priceInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Icon name="star" set="bold" size={16} color={colors.primary} />
                  <TextInput
                    value={editPrice}
                    onChangeText={(t) => setEditPrice(t.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground + "60"}
                    keyboardType="number-pad"
                    style={[styles.priceInput, { color: colors.foreground }]}
                  />
                  <Text style={[styles.priceSuffix, { color: colors.mutedForeground }]}>Stars</Text>
                </View>
                <Text style={[styles.editLabel, { color: colors.mutedForeground }]}>Category</Text>
                <View style={styles.chips}>
                  {LISTING_CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setEditCategory(c)}
                      style={[
                        styles.chip,
                        {
                          borderColor: editCategory === c ? colors.primary : colors.border,
                          backgroundColor: editCategory === c ? colors.primary + "12" : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: editCategory === c ? colors.primary : colors.mutedForeground },
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.foreground }]}>{listing.title}</Text>
                {listing.status === "sold" ? (
                  <Text style={[styles.statusText, { color: colors.success }]} numberOfLines={1}>
                    Sold{listing.buyer?.username ? ` to ${listing.buyer.username}` : ""} ·{" "}
                    {new Date(soldDate).toLocaleDateString()}
                  </Text>
                ) : listing.status === "removed" ? (
                  <Text style={[styles.statusText, { color: colors.destructive }]}>Removed</Text>
                ) : (
                  <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
                )}
                <View style={styles.metaRow}>
                  <View style={styles.priceRow}>
                    <Icon name="star" set="bold" size={18} color={colors.primary} />
                    <Text style={[styles.priceText, { color: colors.foreground }]}>
                      {listing.priceStars} Stars
                    </Text>
                  </View>
                  <View style={[styles.categoryChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                    <Text style={[styles.categoryText, { color: colors.mutedForeground }]}>
                      {listing.category}
                    </Text>
                  </View>
                </View>
                {listing.description ? (
                  <Text style={[styles.description, { color: colors.foreground }]}>
                    {listing.description}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {canBuy && (
        <View style={[styles.bottomBar, { borderTopColor: colors.border + "40", backgroundColor: colors.background }]}>
          <PressableScale
            onPress={buy}
            scaleTo={0.98}
            style={[styles.buyBtn, { backgroundColor: colors.primary }]}
            disabled={buying}
          >
            {buying ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <View style={styles.buyBtnInner}>
                <Icon name="star" set="bold" size={18} color={colors.primaryForeground} />
                <Text style={[styles.buyBtnText, { color: colors.primaryForeground }]}>
                  Buy for {listing.priceStars} Stars
                </Text>
              </View>
            )}
          </PressableScale>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4, flex: 1, textAlign: "center", paddingHorizontal: 8 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  editText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  mediaWrap: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, position: "relative" },
  pageImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  dots: { position: "absolute", bottom: 12, flexDirection: "row", alignSelf: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  mediaPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 40 },
  scrollContentWithBar: { paddingBottom: 140 },
  body: { padding: Spacing.lg, gap: 12 },
  sellerRow: { flexDirection: "row", alignItems: "center" },
  sellerTouch: { flexDirection: "row", alignItems: "center", gap: 10 },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sellerAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  sellerName: { ...Typography.body, fontFamily: FontFamily.semibold },
  title: { ...Typography.h3 },
  statusText: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  priceText: { ...Typography.h4, fontFamily: FontFamily.bold },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  categoryText: { ...Typography.caption, fontFamily: FontFamily.semibold },
  description: { ...Typography.body, lineHeight: 22 },
  editForm: { gap: 8 },
  editLabel: { ...Typography.caption, fontFamily: FontFamily.semibold, marginTop: 2 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Typography.body,
  },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1 },
  chipText: { ...Typography.caption },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "center",
    padding: Spacing.md,
    borderTopWidth: 0.5,
  },
  buyBtn: {
    flex: 1,
    maxWidth: 420,
    paddingVertical: 13,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buyBtnText: { ...Typography.body, fontFamily: FontFamily.semibold },
});
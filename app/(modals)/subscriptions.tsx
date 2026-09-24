import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";

import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { Icon } from "../../src/components/ui/Icon";
import { showToast } from "../../src/stores/toastStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { FontFamily, Typography } from "../../src/theme/typography";

interface Person {
  _id: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
}

interface Sub {
  _id: string;
  creator?: Person;
  subscriber?: Person;
  priceStars: number;
  status: "active" | "cancelled" | "expired";
  currentPeriodEnd: string;
  isActive?: boolean;
}

type Tab = "subscribed" | "earning";

export default function SubscriptionsScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [tab, setTab] = useState<Tab>("subscribed");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<Sub[]>([]);
  const [subscribers, setSubscribers] = useState<Sub[]>([]);
  const [monthlyStars, setMonthlyStars] = useState(0);

  const [enabled, setEnabled] = useState(false);
  const [price, setPrice] = useState("100");
  const [savingSettings, setSavingSettings] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [subsRes, subscribersRes, walletRes] = await Promise.all([
        api.get(API.monetization.subscriptions),
        api.get(API.monetization.subscribers),
        api.get(API.monetization.wallet),
      ]);
      setMine(subsRes.data.subscriptions || []);
      setSubscribers(subscribersRes.data.subscribers || []);
      setMonthlyStars(subscribersRes.data.monthlyStars || 0);
      setEnabled(Boolean(walletRes.data.wallet?.subscriptionsEnabled));
      setPrice(String(walletRes.data.wallet?.subscriptionPriceStars ?? 100));
    } catch {
      showToast("Couldn't load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(
    async (next: { subscriptionsEnabled?: boolean; subscriptionPriceStars?: number }) => {
      setSavingSettings(true);
      try {
        const { data } = await api.patch(API.monetization.creatorSettings, next);
        setEnabled(data.subscriptionsEnabled);
        setPrice(String(data.subscriptionPriceStars));
        showToast("Saved", "success");
      } catch (error: any) {
        showToast(error?.response?.data?.message || "Couldn't save", "error");
        // Put the toggle back where the server still has it.
        load();
      } finally {
        setSavingSettings(false);
      }
    },
    [load]
  );

  const commitPrice = useCallback(() => {
    const parsed = Number(price);
    if (!Number.isInteger(parsed) || parsed < 1) {
      showToast("Price must be a whole number of at least 1 Star", "error");
      return;
    }
    saveSettings({ subscriptionPriceStars: parsed });
  }, [price, saveSettings]);

  const cancel = useCallback(
    (sub: Sub) => {
      Alert.alert(
        "Cancel subscription?",
        `You'll keep access to ${sub.creator?.username ?? "this creator"} until ${new Date(
          sub.currentPeriodEnd
        ).toLocaleDateString()}. It won't renew after that.`,
        [
          { text: "Keep it", style: "cancel" },
          {
            text: "Cancel subscription",
            style: "destructive",
            onPress: async () => {
              setCancelling(sub._id);
              try {
                await api.post(API.monetization.cancelSubscription(sub._id));
                showToast("Subscription cancelled", "success");
                load();
              } catch (error: any) {
                showToast(error?.response?.data?.message || "Couldn't cancel", "error");
              } finally {
                setCancelling(null);
              }
            },
          },
        ]
      );
    },
    [load]
  );

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ marginRight: Spacing.md }}>
          <Icon name="arrow-left" set="light" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Subscriptions</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card }]}>
        {(["subscribed", "earning"] as Tab[]).map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => setTab(value)}
            style={[styles.tab, tab === value && { backgroundColor: colors.background }]}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: tab === value ? colors.foreground : colors.mutedForeground },
              ]}
            >
              {value === "subscribed" ? "Subscribed" : "Earning"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {tab === "subscribed" ? (
          mine.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="ticket" set="light" size={40} color={colors.mutedForeground} />
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                You're not subscribed to anyone yet. Open a creator's profile to subscribe.
              </Text>
            </View>
          ) : (
            mine.map((sub) => (
              <View key={sub._id} style={[styles.row, { backgroundColor: colors.card }]}>
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  {sub.creator?.avatarUrl ? (
                    <CachedImage source={{ uri: sub.creator.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                    {sub.creator?.username ?? "Unknown"}
                  </Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {sub.priceStars} Stars / month ·{" "}
                    {sub.status === "cancelled"
                      ? `ends ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                      : `renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                  </Text>
                </View>
                {sub.status === "active" ? (
                  <TouchableOpacity onPress={() => cancel(sub)} disabled={cancelling === sub._id}>
                    {cancelling === sub._id ? (
                      <ActivityIndicator size="small" color={colors.destructive} />
                    ) : (
                      <Text style={[styles.action, { color: colors.destructive }]}>Cancel</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>Cancelled</Text>
                )}
              </View>
            ))
          )
        ) : (
          <>
            <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingTitle, { color: colors.foreground }]}>
                    Let people subscribe to me
                  </Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    Subscribers pay Stars monthly for access to your subscriber-only posts.
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  disabled={savingSettings}
                  onValueChange={(value) => {
                    setEnabled(value);
                    saveSettings({ subscriptionsEnabled: value });
                  }}
                  trackColor={{ true: colors.primary, false: colors.muted }}
                />
              </View>

              <View style={[styles.priceRow, { borderTopColor: colors.border + "40" }]}>
                <Text style={[styles.settingTitle, { color: colors.foreground }]}>Monthly price</Text>
                <View style={styles.priceInputWrap}>
                  <Icon name="star" set="bold" size={16} color={colors.primary} />
                  <TextInput
                    value={price}
                    onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ""))}
                    onBlur={commitPrice}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={commitPrice}
                    style={[styles.priceInput, { color: colors.foreground, borderColor: colors.border }]}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.earningCard, { backgroundColor: colors.card }]}>
              <View style={styles.earningStat}>
                <Text style={[styles.earningValue, { color: colors.foreground }]}>{subscribers.length}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>Subscribers</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.earningStat}>
                <Text style={[styles.earningValue, { color: colors.foreground }]}>{monthlyStars}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>Stars / month</Text>
              </View>
            </View>

            {subscribers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                  No subscribers yet.
                </Text>
              </View>
            ) : (
              subscribers.map((sub) => (
                <View key={sub._id} style={[styles.row, { backgroundColor: colors.card }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                    {sub.subscriber?.avatarUrl ? (
                      <CachedImage source={{ uri: sub.subscriber.avatarUrl }} style={styles.avatarImg} />
                    ) : (
                      <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                      {sub.subscriber?.username ?? "Unknown"}
                    </Text>
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                      {sub.priceStars} Stars · until {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 20 },
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.base,
    padding: Spacing.xs,
    borderRadius: Radius.pill,
    marginBottom: Spacing.base,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.pill, alignItems: "center" },
  tabLabel: { fontFamily: FontFamily.semibold, fontSize: 14 },
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 40, height: 40 },
  name: { ...Typography.body, fontFamily: FontFamily.semibold },
  meta: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  action: { fontFamily: FontFamily.semibold, fontSize: 14 },
  emptyBox: { alignItems: "center", paddingVertical: Spacing.xxxl, gap: Spacing.md },
  empty: { ...Typography.bodySmall, textAlign: "center", paddingHorizontal: Spacing.xl },
  settingsCard: { borderRadius: Radius.lg, padding: Spacing.base },
  settingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  settingTitle: { ...Typography.body, fontFamily: FontFamily.semibold },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
  },
  priceInputWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  priceInput: {
    minWidth: 80,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textAlign: "right",
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  earningCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  earningStat: { alignItems: "center" },
  earningValue: { fontFamily: FontFamily.bold, fontSize: 24 },
  statDivider: { width: 1, height: 32 },
});

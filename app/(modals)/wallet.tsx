import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";

import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { Icon } from "../../src/components/ui/Icon";
import { useAuthStore } from "../../src/stores/authStore";
import { showToast } from "../../src/stores/toastStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { FontFamily, Typography } from "../../src/theme/typography";

interface StarPack {
  id: string;
  stars: number;
  priceLabel: string;
}

interface Party {
  _id?: string;
  username?: string;
}

interface Transaction {
  _id: string;
  kind: "purchase" | "tip" | "subscription" | "payout" | "refund" | "reversal";
  from?: Party | null;
  to?: Party | null;
  amount: number;
  status: "completed" | "failed";
  note?: string;
  createdAt: string;
}

interface WalletState {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  subscriptionsEnabled: boolean;
  subscriptionPriceStars: number;
}

// Kept in sync with the server's Transaction.kind enum.
const KIND_ICON: Record<Transaction["kind"], string> = {
  purchase: "buy",
  tip: "heart",
  subscription: "ticket",
  payout: "bank-card",
  refund: "swap",
  reversal: "swap",
};

function describe(tx: Transaction, meId?: string) {
  const incoming = tx.to?._id === meId;
  switch (tx.kind) {
    case "purchase":
      return "Bought Stars";
    case "tip":
      return incoming ? `Tip from ${tx.from?.username ?? "someone"}` : `Tip to ${tx.to?.username ?? "someone"}`;
    case "subscription":
      return incoming
        ? `Subscription from ${tx.from?.username ?? "someone"}`
        : `Subscribed to ${tx.to?.username ?? "someone"}`;
    case "payout":
      return "Payout";
    default:
      return tx.kind === "refund" ? "Refund" : "Reversal";
  }
}

export default function WalletScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const user = useAuthStore((s) => s.user);

  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [packs, setPacks] = useState<StarPack[]>([]);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [simulated, setSimulated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [walletRes, packsRes] = await Promise.all([
        api.get(API.monetization.wallet),
        api.get(API.monetization.packs),
      ]);
      setWallet(walletRes.data.wallet);
      setRecent(walletRes.data.recent || []);
      setPacks(packsRes.data.packs || []);
      // The server owns this flag. If it ever reports real payments, the
      // warning banner disappears on its own.
      setSimulated(Boolean(walletRes.data.paymentsAreSimulated));
    } catch {
      showToast("Couldn't load your wallet", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = useCallback(
    async (pack: StarPack) => {
      if (buying) return;
      setBuying(pack.id);
      try {
        // A fresh key per tap, so a retry after a dropped response cannot
        // grant the pack twice on the server.
        const idempotencyKey = `${pack.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const { data } = await api.post(API.monetization.purchase, {
          packId: pack.id,
          idempotencyKey,
        });
        setWallet((prev) => (prev ? { ...prev, balance: data.balance } : prev));
        showToast(
          data.alreadyProcessed
            ? "That purchase was already applied"
            : `${pack.stars} Stars added (no payment taken)`,
          "success"
        );
        load();
      } catch (error: any) {
        showToast(error?.response?.data?.message || "Purchase failed", "error");
      } finally {
        setBuying(null);
      }
    },
    [buying, load]
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Wallet & Stars</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
          />
        }
      >
        {/* Not decorative. Stars here cost nothing, and the person using this
            needs to know that before they think they have spent money. */}
        {simulated ? (
          <View style={[styles.notice, { backgroundColor: colors.warning + "1A", borderColor: colors.warning + "66" }]}>
            <Icon name="danger-circle" set="bold" size={20} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: colors.warning }]}>No real payments</Text>
              <Text style={[styles.noticeBody, { color: colors.mutedForeground }]}>
                Payments are not connected yet. Tapping a pack adds Stars to your balance for free — your card is
                never charged and nothing is billed.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <Icon name="star" set="bold" size={32} color={colors.primary} />
          <Text style={[styles.balance, { color: colors.foreground }]}>{wallet?.balance ?? 0}</Text>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>Stars available</Text>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{wallet?.lifetimeEarned ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Earned</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{wallet?.lifetimeSpent ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Spent</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {simulated ? "Get Stars (free)" : "Buy Stars"}
        </Text>
        <View style={styles.packGrid}>
          {packs.map((pack) => (
            <TouchableOpacity
              key={pack.id}
              onPress={() => buy(pack)}
              disabled={buying !== null}
              style={[
                styles.pack,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: buying && buying !== pack.id ? 0.5 : 1 },
              ]}
            >
              {buying === pack.id ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Icon name="star" set="bold" size={22} color={colors.primary} />
                  <Text style={[styles.packStars, { color: colors.foreground }]}>{pack.stars}</Text>
                  {/* The list price is shown struck through while payments are
                      stubbed, so the number can't read as a charge. */}
                  <Text
                    style={[
                      styles.packPrice,
                      { color: colors.mutedForeground },
                      simulated && styles.packPriceVoided,
                    ]}
                  >
                    {pack.priceLabel}
                  </Text>
                  {simulated ? (
                    <Text style={[styles.packFree, { color: colors.success }]}>Free</Text>
                  ) : null}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(modals)/subscriptions")}
          style={[styles.linkRow, { backgroundColor: colors.card }]}
        >
          <Icon name="ticket" set="light" size={22} color={colors.foreground} />
          <Text style={[styles.linkLabel, { color: colors.foreground }]}>Subscriptions & earnings</Text>
          <Icon name="arrow-right" set="light" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent activity</Text>
        {recent.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>Nothing yet</Text>
        ) : (
          recent.map((tx) => {
            const incoming = tx.to?._id === user?.id;
            return (
              <View key={tx._id} style={[styles.txRow, { borderBottomColor: colors.border + "40" }]}>
                <View style={[styles.txIcon, { backgroundColor: colors.muted }]}>
                  <Icon name={KIND_ICON[tx.kind] ?? "swap"} set="light" size={18} color={colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txLabel, { color: colors.foreground }]} numberOfLines={1}>
                    {describe(tx, user?.id)}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[styles.txAmount, { color: incoming ? colors.success : colors.mutedForeground }]}
                >
                  {incoming ? "+" : "−"}
                  {tx.amount}
                </Text>
              </View>
            );
          })
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
  content: { paddingHorizontal: Spacing.base, paddingBottom: Spacing["4xl"] },
  notice: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  noticeTitle: { fontFamily: FontFamily.semibold, fontSize: 14, marginBottom: 2 },
  noticeBody: { ...Typography.bodySmall, lineHeight: 18 },
  balanceCard: {
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: Radius["2xl"],
    marginBottom: Spacing.xl,
  },
  balance: { fontFamily: FontFamily.bold, fontSize: 40, marginTop: Spacing.sm },
  balanceLabel: { ...Typography.bodySmall },
  statRow: { flexDirection: "row", alignItems: "center", marginTop: Spacing.lg },
  stat: { alignItems: "center", paddingHorizontal: Spacing.xl },
  statDivider: { width: 1, height: 28 },
  statValue: { fontFamily: FontFamily.semibold, fontSize: 16 },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  packGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginBottom: Spacing.xl },
  pack: {
    flexGrow: 1,
    flexBasis: "45%",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: "center",
  },
  packStars: { fontFamily: FontFamily.bold, fontSize: 20, marginTop: Spacing.xs },
  packPrice: { ...Typography.bodySmall },
  packPriceVoided: { textDecorationLine: "line-through" },
  packFree: { fontFamily: FontFamily.semibold, fontSize: 12, marginTop: 2 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
  },
  linkLabel: { flex: 1, ...Typography.body },
  empty: { ...Typography.bodySmall, paddingVertical: Spacing.xl, textAlign: "center" },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  txLabel: { ...Typography.bodySmall, fontFamily: FontFamily.medium },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontFamily: FontFamily.semibold, fontSize: 15 },
});

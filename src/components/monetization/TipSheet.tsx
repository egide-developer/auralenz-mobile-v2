import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";

import api from "../../api/client";
import { API } from "../../api/endpoints";
import { Icon } from "../ui/Icon";
import { showToast } from "../../stores/toastStore";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Spacing, Radius } from "../../theme/spacing";
import { FontFamily, Typography } from "../../theme/typography";

const PRESETS = [10, 50, 100, 500];

interface TipSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Who receives the Stars. */
  recipientId: string;
  recipientUsername?: string;
  /** Optional post the tip is attached to, recorded on the ledger row. */
  postId?: string;
  /** Fired after the server confirms, with the amount sent. */
  onTipped?: (amount: number) => void;
}

export function TipSheet({
  visible,
  onClose,
  recipientId,
  recipientUsername,
  postId,
  onTipped,
}: TipSheetProps) {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [amount, setAmount] = useState<number>(50);
  const [custom, setCustom] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  // Balance is fetched each time the sheet opens rather than cached, so the
  // number shown next to a spend decision is never stale.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setCustom("");
    setAmount(50);
    api
      .get(API.monetization.wallet)
      .then(({ data }) => {
        if (!cancelled) setBalance(data.wallet?.balance ?? 0);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const effective = custom ? Number(custom) : amount;
  const valid = Number.isInteger(effective) && effective >= 1;
  const affordable = balance === null || effective <= balance;

  const send = useCallback(async () => {
    if (!valid || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(API.monetization.tip, {
        userId: recipientId,
        amount: effective,
        postId,
      });
      setBalance(data.balance);
      showToast(`Sent ${effective} Stars`, "success");
      onTipped?.(effective);
      onClose();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Couldn't send tip";
      showToast(message, "error");
      // Refresh from the server on a rejection — the most common cause is a
      // balance that moved since the sheet opened.
      if (error?.response?.data?.code === "INSUFFICIENT_STARS") {
        api
          .get(API.monetization.wallet)
          .then(({ data }) => setBalance(data.wallet?.balance ?? 0))
          .catch(() => {});
      }
    } finally {
      setSending(false);
    }
  }, [valid, sending, recipientId, effective, postId, onTipped, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Swallow taps inside the sheet so they don't dismiss it. */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.background }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={styles.titleRow}>
            <Icon name="star" set="bold" size={22} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Send Stars {recipientUsername ? `to ${recipientUsername}` : ""}
            </Text>
          </View>

          <Text style={[styles.balance, { color: colors.mutedForeground }]}>
            {balance === null ? "Balance unavailable" : `You have ${balance} Stars`}
          </Text>

          <View style={styles.presets}>
            {PRESETS.map((value) => {
              const selected = !custom && amount === value;
              return (
                <TouchableOpacity
                  key={value}
                  onPress={() => {
                    setCustom("");
                    setAmount(value);
                  }}
                  style={[
                    styles.preset,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetLabel,
                      { color: selected ? colors.primaryForeground ?? "#FFFFFF" : colors.foreground },
                    ]}
                  >
                    {value}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.customRow, { borderColor: colors.border }]}>
            <Icon name="star" set="light" size={18} color={colors.mutedForeground} />
            <TextInput
              value={custom}
              onChangeText={(text) => setCustom(text.replace(/[^0-9]/g, ""))}
              placeholder="Custom amount"
              placeholderTextColor={colors.mutedForeground + "80"}
              keyboardType="number-pad"
              style={[styles.customInput, { color: colors.foreground }]}
            />
          </View>

          {!affordable ? (
            <View style={styles.shortfall}>
              <Text style={[styles.shortfallText, { color: colors.destructive }]}>
                That's more than you have.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  router.push("/(modals)/wallet");
                }}
              >
                <Text style={[styles.shortfallLink, { color: colors.primary }]}>Get more Stars</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={send}
            disabled={!valid || !affordable || sending}
            style={[
              styles.send,
              {
                backgroundColor: colors.primary,
                opacity: !valid || !affordable || sending ? 0.5 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator color={colors.primaryForeground ?? "#FFFFFF"} />
            ) : (
              <Text style={[styles.sendLabel, { color: colors.primaryForeground ?? "#FFFFFF" }]}>
                Send {valid ? effective : ""} Stars
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancel}>
            <Text style={[styles.cancelLabel, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  title: { fontFamily: FontFamily.bold, fontSize: 18, flex: 1 },
  balance: { ...Typography.bodySmall, marginTop: Spacing.xs, marginBottom: Spacing.lg },
  presets: { flexDirection: "row", gap: Spacing.sm },
  preset: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  presetLabel: { fontFamily: FontFamily.semibold, fontSize: 16 },
  customRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  customInput: { flex: 1, ...Typography.body, paddingVertical: Spacing.md },
  shortfall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  shortfallText: { ...Typography.bodySmall },
  shortfallLink: { fontFamily: FontFamily.semibold, fontSize: 13 },
  send: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.base,
    borderRadius: Radius.pill,
    alignItems: "center",
  },
  sendLabel: { fontFamily: FontFamily.bold, fontSize: 16 },
  cancel: { marginTop: Spacing.md, alignItems: "center", paddingVertical: Spacing.sm },
  cancelLabel: { ...Typography.bodySmall },
});

export default TipSheet;

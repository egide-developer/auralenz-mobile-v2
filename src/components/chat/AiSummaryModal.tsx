// Shared AI summary sheet used by both the DM chat and the group chat headers.
// The backend endpoints it calls are the AI-layer chat-digest shape that
// already exists (`/api/ai/conversations/:id/summary` and `/groups/:id/digest`).
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Spacing, Radius } from "../../theme/spacing";
import { Typography, FontFamily } from "../../theme/typography";
import { Icon } from "../ui/Icon";

export interface AiSummaryData {
  summary?: string | null;
  bulletPoints?: string[];
  decisions?: string[];
  actionItems?: { text?: string }[];
}

interface AiSummaryModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  loadSummary: () => Promise<AiSummaryData | null>;
}

export function AiSummaryModal({ visible, title, onClose, loadSummary }: AiSummaryModalProps) {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [data, setData] = useState<AiSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadSummary();
      setData(result);
    } catch {
      setError("The summary could not be generated right now.");
    } finally {
      setLoading(false);
    }
  }, [loadSummary]);

  useEffect(() => {
    if (visible) {
      setData(null);
      load();
    }
  }, [visible, load]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { justifyContent: "flex-end" }]}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + Spacing.lg,
              borderTopColor: colors.border + "40",
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.mutedForeground + "40" }]} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
              <Icon name="paper" set="light" size={18} color={colors.primary} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Icon name="close-square" set="bold" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.caption, { color: colors.mutedForeground }]}>Reading the chat…</Text>
            </View>
          ) : error ? (
            <View style={styles.centerFill}>
              <Icon name="danger-circle" set="light" size={28} color={colors.destructive} />
              <Text style={[styles.caption, { color: colors.mutedForeground }]}>{error}</Text>
              <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : data == null ? (
            <View style={styles.centerFill}>
              <Text style={[styles.caption, { color: colors.mutedForeground }]}>
                Not enough messages to summarise yet.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              {!!data.summary && (
                <Text style={[styles.summary, { color: colors.foreground }]}>{data.summary}</Text>
              )}
              {(data.bulletPoints || []).length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Key points</Text>
                  {data.bulletPoints!.map((point, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.bulletText, { color: colors.foreground }]}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(data.decisions || []).length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Decisions</Text>
                  {data.decisions!.map((point, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.bulletText, { color: colors.foreground }]}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}
              {(data.actionItems || []).length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Action items</Text>
                  {data.actionItems!.map((item, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Icon name="tick-square" set="bold" size={14} color={colors.primary} />
                      <Text style={[styles.bulletText, { color: colors.foreground }]}>{item?.text || ""}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  backdropTouch: { flex: 1 },
  sheet: {
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
    paddingTop: 8,
    maxHeight: "75%",
    borderTopWidth: 0.5,
  },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetTitle: { ...Typography.h4 },
  centerFill: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 48 },
  caption: { ...Typography.bodySmall },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.pill, marginTop: 4 },
  retryText: { fontFamily: FontFamily.semibold, fontSize: 13 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  summary: { ...Typography.body, lineHeight: 21 },
  section: { marginTop: Spacing.lg, gap: 8 },
  sectionLabel: { ...Typography.caption, fontFamily: FontFamily.semibold, textTransform: "uppercase" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { ...Typography.bodySmall, flex: 1, lineHeight: 18 },
});
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Radius, Spacing } from "../../theme/spacing";
import { Typography, FontFamily } from "../../theme/typography";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showToast } from "../../stores/toastStore";
import api from "../../api/client";
import { API } from "../../api/endpoints";
import type { StoryHighlight } from "../../types";
import { AppIcon } from "./AppIcon";
import { icons } from "../../constants/icons";

interface AddToHighlightSheetProps {
  visible: boolean;
  storyId: string;
  onClose: () => void;
  onAdded?: (highlightId: string) => void;
}

export function AddToHighlightSheet({ visible, storyId, onClose, onAdded }: AddToHighlightSheetProps) {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    api
      .get(API.highlights.me)
      .then(({ data }) => {
        if (cancelled) return;
        const list = data?.highlights ?? data?.data ?? data ?? [];
        setHighlights(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setHighlights([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [visible]);

  const addToHighlight = async (highlightId: string) => {
    setAddingId(highlightId);
    try {
      await api.post(API.highlights.addStory(highlightId), { storyId });
      showToast("Added to highlight", "success");
      onAdded?.(highlightId);
      onClose();
    } catch {
      showToast("Could not add to highlight", "error");
    } finally {
      setAddingId(null);
    }
  };

  const createAndAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const { data } = await api.post(API.highlights.create, { title, storyIds: [storyId] });
      const id = data?.highlight?.id ?? data?.id ?? data?.highlightId;
      showToast("Highlight created", "success");
      if (id) onAdded?.(id);
      onClose();
    } catch {
      showToast("Could not create highlight", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + Spacing.lg }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Add to highlight</Text>

          <View style={styles.createRow}>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="New highlight"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              maxLength={40}
              editable={!creating}
            />
            <Pressable onPress={createAndAdd} disabled={creating || !newTitle.trim()} hitSlop={8}>
              {creating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <AppIcon icon={icons.addCircle} size={30} color={newTitle.trim() ? colors.primary : colors.mutedForeground + "60"} />
              )}
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: Spacing.lg }} />
          ) : highlights.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>No highlights yet. Create one above.</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {highlights.map((h) => (
                <Pressable key={h.id} style={styles.row} onPress={() => addToHighlight(h.id)} disabled={addingId === h.id}>
                  <View style={[styles.circle, { borderColor: colors.border }]}> 
                    <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>{h.title.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{h.title}</Text>
                  {addingId === h.id ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, maxHeight: "70%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.md },
  title: { ...Typography.heading3, fontFamily: FontFamily.semibold, marginBottom: Spacing.md },
  createRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: FontFamily.regular },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, gap: Spacing.md },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rowTitle: { flex: 1, fontFamily: FontFamily.medium, fontSize: 17 },
  empty: { textAlign: "center", marginTop: Spacing.lg, fontFamily: FontFamily.regular },
});

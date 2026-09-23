import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, Alert, ScrollView, Image } from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import api from "../../api/client";
import { API } from "../../api/endpoints";
import type { HighlightSummary } from "../../types";

export function AddToHighlightSheet({
  visible,
  onClose,
  colors,
  storyId,
  ownerId,
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
  storyId: string;
  ownerId: string;
}) {
  const [highlights, setHighlights] = useState<HighlightSummary[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    api
      .get(API.highlights.byUser(ownerId))
      .then(({ data }) => setHighlights(data.highlights || []))
      .catch(() => setHighlights([]));
  }, [visible, ownerId]);

  const addToExisting = async (highlightId: string) => {
    try {
      await api.post(API.highlights.addItem(highlightId), { storyId });
      onClose();
      Alert.alert("Added to highlight");
    } catch {
      Alert.alert("Couldn't add this to the highlight");
    }
  };

  const createNew = async () => {
    if (!newTitle.trim() || creating) return;
    setCreating(true);
    try {
      await api.post(API.highlights.create, { title: newTitle.trim(), storyId });
      setNewTitle("");
      onClose();
      Alert.alert("Highlight created");
    } catch {
      Alert.alert("Couldn't create highlight");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Add to highlight</Text>

        {highlights.length > 0 ? (
          <ScrollView style={{ maxHeight: 180 }}>
            {highlights.map((h) => (
              <TouchableOpacity key={h.id} style={styles.row} onPress={() => addToExisting(h.id)}>
                <View style={[styles.thumb, { backgroundColor: colors.muted }]}>
                  {h.coverImage ? <Image source={{ uri: h.coverImage }} style={styles.thumbImg} /> : null}
                </View>
                <Text style={[styles.rowText, { color: colors.foreground }]}>{h.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.newRow}>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="New highlight name"
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            maxLength={30}
          />
          <TouchableOpacity onPress={createNew} disabled={!newTitle.trim() || creating} style={styles.addBtn}>
            <Ionicons name="add-circle" size={30} color={newTitle.trim() ? colors.primary : colors.mutedForeground + "60"} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.row, styles.cancel]} onPress={onClose}>
          <Text style={[styles.rowText, { color: colors.mutedForeground, textAlign: "center", flex: 1 }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  title: { fontSize: 15, fontWeight: "600", textAlign: "center", paddingVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, gap: 12 },
  thumb: { width: 36, height: 36, borderRadius: 18, overflow: "hidden" },
  thumbImg: { width: 36, height: 36 },
  rowText: { fontSize: 15 },
  newRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 8, paddingTop: 8 },
  input: { flex: 1, height: 40, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, fontSize: 14 },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  cancel: { marginTop: 8 },
});

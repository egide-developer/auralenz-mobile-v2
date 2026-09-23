import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert } from "react-native";

const REASONS: { value: string; label: string }[] = [
  { value: "spam", label: "Spam" },
  { value: "nudity", label: "Nudity or sexual activity" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech or symbols" },
  { value: "violence", label: "Violence or dangerous content" },
  { value: "misinformation", label: "False information" },
  { value: "self_harm", label: "Suicide or self-harm" },
  { value: "other", label: "Something else" },
];

export function ReportSheet({
  visible,
  onClose,
  colors,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
  onSubmit: (reason: string) => void;
}) {
  const choose = (reason: string) => {
    onClose();
    onSubmit(reason);
    Alert.alert("Thanks for letting us know", "We'll review this and take action if it breaks our guidelines.");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Why are you reporting this?</Text>
        {REASONS.map((r) => (
          <TouchableOpacity key={r.value} style={styles.row} onPress={() => choose(r.value)}>
            <Text style={[styles.rowText, { color: colors.foreground }]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.row, styles.cancel]} onPress={onClose}>
          <Text style={[styles.rowText, { color: colors.mutedForeground, textAlign: "center", flex: 1 }]}>
            Cancel
          </Text>
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
  },
  title: { fontSize: 15, fontWeight: "600", textAlign: "center", paddingVertical: 12 },
  row: { paddingVertical: 14, paddingHorizontal: 20 },
  rowText: { fontSize: 15 },
  cancel: { marginTop: 4 },
});

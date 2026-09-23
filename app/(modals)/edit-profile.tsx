import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography, FontFamily, FontSize } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";

export default function EditProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ username, bio });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) {
      // TODO: upload avatar
    }
  };

  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
          <Text style={[styles.saveText, { color: colors.primary, opacity: loading ? 0.5 : 1 }]}>
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickAvatar}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Icon name="camera" set="light" size={28} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickAvatar}>
          <Text style={[styles.changePhoto, { color: colors.primary }]}>Change Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={[styles.input, {
              color: colors.foreground,
              backgroundColor: colors.card + "80",
            }, Shadows[isDark ? "dark" : "light"]["soft"]]}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.bioInput, {
              color: colors.foreground,
              backgroundColor: colors.card + "80",
            }, Shadows[isDark ? "dark" : "light"]["soft"]]}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: { ...Typography.h4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  saveBtn: { paddingHorizontal: 8 },
  saveText: { fontFamily: FontFamily.semibold, fontSize: FontSize.base, lineHeight: 21 },
  avatarSection: { alignItems: "center", paddingVertical: Spacing.xl },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  changePhoto: { fontFamily: FontFamily.semibold, fontSize: FontSize.sm, lineHeight: 20, marginTop: 8 },
  form: { paddingHorizontal: Spacing.lg, gap: 16 },
  inputGroup: { gap: 6 },
  label: { ...Typography.label, paddingHorizontal: 4 },
  input: {
    height: 48,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    ...Typography.body,
  },
  bioInput: {
    height: 100,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingTop: 12,
    ...Typography.body,
  },
});

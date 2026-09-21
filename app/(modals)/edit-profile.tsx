import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";

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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.foreground, flex: 1 }}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary }}>
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: "center", paddingVertical: 20 }}>
        <TouchableOpacity onPress={pickAvatar}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.muted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="camera-outline" size={28} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickAvatar}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "600", marginTop: 8 }}>
            Change Photo
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 6 }}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: 14, color: colors.foreground, fontSize: 15 }}
          />
        </View>
        <View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 6 }}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ height: 100, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: 14, paddingTop: 12, color: colors.foreground, fontSize: 15 }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

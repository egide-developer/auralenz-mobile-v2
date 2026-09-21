import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";

export default function CreateScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setMedia((prev) => [...prev, ...result.assets]);
    }
  };

  const handlePost = async () => {
    if (media.length === 0 && !caption) {
      Alert.alert("Error", "Add a photo or caption");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("caption", caption);
      media.forEach((m, i) => {
        const ext = m.uri.split(".").pop() || "jpg";
        formData.append("media", {
          uri: m.uri,
          type: m.type === "video" ? "video/mp4" : "image/jpeg",
          name: `media_${i}.${ext}`,
        } as any);
      });
      await api.post(API.posts.list, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, flex: 1, textAlign: "center" }}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={loading}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.primary, opacity: loading ? 0.5 : 1 }}>
            {loading ? "Sharing..." : "Share"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Write a caption..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          textAlignVertical="top"
          style={{ height: 100, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: 14, paddingTop: 12, color: colors.foreground, fontSize: 15, marginBottom: 16 }}
        />

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {media.map((m, i) => (
            <View key={i} style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: colors.muted, overflow: "hidden" }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, padding: 4 }} numberOfLines={1}>
                {m.type}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={pickMedia}
            style={{ width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="add" size={28} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

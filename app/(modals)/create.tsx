import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Icon name="close-square" set="light" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Post</Text>
        <TouchableOpacity onPress={handlePost} disabled={loading} style={styles.shareBtn}>
          <Text style={[styles.shareText, { color: colors.primary, opacity: loading ? 0.5 : 1 }]}>
            {loading ? "Sharing..." : "Share"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Write a caption..."
          placeholderTextColor={colors.mutedForeground + "80"}
          multiline
          textAlignVertical="top"
          style={[styles.captionInput, {
            color: colors.foreground,
            backgroundColor: colors.card + "80",
            borderColor: colors.border + "4D",
          }, Shadows[isDark ? "dark" : "light"]["soft"]]}
        />

        <View style={styles.mediaGrid}>
          {media.map((m, i) => (
            <View key={i} style={[styles.mediaThumb, { backgroundColor: colors.muted }]}>
              <Icon name="image" set="light" size={20} color={colors.mutedForeground} />
              <Text style={[styles.mediaType, { color: colors.mutedForeground }]} numberOfLines={1}>
                {m.type}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={pickMedia}
            style={[styles.addMediaBtn, { borderColor: colors.border + "4D" }]}
          >
            <Icon name="camera" set="light" size={28} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: { ...Typography.h4 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  shareBtn: { paddingHorizontal: 8 },
  shareText: { ...Typography.body, fontWeight: "600" },
  content: { padding: Spacing.base },
  captionInput: {
    height: 100,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    ...Typography.body,
    marginBottom: Spacing.base,
  },
  mediaGrid: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  mediaThumb: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  mediaType: { ...Typography.caption, fontSize: 10, padding: 4 },
  addMediaBtn: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
});

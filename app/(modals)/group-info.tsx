import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { usePresenceStore } from "../../src/stores/presenceStore";
import { showToast } from "../../src/stores/toastStore";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import type { ChatGroup, GroupParticipant } from "../../src/types";

export default function GroupInfoScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);
  const isOnline = usePresenceStore((s) => s.isOnline);

  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(API.groups.byId(groupId));
      const loaded: ChatGroup = data.group || data;
      setGroup(loaded);
      setName(loaded.name || "");
      setDescription(loaded.description || "");
    } catch {
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const myRole = group?.participants.find((p) => p.id === currentUser?.id)?.role;
  const isAdmin = myRole === "admin";
  const dirty = !!group && (name.trim() !== (group.name || "") || description.trim() !== (group.description || ""));

  const saveDetails = useCallback(async () => {
    if (!name.trim()) {
      showToast("Group name can't be empty", "error");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(API.groups.update(groupId), {
        name: name.trim(),
        description: description.trim(),
      });
      setGroup(data.group || data);
      showToast("Group updated", "success");
    } catch (e: any) {
      showToast(e?.response?.data?.message || "Could not update the group", "error");
    } finally {
      setSaving(false);
    }
  }, [groupId, name, description]);

  const changeAvatar = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast("Photo access is needed to change the group photo", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setAvatarPreview(asset.uri);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: asset.fileName || `group_${Date.now()}.jpg`,
      } as any);
      const { data } = await api.put(API.groups.avatar(groupId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setGroup(data.group || data);
      showToast("Group photo updated", "success");
    } catch (e: any) {
      setAvatarPreview(null);
      showToast(e?.response?.data?.message || "Could not upload that photo", "error");
    } finally {
      setUploadingAvatar(false);
    }
  }, [groupId]);

  const toggleRole = useCallback(
    async (participant: GroupParticipant) => {
      const promoting = participant.role !== "admin";
      try {
        await api.post(
          promoting ? API.groups.promote(groupId, participant.id) : API.groups.demote(groupId, participant.id)
        );
        await load();
        showToast(promoting ? `${participant.username} is now an admin` : `${participant.username} is no longer an admin`, "success");
      } catch (e: any) {
        showToast(e?.response?.data?.message || "Could not change that role", "error");
      }
    },
    [groupId, load]
  );

  const removeParticipant = useCallback(
    (participant: GroupParticipant) => {
      Alert.alert("Remove member", `Remove ${participant.username} from this group?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(API.groups.leave(groupId, participant.id));
              await load();
              showToast(`${participant.username} removed`, "success");
            } catch (e: any) {
              showToast(e?.response?.data?.message || "Could not remove that member", "error");
            }
          },
        },
      ]);
    },
    [groupId, load]
  );

  const leaveGroup = useCallback(() => {
    if (!currentUser) return;
    Alert.alert("Leave group", "You'll stop receiving messages from this group.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(API.groups.leave(groupId, currentUser.id));
            showToast("You left the group", "info");
            router.dismissAll();
            router.replace("/(modals)/groups");
          } catch (e: any) {
            showToast(e?.response?.data?.message || "Could not leave the group", "error");
          }
        },
      },
    ]);
  }, [groupId, currentUser]);

  const deleteGroup = useCallback(() => {
    Alert.alert("Delete group", "This deletes the group and its messages for everyone. This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(API.groups.remove(groupId));
            showToast("Group deleted", "info");
            router.dismissAll();
            router.replace("/(modals)/groups");
          } catch (e: any) {
            showToast(e?.response?.data?.message || "Could not delete the group", "error");
          }
        },
      },
    ]);
  }, [groupId]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Couldn't load this group</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Group info</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={changeAvatar} disabled={!isAdmin || uploadingAvatar}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            {avatarPreview || group.avatarUrl ? (
              <CachedImage source={{ uri: avatarPreview || group.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="people" size={36} color={colors.mutedForeground} />
            )}
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
        {isAdmin ? (
          <TouchableOpacity onPress={changeAvatar} disabled={uploadingAvatar}>
            <Text style={[styles.changePhoto, { color: colors.primary }]}>
              {uploadingAvatar ? "Uploading..." : "Change photo"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={isAdmin}
          maxLength={50}
          placeholder="Group name"
          placeholderTextColor={colors.mutedForeground + "80"}
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.card }]}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={isAdmin}
          maxLength={500}
          multiline
          placeholder={isAdmin ? "What's this group about?" : "No description"}
          placeholderTextColor={colors.mutedForeground + "80"}
          style={[styles.input, styles.multiline, { color: colors.foreground, backgroundColor: colors.card }]}
        />

        {isAdmin && dirty ? (
          <TouchableOpacity
            onPress={saveDetails}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          {group.participants.length} {group.participants.length === 1 ? "member" : "members"}
        </Text>

        {group.participants.map((participant) => {
          const isSelf = participant.id === currentUser?.id;
          return (
            <View key={participant.id} style={styles.memberRow}>
              <TouchableOpacity
                style={styles.memberMain}
                onPress={() => !isSelf && router.push(`/profile/${participant.username}`)}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.muted }]}>
                  {participant.avatarUrl ? (
                    <CachedImage source={{ uri: participant.avatarUrl }} style={styles.memberAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={16} color={colors.mutedForeground} />
                  )}
                  {isOnline(participant.id) ? (
                    <View style={[styles.onlineDot, { borderColor: colors.background }]} />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.memberName, { color: colors.foreground }]}>
                    {participant.username}
                    {isSelf ? " (you)" : ""}
                  </Text>
                  {participant.role === "admin" ? (
                    <Text style={[styles.memberRole, { color: colors.primary }]}>Admin</Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              {isAdmin && !isSelf ? (
                <View style={styles.memberActions}>
                  <TouchableOpacity onPress={() => toggleRole(participant)} hitSlop={8} style={styles.memberActionBtn}>
                    <Ionicons
                      name={participant.role === "admin" ? "shield" : "shield-outline"}
                      size={18}
                      color={participant.role === "admin" ? colors.primary : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeParticipant(participant)} hitSlop={8} style={styles.memberActionBtn}>
                    <Ionicons name="person-remove-outline" size={18} color="#FF4757" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <TouchableOpacity onPress={leaveGroup} style={styles.dangerRow}>
          <Ionicons name="exit-outline" size={20} color="#FF4757" />
          <Text style={styles.dangerText}>Leave group</Text>
        </TouchableOpacity>

        {isAdmin ? (
          <TouchableOpacity onPress={deleteGroup} style={styles.dangerRow}>
            <Ionicons name="trash-outline" size={20} color="#FF4757" />
            <Text style={styles.dangerText}>Delete group</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: { fontFamily: FontFamily.semibold, fontSize: 16 },

  avatarSection: { alignItems: "center", paddingVertical: Spacing.lg, gap: 6 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 96, height: 96 },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000066",
  },
  changePhoto: { fontFamily: FontFamily.semibold, fontSize: 13 },

  form: { paddingHorizontal: Spacing.lg, gap: 8 },
  label: { ...Typography.label, paddingHorizontal: 4, marginTop: 8 },
  input: { borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 12, ...Typography.body },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  saveButton: {
    height: 44,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveButtonText: { color: "#FFF", fontFamily: FontFamily.semibold, fontSize: 15 },

  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg, gap: 4 },
  sectionTitle: { ...Typography.label, marginBottom: 8 },

  memberRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  memberMain: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  memberAvatarImage: { width: 40, height: 40 },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: "#2ECC71",
  },
  memberName: { ...Typography.bodySmall, fontFamily: FontFamily.medium },
  memberRole: { fontSize: 11, fontFamily: FontFamily.medium, marginTop: 1 },
  memberActions: { flexDirection: "row", gap: 12 },
  memberActionBtn: { padding: 4 },

  dangerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  dangerText: { color: "#FF4757", fontFamily: FontFamily.medium, fontSize: 15 },
});

// AuraLenz Notes — 24-hour text statuses. One active note per person; the
// composer replaces the viewer's current note. Reactions are a single emoji
// per user, toggled by tapping (same emoji removes, a different one swaps).
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";
import { CachedImage } from "../../src/components/ui/CachedImage";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { NoteEntry } from "../../src/types";

const NOTE_EMOJIS = ["❤️", "😮", "😂", "☕", "🔥"];
const MAX_LEN = 80;

const AUDIENCES = [
  { key: "public", label: "Everyone" },
  { key: "followers", label: "Followers" },
  { key: "close_friends", label: "Close friends" },
] as const;

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [mine, setMine] = useState<NoteEntry | null>(null);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [audience, setAudience] = useState<NoteEntry["visibility"]>("followers");
  const [posting, setPosting] = useState(false);
  const [reactingId, setReactingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(API.notes.list);
      setMine(data.mine || null);
      setNotes(data.notes || []);
    } catch {
      // keep whatever is on screen
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const post = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    setPosting(true);
    try {
      const { data } = await api.post(API.notes.create, { text, visibility: audience });
      const created: NoteEntry = data.note || {};
      setMine(created);
      setDraft("");
      await load();
    } catch (e: any) {
      Alert.alert("Couldn't post", e?.response?.data?.message || "Something went wrong.");
    } finally {
      setPosting(false);
    }
  }, [draft, audience, load]);

  const deleteMine = useCallback(() => {
    if (!mine) return;
    Alert.alert("Delete note", "Your note disappears for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(API.notes.remove(mine.id));
            setMine(null);
            setNotes((prev) => prev.filter((n) => n.id !== mine.id));
          } catch {
            Alert.alert("Couldn't delete", "Please try again.");
          }
        },
      },
    ]);
  }, [mine]);

  const toggleReact = useCallback(
    async (note: NoteEntry, emoji: string) => {
      if (note.isMine || reactingId) return;
      setReactingId(note.id);
      try {
        const { data } = await api.post(API.notes.react(note.id), { emoji });
        const updated: NoteEntry = data.note || {};
        setNotes((prev) => {
          const i = prev.findIndex((n) => n.id === note.id);
          if (i === -1) return prev;
          const next = [...prev];
          next[i] = updated;
          return next;
        });
      } catch {
        // reaction rejected — nothing to show
      } finally {
        setReactingId(null);
      }
    },
    [reactingId]
  );

  const rows: (NoteEntry | null)[] = mine ? [mine, ...notes] : notes;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: colors.border + "40" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notes</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Composer — replaces the viewer's current note when posted. */}
      <View style={[styles.composer, { backgroundColor: colors.card }]}>
        <Text style={[styles.composerLabel, { color: colors.mutedForeground }]}>
          {mine ? "Update your note" : "Leave a note"}
        </Text>
        <Input
          value={draft}
          onChangeText={(t) => setDraft(t.slice(0, MAX_LEN))}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.mutedForeground + "80"}
          multiline
          maxLength={MAX_LEN}
          style={styles.composerInput}
        />
        <View style={styles.composerFooter}>
          <View style={styles.audienceRow}>
            {AUDIENCES.map((a) => {
              const active = audience === a.key;
              return (
                <TouchableOpacity
                  key={a.key}
                  onPress={() => setAudience(a.key)}
                  style={[
                    styles.audienceChip,
                    active && { backgroundColor: colors.primary + "18" },
                  ]}
                >
                  <Text
                    style={[
                      styles.audienceText,
                      { color: active ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {a.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Button
            size="sm"
            onPress={post}
            disabled={!draft.trim()}
            loading={posting}
            style={styles.postBtn}
          >
            Post
          </Button>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item, index) => item?.id || `blank-${index}`}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 24 }}
        renderItem={({ item }) => {
          if (!item) return null;
          const author = item.author;
          return (
            <View style={[styles.noteCard, { backgroundColor: colors.card }]}>
              <View style={styles.noteHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                  {author?.avatarUrl ? (
                    <CachedImage source={{ uri: author.avatarUrl }} style={styles.avatarImg} />
                  ) : (
                    <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
                  )}
                </View>
                <View style={styles.noteMeta}>
                  <Text style={[styles.noteName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.isMine ? "Your note" : author?.username || "Someone"}
                  </Text>
                  <Text style={[styles.noteTime, { color: colors.mutedForeground }]}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {item.isMine && (
                  <TouchableOpacity onPress={deleteMine} hitSlop={8}>
                    <Icon name="delete" set="light" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.noteText, { color: colors.foreground }]}>{item.text}</Text>

              <View style={styles.reactionRow}>
                {NOTE_EMOJIS.map((emoji) => {
                  const count = item.reactionCounts?.[emoji] || 0;
                  const active = item.myReaction === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      disabled={item.isMine || reactingId === item.id}
                      onPress={() => toggleReact(item, emoji)}
                      style={[
                        styles.reactionChip,
                        { backgroundColor: colors.background },
                        active && { backgroundColor: colors.primary + "18", borderColor: colors.primary + "55" },
                      ]}
                    >
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      {count > 0 && (
                        <Text
                          style={[
                            styles.reactionCount,
                            { color: active ? colors.primary : colors.mutedForeground },
                          ]}
                        >
                          {count}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerFill}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            </View>
          ) : (
            <View style={[styles.centerFill, { paddingTop: 60 }]}>
              <Icon name="document" set="light" size={40} color={colors.mutedForeground + "60"} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No notes from people you follow yet
              </Text>
            </View>
          )
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...Typography.h4 },
  composer: {
    margin: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius["2xl"],
    padding: Spacing.base,
    gap: 10,
  },
  composerLabel: { ...Typography.caption, fontFamily: FontFamily.semibold },
  composerInput: { marginBottom: 2 },
  composerFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  audienceRow: { flexDirection: "row", flex: 1, gap: 6, flexWrap: "wrap" },
  audienceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  audienceText: { fontSize: 12, fontFamily: FontFamily.semibold },
  postBtn: { minWidth: 72 },
  noteCard: {
    borderRadius: Radius["2xl"],
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    gap: 10,
  },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 36, height: 36 },
  noteMeta: { flex: 1 },
  noteName: { ...Typography.bodySmall, fontFamily: FontFamily.semibold },
  noteTime: { ...Typography.caption },
  noteText: { ...Typography.body, lineHeight: 21 },
  reactionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reactionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "transparent",
  },
  reactionEmoji: { fontSize: 15 },
  reactionCount: { fontSize: 13, fontFamily: FontFamily.semibold },
  centerFill: { alignItems: "center", gap: 10, justifyContent: "center" },
  emptyText: { ...Typography.bodySmall },
});
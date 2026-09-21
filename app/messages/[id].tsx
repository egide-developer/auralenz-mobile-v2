import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import { Icon } from "../../src/components/ui/Icon";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Message } from "../../src/types";

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(API.messages.messages(id));
        setMessages(data.data || data.messages || data);
      } catch {}
    })();
  }, [id]);

  const send = async () => {
    if (!text.trim() || !id) return;
    const msg = text.trim();
    setText("");
    try {
      const { data } = await api.post(API.messages.send(id), { content: msg });
      setMessages((prev) => [...prev, data.data || data]);
    } catch {}
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-left" set="light" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Chat</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
              <View
                style={[
                  styles.bubble,
                  isMe
                    ? [styles.bubbleMe, { backgroundColor: colors.primary }]
                    : [styles.bubbleThem, { backgroundColor: colors.card, borderColor: colors.border + "30" }],
                ]}
              >
                <Text style={{ color: isMe ? colors.primaryForeground : colors.foreground, ...Typography.body, lineHeight: 20 }}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.inputBar, { borderTopColor: colors.border + "66" }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.mutedForeground + "80"}
          multiline
          maxLength={2000}
          style={[styles.chatInput, {
            color: colors.foreground,
            backgroundColor: colors.card + "80",
            borderColor: colors.border + "4D",
          }, Shadows[isDark ? "dark" : "light"]["soft"]]}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim()}
          style={[styles.sendBtn, {
            backgroundColor: text.trim() ? colors.primary : colors.muted,
          }]}
        >
          <Icon
            name="send"
            set="bold"
            size={18}
            color={text.trim() ? colors.primaryForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>
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
    paddingTop: 12,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  headerTitle: { ...Typography.h4 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  messageList: { padding: Spacing.base, flexGrow: 1, justifyContent: "flex-end" },
  messageRow: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 8 },
  messageRowMe: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", borderRadius: Radius.xl, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: {},
  bubbleThem: { borderWidth: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Typography.body,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

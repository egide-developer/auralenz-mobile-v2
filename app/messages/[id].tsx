import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
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
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Chat</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: "flex-end" }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
              <View
                style={{
                  maxWidth: "78%",
                  backgroundColor: isMe ? colors.primary : colors.muted,
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: isMe ? colors.primaryForeground : colors.foreground, fontSize: 15, lineHeight: 20 }}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={{ flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: colors.border, gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          maxLength={2000}
          style={{ flex: 1, minHeight: 40, maxHeight: 120, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.muted, paddingHorizontal: 14, paddingVertical: 10, color: colors.foreground, fontSize: 15 }}
        />
        <TouchableOpacity
          onPress={send}
          disabled={!text.trim()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: text.trim() ? colors.primary : colors.muted, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="send" size={18} color={text.trim() ? colors.primaryForeground : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

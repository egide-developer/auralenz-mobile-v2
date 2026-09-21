import { View, Text, TouchableOpacity, Dimensions, TextInput } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Story, StoryGroup } from "../../src/types";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const STORY_DURATION = 5000;
const REACTIONS = ["❤️", "😂", "😮", "😢", "🔥"];

export default function StoryViewerScreen() {
  const { groupId, storyIndex } = useLocalSearchParams<{
    groupId: string;
    storyIndex?: string;
  }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [storyGroup, setStoryGroup] = useState<StoryGroup | null>(null);
  const [currentIndex, setCurrentIndex] = useState(parseInt(storyIndex || "0", 10));
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const story = storyGroup?.stories[currentIndex];
  const isOwn = story?.userId === user?.id;

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(API.stories.list);
        const groups: StoryGroup[] = data.data || data.storyGroups || data;
        const found = groups.find((g) => g.userId === groupId);
        if (found) {
          setStoryGroup(found);
          if (story) {
            api.post(API.stories.view(story.id)).catch(() => {});
          }
        }
      } catch {}
    })();
  }, [groupId]);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / STORY_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, 30);
  }, [currentIndex, storyGroup]);

  useEffect(() => {
    if (story) {
      startTimer();
      api.post(API.stories.view(story.id)).catch(() => {});
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, story?.id]);

  const goNext = () => {
    if (!storyGroup) return;
    if (currentIndex < storyGroup.stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      router.back();
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const sendReaction = async (emoji: string) => {
    if (!story) return;
    try {
      await api.post(API.stories.react(story.id), { emoji });
    } catch {}
    setShowReactions(false);
  };

  const sendReply = async () => {
    if (!story || !reply.trim()) return;
    try {
      await api.post(API.stories.reply(story.id), { content: reply.trim() });
    } catch {}
    setReply("");
  };

  if (!story) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Story image/video placeholder */}
      <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: "#1a1a1a" }} />

      {/* Progress bars */}
      <View
        style={{
          position: "absolute",
          top: 48,
          left: 12,
          right: 12,
          flexDirection: "row",
          gap: 3,
        }}
      >
        {storyGroup?.stories.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 2,
              borderRadius: 1,
              backgroundColor: "rgba(255,255,255,0.3)",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                borderRadius: 1,
                backgroundColor: "#fff",
                width:
                  i < currentIndex
                    ? "100%"
                    : i === currentIndex
                      ? `${progress * 100}%`
                      : "0%",
              }}
            />
          </View>
        ))}
      </View>

      {/* Header */}
      <View
        style={{
          position: "absolute",
          top: 58,
          left: 12,
          right: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: Colors.dark.primary,
            marginRight: 8,
          }}
        />
        <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14, flex: 1 }}>
          {storyGroup?.user?.username || "User"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginRight: 12 }}>
          {new Date(story.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tap zones */}
      <TouchableOpacity
        style={{ position: "absolute", top: 80, left: 0, width: SCREEN_W * 0.35, height: SCREEN_H - 160 }}
        onPress={goPrev}
        activeOpacity={1}
      />
      <TouchableOpacity
        style={{ position: "absolute", top: 80, right: 0, width: SCREEN_W * 0.65, height: SCREEN_H - 160 }}
        onPress={() => {
          if (timerRef.current) clearInterval(timerRef.current);
          goNext();
        }}
        activeOpacity={1}
      />

      {/* Reaction bar */}
      {!isOwn && (
        <View
          style={{
            position: "absolute",
            bottom: 80,
            left: 12,
            right: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowReactions(!showReactions)}
            style={{ marginRight: 12 }}
          >
            <Text style={{ fontSize: 28 }}>😊</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Reply..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              onFocus={() => {
                if (timerRef.current) clearInterval(timerRef.current);
              }}
              onBlur={() => startTimer()}
              onSubmitEditing={sendReply}
              style={{
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.3)",
                paddingHorizontal: 14,
                color: "#fff",
                fontSize: 14,
              }}
            />
          </View>
        </View>
      )}

      {/* Emoji reactions popup */}
      {showReactions && (
        <View
          style={{
            position: "absolute",
            bottom: 130,
            left: 12,
            flexDirection: "row",
            backgroundColor: "rgba(0,0,0,0.7)",
            borderRadius: 24,
            paddingHorizontal: 8,
            paddingVertical: 6,
            gap: 4,
          }}
        >
          {REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => sendReaction(emoji)}
              style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            >
              <Text style={{ fontSize: 28 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

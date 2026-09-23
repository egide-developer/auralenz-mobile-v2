import { View, Text, TouchableOpacity, Dimensions, TextInput } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "expo-video";
import { useCachedVideoPlayer } from "../../src/hooks/useCachedVideoPlayer";
import { prefetchVideo } from "../../src/utils/videoCache";
import { CachedImage } from "../../src/components/ui/CachedImage";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { FontFamily } from "../../src/theme/typography";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { normalizeStoryGroups, extractStoryGroupsPayload } from "../../src/utils/stories";
import { AddToHighlightSheet } from "../../src/components/ui/AddToHighlightSheet";
import type { Story, StoryGroup, StorySticker } from "../../src/types";

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
  const [highlightSheetVisible, setHighlightSheetVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const story = storyGroup?.stories[currentIndex];
  const isOwn = story?.userId === user?.id;

  const [activeSticker, setActiveSticker] = useState<StorySticker | null>(story?.stickers?.[0] ?? null);
  useEffect(() => {
    setActiveSticker(storyGroup?.stories[currentIndex]?.stickers?.[0] ?? null);
  }, [currentIndex, storyGroup]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(API.stories.list);
        const groups = normalizeStoryGroups(extractStoryGroupsPayload(data));
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

  // Warm the cache for the next story's video as soon as the current one
  // starts, so swiping forward doesn't hit a cold re-buffer.
  useEffect(() => {
    const next = storyGroup?.stories[currentIndex + 1];
    if (next?.type === "video") {
      prefetchVideo(next.mediaUrl);
    }
  }, [currentIndex, storyGroup]);

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

  const respondToSticker = async (payload: { optionIndex?: number; text?: string }) => {
    if (!story || !activeSticker) return;
    try {
      const { data } = await api.post(API.stories.respondToSticker(story.id, activeSticker._id), payload);
      setActiveSticker(data.sticker);
    } catch {}
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
      <StoryMedia story={story} paused={showReactions} />

      {activeSticker ? (
        <StickerOverlay
          sticker={activeSticker}
          screenW={SCREEN_W}
          onRespond={respondToSticker}
          onFocusPause={() => {
            if (timerRef.current) clearInterval(timerRef.current);
          }}
          onBlurResume={startTimer}
        />
      ) : null}
      {isOwn && (
        <TouchableOpacity
          style={{
            position: "absolute",
            bottom: 40,
            left: 12,
            right: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 10,
          }}
          onPress={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.push(`/story/insights/${story.id}`);
          }}
        >
          <Ionicons name="eye-outline" size={18} color="#fff" />
          <Text style={{ color: "#fff", marginLeft: 6, fontSize: 13 }}>
            {story.viewsCount} {story.viewsCount === 1 ? "view" : "views"}
          </Text>
        </TouchableOpacity>
      )}
      {isOwn && (
        <TouchableOpacity
          style={{ position: "absolute", bottom: 40, right: 12, padding: 10 }}
          onPress={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            setHighlightSheetVisible(true);
          }}
        >
          <Ionicons name="star-outline" size={22} color="#fff" />
        </TouchableOpacity>
      )}
      {isOwn && user?.id ? (
        <AddToHighlightSheet
          visible={highlightSheetVisible}
          onClose={() => {
            setHighlightSheetVisible(false);
            startTimer();
          }}
          colors={Colors.dark}
          storyId={story.id}
          ownerId={user.id}
        />
      ) : null}

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
        <Text style={{ color: "#fff", fontFamily: FontFamily.semibold, fontSize: 14, flex: 1 }}>
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

function StoryMedia({ story, paused }: { story: Story; paused: boolean }) {
  const isVideo = story.type === "video";
  const { player: videoPlayer } = useCachedVideoPlayer(isVideo ? story.mediaUrl : null, (player) => {
    player.loop = true;
  });

  useEffect(() => {
    if (!isVideo) return;
    if (paused) videoPlayer.pause();
    else videoPlayer.play();
  }, [paused, isVideo, videoPlayer]);

  if (isVideo) {
    return (
      <VideoView
        player={videoPlayer}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        contentFit="contain"
        nativeControls={false}
      />
    );
  }

  return (
    <CachedImage
      source={{ uri: story.mediaUrl }}
      style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: "#1a1a1a" }}
      contentFit="contain"
    />
  );
}

function StickerOverlay({
  sticker,
  screenW,
  onRespond,
  onFocusPause,
  onBlurResume,
}: {
  sticker: StorySticker;
  screenW: number;
  onRespond: (payload: { optionIndex?: number; text?: string }) => void;
  onFocusPause: () => void;
  onBlurResume: () => void;
}) {
  const [answerText, setAnswerText] = useState("");
  const left = Math.max(12, sticker.position.x * screenW - 130);
  const boxStyle = {
    position: "absolute" as const,
    top: `${sticker.position.y * 100}%` as any,
    left,
    width: 260,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 16,
    padding: 14,
    gap: 8,
  };
  const questionTextStyle = { color: "#fff", fontFamily: FontFamily.semibold, fontSize: 14 };

  if (sticker.type === "question") {
    if (sticker.hasResponded) {
      return (
        <View style={boxStyle} pointerEvents="none">
          <Text style={questionTextStyle}>{sticker.question}</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Your answer sent ✓</Text>
        </View>
      );
    }
    return (
      <View style={boxStyle}>
        <Text style={questionTextStyle}>{sticker.question}</Text>
        <TextInput
          value={answerText}
          onChangeText={setAnswerText}
          placeholder="Type your answer..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          onFocus={onFocusPause}
          onBlur={onBlurResume}
          onSubmitEditing={() => {
            if (answerText.trim()) {
              onRespond({ text: answerText.trim() });
              setAnswerText("");
            }
          }}
          style={{ color: "#fff", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 }}
        />
      </View>
    );
  }

  // poll / quiz
  const options = sticker.options || [];
  const aggregate = sticker.aggregate;
  return (
    <View style={boxStyle}>
      <Text style={questionTextStyle}>{sticker.question}</Text>
      {options.map((opt, i) => {
        const isMine = sticker.myResponse?.optionIndex === i;
        const isCorrectAnswer = sticker.type === "quiz" && sticker.hasResponded && opt.isCorrect;
        return (
          <TouchableOpacity
            key={i}
            disabled={sticker.hasResponded}
            onPress={() => {
              onFocusPause();
              onRespond({ optionIndex: i });
            }}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: isCorrectAnswer ? "rgba(46,204,113,0.35)" : "rgba(255,255,255,0.15)",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderWidth: isMine ? 1.5 : 0,
              borderColor: "#fff",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, flexShrink: 1 }}>{opt.text}</Text>
            {sticker.hasResponded && aggregate ? (
              <Text style={{ color: "#fff", fontSize: 12, fontFamily: FontFamily.semibold }}>{aggregate[i]}%</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

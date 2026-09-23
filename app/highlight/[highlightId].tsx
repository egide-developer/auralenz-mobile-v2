import { View, Text, TouchableOpacity, Dimensions, Image } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { FontFamily } from "../../src/theme/typography";
import { Colors } from "../../src/theme/colors";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import type { Highlight, HighlightItem } from "../../src/types";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const ITEM_DURATION = 5000;

export default function HighlightViewerScreen() {
  const { highlightId } = useLocalSearchParams<{ highlightId: string }>();
  const router = useRouter();

  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(API.highlights.byId(highlightId));
        setHighlight(data.highlight);
      } catch {}
    })();
  }, [highlightId]);

  const item: HighlightItem | undefined = highlight?.items[currentIndex];

  const goNext = useCallback(() => {
    if (!highlight) return;
    if (currentIndex < highlight.items.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      router.back();
    }
  }, [highlight, currentIndex, router]);

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / ITEM_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, 30);
  }, [goNext]);

  useEffect(() => {
    if (item) startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, item, startTimer]);

  if (!highlight || !item) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <HighlightMedia item={item} />

      <View style={{ position: "absolute", top: 48, left: 12, right: 12, flexDirection: "row", gap: 3 }}>
        {highlight.items.map((_, i) => (
          <View
            key={i}
            style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" }}
          >
            <View
              style={{
                height: "100%",
                borderRadius: 1,
                backgroundColor: "#fff",
                width: i < currentIndex ? "100%" : i === currentIndex ? `${progress * 100}%` : "0%",
              }}
            />
          </View>
        ))}
      </View>

      <View style={{ position: "absolute", top: 58, left: 12, right: 12, flexDirection: "row", alignItems: "center" }}>
        <View
          style={{ width: 32, height: 32, borderRadius: 16, overflow: "hidden", backgroundColor: Colors.dark.primary, marginRight: 8 }}
        >
          {highlight.owner?.avatarUrl ? (
            <Image source={{ uri: highlight.owner.avatarUrl }} style={{ width: 32, height: 32 }} />
          ) : null}
        </View>
        <Text style={{ color: "#fff", fontFamily: FontFamily.semibold, fontSize: 14, flex: 1 }} numberOfLines={1}>
          {highlight.title}
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

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

      {item.text ? (
        <View style={{ position: "absolute", bottom: 60, left: 20, right: 20 }}>
          <Text style={{ color: "#fff", fontSize: 15 }}>{item.text}</Text>
        </View>
      ) : null}
    </View>
  );
}

function HighlightMedia({ item }: { item: HighlightItem }) {
  const isVideo = item.media.type === "video";
  const videoPlayer = useVideoPlayer(isVideo ? item.media.url : null, (player) => {
    player.loop = true;
    player.play();
  });

  if (isVideo) {
    return <VideoView player={videoPlayer} style={{ width: SCREEN_W, height: SCREEN_H }} contentFit="contain" nativeControls={false} />;
  }

  return (
    <Image
      source={{ uri: item.media.url }}
      style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: "#1a1a1a" }}
      resizeMode="contain"
    />
  );
}

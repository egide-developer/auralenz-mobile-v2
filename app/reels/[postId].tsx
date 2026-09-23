import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Share,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Typography, FontFamily } from "../../src/theme/typography";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { Icon } from "../../src/components/ui/Icon";
import { UserLink } from "../../src/components/ui/UserLink";
import { renderRichText } from "../../src/components/ui/RichText";
import type { Post } from "../../src/types";
import { CommentSheet } from "../(tabs)/index";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_LOOPS = 30;
const MAX_REEL_ITEMS = 40;
const KEEP_BEHIND = 10;

// Reels renders over a full-black background regardless of app theme, so
// UserLink (which normally follows light/dark theme colors) needs an
// override palette guaranteeing white text/icons stay legible here.
const REEL_OVERLAY_COLORS = {
  foreground: "#FFFFFF",
  mutedForeground: "#FFFFFF",
  muted: "rgba(255,255,255,0.2)",
  background: "#000000",
  primary: Colors.dark.primary,
};

type ReelEntry = { post: Post; key: string };

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function ReelsScreen() {
  const { postId, initialPost: initialPostParam } = useLocalSearchParams<{
    postId: string;
    initialPost?: string;
  }>();
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const parsedInitial: Post | null = (() => {
    if (!initialPostParam) return null;
    try {
      return JSON.parse(initialPostParam);
    } catch {
      return null;
    }
  })();

  const [reelItems, setReelItems] = useState<ReelEntry[]>(
    parsedInitial ? [{ post: parsedInitial, key: `${parsedInitial.id}-0` }] : []
  );
  const [loading, setLoading] = useState(reelItems.length === 0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const pageRef = useRef(1);
  const loopRef = useRef(0);
  // Tracks ids already appended in the *current* loop pass only — cleared on
  // wraparound so the same posts can be re-appended (under a new `${id}-${loop}`
  // key) without ever producing a duplicate key within a single pass.
  const seenInLoopRef = useRef(new Set<string>(parsedInitial ? [parsedInitial.id] : []));
  const loadingRef = useRef(false);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loopRef.current > MAX_LOOPS) return;
    loadingRef.current = true;
    try {
      const { data } = await api.get(`${API.posts.list}?page=${pageRef.current}&limit=10`);
      const raw: Post[] = data.posts || data.data || data.items || data || [];
      const videoPosts = raw.filter((p) => p.media?.some((m) => m.type === "video"));
      const freshPosts = videoPosts.filter((p) => !seenInLoopRef.current.has(p.id));
      const hasMore = !!data.pagination?.hasMore;

      if (freshPosts.length > 0) {
        const loop = loopRef.current;
        const appended = freshPosts.map((p) => ({ post: p, key: `${p.id}-${loop}` }));
        setReelItems((prev) => {
          const next = [...prev, ...appended];
          // Avoid unbounded growth over a long infinite-scroll session — trim
          // watched-past entries off the front, but never anything the user
          // could still scroll back into (kept window behind activeIndex).
          // `maintainVisibleContentPosition` on the FlatList keeps the visual
          // scroll position stable when items disappear above the viewport.
          if (next.length > MAX_REEL_ITEMS) {
            const safeToTrim = Math.max(0, activeIndexRef.current - KEEP_BEHIND);
            const trimCount = Math.min(safeToTrim, next.length - MAX_REEL_ITEMS);
            if (trimCount > 0) {
              activeIndexRef.current -= trimCount;
              setActiveIndex((i) => Math.max(0, i - trimCount));
              return next.slice(trimCount);
            }
          }
          return next;
        });
        freshPosts.forEach((p) => seenInLoopRef.current.add(p.id));
      }

      if (hasMore) {
        pageRef.current += 1;
      } else {
        pageRef.current = 1;
        loopRef.current += 1;
        seenInLoopRef.current = new Set();
      }

      if (freshPosts.length === 0) {
        loadingRef.current = false;
        if (loopRef.current <= MAX_LOOPS) await loadMore();
        return;
      }
    } catch {
      // ignore transient fetch errors, user can keep scrolling / retry via onEndReached
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!parsedInitial && postId) {
        try {
          const { data } = await api.get(API.posts.byId(postId));
          const fetched: Post | undefined = data.post || data;
          if (fetched) {
            setReelItems((prev) => [{ post: fetched, key: `${fetched.id}-0` }, ...prev]);
            seenInLoopRef.current.add(fetched.id);
          }
        } catch {
          // fall through to loadMore below regardless
        }
      }
      await loadMore();
      await loadMore();
    })();
  }, [loadMore, postId]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const handleLike = useCallback(async (post: Post) => {
    const wasLiked = post.isLiked;
    const wasCount = post.likesCount;
    setReelItems((prev) =>
      prev.map((r) =>
        r.post.id === post.id
          ? { ...r, post: { ...r.post, isLiked: !wasLiked, likesCount: wasLiked ? wasCount - 1 : wasCount + 1 } }
          : r
      )
    );
    try {
      const { data } = await api.post(API.posts.like(post.id));
      setReelItems((prev) =>
        prev.map((r) =>
          r.post.id === post.id
            ? { ...r, post: { ...r.post, isLiked: data.isLiked, likesCount: data.post?.likesCount ?? r.post.likesCount } }
            : r
        )
      );
    } catch {
      setReelItems((prev) =>
        prev.map((r) =>
          r.post.id === post.id ? { ...r, post: { ...r.post, isLiked: wasLiked, likesCount: wasCount } } : r
        )
      );
    }
  }, []);

  const handleShare = useCallback(async (post: Post) => {
    try {
      await Share.share({ message: post.caption || "Check out this video on AuraLenz" });
    } catch {}
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: "#000", justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: "#000" }]}>
      <FlatList
        data={reelItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => (
          <ReelItem
            post={item.post}
            isActive={index === activeIndex}
            muted={muted}
            onToggleMuted={() => setMuted((m) => !m)}
            onLike={handleLike}
            onShare={handleShare}
            onOpenComments={() => setCommentPostId(item.post.id)}
            insets={insets}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({ length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * i, index: i })}
        onEndReached={loadMore}
        onEndReachedThreshold={2}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        removeClippedSubviews={Platform.OS === "android"}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Icon name="arrow-left" set="bold" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {commentPostId ? (
        <CommentSheet
          visible={!!commentPostId}
          onClose={() => setCommentPostId(null)}
          postId={commentPostId}
          colors={colors}
          isDark={isDark}
        />
      ) : null}
    </View>
  );
}

function ReelItem({
  post,
  isActive,
  muted,
  onToggleMuted,
  onLike,
  onShare,
  onOpenComments,
  insets,
}: {
  post: Post;
  isActive: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  onLike: (p: Post) => void;
  onShare: (p: Post) => void;
  onOpenComments: () => void;
  insets: { top: number; bottom: number; left: number; right: number };
}) {
  const media = post.media?.find((m) => m.type === "video") || post.media?.[0];
  const isVideo = media?.type === "video";

  const videoThumbUrl =
    isVideo && media
      ? media.url.includes("?")
        ? media.url.replace("?", ".jpg?")
        : `${media.url}.jpg`
      : "";

  const videoPlayer = useVideoPlayer(isVideo && media ? media.url : null, (player) => {
    player.loop = true;
    player.muted = muted;
  });

  useEffect(() => {
    if (!isVideo) return;
    if (isActive) {
      videoPlayer.play();
    } else {
      videoPlayer.pause();
      videoPlayer.currentTime = 0;
    }
  }, [isActive, isVideo, videoPlayer]);

  useEffect(() => {
    if (!isVideo) return;
    videoPlayer.muted = muted;
  }, [muted, isVideo, videoPlayer]);

  const heartOpacity = useSharedValue(0);
  const burstHeart = useCallback(() => {
    heartOpacity.value = 1;
    heartOpacity.value = withDelay(700, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, []);

  const handleDoubleTap = useCallback(() => {
    if (!post.isLiked) onLike(post);
    burstHeart();
  }, [post, onLike, burstHeart]);

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      runOnJS(handleDoubleTap)();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (isVideo) runOnJS(onToggleMuted)();
    });

  const heartOverlayStyle = useAnimatedStyle(() => ({ opacity: heartOpacity.value }));

  if (!media) {
    return <View style={[styles.reelItem, { backgroundColor: "#000" }]} />;
  }

  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTapGesture, singleTapGesture)}>
      <View style={styles.reelItem}>
        <Image
          source={{ uri: isVideo ? videoThumbUrl : media.url }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
        {isVideo && isActive ? (
          <VideoView
            player={videoPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
          />
        ) : null}

        <Animated.View pointerEvents="none" style={[styles.heartOverlay, heartOverlayStyle]}>
          <Ionicons name="heart" size={96} color="#FFFFFF" />
        </Animated.View>

        {isVideo && !muted ? (
          <View pointerEvents="none" style={[styles.muteBadge, { top: insets.top + 60 }]}>
            <Icon name="volume-up" set="bold" size={14} color="#FFFFFF" />
          </View>
        ) : null}

        <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + 64 }]}>
          <View style={styles.bottomInfo}>
            <View style={styles.reelHeader}>
              {post.author ? (
                <UserLink user={post.author} colors={REEL_OVERLAY_COLORS} avatarSize={28} showUsername={false} />
              ) : (
                <View style={styles.reelAvatar}>
                  <Icon name="user" set="light" size={16} color="#FFFFFF" />
                </View>
              )}
              {post.author ? (
                <UserLink
                  user={post.author}
                  colors={REEL_OVERLAY_COLORS}
                  showAvatar={false}
                  usernameStyle={styles.reelUsername}
                />
              ) : (
                <Text style={styles.reelUsername}>User</Text>
              )}
              <Text style={styles.reelTime}>· {timeAgo(post.createdAt)}</Text>
            </View>
            {post.caption ? (
              <Text style={styles.reelCaption}>
                {renderRichText(post.caption, Colors.dark.primary, `reel-cap-${post.id}`)}
              </Text>
            ) : null}
          </View>

          <View style={styles.reelActions}>
            <TouchableOpacity style={styles.reelActionBtn} onPress={() => onLike(post)}>
              <Ionicons
                name={post.isLiked ? "heart" : "heart-outline"}
                size={30}
                color={post.isLiked ? Colors.light.destructive : "#FFFFFF"}
              />
              <Text style={styles.reelActionText}>{post.likesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reelActionBtn} onPress={onOpenComments}>
              <Icon name="chat" set="bold" size={27} color="#FFFFFF" />
              <Text style={styles.reelActionText}>{post.commentsCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reelActionBtn} onPress={() => onShare(post)}>
              <Icon name="send" set="bold" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  reelItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#000",
  },
  heartOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  muteBadge: {
    position: "absolute",
    right: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    padding: 6,
  },
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
  },
  bottomInfo: {
    flex: 1,
    paddingRight: 12,
  },
  reelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  reelAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 8,
  },
  reelAvatarImg: { width: 28, height: 28 },
  reelUsername: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.bold,
    color: "#FFFFFF",
  },
  reelTime: {
    ...Typography.bodySmall,
    color: "rgba(255,255,255,0.7)",
    marginLeft: 4,
  },
  reelCaption: {
    ...Typography.bodySmall,
    color: "#FFFFFF",
  },
  reelActions: {
    alignItems: "center",
    gap: 18,
  },
  reelActionBtn: {
    alignItems: "center",
    gap: 4,
  },
  reelActionText: {
    ...Typography.bodySmall,
    color: "#FFFFFF",
    fontFamily: FontFamily.semibold,
  },
});

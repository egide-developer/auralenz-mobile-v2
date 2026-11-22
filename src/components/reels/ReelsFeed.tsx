// Shared vertical-swipe video feed engine, used both by the reels tab
// (no seed post — starts from page 1 of the general feed) and by the
// post-triggered reels viewer (`app/reels/[postId].tsx`, seeded with the
// post that was tapped). Extracted out of that screen so both entry points
// share one implementation instead of drifting apart.
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Share,
  Dimensions,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { TipSheet } from "../monetization/TipSheet";
import { CachedImage } from "../ui/CachedImage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
// Ionicons removed - using custom Icon component
import { VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useCachedVideoPlayer } from "../../hooks/useCachedVideoPlayer";
import { useThemeStore } from "../../stores/themeStore";
import { useAuthStore } from "../../stores/authStore";
import { Colors } from "../../theme/colors";
import { Typography, FontFamily } from "../../theme/typography";
import { Spacing, Radius, Gap, TAB_BAR_HEIGHT } from "../../theme/spacing";
import { showToast } from "../../stores/toastStore";
import api from "../../api/client";
import { API } from "../../api/endpoints";
import { Icon } from "../ui/Icon";
import { GlassSurface } from "../ui/GlassSurface";
import { UserLink } from "../ui/UserLink";
import { renderRichText } from "../ui/RichText";
import type { Post, UserPreview } from "../../types";
import { CommentSheet } from "../../../app/(tabs)/index";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_LOOPS = 30;
const MAX_REEL_ITEMS = 40;
const KEEP_BEHIND = 10;

// Reel controls and metadata overlay the media, so keep them white regardless
// of the app theme.
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

export function ReelsFeed({
  initialPost,
  startAtPostId,
  onBack,
  insets,
}: {
  initialPost?: Post | null;
  startAtPostId?: string;
  onBack?: () => void;
  insets: { top: number; bottom: number; left: number; right: number };
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  const [reelItems, setReelItems] = useState<ReelEntry[]>(
    initialPost ? [{ post: initialPost, key: `${initialPost.id}-0` }] : []
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
  const seenInLoopRef = useRef(new Set<string>(initialPost ? [initialPost.id] : []));
  const loadingRef = useRef(false);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || loopRef.current > MAX_LOOPS) return;
    loadingRef.current = true;
    try {
      const { data } = await api.get(`${API.posts.list}?page=${pageRef.current}&limit=10&type=video`);
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
      if (!initialPost && startAtPostId) {
        try {
          const { data } = await api.get(API.posts.byId(startAtPostId));
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
  }, [loadMore, startAtPostId]);

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
      <View style={[styles.screen, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
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
            backgroundColor={colors.background}
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

      {onBack ? (
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={onBack}
          hitSlop={10}
        >
          <Icon name="arrow-left" set="bold" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

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
  backgroundColor,
}: {
  post: Post;
  isActive: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  onLike: (p: Post) => void;
  onShare: (p: Post) => void;
  onOpenComments: () => void;
  insets: { top: number; bottom: number; left: number; right: number };
  backgroundColor: string;
}) {
  const [tipVisible, setTipVisible] = useState(false);
  const [collabVisible, setCollabVisible] = useState(false);
  const media = post.media?.find((m) => m.type === "video") || post.media?.[0];
  const isVideo = media?.type === "video";

  const videoThumbUrl =
    isVideo && media
      ? media.url.includes("?")
        ? media.url.replace("?", ".jpg?")
        : `${media.url}.jpg`
      : "";

  const { player: videoPlayer } = useCachedVideoPlayer(isVideo && media ? media.url : null, (player) => {
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
    return <View style={[styles.reelItem, { backgroundColor }]} />;
  }

  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTapGesture, singleTapGesture)}>
      <View style={[styles.reelItem, { backgroundColor }]}>
        <CachedImage
          source={{ uri: isVideo ? videoThumbUrl : media.url }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
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
          <Icon name="heart" set="bold" size={96} color="#FFFFFF" />
        </Animated.View>

        {isVideo && !muted ? (
          <View pointerEvents="none" style={[styles.muteBadge, { top: insets.top + 60 }]}>
            <Icon name="volume-up" set="bold" size={14} color="#FFFFFF" />
          </View>
        ) : null}

        {/* White icons/text over arbitrary video content have no guaranteed
            contrast otherwise - a bright frame can make them unreadable. */}
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          style={styles.bottomScrim}
        />

        <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT }]}>
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
            {post.collaborators && post.collaborators.length > 0 ? (
              <Text style={styles.reelCollaborators} numberOfLines={1}>
                with {post.collaborators.map((c) => `@${c.username}`).join(" · ")}
              </Text>
            ) : null}
            {post.isRemix && post.remixSource?.username ? (
              <Text style={styles.reelRemix} numberOfLines={1}>
                Remixed from @{post.remixSource.username}
              </Text>
            ) : null}
            {post.caption ? (
              <Text style={styles.reelCaption}>
                {renderRichText(post.caption, Colors.dark.primary, `reel-cap-${post.id}`)}
              </Text>
            ) : null}
          </View>

          <View style={styles.reelActions}>
            <TouchableOpacity style={styles.reelActionBtn} onPress={() => onLike(post)}>
              <Icon
                name="heart"
                set={post.isLiked ? "bold" : "light"}
                size={30}
                color={post.isLiked ? Colors.dark.destructive : "#FFFFFF"}
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
            <TouchableOpacity
              style={styles.reelActionBtn}
              onPress={() => setCollabVisible(true)}
              accessibilityLabel="Remix or collaborate"
            >
              <Icon name="swap" set="bold" size={27} color="#FFFFFF" />
            </TouchableOpacity>
            {post.author?.id ? (
              <TouchableOpacity
                style={styles.reelActionBtn}
                onPress={() => setTipVisible(true)}
                accessibilityLabel="Send Stars"
              >
                <Icon name="star" set="light" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {post.author?.id ? (
          <TipSheet
            visible={tipVisible}
            onClose={() => setTipVisible(false)}
            recipientId={post.author.id}
            recipientUsername={post.author.username}
            postId={post.id}
          />
        ) : null}

        <CollabSheet
          visible={collabVisible}
          onClose={() => setCollabVisible(false)}
          post={post}
        />
      </View>
    </GestureDetector>
  );
}

function CollabSheet({
  visible,
  onClose,
  post,
}: {
  visible: boolean;
  onClose: () => void;
  post: Post;
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUser = useAuthStore((s) => s.user);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAuthor = post.author?.id && currentUser?.id && post.author.id === currentUser.id;

  useEffect(() => {
    if (!visible || !isAuthor || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const handle = setTimeout(() => {
      api
        .get(`${API.users.search}?q=${encodeURIComponent(query.trim())}`)
        .then(({ data }) => {
          if (active) setResults(data.data || data.users || data || []);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [visible, query, isAuthor]);

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const remix = useCallback(async () => {
    setBusy(true);
    try {
      await api.post(API.posts.remix(post.id), {
        publish: true,
        caption: `Remixed from @${post.author.username}`,
      });
      showToast("Remix published to your profile", "info");
      onClose();
    } catch (e: any) {
      Alert.alert("Remix failed", e?.response?.data?.message || "Could not create remix");
    } finally {
      setBusy(false);
    }
  }, [post, onClose]);

  const addCollab = useCallback(
    async (user: UserPreview) => {
      setBusy(true);
      try {
        await api.post(API.posts.addCollaborator(post.id, user.id));
        showToast(`@${user.username} added as a collaborator`, "info");
        onClose();
      } catch (e: any) {
        Alert.alert("Collaborator failed", e?.response?.data?.message || "Could not add collaborator");
      } finally {
        setBusy(false);
      }
    },
    [post, onClose]
  );

  const alreadyCollab = (id: string) => (post.collaborators || []).some((c) => c.id === id);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <GlassSurface intensity="strong" bordered={false} radius={0} style={styles.sheetCard}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Create with this reel</Text>

          <TouchableOpacity
            style={[styles.sheetRow, { borderBottomColor: colors.border + "40" }]}
            onPress={remix}
            disabled={busy}
          >
            <View style={[styles.sheetIcon, { backgroundColor: colors.primary + "14" }]}>
              <Icon name="swap" set="bold" size={20} color={colors.primary} />
            </View>
            <View style={styles.sheetRowMeta}>
              <Text style={[styles.sheetRowTitle, { color: colors.foreground }]}>Remix this reel</Text>
              <Text style={[styles.sheetRowSub, { color: colors.mutedForeground }]}>
                Repost the video as your own, credited to @{post.author.username}
              </Text>
            </View>
            {busy ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </TouchableOpacity>

          {isAuthor ? (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Add a collaborator by username..."
                placeholderTextColor={colors.mutedForeground + "80"}
                style={[styles.sheetInput, { backgroundColor: colors.background, color: colors.foreground }]}
                autoCapitalize="none"
              />
              {searching ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} style={{ paddingVertical: 12 }} />
              ) : query.trim().length >= 2 ? (
                <View style={{ maxHeight: 180 }}>
                  {results.map((u) => {
                    const already = alreadyCollab(u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.personRow}
                        onPress={() => !already && addCollab(u)}
                        disabled={already || busy}
                      >
                        <View style={[styles.personAvatar, { backgroundColor: colors.muted }]}>
                          {u.avatarUrl ? (
                            <CachedImage source={{ uri: u.avatarUrl }} style={styles.personAvatarImg} />
                          ) : (
                            <Icon name="user" set="light" size={16} color={colors.mutedForeground} />
                          )}
                        </View>
                        <Text style={[styles.personName, { color: colors.foreground }]} numberOfLines={1}>
                          @{u.username}
                        </Text>
                        <Text
                          style={[
                            styles.personAction,
                            { color: already ? colors.mutedForeground : colors.primary },
                          ]}
                        >
                          {already ? "Added" : "Add"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={[styles.sheetHint, { color: colors.mutedForeground }]}>
              Only the post author can invite collaborators. You can still remix.
            </Text>
          )}

          <TouchableOpacity onPress={onClose} style={styles.sheetCancel} hitSlop={8}>
            <Text style={[styles.sheetCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  reelItem: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  heartOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    left: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  muteBadge: {
    position: "absolute",
    right: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: Radius.md,
    padding: Spacing.xs,
  },
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  bottomInfo: {
    flex: 1,
    paddingRight: Gap.md,
  },
  reelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  reelAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: Gap.sm,
  },
  reelAvatarImg: { width: 28, height: 28 },
  reelUsername: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.medium,
    color: "#FFFFFF",
  },
  reelTime: {
    ...Typography.bodySmall,
    color: "rgba(255,255,255,0.7)",
    marginLeft: Gap.xs,
  },
  reelCaption: {
    ...Typography.bodySmall,
    color: "#FFFFFF",
  },
  reelActions: {
    alignItems: "center",
    gap: Gap.xl,
  },
  reelActionBtn: {
    alignItems: "center",
    gap: Gap.xs,
  },
  reelActionText: {
    ...Typography.bodySmall,
    color: "#FFFFFF",
    fontFamily: FontFamily.medium,
  },
  reelCollaborators: {
    ...Typography.bodySmall,
    color: "rgba(255,255,255,0.85)",
    fontFamily: FontFamily.medium,
    marginBottom: Spacing["2xs"],
  },
  reelRemix: {
    ...Typography.bodySmall,
    color: "rgba(255,255,255,0.65)",
    marginBottom: Spacing["2xs"],
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "#00000066",
  },
  sheetCard: {
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
    padding: Spacing.xl,
    paddingBottom: Spacing["2xl"],
  },
  sheetTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRowMeta: { flex: 1 },
  sheetRowTitle: { ...Typography.body, fontFamily: FontFamily.medium },
  sheetRowSub: { ...Typography.bodySmall, marginTop: Spacing["2xs"] },
  sheetInput: {
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: Spacing.md,
    ...Typography.bodySmall,
  },
  sheetHint: { ...Typography.bodySmall, marginTop: Spacing.md },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingVertical: Spacing.md,
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  personAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  personName: { ...Typography.bodySmall, flex: 1, fontFamily: FontFamily.medium },
  personAction: { ...Typography.bodySmall, fontFamily: FontFamily.medium },
  sheetCancel: { alignItems: "center", marginTop: 16 },
  sheetCancelText: { ...Typography.bodySmall, fontFamily: FontFamily.medium },
});

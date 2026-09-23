import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Image,
  Share,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useCallback, useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  withDelay,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useThemeStore } from "../../src/stores/themeStore";
import { useAuthStore } from "../../src/stores/authStore";
import { Colors } from "../../src/theme/colors";
import { Spacing, Radius } from "../../src/theme/spacing";
import { Typography, FontFamily } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { Icon } from "../../src/components/ui/Icon";
import { UserLink } from "../../src/components/ui/UserLink";
import { PressableScale } from "../../src/components/ui/PressableScale";
import { renderRichText } from "../../src/components/ui/RichText";
import { MentionSuggestions, useMentionQuery, applyMentionSelection } from "../../src/components/ui/MentionSuggestions";
import { ReportSheet } from "../../src/components/ui/ReportSheet";
import { StoryBar } from "../../src/components/feed/StoryBar";
import type { Post, PostMedia, Comment } from "../../src/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MEDIA_WIDTH = SCREEN_WIDTH;
const MIN_MEDIA_HEIGHT = 240;
const MAX_MEDIA_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
const SHEET_HEIGHT_DEFAULT = Math.round(SCREEN_HEIGHT * 2 / 3);
const SHEET_HEIGHT_EXPANDED = Math.round(SCREEN_HEIGHT * 0.8);

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export default function FeedScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const toggleVideoMuted = useCallback(() => setVideoMuted((m) => !m), []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const firstVideo = viewableItems.find((v: any) => v.item?.media?.[0]?.type === "video");
    setActivePostId(firstVideo ? firstVideo.item.id : null);
  }).current;

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await api.get(API.posts.list);
      const list = data.posts || data.data || data.items || data;
      setPosts(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.log("Fetch posts error:", e?.response?.status, e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-fetch (and immediately drop whatever was cached in local state) any
  // time the signed-in account changes — the feed tab stays mounted across
  // logout/login since it lives inside the (tabs) group, so without this a
  // freshly logged-in account could briefly render the previous account's
  // feed until a manual pull-to-refresh.
  useEffect(() => {
    setPosts([]);
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPosts();
  }, [currentUserId, fetchPosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, []);

  const handleLike = useCallback(async (post: Post) => {
    const wasLiked = post.isLiked;
    const wasCount = post.likesCount;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, isLiked: !wasLiked, likesCount: wasLiked ? wasCount - 1 : wasCount + 1 }
          : p
      )
    );
    try {
      const { data } = await api.post(API.posts.like(post.id));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, isLiked: data.isLiked, likesCount: data.post?.likesCount ?? p.likesCount }
            : p
        )
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, isLiked: wasLiked, likesCount: wasCount } : p
        )
      );
    }
  }, []);

  const handleSave = useCallback(async (post: Post) => {
    const wasSaved = post.isSaved;
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, isSaved: !wasSaved } : p))
    );
    try {
      const { data } = await api.post(API.posts.save(post.id));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, isSaved: data.isSaved } : p
        )
      );
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isSaved: wasSaved } : p))
      );
    }
  }, []);

  const handleShare = useCallback(async (post: Post) => {
    try {
      await Share.share({
        message: post.caption || "Check out this post on AuraLenz",
      });
    } catch {}
  }, []);

  const removePostLocally = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const handleDeletePost = useCallback(async (post: Post) => {
    removePostLocally(post.id);
    try {
      await api.delete(API.posts.byId(post.id));
    } catch {
      // Deletion failed server-side — bring it back rather than leaving the
      // feed silently missing a post that still exists.
      fetchPosts();
    }
  }, [removePostLocally, fetchPosts]);

  const handleUnfollow = useCallback(async (post: Post) => {
    const authorId = post.author?.id;
    if (!authorId) return;
    // Unfollowing removes every post from that author, not just this one —
    // the feed is following-scoped, so all of their posts belong gone.
    setPosts((prev) => prev.filter((p) => p.author?.id !== authorId));
    try {
      await api.post(API.users.follow(authorId));
    } catch {
      fetchPosts();
    }
  }, [fetchPosts]);

  const handleReportPost = useCallback(async (post: Post, reason: string) => {
    try {
      await api.post(API.reports.create, { targetType: "post", targetId: post.id, reason });
    } catch {}
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <BlurView
        intensity={Platform.OS === "ios" ? 40 : 0}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.header,
          {
            borderBottomColor: colors.border + "40",
            backgroundColor: Platform.OS === "ios" ? "transparent" : colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AuraLenz</Text>
        <View style={styles.headerActions}>
          <PressableScale
            onPress={() => router.push("/search")}
            style={[styles.headerBtn, { backgroundColor: colors.card + "90" }]}
          >
            <Icon name="search" set="light" size={20} color={colors.mutedForeground} />
          </PressableScale>
          <PressableScale
            onPress={() => router.push("/notifications")}
            style={[styles.headerBtn, { backgroundColor: colors.card + "90" }]}
          >
            <Icon name="notification" set="light" size={20} color={colors.mutedForeground} />
          </PressableScale>
        </View>
      </BlurView>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={<StoryBar colors={colors} isDark={isDark} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="image" set="light" size={48} color={colors.mutedForeground + "60"} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No posts yet
            </Text>
          </View>
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        windowSize={5}
        maxToRenderPerBatch={4}
        initialNumToRender={4}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === "android"}
        renderItem={({ item, index }) => (
          <PostCard
            post={item}
            index={index}
            colors={colors}
            isDark={isDark}
            isActive={item.id === activePostId}
            videoMuted={videoMuted}
            onToggleVideoMuted={toggleVideoMuted}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            onDelete={handleDeletePost}
            onUnfollow={handleUnfollow}
            onReport={handleReportPost}
          />
        )}
      />
    </View>
  );
}

function PostCard({
  post,
  index,
  colors,
  isDark,
  isActive,
  videoMuted,
  onToggleVideoMuted,
  onLike,
  onSave,
  onShare,
  onDelete,
  onUnfollow,
  onReport,
}: {
  post: Post;
  index: number;
  colors: any;
  isDark: boolean;
  isActive: boolean;
  videoMuted: boolean;
  onToggleVideoMuted: () => void;
  onLike: (p: Post) => void;
  onSave: (p: Post) => void;
  onShare: (p: Post) => void;
  onDelete: (p: Post) => void;
  onUnfollow: (p: Post) => void;
  onReport: (p: Post, reason: string) => void;
}) {
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isOwnPost = !!post.author?.id && post.author.id === currentUserId;
  const media = post.media || [];

  const openReel = useCallback(() => {
    router.push({
      pathname: "/reels/[postId]",
      params: { postId: post.id, initialPost: JSON.stringify(post) },
    });
  }, [post]);

  const rawAspectRatio = media[0]?.aspectRatio;
  const firstAspectRatio = rawAspectRatio && rawAspectRatio > 0 ? rawAspectRatio : 1;
  const mediaHeight = clamp(MEDIA_WIDTH / firstAspectRatio, MIN_MEDIA_HEIGHT, MAX_MEDIA_HEIGHT);

  const onMediaScrollEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / MEDIA_WIDTH);
    setMediaIndex(idx);
  }, []);

  const heartOpacity = useSharedValue(0);
  const likeBtnScale = useSharedValue(1);
  const saveBtnScale = useSharedValue(1);

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

  const handleLikePress = () => {
    likeBtnScale.value = withSpring(1.3, { damping: 6, stiffness: 300 }, () => {
      likeBtnScale.value = withSpring(1, { damping: 8, stiffness: 250 });
    });
    onLike(post);
  };

  const handleSavePress = () => {
    saveBtnScale.value = withSpring(1.25, { damping: 6, stiffness: 300 }, () => {
      saveBtnScale.value = withSpring(1, { damping: 8, stiffness: 250 });
    });
    onSave(post);
  };

  const heartOverlayStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
  }));

  const likeBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: likeBtnScale.value }] }));
  const saveBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveBtnScale.value }] }));

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(Math.min(index, 6) * 60)}
      layout={LinearTransition.springify()}
      style={styles.postCard}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: "#808080" },
        ]}
      >
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            {post.author ? (
              <UserLink user={post.author} colors={colors} avatarSize={36} showUsername={false} />
            ) : null}
            <View style={styles.postMeta}>
              {post.author ? (
                <UserLink
                  user={post.author}
                  colors={colors}
                  showAvatar={false}
                  usernameStyle={styles.username}
                />
              ) : (
                <Text style={[styles.username, { color: colors.foreground }]}>User</Text>
              )}
              <Text style={[styles.timeAgo, { color: colors.mutedForeground }]}>
                {timeAgo(post.createdAt)}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreBtn} hitSlop={8} onPress={() => setOptionsVisible(true)}>
            <Icon name="more-circle" set="light" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {media.length > 0 ? (
          <GestureDetector gesture={doubleTapGesture}>
            <View style={styles.mediaWrap}>
              {media.length > 1 ? (
                <FlatList
                  data={media}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={{ height: mediaHeight }}
                  keyExtractor={(m, i) => m.id || m.url || String(i)}
                  onMomentumScrollEnd={onMediaScrollEnd}
                  renderItem={({ item, index: slideIdx }) => (
                    <MediaSlide
                      media={item}
                      isPostActive={isActive}
                      isCurrentSlide={slideIdx === mediaIndex}
                      height={mediaHeight}
                      colors={colors}
                      muted={videoMuted}
                      onToggleMuted={onToggleVideoMuted}
                      onOpenReel={openReel}
                    />
                  )}
                />
              ) : (
                <MediaSlide
                  media={media[0]}
                  isPostActive={isActive}
                  isCurrentSlide
                  height={mediaHeight}
                  colors={colors}
                  muted={videoMuted}
                  onToggleMuted={onToggleVideoMuted}
                  onOpenReel={openReel}
                />
              )}
              {media.length > 1 ? (
                <View pointerEvents="none" style={styles.dotsRow}>
                  {media.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i === mediaIndex ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  ))}
                </View>
              ) : null}
              <Animated.View pointerEvents="none" style={[styles.heartOverlay, heartOverlayStyle]}>
                <Ionicons name="heart" size={84} color="#FFFFFF" />
              </Animated.View>
            </View>
          </GestureDetector>
        ) : null}

        {post.caption ? (
          <Text style={[styles.caption, { color: colors.foreground }]}>
            <Text
              style={{ fontFamily: FontFamily.bold }}
              onPress={() => post.author && router.push(`/profile/${post.author.username}`)}
            >
              {post.author?.username}{" "}
            </Text>
            {renderRichText(post.caption, colors.primary, `cap-${post.id}`)}
          </Text>
        ) : null}

        <View style={styles.postActions}>
          <AnimatedTouchable style={[styles.actionBtn, likeBtnStyle]} onPress={handleLikePress} activeOpacity={0.75}>
            <Ionicons
              name={post.isLiked ? "heart" : "heart-outline"}
              size={20}
              color={post.isLiked ? Colors.light.destructive : colors.mutedForeground}
            />
            <Text style={[styles.actionText, { color: post.isLiked ? Colors.light.destructive : colors.mutedForeground }]}>
              {post.likesCount}
            </Text>
          </AnimatedTouchable>
          <PressableScale
            style={styles.actionBtn}
            onPress={() => setCommentModalVisible(true)}
            scaleTo={0.85}
          >
            <Icon name="chat" set="light" size={19} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              {post.commentsCount}
            </Text>
          </PressableScale>
          <PressableScale style={styles.actionBtn} onPress={() => onShare(post)} scaleTo={0.85}>
            <Icon name="send" set="light" size={19} color={colors.mutedForeground} />
          </PressableScale>
          <View style={{ flex: 1 }} />
          <AnimatedTouchable style={saveBtnStyle} onPress={handleSavePress} activeOpacity={0.75}>
            <Icon
              name="bookmark"
              set={post.isSaved ? "bold" : "light"}
              size={19}
              color={post.isSaved ? colors.primary : colors.mutedForeground}
            />
          </AnimatedTouchable>
        </View>
      </View>

      <CommentSheet
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={post.id}
        colors={colors}
        isDark={isDark}
      />

      <PostOptionsSheet
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        colors={colors}
        isOwnPost={isOwnPost}
        authorUsername={post.author?.username}
        onShare={() => onShare(post)}
        onDelete={() => onDelete(post)}
        onUnfollow={() => onUnfollow(post)}
        onReport={(reason) => onReport(post, reason)}
      />
    </Animated.View>
  );
}

function MediaSlide({
  media,
  isPostActive,
  isCurrentSlide,
  height,
  colors,
  muted,
  onToggleMuted,
  onOpenReel,
}: {
  media: PostMedia;
  isPostActive: boolean;
  isCurrentSlide: boolean;
  height: number;
  colors: any;
  muted: boolean;
  onToggleMuted: () => void;
  onOpenReel: () => void;
}) {
  const isVideo = media.type === "video";
  const isActive = isPostActive && isCurrentSlide;
  const videoThumbUrl = isVideo
    ? media.url.includes("?")
      ? media.url.replace("?", ".jpg?")
      : `${media.url}.jpg`
    : "";
  const videoPlayer = useVideoPlayer(isVideo ? media.url : null, (player) => {
    player.loop = true;
    player.muted = true;
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

  return (
    <View style={[styles.mediaSlide, { width: MEDIA_WIDTH, height, backgroundColor: colors.muted }]}>
      <Image
        source={{ uri: isVideo ? videoThumbUrl : media.url }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
      />
      {isVideo && isActive ? (
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onOpenReel}>
          <VideoView
            player={videoPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls={false}
          />
        </TouchableOpacity>
      ) : null}
      {isVideo ? (
        <TouchableOpacity style={styles.videoBadge} onPress={onToggleMuted} hitSlop={8}>
          <Icon
            name={!isActive ? "video" : muted ? "volume-off" : "volume-up"}
            set="bold"
            size={14}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function PostOptionsSheet({
  visible,
  onClose,
  colors,
  isOwnPost,
  authorUsername,
  onShare,
  onDelete,
  onUnfollow,
  onReport,
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
  isOwnPost: boolean;
  authorUsername?: string;
  onShare: () => void;
  onDelete: () => void;
  onUnfollow: () => void;
  onReport: (reason: string) => void;
}) {
  const [reportVisible, setReportVisible] = useState(false);

  const confirmDelete = () => {
    onClose();
    Alert.alert("Delete post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  const confirmUnfollow = () => {
    onClose();
    Alert.alert(`Unfollow ${authorUsername || "this user"}?`, undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Unfollow", style: "destructive", onPress: onUnfollow },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.optionsSheet, { backgroundColor: colors.card }]}>
        {isOwnPost ? (
          <TouchableOpacity style={styles.optionRow} onPress={confirmDelete}>
            <Icon name="delete" set="light" size={20} color={Colors.light.destructive} />
            <Text style={[styles.optionText, { color: Colors.light.destructive }]}>Delete post</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.optionRow} onPress={confirmUnfollow}>
            <Icon name="close-square" set="light" size={20} color={Colors.light.destructive} />
            <Text style={[styles.optionText, { color: Colors.light.destructive }]}>Unfollow</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => {
            onClose();
            onShare();
          }}
        >
          <Icon name="send" set="light" size={20} color={colors.foreground} />
          <Text style={[styles.optionText, { color: colors.foreground }]}>Share</Text>
        </TouchableOpacity>
        {!isOwnPost ? (
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => {
              onClose();
              setReportVisible(true);
            }}
          >
            <Ionicons name="flag-outline" size={20} color={Colors.light.destructive} />
            <Text style={[styles.optionText, { color: Colors.light.destructive }]}>Report</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.optionRow, styles.optionCancel]} onPress={onClose}>
          <Text style={[styles.optionText, { color: colors.mutedForeground, textAlign: "center", flex: 1 }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
      <ReportSheet
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        colors={colors}
        onSubmit={onReport}
      />
    </Modal>
  );
}

function extractId(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "object" && obj.$oid) return obj.$oid;
  if (typeof obj.toString === "function") {
    const s = obj.toString();
    if (s !== "[object Object]" && s.length === 24) return s;
  }
  return "";
}

function normalizeComment(c: any): Comment {
  return {
    ...c,
    id: extractId(c.id) || extractId(c._id),
    author: c.author,
    replies: c.replies?.map(normalizeComment) || [],
  };
}

export function CommentSheet({
  visible,
  onClose,
  postId,
  colors,
  isDark,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
  colors: any;
  isDark: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const mentionQuery = useMentionQuery(text);
  const inputRef = useRef<TextInput>(null);
  const expandedRef = useRef(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);
  const sheetHeight = useSharedValue(SHEET_HEIGHT_DEFAULT);

  useEffect(() => {
    if (visible) {
      expandedRef.current = false;
      sheetHeight.value = SHEET_HEIGHT_DEFAULT;
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
      overlayOpacity.value = withTiming(1, { duration: 300 });
      setLoading(true);
      api
        .get(API.comments.list(postId))
        .then(({ data }) => {
          const raw = data.comments || data.data || data || [];
          setComments(raw.map(normalizeComment));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 350, easing: Easing.in(Easing.cubic) });
      overlayOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible, postId]);

  const dismiss = () => {
    "worklet";
    runOnJS(onClose)();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 800) {
        dismiss();
      } else {
        translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
      }
    });

  const sheetHeightStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleScroll = (e: any) => {
    if (expandedRef.current) return;
    const y = e.nativeEvent.contentOffset.y;
    if (y > 200 && !expandedRef.current) {
      expandedRef.current = true;
      sheetHeight.value = withTiming(SHEET_HEIGHT_EXPANDED, { duration: 350, easing: Easing.out(Easing.cubic) });
    }
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const payload: any = { text: text.trim() };
    if (replyTo) {
      payload.parentComment = replyTo.id;
    }
    try {
      const { data } = await api.post(`/api/comments/post/${postId}`, payload);
      const newComment = normalizeComment(data.comment);
      if (newComment) {
        if (replyTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyTo.id
                ? { ...c, replies: [...(c.replies || []), newComment] }
                : c
            )
          );
        } else {
          setComments((prev) => [...prev, newComment]);
        }
      }
      setText("");
      setReplyTo(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e: any) {
      console.log("Comment error:", e?.response?.status, e?.message);
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const prev = comments;

    let targetComment: Comment | undefined;
    const find = (list: Comment[]): Comment | undefined => {
      for (const c of list) {
        if (c.id === commentId) return c;
        if (c.replies) {
          const found = find(c.replies);
          if (found) return found;
        }
      }
      return undefined;
    };
    targetComment = find(comments);
    if (!targetComment) return;

    const wasLiked = targetComment.isLiked;
    const wasCount = targetComment.likesCount;
    const newLiked = !wasLiked;
    const newCount = wasLiked ? wasCount - 1 : wasCount + 1;

    const apply = (list: Comment[]): Comment[] =>
      list.map((c) => {
        if (c.id === commentId) return { ...c, isLiked: newLiked, likesCount: newCount };
        if (c.replies) return { ...c, replies: apply(c.replies) };
        return c;
      });

    setComments(apply(comments));

    try {
      const { data } = await api.post(API.comments.like(commentId));
      const serverCount = data.comment?.likesCount ?? newCount;
      setComments((cur) =>
        cur.map((c) => {
          if (c.id === commentId) return { ...c, isLiked: data.isLiked, likesCount: serverCount };
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId ? { ...r, isLiked: data.isLiked, likesCount: serverCount } : r
              ),
            };
          }
          return c;
        })
      );
    } catch {
      setComments(prev);
    }
  };

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Animated.View style={[styles.sheetOverlay, overlayStyle]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheetContent,
              sheetStyle,
              sheetHeightStyle,
              { backgroundColor: colors.background },
              Shadows[isDark ? "dark" : "light"]["soft-xl"],
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.mutedForeground + "40" }]} />

            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.commentList}
                onScroll={handleScroll}
                scrollEventThrottle={100}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No comments yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <CommentItem
                    comment={item}
                    colors={colors}
                    isDark={isDark}
                    onLike={(c) => handleLikeComment(c.id)}
                    onReply={(c) => {
                      setReplyTo(c);
                    }}
                    depth={0}
                  />
                )}
              />
            )}

            {replyTo && (
              <View style={[styles.replyBanner, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}>
                <Text style={[styles.replyText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  Replying to {replyTo.author?.username}
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}>
                  <Icon name="close-square" set="light" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )}

            <MentionSuggestions
              query={mentionQuery}
              colors={colors}
              onSelect={(username) => setText((t) => applyMentionSelection(t, username))}
            />

            <View style={[styles.commentInput, { borderTopColor: colors.border + "66", backgroundColor: colors.card }]}>
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? `Reply to ${replyTo.author?.username}...` : "Add a comment..."}
                placeholderTextColor={colors.mutedForeground + "80"}
                style={[styles.commentTextInput, { color: colors.foreground }]}
                blurOnSubmit={false}
              />
              <TouchableOpacity onPress={handleSend} disabled={!text.trim() || sending}>
                <Icon
                  name="send"
                  set="bold"
                  size={20}
                  color={text.trim() ? colors.primary : colors.mutedForeground + "40"}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

function CommentItem({
  comment,
  colors,
  isDark,
  onLike,
  onReply,
  depth,
}: {
  comment: Comment;
  colors: any;
  isDark: boolean;
  onLike: (c: Comment) => void;
  onReply: (c: Comment) => void;
  depth: number;
}) {
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <View style={[styles.commentItem, depth > 0 && { marginLeft: 36 }]}>
      <View style={styles.commentRow}>
        {comment.author ? (
          <UserLink user={comment.author} colors={colors} avatarSize={28} showUsername={false} />
        ) : (
          <View style={[styles.commentAvatar, { backgroundColor: colors.muted }]}>
            <Icon name="user" set="light" size={12} color={colors.mutedForeground} />
          </View>
        )}
        <View style={styles.commentBody}>
          {comment.author ? (
            <UserLink user={comment.author} colors={colors} showAvatar={false} usernameStyle={styles.commentUser} />
          ) : (
            <Text style={[styles.commentUser, { color: colors.foreground }]}>User</Text>
          )}
          <Text style={[styles.commentText, { color: colors.foreground }]}>
            {renderRichText(comment.text || comment.content, colors.primary, `cmt-${comment.id}`)}
          </Text>
          <View style={styles.commentActions}>
            <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>
              {timeAgo(comment.createdAt)}
            </Text>
            {depth === 0 && (
              <TouchableOpacity style={styles.commentActionBtn} onPress={() => onReply(comment)}>
                <Text style={[styles.commentActionText, { color: colors.mutedForeground }]}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.commentLikeBtn} onPress={() => onLike(comment)}>
          <Icon
            name="heart"
            set={comment.isLiked ? "bold" : "light"}
            size={14}
            color={comment.isLiked ? Colors.light.destructive : colors.mutedForeground}
          />
          {comment.likesCount > 0 && (
            <Text style={[styles.commentLikeCount, { color: comment.isLiked ? Colors.light.destructive : colors.mutedForeground }]}>
              {comment.likesCount}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {hasReplies &&
        comment.replies!.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            colors={colors}
            isDark={isDark}
            onLike={onLike}
            onReply={onReply}
            depth={depth + 1}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    overflow: "hidden",
  },
  headerTitle: {
    ...Typography.h3,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingVertical: Spacing.sm,
    paddingBottom: 100,
  },
  emptyState: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    ...Typography.body,
  },
  postCard: {
    marginBottom: 0,
    marginTop: 0,
  },
  card: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0,
    padding: Spacing.base,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  postHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  moreBtn: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  postMeta: {
    flex: 1,
  },
  username: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.bodySmall.fontSize,
    lineHeight: Typography.bodySmall.lineHeight,
  },
  timeAgo: {
    fontSize: 11,
    marginTop: 1,
  },
  mediaWrap: {
    marginHorizontal: -Spacing.base,
    marginBottom: Spacing.sm,
  },
  postImage: {
    width: "100%",
    height: 320,
    backgroundColor: "#00000010",
  },
  mediaSlide: {
    overflow: "hidden",
  },
  heartOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  videoBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  caption: {
    ...Typography.bodySmall,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  postActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    ...Typography.caption,
  },
  sheetRoot: {
    flex: 1,
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  commentList: {
    padding: Spacing.lg,
    paddingBottom: 8,
  },
  commentItem: {
    marginBottom: 4,
  },
  commentRow: {
    flexDirection: "row",
    paddingVertical: 10,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  commentAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  commentBody: {
    flex: 1,
  },
  commentUser: {
    fontFamily: FontFamily.semibold,
    fontSize: Typography.bodySmall.fontSize,
    lineHeight: Typography.bodySmall.lineHeight,
    marginBottom: 2,
  },
  commentText: {
    ...Typography.bodySmall,
    lineHeight: 18,
  },
  commentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 6,
  },
  commentTime: {
    fontSize: 11,
  },
  commentActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  commentActionText: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
  },
  commentLikeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    marginTop: 10,
    marginLeft: 6,
    paddingVertical: 4,
  },
  commentLikeCount: {
    fontSize: 11,
  },
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderLeftWidth: 3,
  },
  replyText: {
    ...Typography.caption,
    flex: 1,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    gap: 12,
  },
  commentTextInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 8,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  optionsSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 16,
  },
  optionText: {
    ...Typography.body,
    fontFamily: FontFamily.semibold,
  },
  optionCancel: {
    justifyContent: "center",
    marginTop: 4,
  },
});

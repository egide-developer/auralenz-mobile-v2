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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useCallback, useEffect, useState, useRef } from "react";
import { router } from "expo-router";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors } from "../../src/theme/colors";
import { Radius, Spacing } from "../../src/theme/spacing";
import { Typography } from "../../src/theme/typography";
import { Shadows } from "../../src/theme/shadows";
import api from "../../src/api/client";
import { API } from "../../src/api/endpoints";
import { Icon } from "../../src/components/ui/Icon";
import type { Post, Comment } from "../../src/types";

export default function FeedScreen() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await api.get(API.posts.list);
      setPosts(data.posts || data.data || data.items || data);
    } catch (e: any) {
      console.log("Fetch posts error:", e?.response?.status, e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

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
          p.id === post.id
            ? { ...p, isLiked: wasLiked, likesCount: wasCount }
            : p
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

  const handleDelete = useCallback(async (postId: string) => {
    try {
      await api.delete(API.posts.byId(postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
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
      <View style={[styles.header, { borderBottomColor: colors.border + "66" }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>AuraLenz</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/search")}
            style={[styles.headerBtn, { backgroundColor: colors.card + "80" }]}
          >
            <Icon name="search" set="light" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/notifications")}
            style={[styles.headerBtn, { backgroundColor: colors.card + "80" }]}
          >
            <Icon name="notification" set="light" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="image" set="light" size={48} color={colors.mutedForeground + "60"} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No posts yet
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            colors={colors}
            isDark={isDark}
            onLike={handleLike}
            onSave={handleSave}
            onShare={handleShare}
            onDelete={handleDelete}
          />
        )}
      />
    </View>
  );
}

function PostCard({
  post,
  colors,
  isDark,
  onLike,
  onSave,
  onShare,
  onDelete,
}: {
  post: Post;
  colors: any;
  isDark: boolean;
  onLike: (p: Post) => void;
  onSave: (p: Post) => void;
  onShare: (p: Post) => void;
  onDelete: (id: string) => void;
}) {
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const firstMedia = post.media?.[0];

  return (
    <View style={styles.postCard}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border + "30" }, Shadows[isDark ? "dark" : "light"]["soft"]]}>
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            {post.author?.avatarUrl ? (
              <Image source={{ uri: post.author.avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Icon name="user" set="light" size={18} color={colors.mutedForeground} />
            )}
          </View>
          <View style={styles.postMeta}>
            <Text style={[styles.username, { color: colors.foreground }]}>
              {post.author?.username || "User"}
            </Text>
          </View>
        </View>

        {firstMedia && firstMedia.url ? (
          <Image
            source={{ uri: firstMedia.url }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : null}

        {post.caption ? (
          <Text style={[styles.caption, { color: colors.foreground }]}>
            {post.caption}
          </Text>
        ) : null}

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post)}>
            <Icon
              name="heart"
              set={post.isLiked ? "bold" : "light"}
              size={18}
              color={post.isLiked ? Colors.light.destructive : colors.mutedForeground}
            />
            <Text style={[styles.actionText, { color: post.isLiked ? Colors.light.destructive : colors.mutedForeground }]}>
              {post.likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setCommentModalVisible(true)}>
            <Icon name="chat" set="light" size={18} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>
              {post.commentsCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => onShare(post)}>
            <Icon name="send" set="light" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.actionBtn} onPress={() => onSave(post)}>
            <Icon
              name="bookmark"
              set={post.isSaved ? "bold" : "light"}
              size={18}
              color={post.isSaved ? Colors.light.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        postId={post.id}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}

function CommentModal({
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

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api
      .get(API.comments.list(postId))
      .then(({ data }) => {
        setComments(data.comments || data.data || data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, postId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/comments/post/${postId}`, { text: text.trim() });
      const newComment = data.comment;
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
      }
      setText("");
    } catch (e: any) {
      console.log("Comment error:", e?.response?.status, e?.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border + "66" }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close-square" set="light" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.commentList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No comments yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.commentRow, { borderBottomColor: colors.border + "30" }]}>
                <View style={[styles.commentAvatar, { backgroundColor: colors.muted }]}>
                  <Icon name="user" set="light" size={14} color={colors.mutedForeground} />
                </View>
                <View style={styles.commentBody}>
                  <Text style={[styles.commentUser, { color: colors.foreground }]}>
                    {item.author?.username || "User"}
                  </Text>
                  <Text style={[styles.commentText, { color: colors.foreground }]}>{item.text || item.content}</Text>
                </View>
              </View>
            )}
          />
        )}

        <View style={[styles.commentInput, { borderTopColor: colors.border + "66", backgroundColor: colors.card }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment..."
            placeholderTextColor={colors.mutedForeground + "80"}
            style={[styles.commentTextInput, { color: colors.foreground }]}
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
      </View>
    </Modal>
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.base,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
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
    ...Typography.bodySmall,
    fontWeight: "600",
  },
  postImage: {
    width: "100%",
    height: 300,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: "#00000010",
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
  },
  modalTitle: {
    ...Typography.h3,
  },
  commentList: {
    padding: Spacing.lg,
  },
  commentRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentUser: {
    ...Typography.bodySmall,
    fontWeight: "600",
    marginBottom: 2,
  },
  commentText: {
    ...Typography.bodySmall,
    lineHeight: 18,
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
});

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Radius, Spacing } from "../../theme/spacing";
import { Typography } from "../../theme/typography";
import { formatCount } from "../../utils/format";
import type { Post } from "../../types";
import { CachedImage } from "../ui/CachedImage";
import { Icon } from "../ui/Icon";

interface PostTileProps {
  post: Post;
  size: number;
  onPress: () => void;
}

export function PostTile({ post, size, onPress }: PostTileProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const media = post.media?.[0];
  const uri = media?.thumbnailUrl ?? media?.url;
  const isVideo = media?.type === "video";
  const author = post.author;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel={post.caption || "Post"}
      style={[styles.tile, { width: size, height: size, backgroundColor: colors.muted }]}
    >
      {uri ? (
        <CachedImage source={{ uri }} style={styles.image} contentFit="cover" />
      ) : null}
      {isVideo ? (
        <View style={styles.videoBadge}>
          <Icon name="video" set="bold" size={12} color="#FFFFFF" />
        </View>
      ) : null}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.62)"]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
        style={styles.overlay}
        pointerEvents="none"
      />
      <View style={styles.meta} pointerEvents="none">
        {author.avatarUrl ? (
          <CachedImage
            source={{ uri: author.avatarUrl }}
            style={styles.authorAvatar}
            contentFit="cover"
          />
        ) : null}
        <Text style={styles.author} numberOfLines={1}>
          {author.username}
        </Text>
        <View style={styles.spacer} />
        <Icon name="heart" set="light" size={12} color="#FFFFFF" />
        <Text style={styles.count} numberOfLines={1}>
          {formatCount(post.likesCount)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: Radius.md,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  meta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  authorAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  author: {
    ...Typography.caption,
    color: "#FFFFFF",
    flexShrink: 1,
    maxWidth: "55%",
  },
  spacer: {
    flex: 1,
  },
  count: {
    ...Typography.caption,
    color: "#FFFFFF",
  },
});

export default PostTile;

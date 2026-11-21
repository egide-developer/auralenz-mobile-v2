import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Gap, Spacing } from "../../theme/spacing";
import { Typography } from "../../theme/typography";
import { formatCount } from "../../utils/format";
import type { UserPreview } from "../../types";
import { CachedImage } from "../ui/CachedImage";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { HighlightedText } from "./HighlightedText";

export function UserAvatar({ user, size = 44 }: { user: UserPreview; size?: number }) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.muted },
      ]}
    >
      {user.avatarUrl ? (
        <CachedImage
          source={{ uri: user.avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      ) : (
        <Icon name="user" set="light" size={size * 0.45} color={colors.mutedForeground} />
      )}
    </View>
  );
}

/** Second line: `@handle · N followers` when counts are known, otherwise the bio. */
export function userSubtitle(user: UserPreview): string {
  if (user.followersCount != null) {
    return `@${user.username} · ${formatCount(user.followersCount)} followers`;
  }
  return user.bio ?? "";
}

interface UserRowProps {
  user: UserPreview;
  query?: string;
  isFollowing?: boolean;
  isSelf?: boolean;
  onPress: () => void;
  onFollow: () => void;
}

export function UserRow({ user, query, isFollowing, isSelf, onPress, onFollow }: UserRowProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;
  const primary = user.displayName || user.username;
  const subtitle = userSubtitle(user);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <TouchableOpacity style={styles.main} activeOpacity={0.7} onPress={onPress}>
        <UserAvatar user={user} />
        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <HighlightedText
              text={primary}
              query={query}
              numberOfLines={1}
              style={[styles.name, { color: colors.foreground }]}
              highlightStyle={{ color: colors.primary }}
            />
            {user.isVerified ? (
              <Icon name="tick-square" set="bold" size={14} color={colors.verified} />
            ) : null}
          </View>
          {subtitle ? (
            <HighlightedText
              text={subtitle}
              query={query}
              numberOfLines={1}
              style={[styles.subtitle, { color: colors.mutedForeground }]}
              highlightStyle={{ color: colors.primary }}
            />
          ) : null}
        </View>
      </TouchableOpacity>
      {!isSelf ? (
        <Button
          title={isFollowing ? "Following" : "Follow"}
          variant={isFollowing ? "outline" : "primary"}
          size="sm"
          onPress={onFollow}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.xs,
  },
  name: {
    ...Typography.bodySmall,
    flexShrink: 1,
  },
  subtitle: {
    ...Typography.caption,
  },
});

export default UserRow;

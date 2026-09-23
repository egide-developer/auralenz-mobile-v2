// Single reusable "who is this" building block: an avatar (optionally with a
// green online dot, and a story ring when the user has an active story) and
// the username, each independently tappable. Used anywhere a user's avatar
// and/or username is shown across the app so navigation-to-profile and
// open-story-on-avatar-tap behave identically everywhere instead of each
// screen reimplementing it slightly differently.
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Icon } from "./Icon";

export interface UserLinkUser {
  id?: string;
  username: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  hasStory?: boolean;
  hasUnviewedStory?: boolean;
}

export function UserLink({
  user,
  colors,
  avatarSize = 36,
  showAvatar = true,
  showUsername = true,
  usernameStyle,
  gap = 8,
  row = true,
}: {
  user: UserLinkUser;
  colors: any;
  avatarSize?: number;
  showAvatar?: boolean;
  showUsername?: boolean;
  usernameStyle?: any;
  gap?: number;
  row?: boolean;
}) {
  if (!user?.username) return null;

  const goToProfile = () => router.push(`/profile/${user.username}`);
  const openAvatar = () => {
    if (user.hasStory && user.id) {
      router.push(`/story/${user.id}`);
    } else {
      goToProfile();
    }
  };

  const dotSize = Math.max(10, Math.round(avatarSize * 0.28));

  return (
    <View style={[styles.wrap, { flexDirection: row ? "row" : "column", alignItems: "center", gap }]}>
      {showAvatar ? (
        <TouchableOpacity activeOpacity={0.8} onPress={openAvatar}>
          <View
            style={[
              styles.avatarOuter,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
                backgroundColor: colors.muted,
                borderWidth: user.hasUnviewedStory ? 2 : 0,
                borderColor: colors.primary,
              },
            ]}
          >
            {user.avatarUrl ? (
              <Image
                source={{ uri: user.avatarUrl }}
                style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
              />
            ) : (
              <Icon name="user" set="light" size={Math.round(avatarSize * 0.5)} color={colors.mutedForeground} />
            )}
            {user.isOnline ? (
              <View
                style={[
                  styles.onlineDot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: colors.online,
                    borderColor: colors.background,
                  },
                ]}
              />
            ) : null}
          </View>
        </TouchableOpacity>
      ) : null}

      {showUsername ? (
        <TouchableOpacity activeOpacity={0.7} onPress={goToProfile} style={styles.usernameRow}>
          <Text numberOfLines={1} style={[styles.username, { color: colors.foreground }, usernameStyle]}>
            {user.username}
          </Text>
          {user.isVerified ? (
            <Icon name="shield" set="bold" size={13} color={colors.primary} style={{ marginLeft: 3 }} />
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  avatarOuter: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  onlineDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    borderWidth: 2,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
  },
});

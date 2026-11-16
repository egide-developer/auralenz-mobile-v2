import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HighlightsRow } from "../../src/components/profile/HighlightsRow";
import {
  LogoutButton,
  ProfileHeader,
  ProfileIdentity,
  QuickActions,
  SettingsSection,
  StatsCard,
  type ProfileSettingsRow,
} from "../../src/components/profile/ProfileScreenParts";
import { showToast } from "../../src/stores/toastStore";
import { useAuthStore } from "../../src/stores/authStore";
import { useThemeStore } from "../../src/stores/themeStore";
import { Colors, ProfileColors } from "../../src/theme/colors";
import { ProfileLayout, Spacing } from "../../src/theme/spacing";
import { useOwnProfile } from "../../src/hooks/useProfilePosts";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const authLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const isDark = useThemeStore((state) => state.isDark);
  const palette = isDark ? ProfileColors.dark : ProfileColors.light;
  const appColors = isDark ? Colors.dark : Colors.light;

  const { profile, isLoading, error, refresh } = useOwnProfile();
  const user = useAuthStore((state) => state.user);

  const mergedUser = profile && user ? {
    ...user,
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName ?? undefined,
    bio: profile.bio ?? undefined,
    avatarUrl: profile.avatar ?? undefined,
    postsCount: profile.counts.posts,
    followersCount: profile.counts.followers,
    followingCount: profile.counts.following,
  } : user;

  const [refreshing, setRefreshing] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.warn("Profile refresh failed", error);
      showToast("Couldn't refresh your profile", "error");
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const navigateToEditProfile = useCallback(() => {
    router.push("/(modals)/edit-profile");
  }, [router]);

  const navigateToSettings = useCallback(() => {
    router.push("/(modals)/settings");
  }, [router]);

  const shareProfile = useCallback(async () => {
    if (!mergedUser?.username) return;
    const profileUrl = Linking.createURL(`/profile/${encodeURIComponent(mergedUser.username)}`);
    const displayName = mergedUser.displayName?.trim() || mergedUser.username;
    try {
      await Share.share({
        message: `${displayName} (@${mergedUser.username}) on AuraLenz\n${profileUrl}`,
      });
    } catch (error) {
      console.warn("Profile sharing failed", error);
      showToast("Couldn't share your profile", "error");
    }
  }, [mergedUser]);

  const navigateToFollowList = useCallback(
    (mode: "followers" | "following", title: string) => {
      if (!mergedUser?.id) return;
      router.push({
        pathname: "/profile/follow-list",
        params: { userId: mergedUser.id, mode, title },
      });
    },
    [router, mergedUser?.id],
  );

  const onLogout = useCallback(async () => {
    try {
      await logout();
      return true;
    } catch (error) {
      console.warn("Log out failed", error);
      showToast("Couldn't log out", "error");
      return false;
    }
  }, [logout]);

  const accountRows: ProfileSettingsRow[] = [
    {
      label: "Notifications",
      icon: "notification",
      onPress: () => router.push("/(modals)/notifications"),
    },
    {
      label: "Wallet & stars",
      icon: "wallet",
      value: "Unavailable",
      valueColor: palette.accent,
      loadingValue: authLoading,
      onPress: () => router.push("/(modals)/wallet"),
    },
    {
      label: "Subscriptions",
      icon: "ticket",
      onPress: () => router.push("/(modals)/subscriptions"),
    },
  ];

  const quickActions = [
    {
      label: "Saved",
      icon: "bookmark",
      onPress: () => router.push("/(modals)/saved-posts"),
    },
    {
      label: "Library",
      icon: "folder",
      onPress: () => router.push("/(modals)/library"),
    },
    {
      label: "Archive",
      icon: "document",
      onPress: () => router.push("/(modals)/archived-posts"),
    },
    {
      label: "Close friends",
      icon: "star",
      onPress: () => router.push("/(modals)/close-friends"),
    },
  ];

  const highlightColors = {
    ...appColors,
    background: palette.background,
    border: palette.hairline,
    muted: palette.elevated,
    mutedForeground: palette.muted,
    foreground: palette.foreground,
    primary: palette.accent,
    primaryForeground: palette.accentForeground,
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <ProfileHeader
        safeAreaTop={insets.top}
        scrolled={headerScrolled}
        isDark={isDark}
        palette={palette}
        onSettings={navigateToSettings}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: ProfileLayout.scrollBottomPadding + insets.bottom,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
            colors={[palette.accent]}
          />
        }
        onScroll={(event) => {
          setHeaderScrolled(
            event.nativeEvent.contentOffset.y > ProfileLayout.headerScrollThreshold,
          );
        }}
        scrollEventThrottle={ProfileLayout.scrollEventThrottleMs}
      >
        <View style={styles.contentStack}>
          <ProfileIdentity
            user={mergedUser}
            loading={authLoading || isLoading}
            palette={palette}
            onEdit={navigateToEditProfile}
            onShare={() => void shareProfile()}
          />

          <StatsCard
            posts={mergedUser?.postsCount ?? 0}
            followers={mergedUser?.followersCount ?? 0}
            following={mergedUser?.followingCount ?? 0}
            loading={authLoading || isLoading}
            palette={palette}
            onFollowers={() => navigateToFollowList("followers", "Followers")}
            onFollowing={() => navigateToFollowList("following", "Following")}
          />

          {mergedUser?.id ? (
            <HighlightsRow userId={mergedUser.id} colors={highlightColors} />
          ) : null}

          <QuickActions actions={quickActions} palette={palette} />

          <SettingsSection
            title="Account"
            rows={accountRows}
            palette={palette}
          />

          {mergedUser?.role === "admin" ? (
            <SettingsSection
              title="Admin"
              rows={[
                {
                  label: "Admin",
                  icon: "shield",
                  onPress: () => router.push("/(modals)/admin"),
                },
              ]}
              palette={palette}
              emphasized
            />
          ) : null}

          <LogoutButton
            palette={palette}
            safeAreaBottom={insets.bottom}
            onConfirm={onLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    paddingHorizontal: ProfileLayout.pagePadding,
    paddingTop: Spacing.sm,
  },
  contentStack: {
    gap: Spacing.xl,
  },
});

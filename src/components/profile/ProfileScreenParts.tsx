import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { CachedImage } from "../ui/CachedImage";
import { Icon } from "../ui/Icon";
import { PressableScale } from "../ui/PressableScale";
import { Skeleton } from "../skeletons/Skeleton";
import { ProfileHeaderSkeleton } from "../skeletons/ProfileHeaderSkeleton";
import { ProfileColors } from "../../theme/colors";
import {
  Gap,
  IconSize,
  ProfileLayout,
  Radius,
  Spacing,
} from "../../theme/spacing";
import { FontFamily, FontSize, Typography } from "../../theme/typography";
import type { User } from "../../types";

type ProfilePalette = (typeof ProfileColors)[keyof typeof ProfileColors];

export function ProfileHeader({
  safeAreaTop,
  scrolled,
  isDark,
  palette,
  onSettings,
}: {
  safeAreaTop: number;
  scrolled: boolean;
  isDark: boolean;
  palette: ProfilePalette;
  onSettings: () => void;
}) {
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: safeAreaTop,
          backgroundColor: scrolled ? palette.headerOverlay : palette.background,
          borderBottomColor: palette.hairline,
          borderBottomWidth: scrolled ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      {scrolled ? (
        <BlurView
          intensity={ProfileLayout.headerBlurIntensity}
          tint={isDark ? "dark" : "light"}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.headerInner}>
        <Text style={[styles.headerTitle, { color: palette.foreground }]}>Profile</Text>
        <TouchableOpacity
          onPress={onSettings}
          hitSlop={ProfileLayout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={[
            styles.settingsButton,
            { backgroundColor: palette.surface, borderColor: palette.hairline },
          ]}
        >
          <Icon name="setting" set="light" size={IconSize.md} color={palette.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function ProfileIdentity({
  user,
  loading,
  palette,
  onEdit,
  onShare,
}: {
  user: User | null;
  loading: boolean;
  palette: ProfilePalette;
  onEdit: () => void;
  onShare: () => void;
}) {
  const displayName = user?.displayName?.trim() || user?.username || "User";
  const username = user?.username ? `@${user.username}` : "";

  if (loading) {
    return <ProfileHeaderSkeleton includeStats={false} />;
  }

  return (
    <View style={styles.identity}>
      <View style={styles.avatarWrap}>
        <View
          style={[
            styles.avatarFrame,
            {
              width: ProfileLayout.avatarSize,
              height: ProfileLayout.avatarSize,
              borderRadius: ProfileLayout.avatarSize / 2,
              borderWidth: ProfileLayout.avatarRingWidth,
              borderColor: palette.accent,
            },
          ]}
        >
          <View
            style={[
              styles.avatarClip,
              {
                borderRadius:
                  ProfileLayout.avatarSize / 2 - ProfileLayout.avatarRingWidth,
                backgroundColor: palette.elevated,
              },
            ]}
          >
            {user?.avatarUrl ? (
              <CachedImage
                source={{ uri: user.avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={palette.avatarGradient}
                style={styles.avatarInitials}
              >
                <Text style={[styles.initials, { color: palette.foreground }]}>
                  {getInitials(displayName)}
                </Text>
              </LinearGradient>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={onEdit}
          hitSlop={ProfileLayout.avatarEditHitSlop}
          accessibilityRole="button"
          accessibilityLabel="Edit profile photo"
          style={[
            styles.avatarEditBadge,
            {
              width: ProfileLayout.avatarEditBadgeSize,
              height: ProfileLayout.avatarEditBadgeSize,
              borderRadius: ProfileLayout.avatarEditBadgeSize / 2,
              borderWidth: ProfileLayout.avatarEditBadgeBorderWidth,
              backgroundColor: palette.accent,
              borderColor: palette.background,
            },
          ]}
        >
          <Icon name="edit" set="bold" size={IconSize.sm} color={palette.accentForeground} />
        </TouchableOpacity>
      </View>

      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.displayName, { color: palette.foreground }]}
      >
        {displayName}
      </Text>
      {username ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.username, { color: palette.muted }]}
        >
          {username}
        </Text>
      ) : null}
      {user?.bio ? (
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[styles.bio, { color: palette.muted }]}
        >
          {user.bio}
        </Text>
      ) : null}

      <View style={styles.identityActions}>
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          style={[
            styles.editProfileButton,
            {
              borderColor: palette.hairline,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <Icon name="edit-square" set="light" size={IconSize.sm} color={palette.foreground} />
          <Text style={[styles.editProfileText, { color: palette.foreground }]}>
            Edit profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onShare}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Share profile"
          style={[
            styles.shareButton,
            {
              borderColor: palette.hairline,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <Icon name="send" set="light" size={IconSize.md} color={palette.foreground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function StatsCard({
  posts,
  followers,
  following,
  loading,
  palette,
  onFollowers,
  onFollowing,
}: {
  posts: number;
  followers: number;
  following: number;
  loading: boolean;
  palette: ProfilePalette;
  onFollowers: () => void;
  onFollowing: () => void;
}) {
  return (
    <View
      style={[
        styles.statsCard,
        { backgroundColor: palette.surface, borderColor: palette.hairline },
      ]}
    >
      <StatColumn value={posts} label="Posts" loading={loading} palette={palette} />
      <View style={[styles.statDivider, { backgroundColor: palette.hairline }]} />
      <StatColumn
        value={followers}
        label="Followers"
        loading={loading}
        palette={palette}
        onPress={onFollowers}
      />
      <View style={[styles.statDivider, { backgroundColor: palette.hairline }]} />
      <StatColumn
        value={following}
        label="Following"
        loading={loading}
        palette={palette}
        onPress={onFollowing}
      />
    </View>
  );
}

function StatColumn({
  value,
  label,
  loading,
  palette,
  onPress,
}: {
  value: number;
  label: string;
  loading: boolean;
  palette: ProfilePalette;
  onPress?: () => void;
}) {
  const content = (
    <>
      {loading ? (
        <Skeleton width={ProfileLayout.statSkeletonWidth} height={Spacing.lg} />
      ) : (
        <AnimatedCount value={value} color={palette.foreground} />
      )}
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.statColumn}>{content}</View>;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${formatCount(value)}`}
      style={styles.statColumn}
    >
      {content}
    </TouchableOpacity>
  );
}

function AnimatedCount({ value, color }: { value: number; color: string }) {
  const [count, setCount] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const target = Math.max(0, value);
    let startTime: number | null = null;
    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const progress = Math.min(
        (time - startTime) / ProfileLayout.counterDurationMs,
        1,
      );
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(animate);
    };

    frame.current = requestAnimationFrame(animate);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [value]);

  return (
    <Text
      style={[
        styles.statValue,
        { color, fontVariant: ["tabular-nums"] },
      ]}
    >
      {formatCount(count)}
    </Text>
  );
}

export function QuickActions({
  actions,
  palette,
}: {
  actions: Array<{ label: string; icon: string; onPress: () => void }>;
  palette: ProfilePalette;
}) {
  return (
    <View style={styles.quickActions}>
      {actions.map((action) => (
        <PressableScale
          key={action.label}
          onPress={action.onPress}
          scaleTo={ProfileLayout.pressScale}
          style={styles.quickAction}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <View
            style={[
              styles.quickActionIcon,
              { backgroundColor: palette.accentTint },
            ]}
          >
            <Icon name={action.icon} set="light" size={IconSize.md} color={palette.accent} />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.quickActionLabel, { color: palette.muted }]}
          >
            {action.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

export interface ProfileSettingsRow {
  label: string;
  icon: string;
  onPress: () => void;
  value?: string | null;
  valueColor?: string;
  badgeCount?: number;
  loadingValue?: boolean;
}

export function SettingsSection({
  title,
  rows,
  palette,
  emphasized = false,
}: {
  title: string;
  rows: ProfileSettingsRow[];
  palette: ProfilePalette;
  emphasized?: boolean;
}) {
  return (
    <View style={styles.settingsSection}>
      <Text style={[styles.sectionLabel, { color: palette.muted }]}>{title}</Text>
      <View
        style={[
          styles.settingsCard,
          {
            backgroundColor: emphasized ? palette.accentTint : palette.surface,
            borderColor: emphasized ? palette.accentBorder : palette.hairline,
          },
        ]}
      >
        {rows.map((row, index) => (
          <SettingsRow
            key={row.label}
            row={row}
            palette={palette}
            last={index === rows.length - 1}
            emphasized={emphasized}
          />
        ))}
      </View>
    </View>
  );
}

export function SettingsRow({
  row,
  palette,
  last,
  emphasized = false,
}: {
  row: ProfileSettingsRow;
  palette: ProfilePalette;
  last: boolean;
  emphasized?: boolean;
}) {
  return (
    <View>
      <TouchableOpacity
        onPress={row.onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={
          row.badgeCount && row.badgeCount > 0
            ? `${row.label}, ${formatCount(row.badgeCount)} unread`
            : row.label
        }
        style={styles.settingsRow}
      >
        <View
          style={[
            styles.settingsIconWrap,
            {
              backgroundColor: emphasized ? palette.accentTint : palette.elevated,
            },
          ]}
        >
          <Icon
            name={row.icon}
            set="light"
            size={IconSize.md}
            color={emphasized ? palette.accent : palette.muted}
          />
        </View>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.settingsLabel,
            { color: palette.foreground, flex: 1 },
          ]}
        >
          {row.label}
        </Text>
        {row.loadingValue ? (
          <Skeleton width={Spacing["2xl"]} height={Spacing.sm} />
        ) : row.badgeCount && row.badgeCount > 0 ? (
          <View style={[styles.unreadBadge, { backgroundColor: palette.accentTint }]}>
            <Text style={[styles.unreadBadgeText, { color: palette.accent }]}>
              {row.badgeCount > 99 ? "99+" : formatCount(row.badgeCount)}
            </Text>
          </View>
        ) : row.value ? (
          <Text
            numberOfLines={1}
            style={[
              styles.settingsValue,
              { color: row.valueColor ?? palette.muted },
            ]}
          >
            {row.value}
          </Text>
        ) : null}
        <Icon name="arrow-right" set="light" size={IconSize.sm} color={palette.muted} />
      </TouchableOpacity>
      {!last ? (
        <View
          style={[
            styles.rowDivider,
            {
              left: Spacing.md + ProfileLayout.settingsIconSize + Gap.md,
              right: Spacing.md,
              backgroundColor: palette.hairline,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export function LogoutButton({
  palette,
  safeAreaBottom,
  onConfirm,
}: {
  palette: ProfilePalette;
  safeAreaBottom: number;
  onConfirm: () => Promise<boolean>;
}) {
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const confirmLogout = async () => {
    setConfirming(true);
    const succeeded = await onConfirm();
    setConfirming(false);
    if (succeeded) setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Log out"
        style={[
          styles.logoutButton,
          { backgroundColor: palette.background },
        ]}
      >
        <Icon name="logout" set="light" size={IconSize.md} color={palette.danger} />
        <Text style={[styles.logoutLabel, { color: palette.danger }]}>Log out</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close log out confirmation"
            onPress={() => setVisible(false)}
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.modalScrim }]}
          />
          <View
            style={[
              styles.confirmSheet,
              {
                paddingBottom: safeAreaBottom + Spacing.md,
                backgroundColor: palette.elevated,
                borderColor: palette.hairline,
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: palette.muted }]} />
            <Text style={[styles.confirmTitle, { color: palette.foreground }]}>
              Log out?
            </Text>
            <Text style={[styles.confirmCopy, { color: palette.muted }]}>
              You'll need to sign in again to use this account
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                disabled={confirming}
                accessibilityRole="button"
                style={[
                  styles.confirmButton,
                  { backgroundColor: palette.surface, borderColor: palette.hairline },
                ]}
              >
                <Text style={[styles.confirmButtonText, { color: palette.foreground }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void confirmLogout()}
                disabled={confirming}
                accessibilityRole="button"
                accessibilityLabel="Confirm log out"
                style={[
                  styles.confirmButton,
                  { backgroundColor: palette.danger, borderColor: palette.danger },
                ]}
              >
                <Text style={[styles.confirmButtonText, { color: palette.foreground }]}>
                  {confirming ? "Logging out..." : "Log out"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "A";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

const styles = StyleSheet.create({
  header: {
    zIndex: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInner: {
    minHeight: ProfileLayout.headerRowHeight,
    paddingHorizontal: ProfileLayout.pagePadding,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { ...Typography.h3 },
  settingsButton: {
    width: ProfileLayout.headerButtonSize,
    height: ProfileLayout.headerButtonSize,
    borderRadius: ProfileLayout.headerButtonSize / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    alignItems: "center",
    paddingTop: Spacing.sm,
  },
  avatarWrap: {
    width: ProfileLayout.avatarSize,
    height: ProfileLayout.avatarSize,
  },
  avatarFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarClip: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { ...Typography.h1 },
  avatarEditBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  displayName: {
    ...Typography.h2,
    marginTop: Spacing.md,
    maxWidth: "100%",
    textAlign: "center",
  },
  username: {
    ...Typography.bodySmall,
    marginTop: Spacing["2xs"],
    maxWidth: "100%",
  },
  bio: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
    maxWidth: ProfileLayout.bioMaxWidth,
    textAlign: "center",
  },
  identityActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.sm,
    width: "100%",
    marginTop: Spacing.md,
  },
  editProfileButton: {
    height: ProfileLayout.actionButtonHeight,
    minWidth: ProfileLayout.actionButtonHeight,
    paddingHorizontal: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.sm,
  },
  editProfileText: { ...Typography.bodySmall },
  shareButton: {
    width: ProfileLayout.actionButtonHeight,
    height: ProfileLayout.actionButtonHeight,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statsCard: {
    minHeight: ProfileLayout.statCardHeight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
    flexDirection: "row",
    alignItems: "center",
  },
  statColumn: {
    flex: 1,
    minHeight: ProfileLayout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.xs,
  },
  statValue: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize["2xl"],
    lineHeight: FontSize["2xl"] + Spacing.sm,
  },
  statLabel: { ...Typography.caption, fontSize: FontSize.sm },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: ProfileLayout.statDividerHeight,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Gap.xs,
  },
  quickAction: {
    flex: 1,
    minWidth: ProfileLayout.minimumTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
    gap: Gap.sm,
  },
  quickActionIcon: {
    width: ProfileLayout.actionIconSize,
    height: ProfileLayout.actionIconSize,
    borderRadius: ProfileLayout.actionIconSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: { ...Typography.bodySmall, textAlign: "center" },
  settingsSection: { gap: Gap.sm },
  sectionLabel: { ...Typography.bodySmall, paddingHorizontal: Spacing.xs },
  settingsCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
    overflow: "hidden",
  },
  settingsRow: {
    minHeight: ProfileLayout.settingsRowHeight,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
  },
  settingsIconWrap: {
    width: ProfileLayout.settingsIconSize,
    height: ProfileLayout.settingsIconSize,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: { ...Typography.bodySmall, minWidth: 0 },
  settingsValue: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.medium,
    maxWidth: ProfileLayout.trailingValueMaxWidth,
  },
  unreadBadge: {
    minWidth: ProfileLayout.unreadBadgeSize,
    height: ProfileLayout.unreadBadgeSize,
    paddingHorizontal: Gap.xs,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: { ...Typography.caption, fontFamily: FontFamily.semibold },
  rowDivider: {
    position: "absolute",
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  logoutButton: {
    minHeight: ProfileLayout.minimumTouchTarget,
    borderRadius: Radius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.sm,
  },
  logoutLabel: { ...Typography.bodySmall },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  confirmSheet: {
    paddingHorizontal: ProfileLayout.pagePadding,
    paddingTop: Spacing.md,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHandle: {
    alignSelf: "center",
    width: Spacing["3xl"],
    height: Spacing.xs,
    borderRadius: Radius.pill,
    opacity: ProfileLayout.sheetHandleOpacity,
  },
  confirmTitle: { ...Typography.h4, marginTop: Spacing.lg },
  confirmCopy: { ...Typography.bodySmall, marginTop: Spacing.xs },
  confirmActions: {
    flexDirection: "row",
    gap: Gap.sm,
    marginTop: Spacing.xl,
  },
  confirmButton: {
    flex: 1,
    minHeight: ProfileLayout.minimumTouchTarget,
    paddingHorizontal: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: { ...Typography.bodySmall },
});

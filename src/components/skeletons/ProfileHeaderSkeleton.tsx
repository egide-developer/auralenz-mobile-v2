import React from "react";
import { StyleSheet, View } from "react-native";
import { Gap, ProfileLayout, Radius, Spacing } from "../../theme/spacing";
import {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  useSkeletonColors,
} from "./Skeleton";

export function ProfileHeaderSkeleton({
  includeStats = true,
}: {
  includeStats?: boolean;
}) {
  const colors = useSkeletonColors();

  return (
    <View style={styles.identity} accessible={false}>
      <SkeletonCircle size={ProfileLayout.avatarSize} />
      <SkeletonText
        width={ProfileLayout.identitySkeletonNameWidth}
        lineHeight={ProfileLayout.avatarSize / 4}
        style={styles.displayName}
      />
      <SkeletonText
        width={ProfileLayout.identitySkeletonHandleWidth}
        lineHeight={Spacing.lg}
        style={styles.username}
      />
      <SkeletonText
        lines={2}
        width={["78%", "52%"]}
        lineHeight={Spacing.lg}
        style={styles.bio}
      />
      <View style={styles.actions}>
        <Skeleton
          width={ProfileLayout.identitySkeletonActionWidth}
          height={ProfileLayout.actionButtonHeight}
          borderRadius={Radius.pill}
        />
        <SkeletonCircle size={ProfileLayout.actionButtonHeight} />
      </View>
      {includeStats ? (
        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.surface, borderColor: colors.divider },
          ]}
        >
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.stat,
                { borderLeftColor: colors.divider },
                index > 0 && styles.dividedStat,
              ]}
            >
              <Skeleton width="48%" height={Spacing.xl} />
              <Skeleton width="58%" height={Spacing.md} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  identity: {
    width: "100%",
    alignItems: "center",
    paddingTop: Spacing.sm,
  },
  displayName: {
    marginTop: Spacing.md,
  },
  username: {
    marginTop: Gap.xs,
  },
  bio: {
    width: "100%",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  actions: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.sm,
    marginTop: Spacing.md,
  },
  statsCard: {
    width: "100%",
    minHeight: ProfileLayout.statCardHeight,
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.xl,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: Gap.sm,
  },
  dividedStat: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
});

// AuraLenz — Reel Skeleton
// Matches ReelsFeed full-screen video layout

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

export function ReelSkeleton() {
  return (
    <View style={styles.reel}>
      <Skeleton
        style={styles.video}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
      />

      <View style={styles.bottomOverlay}>
        <View style={styles.bottomInfo}>
          <View style={styles.reelHeader}>
            <SkeletonCircle size={28} style={styles.reelAvatar} />
            <View style={styles.reelMeta}>
              <SkeletonText lines={1} width="60%" lineHeight={20} style={styles.reelUsername} />
              <SkeletonText lines={1} width="40%" lineHeight={16} style={styles.reelTime} />
            </View>
          </View>
          <SkeletonText lines={2} width={["80%", "50%"]} lineHeight={20} style={styles.reelCaption} />
        </View>

        <View style={styles.reelActions}>
          {["like", "comment", "share", "remix", "tip"].map((_, i) => (
            <View key={i} style={styles.reelActionBtn}>
              <SkeletonCircle size={28} style={styles.reelActionIcon} />
              <SkeletonText lines={1} width={30} lineHeight={16} style={styles.reelActionText} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function ReelSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <ReelSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  reel: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  reelMeta: {
    marginLeft: 8,
  },
  reelUsername: {
    color: "#FFFFFF",
  },
  reelTime: {
    color: "rgba(255,255,255,0.7)",
    marginLeft: 4,
  },
  reelCaption: {
    color: "#FFFFFF",
    marginTop: 8,
  },
  reelActions: {
    alignItems: "center",
    gap: 18,
  },
  reelActionBtn: {
    alignItems: "center",
    gap: 4,
  },
  reelActionIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  reelActionText: {
    color: "#FFFFFF",
  },
  list: {
    flex: 1,
  },
});
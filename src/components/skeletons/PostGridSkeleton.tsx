// AuraLenz — Post Grid Skeleton
// Matches SearchScreen discover grid

import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "./Skeleton";
import { Spacing, Radius, Gap } from "../../theme/spacing";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_GAP = 2;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - Spacing.lg * 2 - GRID_GAP) / 2;

export function PostGridSkeleton({ columns = 2, rows = 3 }: { columns?: number; rows?: number }) {
  const items = Array.from({ length: columns * rows });

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {items.map((_, i) => (
          <View key={i} style={styles.item}>
            <Skeleton
              width={GRID_ITEM_SIZE}
              height={GRID_ITEM_SIZE}
              borderRadius={Radius.md}
              style={styles.image}
            />
            {i % 3 === 0 && (
              <View style={styles.videoBadge}>
                <Skeleton width={16} height={16} borderRadius={8} />
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  item: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
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
    top: 6,
    right: 6,
  },
});
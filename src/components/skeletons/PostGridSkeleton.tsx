import React, { useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Gap, Radius, Spacing } from "../../theme/spacing";
import { Skeleton } from "./Skeleton";

const GRID_GAP = 2;

export function PostGridSkeleton({
  columns = 2,
  rows = 3,
  horizontalPadding = Spacing.lg,
}: {
  columns?: number;
  rows?: number;
  horizontalPadding?: number;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const columnCount = Math.max(1, Math.floor(columns));
  const rowCount = Math.max(0, Math.floor(rows));
  const itemWidth = Math.max(
    0,
    (containerWidth -
      horizontalPadding * 2 -
      GRID_GAP * (columnCount - 1)) /
      columnCount,
  );
  const items = Array.from({ length: columnCount * rowCount });

  return (
    <View
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
      style={[styles.container, { paddingHorizontal: horizontalPadding }]}
    >
      <View style={styles.grid}>
        {items.map((_, index) => (
          <View
            key={index}
            style={[
              styles.item,
              { width: itemWidth, height: itemWidth },
            ] as const}
          >
            <Skeleton width="100%" height={itemWidth} borderRadius={Radius.sm} />
            {index % 4 === 0 ? (
              <Skeleton
                width={Spacing.md}
                height={Spacing.md}
                borderRadius={Radius.xs}
                tone="overlay"
                style={styles.videoMark}
              />
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  item: {
    overflow: "hidden",
    position: "relative",
  },
  videoMark: {
    position: "absolute",
    top: Gap.sm,
    right: Gap.sm,
  },
});

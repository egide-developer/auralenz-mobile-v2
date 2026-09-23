import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import api from "../../api/client";
import { API } from "../../api/endpoints";
import { useAuthStore } from "../../stores/authStore";
import { Colors } from "../../theme/colors";
import { Radius, Spacing } from "../../theme/spacing";
import { Typography } from "../../theme/typography";
import { Icon } from "../ui/Icon";
import { normalizeStoryGroups, extractStoryGroupsPayload } from "../../utils/stories";
import type { StoryGroup } from "../../types";

const RING_SIZE = 68;
const AVATAR_SIZE = 60;

export function StoryBar({ colors, isDark }: { colors: any; isDark: boolean }) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  const fetchGroups = useCallback(async () => {
    try {
      const { data } = await api.get(API.stories.list);
      const list = normalizeStoryGroups(extractStoryGroupsPayload(data));
      setGroups(list);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Refresh after returning from the story composer so a newly shared story
  // shows up on the ring without needing a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups])
  );

  if (loading) return null;

  const myGroup = groups.find((g) => g.userId === user?.id);
  const otherGroups = groups.filter((g) => g.userId !== user?.id);

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border + "40" }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeIn.duration(300)} style={styles.item}>
          <View style={styles.ringSlot}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() =>
                myGroup ? router.push(`/story/${myGroup.userId}`) : router.push("/story/create")
              }
            >
              {myGroup ? (
                <GradientRing hasUnviewed={myGroup.hasUnviewed} isDark={isDark}>
                  <Avatar uri={user?.avatarUrl} colors={colors} />
                </GradientRing>
              ) : (
                <View style={[styles.plainRing, { borderColor: colors.border }]}>
                  <Avatar uri={user?.avatarUrl} colors={colors} />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.75}
              hitSlop={6}
              onPress={() => router.push("/story/create")}
              style={[styles.addBadge, { backgroundColor: colors.primary, borderColor: colors.background }]}
            >
              <Icon name="plus" set="bold" size={11} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
          <Text numberOfLines={1} style={[styles.label, { color: colors.mutedForeground }]}>
            Your story
          </Text>
        </Animated.View>

        {otherGroups.map((group, i) => (
          <Animated.View
            key={group.userId}
            entering={FadeIn.duration(300).delay(60 * (i + 1))}
            style={styles.item}
          >
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => router.push(`/story/${group.userId}`)}
            >
              <View style={styles.ringSlot}>
                <GradientRing hasUnviewed={group.hasUnviewed} isDark={isDark}>
                  <Avatar uri={group.user?.avatarUrl} colors={colors} />
                </GradientRing>
              </View>
            </TouchableOpacity>
            <Text numberOfLines={1} style={[styles.label, { color: colors.foreground }]}>
              {group.user?.username}
            </Text>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

function GradientRing({
  hasUnviewed,
  isDark,
  children,
}: {
  hasUnviewed: boolean;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const colors = isDark ? Colors.dark : Colors.light;
  if (!hasUnviewed) {
    return (
      <View style={[styles.plainRing, { borderColor: colors.border }]}>{children}</View>
    );
  }
  return (
    <LinearGradient
      colors={colors.storyGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientRing}
    >
      <View style={[styles.ringInner, { backgroundColor: colors.background }]}>{children}</View>
    </LinearGradient>
  );
}

function Avatar({ uri, colors }: { uri?: string; colors: any }) {
  return (
    <View style={[styles.avatarBase, { backgroundColor: colors.muted }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImg} />
      ) : (
        <Icon name="user" set="light" size={22} color={colors.mutedForeground} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: 0.5,
    paddingVertical: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: 14,
  },
  item: {
    alignItems: "center",
    width: RING_SIZE + 8,
  },
  ringSlot: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 2.5,
  },
  ringInner: {
    width: "100%",
    height: "100%",
    borderRadius: RING_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  plainRing: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBase: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  addBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  label: {
    ...Typography.caption,
    marginTop: 6,
    maxWidth: RING_SIZE + 8,
    textAlign: "center",
  },
});

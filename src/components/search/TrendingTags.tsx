import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Gap, Spacing } from "../../theme/spacing";
import { FontFamily, FontSize, Typography } from "../../theme/typography";
import { formatCount } from "../../utils/format";
import type { TrendingTag } from "../../hooks/useSearch";
import { Icon } from "../ui/Icon";
import { SectionTitle } from "./SectionTitle";
import { HighlightedText } from "./HighlightedText";

interface TagRowProps {
  tag: string;
  total: number;
  query?: string;
  rank?: number;
  onSelect: (tag: string) => void;
}

export function TagRow({ tag, total, query, rank, onSelect }: TagRowProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => onSelect(tag)}>
      {rank != null ? (
        <Text style={[styles.rank, { color: colors.mutedForeground }]}>
          {String(rank).padStart(2, "0")}
        </Text>
      ) : null}
      <View style={styles.body}>
        <HighlightedText
          text={`#${tag}`}
          query={query}
          numberOfLines={1}
          style={[styles.tag, { color: colors.foreground }]}
          highlightStyle={{ color: colors.primary }}
        />
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {`${formatCount(total)} posts`}
        </Text>
      </View>
      <Icon name="arrow-up" set="light" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

interface TrendingTagsProps {
  tags: TrendingTag[];
  query?: string;
  onSelect: (tag: string) => void;
}

export function TrendingTags({ tags, query, onSelect }: TrendingTagsProps) {
  if (tags.length === 0) return null;

  return (
    <View>
      <SectionTitle title="Trending now" iconName="flame" />
      {tags.map((entry, index) => (
        <TagRow
          key={entry.tag}
          tag={entry.tag}
          total={entry.total}
          rank={index + 1}
          query={query}
          onSelect={onSelect}
        />
      ))}
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
    paddingVertical: Spacing.sm,
  },
  rank: {
    ...Typography.monoSm,
    width: 24,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  tag: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
  },
  count: {
    ...Typography.caption,
  },
  tail: {
    height: Spacing.xs,
  },
});

export default TrendingTags;

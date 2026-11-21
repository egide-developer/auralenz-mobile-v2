import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Gap, Radius, Spacing } from "../../theme/spacing";
import { Typography } from "../../theme/typography";
import type { RecentSearch } from "../../repositories/search";
import { Icon } from "../ui/Icon";
import { SectionTitle } from "./SectionTitle";
import { HighlightedText } from "./HighlightedText";

interface RecentSearchesProps {
  searches: RecentSearch[];
  query: string;
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
  onClear: () => void;
}

export function RecentSearches({
  searches,
  query,
  onSelect,
  onRemove,
  onClear,
}: RecentSearchesProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  if (searches.length === 0) return null;

  return (
    <View>
      <SectionTitle
        title="Recent searches"
        iconName="time"
        actionLabel="Clear all"
        onAction={onClear}
      />
      {searches.map((search) => (
        <View key={search.term} style={styles.row}>
          <TouchableOpacity
            style={styles.main}
            activeOpacity={0.7}
            onPress={() => onSelect(search.term)}
          >
            <View style={[styles.iconBubble, { backgroundColor: colors.secondary }]}>
              <Icon name="time" set="light" size={16} color={colors.mutedForeground} />
            </View>
            <HighlightedText
              text={search.term}
              query={query}
              numberOfLines={1}
              style={[styles.term, { color: colors.foreground }]}
              highlightStyle={{ color: colors.primary }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={`Remove ${search.term} from recent searches`}
            hitSlop={10}
            onPress={() => onRemove(search.term)}
          >
            <Icon name="close" set="light" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.sm,
    paddingVertical: Spacing.sm,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.md,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  term: {
    ...Typography.bodySmall,
    flexShrink: 1,
  },
});

export default RecentSearches;

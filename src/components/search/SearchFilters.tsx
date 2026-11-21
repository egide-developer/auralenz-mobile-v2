import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Gap, Radius, Spacing } from "../../theme/spacing";
import { FontFamily, FontSize, Typography } from "../../theme/typography";

export type SearchFilterKey =
  | "top"
  | "users"
  | "posts"
  | "tags"
  | "media"
  | "places";

export const SEARCH_FILTERS: { key: SearchFilterKey; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "users", label: "Users" },
  { key: "posts", label: "Posts" },
  { key: "tags", label: "Tags" },
  { key: "media", label: "Media" },
  { key: "places", label: "Places" },
];

interface SearchFiltersProps {
  value: SearchFilterKey;
  onChange: (key: SearchFilterKey) => void;
}

export function SearchFilters({ value, onChange }: SearchFiltersProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {SEARCH_FILTERS.map((filter) => {
        const selected = filter.key === value;
        return (
          <TouchableOpacity
            key={filter.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            activeOpacity={0.85}
            onPress={() => onChange(filter.key)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.primary : colors.secondary,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: selected ? colors.primaryForeground : colors.secondaryForeground },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    marginBottom: Spacing.xs,
  },
  content: {
    gap: Gap.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  chip: {
    height: 34,
    paddingHorizontal: Spacing.base,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...Typography.button,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
});

export default SearchFilters;

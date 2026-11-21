import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Gap, Spacing } from "../../theme/spacing";
import { FontFamily, FontSize, Typography } from "../../theme/typography";
import { Icon } from "../ui/Icon";

interface SectionTitleProps {
  title: string;
  iconName?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, iconName, actionLabel, onAction }: SectionTitleProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.row}>
      <View style={styles.titleGroup}>
        {iconName ? (
          <Icon name={iconName} set="light" size={16} color={colors.mutedForeground} />
        ) : null}
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={10}>
          <Text style={[styles.action, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Gap.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Gap.sm,
    flexShrink: 1,
  },
  title: {
    ...Typography.bodySmall,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  action: {
    ...Typography.button,
  },
});

export default SectionTitle;

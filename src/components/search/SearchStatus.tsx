import { StyleSheet, Text, View } from "react-native";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Gap, Spacing } from "../../theme/spacing";
import { Typography } from "../../theme/typography";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

interface SearchStatusProps {
  iconName?: string;
  message: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export function SearchStatus({
  iconName = "search",
  message,
  error,
  onRetry,
  retryLabel = "Try again",
}: SearchStatusProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={styles.wrap}>
      <Icon name={iconName} set="light" size={40} color={colors.mutedForeground + "66"} />
      <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
      {error && onRetry ? (
        <Button title={retryLabel} variant="outline" size="sm" onPress={onRetry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: Gap.md,
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing.xl,
  },
  message: {
    ...Typography.bodySmall,
    textAlign: "center",
  },
});

export default SearchStatus;

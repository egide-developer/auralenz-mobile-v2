// Shared screen wrapper — handles top/bottom safe area, theme background
import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeStore } from "../../stores/themeStore";
import { Colors } from "../../theme/colors";
import { Spacing } from "../../theme/spacing";

interface ScreenProps {
  children: React.ReactNode;
  style?: any;
  contentContainerStyle?: any;
  scroll?: boolean;
  showsVerticalScrollIndicator?: boolean;
  header?: React.ReactNode;
  headerStyle?: any;
  extraBottomPadding?: number;
}

export function Screen({
  children,
  style,
  contentContainerStyle,
  scroll = false,
  showsVerticalScrollIndicator = false,
  header,
  headerStyle,
  extraBottomPadding = 0,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const isDark = useThemeStore((s) => s.isDark);
  const bg = isDark ? Colors.dark.background : Colors.light.background;

  const content = (
    <>
      {header && (
        <View
          style={[
            styles.headerWrapper,
            { paddingTop: insets.top, backgroundColor: bg },
            headerStyle,
          ]}
        >
          {header}
        </View>
      )}
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + extraBottomPadding },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </>
  );

  if (scroll) {
    return (
      <SafeAreaView
        style={[styles.scrollWrapper, { backgroundColor: bg }, style]}
      >
        <View
          style={[
            styles.scrollContent,
            { paddingTop: insets.top, paddingBottom: insets.bottom + extraBottomPadding },
          ]}
        >
          {header && <View style={[{ backgroundColor: bg }, headerStyle]}>{header}</View>}
          <View style={contentContainerStyle}>{children}</View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.wrapper, { backgroundColor: bg }, style]}>
      {header && (
        <View
          style={[
            styles.headerWrapper,
            { paddingTop: insets.top, backgroundColor: bg },
            headerStyle,
          ]}
        >
          {header}
        </View>
      )}
      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + extraBottomPadding },
          contentContainerStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  scrollWrapper: { flex: 1 },
  scrollContent: { flex: 1 },
  headerWrapper: {
    position: "relative",
    zIndex: 10,
  },
  content: { flex: 1 },
});
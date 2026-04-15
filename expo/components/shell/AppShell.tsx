import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";

import { AppHeader } from "@/components/shell/AppHeader";
import { BrandedBackground } from "@/components/ui/BrandedBackground";
import { useAppTheme } from "@/lib/theme";

export function AppShell({
  title,
  subtitle,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const content = (
    <Animated.View entering={FadeInUp.duration(350)} style={styles.content}>
      <AppHeader title={title} subtitle={subtitle} />
      {children}
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <BrandedBackground />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.page,
              paddingTop: theme.spacing.page,
              paddingBottom: Math.max(theme.spacing.page * 2, insets.bottom + 24),
            }}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
            <View style={{ gap: theme.spacing.section }}>{content}</View>
          </ScrollView>
        ) : (
          <View
            style={{
              ...styles.nonScrollContainer,
              paddingHorizontal: theme.spacing.page,
              paddingTop: theme.spacing.page,
              paddingBottom: Math.max(theme.spacing.page, insets.bottom + 16),
            }}
          >
            {content}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 20,
  },
  nonScrollContainer: {
    flex: 1,
  },
});

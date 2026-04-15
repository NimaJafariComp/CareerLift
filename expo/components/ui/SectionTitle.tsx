import React from "react";
import { StyleSheet } from "react-native";
import { Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      {eyebrow ? (
        <Text style={{ color: theme.palette.accent, fontSize: theme.text.size(12), fontWeight: "600", letterSpacing: 1.1 }}>
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(22), fontWeight: "700" }}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(14), lineHeight: theme.text.size(21) }}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

type Props = {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
};

export function StatPill({ label, value, tone = "default" }: Props) {
  const { theme } = useAppTheme();

  const toneMap = {
    default: theme.palette.surfaceMuted,
    accent: theme.palette.accentSoft,
    success: "rgba(52, 211, 153, 0.16)",
    warning: "rgba(251, 191, 36, 0.16)",
    danger: "rgba(248, 113, 113, 0.16)",
  };

  const textToneMap = {
    default: theme.palette.foreground,
    accent: theme.palette.accent,
    success: theme.palette.success,
    warning: theme.palette.warning,
    danger: theme.palette.danger,
  };

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: toneMap[tone],
          borderColor: theme.palette.divider,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[styles.label, { color: theme.palette.muted, fontSize: theme.text.size(11) }]}
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[styles.value, { color: textToneMap[tone], fontSize: theme.text.size(20) }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 80,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  label: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  value: {
    fontWeight: "700",
  },
});

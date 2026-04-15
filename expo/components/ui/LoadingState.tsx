import React from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingVertical: 24,
      }}
    >
      <ActivityIndicator color={theme.palette.accent} />
      <Text style={{ color: theme.palette.muted, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

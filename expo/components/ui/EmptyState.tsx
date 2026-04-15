import React from "react";
import { StyleSheet } from "react-native";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.palette.surfaceMuted,
          borderColor: theme.palette.divider,
        },
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={{ color: theme.palette.foreground, fontSize: 15, fontWeight: "600" }}>{title}</Text>
        <Text style={{ color: theme.palette.muted, fontSize: 14, lineHeight: 20 }}>{message}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={[
            styles.button,
            { backgroundColor: theme.palette.accentSoft },
          ]}
        >
          <Text style={{ color: theme.palette.accent, fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  textBlock: {
    gap: 6,
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});

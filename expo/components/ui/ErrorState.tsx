import React from "react";
import { StyleSheet } from "react-native";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

export function ErrorState({
  title,
  message,
  retryLabel = "Try again",
  onRetry,
}: {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[styles.container, { borderColor: "rgba(248, 113, 113, 0.18)", backgroundColor: "rgba(248, 113, 113, 0.08)" }]}
    >
      <View style={styles.textBlock}>
        <Text style={{ color: theme.palette.danger, fontSize: 15, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: theme.palette.foreground, fontSize: 14, lineHeight: 20 }}>{message}</Text>
      </View>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={{ color: theme.palette.danger, fontWeight: "600" }}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  textBlock: {
    gap: 6,
  },
  button: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(248, 113, 113, 0.16)",
  },
});

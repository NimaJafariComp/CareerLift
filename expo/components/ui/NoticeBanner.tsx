import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";
import type { Notice } from "@/lib/types";

const ICONS: Record<Notice["type"], string> = {
  error: "Warning",
  info: "Note",
  success: "Success",
};

export function NoticeBanner({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  const { theme } = useAppTheme();
  if (!notice) return null;

  const stylesByType =
    notice.type === "error"
      ? { borderColor: "rgba(248, 113, 113, 0.25)", backgroundColor: "rgba(248, 113, 113, 0.08)", textColor: theme.palette.danger }
      : notice.type === "success"
        ? { borderColor: "rgba(52, 211, 153, 0.25)", backgroundColor: "rgba(52, 211, 153, 0.09)", textColor: theme.palette.success }
        : { borderColor: "rgba(75, 210, 255, 0.24)", backgroundColor: "rgba(75, 210, 255, 0.08)", textColor: theme.palette.accentStrong };

  return (
    <View style={[styles.container, { borderColor: stylesByType.borderColor, backgroundColor: stylesByType.backgroundColor }]}>
      <View style={styles.copy}>
        <Text style={{ color: stylesByType.textColor, fontWeight: "700", fontSize: theme.text.size(12) }}>{ICONS[notice.type]}</Text>
        <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20), fontSize: theme.text.size(13) }}>{notice.message}</Text>
      </View>
      <Pressable onPress={onDismiss} style={styles.dismiss}>
        <Text style={{ color: theme.palette.muted, fontWeight: "600", fontSize: theme.text.size(12) }}>Dismiss</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  copy: {
    gap: 6,
  },
  dismiss: {
    alignSelf: "flex-start",
  },
});

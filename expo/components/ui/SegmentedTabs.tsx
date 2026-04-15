import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  counts,
  labels,
}: {
  tabs: T[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
  labels?: Partial<Record<T, string>>;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.shell, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={[
              styles.option,
              {
                backgroundColor: active ? theme.palette.surface : "transparent",
                borderColor: active ? theme.palette.divider : "transparent",
              },
            ]}
          >
            <Text style={{ color: active ? theme.palette.foreground : theme.palette.muted, fontWeight: active ? "700" : "600", fontSize: theme.text.size(13) }}>
              {labels?.[tab] ?? tab}
            </Text>
            {typeof counts?.[tab] === "number" ? (
              <View style={[styles.countPill, { backgroundColor: active ? theme.palette.accentSoft : theme.palette.surfaceStrong }]}>
                <Text style={{ color: active ? theme.palette.accent : theme.palette.muted, fontSize: theme.text.size(11), fontWeight: "700" }}>
                  {counts[tab]}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderWidth: 1,
    borderRadius: 22,
    padding: 6,
  },
  option: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAppTheme } from "@/lib/theme";

export function BrandMark({ size = 56 }: { size?: number }) {
  const { theme } = useAppTheme();

  return (
    <LinearGradient
      colors={[theme.palette.accentStrong, theme.palette.accent, theme.palette.warning]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          shadowColor: theme.palette.shadow,
        },
      ]}
    >
      <View style={styles.overlay} />
      <View style={styles.inner}>
        <View style={[styles.bar, { width: size * 0.14, height: size * 0.42, borderRadius: size * 0.08 }]} />
        <View style={styles.signalStack}>
          <View style={[styles.signal, { width: size * 0.44, height: size * 0.13, borderRadius: size * 0.08 }]} />
          <View style={[styles.signal, { width: size * 0.34, height: size * 0.13, borderRadius: size * 0.08 }]} />
          <View style={[styles.signal, { width: size * 0.26, height: size * 0.13, borderRadius: size * 0.08 }]} />
        </View>
      </View>
      <Text style={[styles.arrow, { fontSize: size * 0.42 }]}>↑</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 26,
    elevation: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 5,
    transform: [{ translateY: 4 }],
  },
  bar: {
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  signalStack: {
    gap: 4,
    marginBottom: 2,
  },
  signal: {
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  arrow: {
    position: "absolute",
    top: 5,
    right: 7,
    color: "rgba(10,14,20,0.55)",
    fontWeight: "900",
  },
});

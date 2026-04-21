import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from "react-native-svg";

import { useAppTheme } from "@/lib/theme";

export function BrandMark({ size = 56 }: { size?: number }) {
  const { theme } = useAppTheme();
  const gradientId = React.useId().replace(/:/g, "");

  return (
    <View
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          shadowColor: theme.palette.shadow,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="CareerLift">
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0dd9a3" />
            <Stop offset="100%" stopColor="#4bd2ff" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${gradientId})`} />
        <Path
          d="M 32 18 a 14 14 0 1 0 0 28"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <Path
          d="M 38 18 v 26 h 12 l 0 -3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 8,
  },
});

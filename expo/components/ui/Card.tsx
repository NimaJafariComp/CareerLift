import React from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { useAppTheme } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  delay?: number;
  style?: ViewStyle;
};

export function Card({ children, onPress, delay = 0, style }: Props) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const body = (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={style}>
      <Animated.View style={animatedStyle}>
        <LinearGradient
          colors={[theme.palette.cardStart, theme.palette.cardEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.card,
            {
              borderColor: theme.palette.divider,
              shadowColor: theme.palette.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.overlay,
              {
                backgroundColor: theme.palette.overlay,
              },
            ]}
          />
          <View style={styles.content}>{children}</View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.985, { damping: 16, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 200 });
      }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 6,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
});

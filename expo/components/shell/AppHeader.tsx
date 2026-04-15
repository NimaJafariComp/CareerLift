import React from "react";
import { StyleSheet } from "react-native";
import { Pressable, Text, View } from "react-native";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { useAppTheme } from "@/lib/theme";

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const navigation = useNavigation();
  const { theme } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.titleBlock}>
        <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(34), fontWeight: "700" }}>{title}</Text>
        {subtitle ? <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(15), lineHeight: theme.text.size(22) }}>{subtitle}</Text> : null}
      </View>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        style={[
          styles.menuButton,
          { borderColor: theme.palette.borderColor, backgroundColor: theme.palette.accentSoft },
        ]}
      >
        <Feather name="menu" size={20} color={theme.palette.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  menuButton: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
});

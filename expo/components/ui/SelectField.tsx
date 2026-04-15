import React from "react";
import { StyleSheet } from "react-native";
import { Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { useAppTheme } from "@/lib/theme";

export function SelectField({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: Array<{ label: string; value: string }>;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={{ color: theme.palette.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.4 }}>{label}</Text>
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.surfaceMuted,
          overflow: "hidden",
        }}
      >
        <Picker
          selectedValue={value}
          onValueChange={(itemValue) => onChange(String(itemValue))}
          dropdownIconColor={theme.palette.accent}
          style={{ color: theme.palette.foreground }}
          itemStyle={{ color: theme.palette.foreground }}
        >
          {items.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
});

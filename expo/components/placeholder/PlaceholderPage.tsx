import React from "react";
import { Text, View } from "react-native";

import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppTheme } from "@/lib/theme";

export function PlaceholderPage({
  title,
  subtitle,
  body,
  next,
}: {
  title: string;
  subtitle: string;
  body: string;
  next: string[];
}) {
  const { theme } = useAppTheme();

  return (
    <AppShell title={title} subtitle={subtitle}>
      <Card delay={40}>
        <SectionTitle eyebrow="Mobile Phase 1" title={`${title} foundations are ready`} subtitle={body} />
      </Card>

      <Card delay={100}>
        <View className="gap-3">
          <Text style={{ color: theme.palette.foreground, fontSize: 18, fontWeight: "700" }}>What lands next</Text>
          {next.map((item) => (
            <View key={item} className="rounded-2xl border px-4 py-3" style={{ borderColor: theme.palette.borderColor, backgroundColor: theme.palette.backgroundAlt }}>
              <Text style={{ color: theme.palette.foreground, lineHeight: 20 }}>{item}</Text>
            </View>
          ))}
        </View>
      </Card>
    </AppShell>
  );
}

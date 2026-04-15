import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ApplicationsCard } from "@/components/dashboard/ApplicationsCard";
import { CoachCenterCard } from "@/components/dashboard/CoachCenterCard";
import { RecentResumeCard } from "@/components/dashboard/RecentResumeCard";
import { SavedJobsCard } from "@/components/dashboard/SavedJobsCard";
import { AppShell } from "@/components/shell/AppShell";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppTheme } from "@/lib/theme";

export default function DashboardScreen() {
  const { theme } = useAppTheme();

  return (
    <AppShell title="Welcome back" subtitle="Your mobile career cockpit is live with the same priorities as the web dashboard.">
      <Card delay={0}>
        <SectionTitle
          eyebrow="Dashboard"
          title="CareerLift on mobile"
          subtitle="Live resume, saved jobs, applications, and coaching context are all framed into a native shell."
        />
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: theme.palette.accentSoft }]}>
            <Text style={{ color: theme.palette.accent, fontSize: 12, fontWeight: "700" }}>Drawer navigation</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.palette.accentSoft }]}>
            <Text style={{ color: theme.palette.accent, fontSize: 12, fontWeight: "700" }}>Live backend data</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.palette.accentSoft }]}>
            <Text style={{ color: theme.palette.accent, fontSize: 12, fontWeight: "700" }}>Native motion</Text>
          </View>
        </View>
      </Card>

      <RecentResumeCard />
      <SavedJobsCard />
      <ApplicationsCard />
      <CoachCenterCard />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
});

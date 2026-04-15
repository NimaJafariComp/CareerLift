import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatPill } from "@/components/ui/StatPill";
import { loadApplications } from "@/lib/storage/applications";
import { useAppTheme } from "@/lib/theme";
import type { ApplicationStatus, SavedApplication } from "@/lib/types";

const ORDER: ApplicationStatus[] = ["Applied", "Interview", "Offer", "Rejected"];

export function ApplicationsCard() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [applications, setApplications] = React.useState<SavedApplication[] | null>(null);

  React.useEffect(() => {
    loadApplications().then(setApplications).catch(() => setApplications([]));
  }, []);

  const counts: Record<ApplicationStatus, number> = {
    Applied: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
  };

  (applications ?? []).forEach((application) => {
    counts[application.status] += 1;
  });

  const recent = [...(applications ?? [])]
    .sort((left, right) => new Date(right.dateApplied).getTime() - new Date(left.dateApplied).getTime())
    .slice(0, 3);

  return (
    <Card delay={150}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={{ color: theme.palette.foreground, fontSize: 18, fontWeight: "700" }}>Applications</Text>
          <Text style={{ color: theme.palette.muted, fontSize: 12 }}>Pipeline status from your local mobile tracker</Text>
        </View>
        <Pressable onPress={() => router.push("/applications")}>
          <Text style={{ color: theme.palette.accent, fontSize: 13, fontWeight: "600" }}>Open →</Text>
        </Pressable>
      </View>

      {applications === null ? <LoadingState label="Loading applications…" /> : null}

      {applications && (
        <View style={styles.sectionGap}>
          <View style={styles.metricRow}>
            {ORDER.map((status) => (
              <StatPill
                key={status}
                label={status}
                value={counts[status]}
                tone={
                  status === "Offer" ? "success" : status === "Rejected" ? "danger" : status === "Interview" ? "warning" : "accent"
                }
              />
            ))}
          </View>

          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              message="When you start saving and tracking roles on mobile, your latest application milestones will show up here."
              actionLabel="Open Job Finder"
              onAction={() => router.push("/job-finder")}
            />
          ) : (
            <View style={styles.listGap}>
              {recent.map((application) => (
                <View
                  key={application.id}
                  style={[styles.itemCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}
                >
                  <View style={styles.itemText}>
                    <Text style={{ color: theme.palette.foreground, fontSize: 14, fontWeight: "600" }}>{application.title}</Text>
                    <Text style={{ color: theme.palette.muted, fontSize: 12 }}>{application.company}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: theme.palette.accentSoft }]}>
                    <Text style={{ color: theme.palette.accent, fontSize: 12, fontWeight: "700" }}>{application.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  sectionGap: {
    gap: 16,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  listGap: {
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  itemText: {
    flex: 1,
    gap: 4,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

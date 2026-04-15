import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAppTheme } from "@/lib/theme";
import type { SkillGapData } from "@/lib/types";

export function SkillGapAnalysisCard({
  data,
  loading,
  error,
  onRetry,
}: {
  data: SkillGapData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = React.useState({
    matched: true,
    required: true,
    preferred: true,
    recommendations: true,
  });

  if (loading) return <LoadingState label="Loading skill-gap analysis…" />;

  if (error) {
    const isNoJobs = error.toLowerCase().includes("no saved jobs") || error.includes("400");
    if (isNoJobs) {
      return (
        <EmptyState
          title="No saved jobs to analyze"
          message="Save some jobs from Job Finder to see your skill-gap analysis here."
        />
      );
    }

    return <ErrorState title="Unable to load analysis" message={error} onRetry={onRetry} />;
  }

  if (!data) return null;

  const noSkillsExtracted =
    data.skill_analysis.matched_skills.length === 0 &&
    data.skill_analysis.missing_required_skills.length === 0 &&
    data.skill_analysis.missing_preferred_skills.length === 0 &&
    data.skill_analysis.all_job_skills.length === 0;

  if (noSkillsExtracted) {
    return (
      <View style={styles.gap}>
        <EmptyState
          title="Not enough data for skill analysis"
          message="Your saved jobs have brief descriptions without specific skill requirements. Save jobs with detailed descriptions for a more meaningful analysis."
        />
        {data.recommendations.length > 0 ? (
          <SectionCard
            title="General Recommendations"
            icon="General"
            open
            onToggle={() => {}}
            theme={theme}
          >
            <View style={styles.gap}>
              {data.recommendations.map((recommendation, index) => (
                <Text key={index} style={{ color: theme.palette.muted, lineHeight: theme.text.size(20) }}>{recommendation}</Text>
              ))}
            </View>
          </SectionCard>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.gap}>
      <View style={styles.metricsGrid}>
        <MetricCard label="Avg ATS Score" value={`${data.summary.average_ats_score}`} suffix="/100" tone={theme.palette.accentStrong} />
        <MetricCard label="Analyzed Jobs" value={`${data.summary.total_saved_jobs}`} tone={theme.palette.success} />
        <MetricCard label="Matched Skills" value={`${data.summary.matched_skills_count}`} tone={theme.palette.success} />
        <MetricCard label="Skills to Learn" value={`${data.summary.missing_required_skills_count}`} tone={theme.palette.warning} />
      </View>

      <SectionCard
        title={`Matched Skills (${data.summary.matched_skills_count})`}
        icon="Matched"
        open={expanded.matched}
        onToggle={() => setExpanded((prev) => ({ ...prev, matched: !prev.matched }))}
        theme={theme}
      >
        {data.skill_analysis.matched_skills.length > 0 ? (
          <View style={styles.chipWrap}>
            {data.skill_analysis.matched_skills.map((skill) => (
              <View key={skill} style={[styles.skillChip, { backgroundColor: `${theme.palette.success}22` }]}>
                <Text style={{ color: theme.palette.success, fontWeight: "600", fontSize: theme.text.size(12) }}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: theme.palette.muted }}>No matched skills found.</Text>
        )}
      </SectionCard>

      <SectionCard
        title={`Required Skills to Learn (${data.summary.missing_required_skills_count})`}
        icon="Priority"
        open={expanded.required}
        onToggle={() => setExpanded((prev) => ({ ...prev, required: !prev.required }))}
        theme={theme}
      >
        {data.skill_analysis.missing_required_skills.length > 0 ? (
          <View style={styles.gap}>
            {data.skill_analysis.missing_required_skills.map((item) => (
              <SkillGapRow key={item.skill} item={item} totalJobs={data.skill_analysis.job_count} theme={theme} />
            ))}
          </View>
        ) : (
          <Text style={{ color: theme.palette.success }}>Great! You have all required skills.</Text>
        )}
      </SectionCard>

      <SectionCard
        title={`Bonus Skills (${data.summary.missing_preferred_skills_count})`}
        icon="Bonus"
        open={expanded.preferred}
        onToggle={() => setExpanded((prev) => ({ ...prev, preferred: !prev.preferred }))}
        theme={theme}
      >
        {data.skill_analysis.missing_preferred_skills.length > 0 ? (
          <View style={styles.gap}>
            {data.skill_analysis.missing_preferred_skills.slice(0, 10).map((item) => (
              <SkillGapRow key={item.skill} item={item} totalJobs={data.skill_analysis.job_count} theme={theme} preferred />
            ))}
          </View>
        ) : (
          <Text style={{ color: theme.palette.accentStrong }}>No preferred skills identified.</Text>
        )}
      </SectionCard>

      <SectionCard
        title="Learning Recommendations"
        icon="Learn"
        open={expanded.recommendations}
        onToggle={() => setExpanded((prev) => ({ ...prev, recommendations: !prev.recommendations }))}
        theme={theme}
      >
        {data.recommendations.length > 0 ? (
          <View style={styles.gap}>
            {data.recommendations.map((recommendation, index) => (
              <View key={index} style={[styles.recCard, { backgroundColor: `${theme.palette.accentStrong}18` }]}>
                <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>{recommendation}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: theme.palette.muted }}>No specific recommendations at this time.</Text>
        )}
      </SectionCard>

      {data.summary.critical_skills_to_learn.length > 0 ? (
        <View style={[styles.criticalCard, { borderColor: `${theme.palette.danger}66`, backgroundColor: `${theme.palette.danger}16` }]}>
          <Text style={{ color: theme.palette.danger, fontWeight: "700", fontSize: theme.text.size(15) }}>Priority Skills to Master</Text>
          <Text style={{ color: theme.palette.foreground, lineHeight: theme.text.size(20) }}>
            These skills are essential for success in your target roles:
          </Text>
          <View style={styles.chipWrap}>
            {data.summary.critical_skills_to_learn.map((skill) => (
              <View key={skill} style={[styles.skillChip, { backgroundColor: `${theme.palette.danger}22` }]}>
                <Text style={{ color: theme.palette.danger, fontWeight: "700", fontSize: theme.text.size(12) }}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  function MetricCard({
    label,
    value,
    suffix,
    tone,
  }: {
    label: string;
    value: string;
    suffix?: string;
    tone: string;
  }) {
    return (
      <View style={[styles.metricCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>{label}</Text>
        <View style={styles.metricValueRow}>
          <Text style={{ color: tone, fontSize: theme.text.size(26), fontWeight: "800" }}>{value}</Text>
          {suffix ? <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>{suffix}</Text> : null}
        </View>
      </View>
    );
  }
}

function SectionCard({
  title,
  icon,
  open,
  onToggle,
  theme,
  children,
}: {
  title: string;
  icon: string;
  open: boolean;
  onToggle: () => void;
  theme: ReturnType<typeof useAppTheme>["theme"];
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.sectionCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
      <Pressable onPress={onToggle} style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(11), fontWeight: "700" }}>{icon}</Text>
          <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(15), flex: 1 }}>{title}</Text>
        </View>
        <Text style={{ color: theme.palette.muted, fontWeight: "700" }}>{open ? "−" : "+"}</Text>
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

function SkillGapRow({
  item,
  totalJobs,
  theme,
  preferred,
}: {
  item: SkillGapData["skill_analysis"]["missing_required_skills"][number];
  totalJobs: number;
  theme: ReturnType<typeof useAppTheme>["theme"];
  preferred?: boolean;
}) {
  const tone =
    item.importance === "critical"
      ? theme.palette.danger
      : item.importance === "high"
        ? "#f97316"
        : item.importance === "medium"
          ? theme.palette.warning
          : theme.palette.accentStrong;

  return (
    <View style={[styles.skillGapRow, { borderColor: `${tone}44`, backgroundColor: `${tone}14` }]}>
      <View style={styles.skillGapCopy}>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700" }}>{item.skill}</Text>
        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>
          {preferred ? "Preferred by" : "Required by"} {item.frequency} of {totalJobs} jobs
          {!preferred ? ` (${((item.frequency / totalJobs) * 100).toFixed(0)}%)` : ""}
        </Text>
      </View>
      <Text style={{ color: tone, fontWeight: "800" }}>{item.frequency}x</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    minWidth: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 14,
  },
  sectionHeaderCopy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sectionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skillGapRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  skillGapCopy: {
    flex: 1,
    gap: 4,
  },
  recCard: {
    borderRadius: 16,
    padding: 12,
  },
  criticalCard: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
});

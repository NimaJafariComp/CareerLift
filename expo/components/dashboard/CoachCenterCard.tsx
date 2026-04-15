import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SelectField } from "@/components/ui/SelectField";
import { StatPill } from "@/components/ui/StatPill";
import { getSkillGapAnalysis, listResumes } from "@/lib/api/dashboard";
import { getStoredValue, setStoredValue } from "@/lib/storage/preferences";
import { makeRecentResumeFallback, setRecentResume } from "@/lib/storage/recentResume";
import { useAppTheme } from "@/lib/theme";
import type { ResumeSummary, SkillGapData } from "@/lib/types";
import { asString } from "@/lib/utils";

const KEY = "coach_resume";

export function CoachCenterCard() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [resumes, setResumes] = React.useState<ResumeSummary[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [analysis, setAnalysis] = React.useState<SkillGapData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const selectedResume = resumes.find((item) => item.resume_id === selectedId) ?? null;

  const loadResumesState = React.useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const [resumeList, storedId] = await Promise.all([listResumes(), getStoredValue(KEY)]);
        setResumes(resumeList);
        setSelectedId(storedId && resumeList.some((item) => item.resume_id === storedId) ? storedId : resumeList[0]?.resume_id ?? "");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load resumes.");
      } finally {
        setLoading(false);
      }
    }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadResumesState();
    }, [loadResumesState])
  );

  const loadAnalysisState = React.useCallback(
    async (resumeId: string) => {
      if (!resumeId) {
        setAnalysis(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await setStoredValue(KEY, resumeId);
        const selectedResume = resumes.find((item) => item.resume_id === resumeId);
        if (selectedResume) {
          await setRecentResume(makeRecentResumeFallback(selectedResume));
        }
        const response = await getSkillGapAnalysis(resumeId);
        setAnalysis(response);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Unable to load skill gap analysis.";
        setError(message);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    },
    [resumes]
  );

  React.useEffect(() => {
    if (!selectedId) {
      setAnalysis(null);
      return;
    }
    void loadAnalysisState(selectedId);
  }, [loadAnalysisState, selectedId, resumes]);

  return (
    <Card delay={210}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(18), fontWeight: "700" }}>Coach Center</Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>Skill gap analysis and growth focus</Text>
        </View>
        <Pressable onPress={() => router.push("/coach-center")}>
          <Text style={{ color: theme.palette.accent, fontSize: theme.text.size(13), fontWeight: "600" }}>Open →</Text>
        </Pressable>
      </View>

      {loading && resumes.length === 0 ? <LoadingState label="Loading coaching context…" /> : null}
      {error && !error.toLowerCase().includes("no saved jobs") ? (
        <ErrorState title="Coach Center unavailable" message={error} onRetry={() => void (selectedId ? loadAnalysisState(selectedId) : loadResumesState())} />
      ) : null}

      {!loading && resumes.length === 0 && !error ? (
        <EmptyState
          title="No resumes available"
          message="Coach Center needs a resume and saved jobs before it can surface personalized growth signals."
          actionLabel="Open Resume Lab"
          onAction={() => router.push("/resume-lab")}
        />
      ) : null}

      {resumes.length > 0 ? (
        <View style={styles.sectionGap}>
          <SelectField
            label="Resume"
            value={selectedId}
            onChange={setSelectedId}
            items={resumes.map((resume) => ({
              label: `${resume.resume_name} (${asString(resume.person_name)})`,
              value: resume.resume_id,
            }))}
          />

          {selectedResume ? (
            <View
              style={[
                styles.selectedResumeCard,
                { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted },
              ]}
            >
              <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(14), fontWeight: "600" }}>
                {selectedResume.resume_name}
              </Text>
              <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>
                {asString(selectedResume.person_name)}
              </Text>
            </View>
          ) : null}

          {loading && resumes.length > 0 ? <LoadingState label="Analyzing saved jobs…" /> : null}

          {error && error.toLowerCase().includes("no saved jobs") ? (
            <EmptyState
              title="No saved jobs to analyze"
              message="Save some roles from Job Finder and we’ll map your strongest matches and critical skills to learn."
              actionLabel="Open Job Finder"
              onAction={() => router.push("/job-finder")}
            />
          ) : null}

          {analysis ? (
            <View style={styles.sectionGap}>
              <View style={styles.metricRow}>
                <StatPill label="Avg ATS" value={`${analysis.summary.average_ats_score}`} tone="accent" />
                <StatPill label="Jobs" value={analysis.summary.total_saved_jobs} tone="success" />
                <StatPill label="To Learn" value={analysis.summary.missing_required_skills_count} tone="warning" />
              </View>

              <View
                style={[styles.insightCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}
              >
                <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(14), fontWeight: "600" }}>Critical skills to learn</Text>
                <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(13), lineHeight: theme.text.size(19) }}>
                  {analysis.summary.critical_skills_to_learn.slice(0, 3).join(", ") || "Your skill profile is already covering your saved roles well."}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailCard,
                    { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted },
                  ]}
                >
                  <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(13), fontWeight: "600" }}>
                    Matched skills
                  </Text>
                  <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), lineHeight: theme.text.size(18) }}>
                    {analysis.skill_analysis.matched_skills.slice(0, 5).join(", ") || "No direct matches surfaced yet."}
                  </Text>
                </View>
                <View
                  style={[
                    styles.detailCard,
                    { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted },
                  ]}
                >
                  <Text style={{ color: theme.palette.foreground, fontSize: theme.text.size(13), fontWeight: "600" }}>
                    Recommendations
                  </Text>
                  <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), lineHeight: theme.text.size(18) }}>
                    {analysis.recommendations.slice(0, 2).join(" ") || "Save more jobs to unlock richer coaching recommendations."}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
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
  selectedResumeCard: {
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  insightCard: {
    gap: 8,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  detailRow: {
    gap: 10,
  },
  detailCard: {
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
});

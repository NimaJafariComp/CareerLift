import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SelectField } from "@/components/ui/SelectField";
import { listResumes, getSavedJobs } from "@/lib/api/dashboard";
import { useAppTheme } from "@/lib/theme";
import type { ResumeSummary, SavedJobInfo } from "@/lib/types";
import { getStoredValue, setStoredValue } from "@/lib/storage/preferences";
import { setRecentResume, makeRecentResumeFallback } from "@/lib/storage/recentResume";
import { asString } from "@/lib/utils";

const SELECTED_KEY = "saved_jobs_resume";

function AtsBadge({ score }: { score: number }) {
  const { theme } = useAppTheme();

  const color = score >= 70 ? theme.palette.success : score >= 50 ? theme.palette.warning : theme.palette.danger;

  return (
    <View className="rounded-xl border px-2 py-1" style={{ borderColor: color, backgroundColor: `${color}22` }}>
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{Math.round(score)}%</Text>
    </View>
  );
}

export function SavedJobsCard() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [resumes, setResumes] = React.useState<ResumeSummary[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [jobs, setJobs] = React.useState<SavedJobInfo[] | null>(null);
  const [loadingResumes, setLoadingResumes] = React.useState(true);
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadResumesState = React.useCallback(async () => {
      setLoadingResumes(true);
      setError(null);

      try {
        const [resumeList, storedId] = await Promise.all([listResumes(), getStoredValue(SELECTED_KEY)]);
        setResumes(resumeList);

        const nextId = storedId && resumeList.some((item) => item.resume_id === storedId) ? storedId : resumeList[0]?.resume_id ?? "";
        setSelectedId(nextId);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load resumes.");
      } finally {
        setLoadingResumes(false);
      }
    }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadResumesState();
    }, [loadResumesState])
  );

  const loadJobsState = React.useCallback(
    async (resumeId: string) => {
      if (!resumeId) {
        setJobs(null);
        return;
      }

      setLoadingJobs(true);
      setError(null);

      try {
        await setStoredValue(SELECTED_KEY, resumeId);
        const selectedResume = resumes.find((item) => item.resume_id === resumeId);
        if (selectedResume) {
          await setRecentResume(makeRecentResumeFallback(selectedResume));
        }

        const response = await getSavedJobs(resumeId);
        const sorted = [...response.jobs].sort((a, b) => (b.ats_score ?? -1) - (a.ats_score ?? -1));
        setJobs(sorted);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to load saved jobs.");
      } finally {
        setLoadingJobs(false);
      }
    },
    [resumes]
  );

  React.useEffect(() => {
    if (!selectedId) {
      setJobs(null);
      return;
    }
    void loadJobsState(selectedId);
  }, [loadJobsState, selectedId, resumes]);

  return (
    <Card delay={90}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={{ color: theme.palette.foreground, fontSize: 18, fontWeight: "700" }}>Saved Jobs</Text>
          <Text style={{ color: theme.palette.muted, fontSize: 12 }}>Resume-aware jobs and ATS signals</Text>
        </View>
        <Pressable onPress={() => router.push("/job-finder")}>
          <Text style={{ color: theme.palette.accent, fontSize: 13, fontWeight: "600" }}>Open →</Text>
        </Pressable>
      </View>

      {loadingResumes ? <LoadingState label="Loading resumes…" /> : null}
      {error ? <ErrorState title="Saved jobs unavailable" message={error} onRetry={() => void (selectedId ? loadJobsState(selectedId) : loadResumesState())} /> : null}

      {!loadingResumes && resumes.length === 0 && !error ? (
        <EmptyState
          title="No resumes found"
          message="Add or upload a resume in Resume Lab to anchor your mobile job workflow."
          actionLabel="Open Resume Lab"
          onAction={() => router.push("/resume-lab")}
        />
      ) : null}

      {!loadingResumes && resumes.length > 0 ? (
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

          {loadingJobs ? <LoadingState label="Scoring saved jobs…" /> : null}

          {!loadingJobs && jobs?.length === 0 ? (
            <EmptyState
              title="No saved jobs yet"
              message="Browse live job sources and save strong matches. They’ll appear here sorted by ATS score."
              actionLabel="Browse Job Finder"
              onAction={() => router.push("/job-finder")}
            />
          ) : null}

          {!loadingJobs && jobs && jobs.length > 0 ? (
            <View style={styles.listGap}>
              {jobs.slice(0, 4).map((job, index) => (
                <View
                  key={`${job.apply_url}-${index}`}
                  style={[styles.itemCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemText}>
                      <Text style={{ color: theme.palette.foreground, fontSize: 14, fontWeight: "600" }}>{job.job_title}</Text>
                      <Text style={{ color: theme.palette.muted, fontSize: 12 }}>
                        {[job.company, job.location].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    {typeof job.ats_score === "number" ? <AtsBadge score={job.ats_score} /> : null}
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable onPress={() => void Linking.openURL(job.apply_url)}>
                      <Text style={{ color: theme.palette.accent, fontSize: 13, fontWeight: "600" }}>Apply →</Text>
                    </Pressable>
                    {job.source ? <Text style={{ color: theme.palette.muted, fontSize: 12 }}>{job.source}</Text> : null}
                  </View>
                </View>
              ))}
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
  listGap: {
    gap: 10,
  },
  itemCard: {
    gap: 10,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  itemText: {
    flex: 1,
    gap: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
});

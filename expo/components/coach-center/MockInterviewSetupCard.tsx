import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { LoadingState } from "@/components/ui/LoadingState";
import { ResumePickerCard } from "@/components/ui/ResumePickerCard";
import { useAppTheme } from "@/lib/theme";
import type { ResumeSummary, SavedJobInfo } from "@/lib/types";

const ROLE_LEVELS = ["entry", "mid", "senior"] as const;

export function MockInterviewSetupCard({
  resumes,
  selectedResume,
  jobs,
  selectedLevel,
  selectedJob,
  loadingResumes,
  loadingJobs,
  resumeError,
  jobsError,
  onResumeChange,
  onStartInterview,
  onSelectLevel,
  onSelectJob,
}: {
  resumes: ResumeSummary[];
  selectedResume: ResumeSummary | null;
  jobs: SavedJobInfo[];
  selectedLevel: string;
  selectedJob: SavedJobInfo | null;
  loadingResumes: boolean;
  loadingJobs: boolean;
  resumeError: string | null;
  jobsError: string | null;
  onResumeChange: (resumeId: string) => void;
  onStartInterview: () => void;
  onSelectLevel: (level: string) => void;
  onSelectJob: (job: SavedJobInfo) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.gap}>
      {loadingResumes ? (
        <LoadingState label="Loading resumes…" />
      ) : (
        <ResumePickerCard
          availableResumes={resumes}
          selectedResume={selectedResume}
          label="Select Resume"
          helper="Choose the resume you want to practice interviewing with."
          onChange={onResumeChange}
        />
      )}

      {resumeError ? (
        <View style={[styles.notice, { borderColor: `${theme.palette.danger}55`, backgroundColor: `${theme.palette.danger}16` }]}>
          <Text style={{ color: theme.palette.danger, fontWeight: "700" }}>Unable to load resumes</Text>
          <Text style={{ color: theme.palette.foreground }}>{resumeError}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(16) }}>Target Level</Text>
        <View style={styles.levelRow}>
          {ROLE_LEVELS.map((level) => {
            const active = selectedLevel === level;
            return (
              <Pressable
                key={level}
                onPress={() => onSelectLevel(level)}
                style={[
                  styles.levelPill,
                  {
                    borderColor: active ? theme.palette.accentStrong : theme.palette.divider,
                    backgroundColor: active ? theme.palette.accentStrong : theme.palette.surface,
                  },
                ]}
              >
                <Text style={{ color: active ? "#fff" : theme.palette.foreground, fontWeight: "700", textTransform: "capitalize" }}>{level}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
        <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(16) }}>Select Job Role</Text>
        {loadingJobs ? <LoadingState label="Loading saved jobs…" /> : null}
        {jobsError ? (
          <View style={[styles.notice, { borderColor: `${theme.palette.danger}55`, backgroundColor: `${theme.palette.danger}16` }]}>
            <Text style={{ color: theme.palette.foreground }}>{jobsError}</Text>
          </View>
        ) : null}
        {!loadingJobs && jobs.length === 0 ? (
          <View style={[styles.notice, { borderColor: `${theme.palette.accentStrong}44`, backgroundColor: `${theme.palette.accentStrong}14` }]}>
            <Text style={{ color: theme.palette.foreground }}>
              No saved jobs. Save a job from Job Finder to practice interviewing for a specific role.
            </Text>
          </View>
        ) : null}
        {!loadingJobs && jobs.length > 0 ? (
          <ScrollView style={styles.jobsScroll} nestedScrollEnabled>
            <View style={styles.gap}>
              {jobs.map((job, index) => {
                const active = selectedJob?.apply_url === job.apply_url;
                return (
                  <Pressable
                    key={`${job.apply_url}-${index}`}
                    onPress={() => onSelectJob(job)}
                    style={[
                      styles.jobCard,
                      {
                        borderColor: active ? theme.palette.accentStrong : theme.palette.divider,
                        backgroundColor: active ? theme.palette.accentSoft : theme.palette.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(14) }}>{job.job_title}</Text>
                    <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>
                      {[job.company, job.location].filter(Boolean).join(" · ")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </View>

      <Pressable
        onPress={onStartInterview}
        disabled={!selectedResume || !selectedJob}
        style={[
          styles.primaryButton,
          {
            backgroundColor: selectedResume && selectedJob ? theme.palette.accentStrong : theme.palette.surfaceStrong,
            opacity: selectedResume && selectedJob ? 1 : 0.65,
          },
        ]}
      >
        <Text style={styles.primaryText}>Start Interview</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  levelRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  levelPill: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 90,
    alignItems: "center",
  },
  jobsScroll: {
    maxHeight: 260,
  },
  jobCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
});

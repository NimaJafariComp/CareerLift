import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAppTheme } from "@/lib/theme";
import type { Job, SourceDefinition, SourceLoadingState } from "@/lib/types";

export function SourceJobsPanelMobile({
  source,
  jobs,
  loadingState,
  hasMoreJobs,
  sourceLimit,
  selectedResumeId,
  addedToGraph,
  addingToGraph,
  removingFromGraph,
  scoringJobs,
  onRefresh,
  onLoadMore,
  onCalculateAts,
  onAddToGraph,
  onUnsave,
  onUnsaveAll,
  onSaveToApplications,
  isAlreadyApplied,
}: {
  source: SourceDefinition;
  jobs: Job[];
  loadingState?: SourceLoadingState;
  hasMoreJobs: boolean;
  sourceLimit: number;
  selectedResumeId: string | null;
  addedToGraph: Set<string>;
  addingToGraph: Set<string>;
  removingFromGraph: Set<string>;
  scoringJobs: Set<string>;
  onRefresh: (sourceKey: string) => void;
  onLoadMore: (sourceKey: string) => void;
  onCalculateAts: (sourceKey: string, jobIndex: number) => void;
  onAddToGraph: (job: Job) => void;
  onUnsave: (job: Job) => void;
  onUnsaveAll: (sourceKey: string) => void;
  onSaveToApplications: (job: { id: string; title: string; company: string; salary?: string; url?: string; source: string }) => void;
  isAlreadyApplied: (id: string) => boolean;
}) {
  const { theme } = useAppTheme();
  const savedJobsInSource = jobs.filter((job) => addedToGraph.has(job.apply_url || job.source_url || "")).length;
  const isSourceLoading = loadingState?.isLoading || false;
  const progress = loadingState?.progress || 0;

  return (
    <View style={[styles.panel, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surfaceMuted }]}>
      <View style={[styles.header, { borderBottomColor: theme.palette.divider }]}>
        <View style={styles.headerTop}>
          <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(18) }}>
            {`${source.emoji} ${source.label}`}
          </Text>
          <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>{jobs.length} jobs</Text>
        </View>

        {isSourceLoading ? (
          <View style={styles.progressBlock}>
            <View style={styles.progressTop}>
              <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>Loading…</Text>
              <Text style={{ color: theme.palette.accentStrong, fontWeight: "700", fontSize: theme.text.size(12) }}>{progress}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.palette.surfaceStrong }]}>
              <View style={[styles.fill, { width: `${progress}%`, backgroundColor: theme.palette.accentStrong }]} />
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <ActionChip label={isSourceLoading ? "Refreshing…" : "Refresh"} onPress={() => onRefresh(source.key)} />
          {jobs.length > 0 && hasMoreJobs && sourceLimit < 1000 ? (
            <ActionChip label={isSourceLoading ? "Loading…" : "Load More (+100)"} onPress={() => onLoadMore(source.key)} />
          ) : null}
          {savedJobsInSource > 0 ? <ActionChip label={`Unsave All (${savedJobsInSource})`} onPress={() => onUnsaveAll(source.key)} danger /> : null}
        </View>
      </View>

      {jobs.length === 0 ? (
        isSourceLoading ? (
          <LoadingState label={`Loading ${source.label} jobs…`} />
        ) : (
          <EmptyState title={`No jobs from ${source.label}`} message="Try refreshing this source or adjusting your search terms." actionLabel="Fetch Jobs" onAction={() => onRefresh(source.key)} />
        )
      ) : (
        <ScrollView style={styles.scroll} nestedScrollEnabled>
          <View style={styles.list}>
            {jobs.map((job, index) => {
              const jobKey = `${source.key}-${index}`;
              const jobUrl = job.apply_url || job.source_url || "";
              const isAdding = addingToGraph.has(jobUrl);
              const isRemoving = removingFromGraph.has(jobUrl);
              const isScoring = scoringJobs.has(jobKey);
              const jobId = job.source_job_id ?? `${job.title}-${job.company}`;
              const isSavedToApplications = isAlreadyApplied(jobId);

              return (
                <View key={jobKey} style={[styles.jobCard, { borderColor: theme.palette.divider, backgroundColor: theme.palette.surface }]}>
                  <View style={styles.jobHeader}>
                    <View style={styles.copy}>
                      <Text style={{ color: theme.palette.foreground, fontWeight: "700", fontSize: theme.text.size(15) }}>{job.title}</Text>
                      <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12) }}>
                        {[job.company, job.location, job.employment_type, typeof job.remote === "boolean" ? (job.remote ? "Remote" : "On-site") : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      {job.salary_text ? (
                        <Text style={{ color: theme.palette.success, fontSize: theme.text.size(12), fontWeight: "600" }}>{job.salary_text}</Text>
                      ) : null}
                    </View>
                    {typeof job.ats_score === "number" ? (
                      <View
                        style={[
                          styles.atsBadge,
                          {
                            backgroundColor:
                              job.ats_score >= 70
                                ? `${theme.palette.success}22`
                                : job.ats_score >= 50
                                  ? `${theme.palette.warning}22`
                                  : `${theme.palette.danger}22`,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color:
                              job.ats_score >= 70
                                ? theme.palette.success
                                : job.ats_score >= 50
                                  ? theme.palette.warning
                                  : theme.palette.danger,
                            fontWeight: "800",
                          }}
                        >
                          {job.ats_score}%
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {job.ats_details ? (
                    <View style={styles.atsDetails}>
                      {job.ats_details.missing.required_skills.length > 0 ? (
                        <Text style={{ color: theme.palette.danger, fontSize: theme.text.size(12) }}>
                          Missing: {job.ats_details.missing.required_skills.slice(0, 3).join(", ")}
                        </Text>
                      ) : null}
                      {job.ats_details.matched.required_skills.length > 0 ? (
                        <Text style={{ color: theme.palette.success, fontSize: theme.text.size(12) }}>
                          Matched: {job.ats_details.matched.required_skills.slice(0, 3).join(", ")}
                        </Text>
                      ) : null}
                      {job.ats_details.reasoning[0] ? (
                        <Text style={{ color: theme.palette.muted, fontSize: theme.text.size(12), lineHeight: theme.text.size(18) }}>
                          {job.ats_details.reasoning[0]}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.actions}>
                    {jobUrl ? <ActionChip label="Apply" onPress={() => void Linking.openURL(jobUrl)} primary /> : null}
                    <ActionChip
                      label={isScoring ? "Scoring…" : "Calculate ATS"}
                      onPress={() => onCalculateAts(source.key, index)}
                      disabled={isScoring}
                    />
                    {isSavedToApplications ? (
                      <ActionChip label={isRemoving ? "Unsaving…" : "Unsave"} onPress={() => onUnsave(job)} disabled={isRemoving} danger />
                    ) : (
                      <ActionChip
                        label={isAdding ? "Adding…" : "Save to Applications"}
                        onPress={() => {
                          onAddToGraph(job);
                          onSaveToApplications({
                            id: jobId,
                            title: job.title,
                            company: job.company ?? "",
                            salary: job.salary_text ?? undefined,
                            url: jobUrl || undefined,
                            source: source.label,
                          });
                        }}
                        disabled={isAdding}
                        primary
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );

  function ActionChip({
    label,
    onPress,
    disabled,
    danger,
    primary,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    danger?: boolean;
    primary?: boolean;
  }) {
    const backgroundColor = primary
      ? theme.palette.accentStrong
      : danger
        ? `${theme.palette.danger}22`
        : theme.palette.surfaceStrong;
    const textColor = primary ? "#fff" : danger ? theme.palette.danger : theme.palette.foreground;

    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.actionChip,
          {
            backgroundColor,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text style={{ color: textColor, fontWeight: "700", fontSize: theme.text.size(12) }}>{label}</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 22,
    overflow: "hidden",
    minHeight: 420,
  },
  header: {
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  progressBlock: {
    gap: 6,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  scroll: {
    flex: 1,
    maxHeight: 640,
  },
  list: {
    gap: 10,
    padding: 14,
  },
  jobCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  atsBadge: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  atsDetails: {
    gap: 4,
  },
  actionChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});

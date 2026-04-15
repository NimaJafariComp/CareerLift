import React from "react";
import { useFocusEffect } from "@react-navigation/native";

import { fetchResumeGraph, getSavedJobs } from "@/lib/api/dashboard";
import {
  SOURCES,
  addJobToGraph,
  calculateAtsScores,
  deleteResume,
  listResumes,
  loadJobsBySource,
  removeJobFromResume,
  saveJobToResume,
} from "@/lib/api/jobFinder";
import { createRecentResumeFromUpload } from "@/lib/resumeData";
import { loadApplications, saveApplication } from "@/lib/storage/applications";
import { loadPersistedJobFinderState, savePersistedJobFinderState } from "@/lib/storage/jobFinder";
import { setRecentResume } from "@/lib/storage/recentResume";
import type {
  Job,
  JobFinderLoadingState,
  JobsBySource,
  Notice,
  ResumeGraphResponse,
  ResumeSummary,
  SavedApplication,
  SourceLimits,
} from "@/lib/types";
import { asString, stripHtmlToText } from "@/lib/utils";

function stripAtsScores(jobsData: JobsBySource): JobsBySource {
  const next: JobsBySource = {};
  for (const [source, jobs] of Object.entries(jobsData)) {
    next[source] = jobs.map(({ ats_score, ats_details, ...rest }) => rest);
  }
  return next;
}

export function useJobFinderMobile() {
  const [q, setQ] = React.useState("");
  const [loc, setLoc] = React.useState("");
  const [selectedSource, setSelectedSource] = React.useState<string>(SOURCES[0].key);
  const [selectedResume, setSelectedResume] = React.useState<ResumeSummary | null>(null);
  const [jobsBySource, setJobsBySource] = React.useState<JobsBySource>({});
  const [sourceLimits, setSourceLimits] = React.useState<SourceLimits>(
    SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: 100 }), {})
  );
  const [hasMoreJobs, setHasMoreJobs] = React.useState<Record<string, boolean>>(
    SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
  );
  const [loading, setLoading] = React.useState(false);
  const [loadingState, setLoadingState] = React.useState<JobFinderLoadingState>({});
  const [scoringJobs, setScoringJobs] = React.useState<Set<string>>(new Set());
  const [availableResumes, setAvailableResumes] = React.useState<ResumeSummary[]>([]);
  const [addedToGraphByResume, setAddedToGraphByResume] = React.useState<Record<string, string[]>>({});
  const [addingToGraph, setAddingToGraph] = React.useState<Set<string>>(new Set());
  const [removingFromGraph, setRemovingFromGraph] = React.useState<Set<string>>(new Set());
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [applications, setApplications] = React.useState<SavedApplication[]>([]);
  const initializedRef = React.useRef(false);

  const addedToGraph = new Set<string>(addedToGraphByResume[selectedResume?.resume_id ?? ""] ?? []);

  const refreshApplications = React.useCallback(async () => {
    const next = await loadApplications();
    setApplications(next);
    return next;
  }, []);

  const refreshResumes = React.useCallback(async () => {
    const resumes = await listResumes();
    setAvailableResumes(resumes);
    return resumes;
  }, []);

  React.useEffect(() => {
    async function bootstrap() {
      const [persisted, resumes] = await Promise.all([
        loadPersistedJobFinderState(),
        refreshResumes().catch(() => [] as ResumeSummary[]),
      ]);
      await refreshApplications();

      if (persisted) {
        setQ(persisted.q);
        setLoc(persisted.loc);
        setJobsBySource(persisted.jobsBySource);
        setAddedToGraphByResume(persisted.addedToGraphByResume);
        setSourceLimits(persisted.sourceLimits);
        setHasMoreJobs(persisted.hasMoreJobs);
        const selected = resumes.find((resume) => resume.resume_id === persisted.selectedResumeId) ?? null;
        setSelectedResume(selected);
      } else {
        void search();
      }

      initializedRef.current = true;
    }

    void bootstrap();
  }, [refreshApplications, refreshResumes]);

  React.useEffect(() => {
    if (!initializedRef.current) return;
    void savePersistedJobFinderState({
      q,
      loc,
      selectedResumeId: selectedResume?.resume_id ?? null,
      jobsBySource,
      addedToGraphByResume,
      sourceLimits,
      hasMoreJobs,
    });
  }, [addedToGraphByResume, hasMoreJobs, jobsBySource, loc, q, selectedResume, sourceLimits]);

  useFocusEffect(
    React.useCallback(() => {
      void refreshApplications();
      void refreshResumes().then((resumes) => {
        setSelectedResume((current) =>
          current ? resumes.find((resume) => resume.resume_id === current.resume_id) ?? null : current
        );
      });
    }, [refreshApplications, refreshResumes])
  );

  const dismissNotice = React.useCallback(() => setNotice(null), []);

  const search = React.useCallback(async () => {
    setLoading(true);
    setNotice(null);
    const initialLoadingState: JobFinderLoadingState = {};
    SOURCES.forEach(({ key }) => {
      initialLoadingState[key] = { isLoading: true, progress: 0 };
    });
    setLoadingState(initialLoadingState);
    setHasMoreJobs(SOURCES.reduce((acc, { key }) => ({ ...acc, [key]: true }), {}));

    try {
      const results: JobsBySource = {};

      for (const { key } of SOURCES) {
        setLoadingState((prev) => ({ ...prev, [key]: { isLoading: true, progress: 50 } }));
        const jobs = await loadJobsBySource(key, sourceLimits[key], q || undefined, loc || undefined);
        results[key] = jobs.map((job) => ({
          ...job,
          description: stripHtmlToText(job.description),
        }));
        setLoadingState((prev) => ({ ...prev, [key]: { isLoading: false, progress: 100 } }));
      }

      setJobsBySource(results);
      const total = Object.values(results).reduce((sum, jobs) => sum + jobs.length, 0);
      if (total === 0) {
        setNotice({ type: "info", message: "No jobs found from any source. Try adjusting your search filters." });
      }
    } catch (error) {
      setJobsBySource({});
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load jobs",
      });
    } finally {
      setLoading(false);
      setLoadingState({});
    }
  }, [loc, q, sourceLimits]);

  const calculateAtsForSingleJob = React.useCallback(
    async (sourceKey: string, jobIndex: number) => {
      if (!selectedResume) {
        setNotice({ type: "info", message: "Select a resume before calculating ATS scores." });
        return;
      }

      const job = jobsBySource[sourceKey]?.[jobIndex];
      if (!job) return;

      const scoreKey = `${sourceKey}-${jobIndex}`;
      setScoringJobs((prev) => new Set(prev).add(scoreKey));
      try {
        const scoredJobs = await calculateAtsScores([job], selectedResume.resume_id);
        const scoredJob = scoredJobs[0];
        if (!scoredJob) return;
        setJobsBySource((prev) => {
          const sourceJobs = [...(prev[sourceKey] || [])];
          if (!sourceJobs[jobIndex]) return prev;
          sourceJobs[jobIndex] = { ...scoredJob, description: stripHtmlToText(scoredJob.description) };
          return { ...prev, [sourceKey]: sourceJobs };
        });
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to calculate ATS score",
        });
      } finally {
        setScoringJobs((prev) => {
          const next = new Set(prev);
          next.delete(scoreKey);
          return next;
        });
      }
    },
    [jobsBySource, selectedResume]
  );

  const refreshSource = React.useCallback(
    async (sourceKey: string) => {
      setNotice(null);
      setSourceLimits((prev) => ({ ...prev, [sourceKey]: 100 }));
      setHasMoreJobs((prev) => ({ ...prev, [sourceKey]: true }));
      setLoadingState((prev) => ({ ...prev, [sourceKey]: { isLoading: true, progress: 0 } }));

      try {
        setLoadingState((prev) => ({ ...prev, [sourceKey]: { isLoading: true, progress: 55 } }));
        const jobs = await loadJobsBySource(sourceKey, 100, q || undefined, loc || undefined);
        setLoadingState((prev) => ({ ...prev, [sourceKey]: { isLoading: true, progress: 100 } }));
        setJobsBySource((prev) => ({
          ...prev,
          [sourceKey]: jobs.map((job) => ({ ...job, description: stripHtmlToText(job.description) })),
        }));
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? `Failed to refresh ${sourceKey}: ${error.message}` : `Failed to refresh ${sourceKey}`,
        });
      } finally {
        setLoadingState((prev) => {
          const next = { ...prev };
          delete next[sourceKey];
          return next;
        });
      }
    },
    [loc, q]
  );

  const loadMore = React.useCallback(
    async (sourceKey: string) => {
      const currentLimit = sourceLimits[sourceKey];
      const newLimit = Math.min(currentLimit + 100, 1000);
      if (currentLimit >= 1000) return;
      const previousJobCount = jobsBySource[sourceKey]?.length || 0;
      setSourceLimits((prev) => ({ ...prev, [sourceKey]: newLimit }));
      setLoadingState((prev) => ({ ...prev, [sourceKey]: { isLoading: true, progress: 0 } }));
      try {
        setLoadingState((prev) => ({ ...prev, [sourceKey]: { isLoading: true, progress: 60 } }));
        const jobs = await loadJobsBySource(sourceKey, newLimit, q || undefined, loc || undefined);
        if (jobs.length <= previousJobCount) {
          setHasMoreJobs((prev) => ({ ...prev, [sourceKey]: false }));
        }
        setJobsBySource((prev) => ({
          ...prev,
          [sourceKey]: jobs.map((job) => ({ ...job, description: stripHtmlToText(job.description) })),
        }));
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? `Failed to load more from ${sourceKey}: ${error.message}` : `Failed to load more from ${sourceKey}`,
        });
      } finally {
        setLoadingState((prev) => {
          const next = { ...prev };
          delete next[sourceKey];
          return next;
        });
      }
    },
    [jobsBySource, loc, q, sourceLimits]
  );

  const handleResumeChange = React.useCallback(
    (resumeId: string) => {
      const resume = availableResumes.find((item) => item.resume_id === resumeId) ?? null;
      setSelectedResume(resume);
      setJobsBySource((prev) => stripAtsScores(prev));
    },
    [availableResumes]
  );

  const handleResumeDelete = React.useCallback(
    async (resumeId: string) => {
      try {
        await deleteResume(resumeId);
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to remove resume",
        });
        return;
      }

      setSelectedResume((prev) => (prev?.resume_id === resumeId ? null : prev));
      setAvailableResumes((prev) => prev.filter((resume) => resume.resume_id !== resumeId));
      setAddedToGraphByResume((prev) => {
        const next = { ...prev };
        delete next[resumeId];
        return next;
      });
      setNotice({ type: "success", message: "Resume removed." });
    },
    []
  );

  const handleDeleteAllResumes = React.useCallback(async () => {
    const ids = availableResumes.map((resume) => resume.resume_id);
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await deleteResume(id);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : id);
      }
    }
    setSelectedResume(null);
    setAvailableResumes([]);
    setAddedToGraphByResume({});
    setNotice(
      errors.length > 0
        ? { type: "error", message: `Some resumes could not be removed: ${errors.join(", ")}` }
        : { type: "success", message: "All resumes removed." }
    );
  }, [availableResumes]);

  const handleUnsaveJob = React.useCallback(
    async (job: Job) => {
      const jobUrl = job.apply_url || job.source_url || "";
      if (!jobUrl) return;
      const key = selectedResume?.resume_id ?? "";
      setRemovingFromGraph((prev) => new Set(prev).add(jobUrl));
      try {
        if (selectedResume) {
          await removeJobFromResume(selectedResume.resume_id, jobUrl);
        }
        setAddedToGraphByResume((prev) => ({
          ...prev,
          [key]: (prev[key] ?? []).filter((url) => url !== jobUrl),
        }));
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to unsave job",
        });
      } finally {
        setRemovingFromGraph((prev) => {
          const next = new Set(prev);
          next.delete(jobUrl);
          return next;
        });
      }
    },
    [selectedResume]
  );

  const handleUnsaveAllInSource = React.useCallback(
    async (sourceKey: string) => {
      const key = selectedResume?.resume_id ?? "";
      const savedUrls = new Set(addedToGraphByResume[key] ?? []);
      const toUnsave = (jobsBySource[sourceKey] ?? [])
        .map((job) => job.apply_url || job.source_url || "")
        .filter((url) => url && savedUrls.has(url));
      if (toUnsave.length === 0) return;

      const errors: string[] = [];
      if (selectedResume) {
        for (const url of toUnsave) {
          try {
            await removeJobFromResume(selectedResume.resume_id, url);
          } catch (error) {
            errors.push(error instanceof Error ? error.message : url);
          }
        }
      }

      setAddedToGraphByResume((prev) => ({
        ...prev,
        [key]: (prev[key] ?? []).filter((url) => !toUnsave.includes(url)),
      }));

      if (errors.length > 0) {
        setNotice({
          type: "error",
          message: `Some jobs could not be unsaved: ${errors.slice(0, 3).join(", ")}`,
        });
      }
    },
    [addedToGraphByResume, jobsBySource, selectedResume]
  );

  const handleSaveToApplications = React.useCallback(
    async (job: { id: string; title: string; company: string; salary?: string; url?: string; source: string }) => {
      await saveApplication(job);
      await refreshApplications();
    },
    [refreshApplications]
  );

  const handleAddToGraph = React.useCallback(
    async (job: Job) => {
      const jobUrl = job.apply_url || job.source_url || "";
      if (!jobUrl) {
        setNotice({
          type: "error",
          message: "This job cannot be saved because it does not include an application URL.",
        });
        return;
      }

      if (!selectedResume) {
        setNotice({
          type: "info",
          message: "Saving without a selected resume will add the job to the graph, but it will not appear under a resume.",
        });
      }

      setAddingToGraph((prev) => new Set(prev).add(jobUrl));
      try {
        const result = await addJobToGraph(job);
        if (!result.success) {
          throw new Error(result.message || "Failed to add job to knowledge graph");
        }

        setAddedToGraphByResume((prev) => {
          const key = selectedResume?.resume_id ?? "";
          const existing = prev[key] ?? [];
          if (existing.includes(jobUrl)) return prev;
          return { ...prev, [key]: [...existing, jobUrl] };
        });

        if (selectedResume) {
          await saveJobToResume(selectedResume.resume_id, jobUrl);
          const graphJson = (await fetchResumeGraph(asString(selectedResume.person_name))) as ResumeGraphResponse;
          await setRecentResume({
            ...createRecentResumeFromUpload({
              message: "Loaded from graph",
              filename: selectedResume.resume_name,
              text_length: 0,
              nodes_created: 0,
              graph_data: {
                person: {
                  name: graphJson.person?.name || asString(selectedResume.person_name),
                  email: graphJson.person?.email,
                  phone: graphJson.person?.phone,
                  location: graphJson.person?.location,
                  summary: graphJson.person?.summary,
                },
                skills: graphJson.skills,
                experiences: graphJson.experiences.map((item) => ({
                  title: asString(item.title),
                  company: asString(item.company),
                  duration: asString(item.duration),
                  description: stripHtmlToText(item.description),
                })),
                education: graphJson.education.map((item) => ({
                  degree: asString(item.degree),
                  institution: asString(item.institution),
                  year: asString(item.year),
                })),
                saved_jobs: graphJson.saved_jobs,
                resumes: graphJson.resumes,
              },
              person_name: asString(selectedResume.person_name),
              resume_name: selectedResume.resume_name,
              resume_id: selectedResume.resume_id,
            }),
          });
        }

        setNotice({
          type: "success",
          message: selectedResume
            ? "Job saved to the knowledge graph and linked to the selected resume."
            : "Job saved to the knowledge graph.",
        });
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to add job to knowledge graph",
        });
      } finally {
        setAddingToGraph((prev) => {
          const next = new Set(prev);
          next.delete(jobUrl);
          return next;
        });
      }
    },
    [refreshApplications, selectedResume]
  );

  const totalJobs = Object.values(jobsBySource).reduce((sum, jobs) => sum + jobs.length, 0);

  return {
    q,
    loc,
    selectedSource,
    loading,
    loadingState,
    notice,
    availableResumes,
    selectedResume,
    jobsBySource,
    totalJobs,
    hasMoreJobs,
    sourceLimits,
    scoringJobs,
    addedToGraph,
    addingToGraph,
    removingFromGraph,
    applications,
    setQ,
    setLoc,
    setSelectedSource,
    dismissNotice,
    search,
    handleResumeChange,
    handleResumeDelete,
    handleDeleteAllResumes,
    refreshSource,
    loadMore,
    calculateAtsForSingleJob,
    handleAddToGraph,
    handleUnsaveJob,
    handleUnsaveAllInSource,
    handleSaveToApplications,
    isAlreadyApplied: (id: string) => applications.some((item) => item.id === id),
  };
}

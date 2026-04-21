import type { Job, Resume } from "@/components/job-finder/types";
import { apiFetch } from "@/lib/apiClient";

export function asString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      (typeof record.name === "string" && record.name) ||
      (typeof record.label === "string" && record.label) ||
      (typeof record.title === "string" && record.title) ||
      JSON.stringify(value)
    );
  }
  return String(value);
}

export function getApiBase() {
  if (typeof window !== "undefined") {
    const fallback = `${window.location.protocol}//${window.location.hostname}:8000`;
    return process.env.NEXT_PUBLIC_API_URL || fallback;
  }
  return process.env.NEXT_PUBLIC_API_URL || "";
}

export async function loadJobsBySource(
  source: string,
  limit: number,
  q?: string,
  location?: string
): Promise<Job[]> {
  const qs = new URLSearchParams();
  if (q) qs.set("keyword", q);
  if (location) qs.set("location", location);
  qs.set("limit", String(limit));

  const base = getApiBase();
  if (!base) return [];

  const res = await apiFetch(`${base}/jobs/fetch-live/${source}?${qs.toString()}`);
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);

  const data = await res.json();
  return data.jobs || [];
}

export async function calculateAtsScores(
  jobs: Job[],
  resumeId: string
): Promise<Job[]> {
  const base = getApiBase();
  const res = await apiFetch(`${base}/jobs/calculate-ats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, resume_id: resumeId }),
  });
  if (!res.ok) throw new Error(`Failed to calculate ATS: ${res.status}`);
  return res.json();
}

export async function addJobToGraph(job: Job) {
  const base = getApiBase();
  const res = await apiFetch(`${base}/jobs/add-to-graph`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error(`Failed to add job to graph: ${res.status}`);
  return res.json();
}

export async function listResumes(): Promise<Resume[]> {
  const base = getApiBase();
  const res = await apiFetch(`${base}/api/resume/list`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load resumes: ${res.status}`);
  const data = await res.json();
  return data.resumes || [];
}

export async function deleteResume(resumeId: string): Promise<void> {
  const base = getApiBase();
  const res = await apiFetch(`${base}/api/resume/${resumeId}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to delete resume: ${res.status}`);
}

/** Snapshot of a job posting; sent to the backend so /api/resume/save-job
 *  can MERGE the JobPosting and link it in a single atomic request. */
export type JobSnapshot = {
  apply_url: string;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  source?: string | null;
  description?: string | null;
  salary_text?: string | null;
  employment_type?: string | null;
  remote?: boolean | null;
  posted_at?: string | null;
  source_url?: string | null;
};

export async function saveJobToResume(
  resumeId: string,
  jobOrUrl: JobSnapshot | string,
  notes: string = "",
) {
  const base = getApiBase();
  const job: JobSnapshot =
    typeof jobOrUrl === "string" ? { apply_url: jobOrUrl } : jobOrUrl;
  const res = await apiFetch(`${base}/api/resume/save-job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume_id: resumeId,
      job,
      notes,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to save job: ${res.status} ${detail.slice(0, 200)}`);
  }
  return res.json();
}

export type SavedJobInfo = {
  job_title: string;
  company?: string | null;
  location?: string | null;
  apply_url: string;
  source?: string | null;
  saved_at: string;
  notes?: string | null;
  ats_score?: number | null;
};

export type SavedJobsList = {
  resume_id: string;
  resume_name: string;
  jobs: SavedJobInfo[];
};

export async function getSavedJobs(resumeId: string): Promise<SavedJobsList> {
  const base = getApiBase();
  const res = await apiFetch(`${base}/api/resume/saved-jobs/${encodeURIComponent(resumeId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch saved jobs: ${res.status}`);
  return res.json();
}

export async function removeJobFromResume(resumeId: string, jobUrl: string) {
  const base = getApiBase();
  const res = await apiFetch(
    `${base}/api/resume/saved-job/${encodeURIComponent(resumeId)}/${encodeURIComponent(jobUrl)}`,
    { method: "DELETE", cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Failed to unsave job: ${res.status}`);
  return res.json();
}

export async function fetchResumeGraph(personName: unknown) {
  const base = getApiBase();
  const res = await apiFetch(
    `${base}/api/resume/graph/${encodeURIComponent(asString(personName))}`
  );
  if (!res.ok) throw new Error(`Failed to refresh resume graph: ${res.status}`);
  return res.json();
}

export async function getSkillGapAnalysis(resumeId: string) {
  const base = getApiBase();
  const res = await apiFetch(`${base}/api/resume/skill-gap-analysis/${encodeURIComponent(resumeId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch skill gap analysis: ${res.status}`);
  return res.json();
}

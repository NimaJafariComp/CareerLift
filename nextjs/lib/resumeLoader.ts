import type { GraphData, UploadResult } from "@/components/resume-lab/types";
import type { Resume } from "@/components/job-finder/types";
import { asString, fetchResumeGraph, listResumes } from "@/lib/jobFinderApi";

export const LAST_RESUME_KEY = "careerlift:lastResume";
export const RESUME_BUILDER_KEY = "careerlift:resumeBuilder";
export const RESUME_UPDATED_EVENT = "careerlift:resume-updated";

/** Display label combining the human-entered resume name with a short id
 *  suffix so users can disambiguate same-named resumes (e.g.
 *  `Spring 2026 SWE — #a73a4f`). */
export function formatResumeLabel(input: {
  resume_name?: string | unknown;
  resume_id?: string;
  filename?: string;
}): string {
  const name = asString(input.resume_name) || asString(input.filename) || "Unnamed";
  const id = input.resume_id || "";
  if (!id) return name;
  return `${name} — #${id.slice(0, 6)}`;
}

export interface StoredResume {
  filename: string;
  text_length: number;
  nodes_created: number;
  graph_data: GraphData;
  person_name: string;
  resume_name: string;
  resume_id: string;
  storedAt: number;
}

// The backend `/api/resume/graph/{person_name}` returns raw Neo4j node dicts
// (each property still on the node). The editor/preview expect the normalized
// shape defined in components/resume-lab/types.ts. This converts one to the
// other.
export function normalizeGraphData(raw: any): GraphData {
  const person = raw?.person || {};
  return {
    person: {
      name: asString(person.name),
      email: person.email ? asString(person.email) : undefined,
      phone: person.phone ? asString(person.phone) : undefined,
      location: person.location ? asString(person.location) : undefined,
      summary: person.summary ? asString(person.summary) : undefined,
    },
    skills: ((raw?.skills as any[]) || [])
      .map((s) => (typeof s === "string" ? s : asString(s?.name ?? s)))
      .filter(Boolean),
    experiences: ((raw?.experiences as any[]) || []).map((e) => ({
      title: asString(e?.title ?? ""),
      company: asString(e?.company ?? ""),
      duration: e?.duration ? asString(e.duration) : undefined,
      description: e?.description ? asString(e.description) : undefined,
    })),
    education: ((raw?.education as any[]) || []).map((ed) => ({
      degree: asString(ed?.degree ?? ""),
      institution: asString(ed?.institution ?? ""),
      year: ed?.year ? asString(ed.year) : undefined,
    })),
    saved_jobs: raw?.saved_jobs || [],
    resumes: raw?.resumes || [],
  };
}

export function toUploadResult(stored: StoredResume): UploadResult {
  return {
    message: "Loaded from saved resume",
    filename: stored.filename,
    text_length: stored.text_length,
    nodes_created: stored.nodes_created,
    graph_data: stored.graph_data,
    person_name: stored.person_name,
    resume_name: stored.resume_name,
    resume_id: stored.resume_id,
  };
}

// Load a resume by id: look it up in the list, fetch its graph, normalize,
// build a StoredResume payload. Caller decides whether to persist.
export async function loadResumeById(
  resumeId: string,
  resumes?: Resume[],
): Promise<StoredResume> {
  const list = resumes ?? (await listResumes());
  const match = list.find((r) => r.resume_id === resumeId);
  if (!match) throw new Error("Resume not found");
  const raw = await fetchResumeGraph(match.person_name);
  const graph = normalizeGraphData(raw);
  // storedAt represents the last *edit* time, so the dashboard's "Updated X
  // ago" reflects real edits and not the moment the user clicked a card.
  // Seed it from the backend's updated_at; user edits in Resume Lab will
  // bump it via persistEditedAt() below.
  const updated = match.updated_at ? Date.parse(match.updated_at) : NaN;
  const storedAt = Number.isFinite(updated) ? updated : Date.now();
  return {
    filename: asString(match.resume_name) || "resume",
    text_length: 0,
    nodes_created: 0,
    graph_data: graph,
    person_name: asString(match.person_name),
    resume_name: asString(match.resume_name),
    resume_id: match.resume_id,
    storedAt,
  };
}

/** Bump only the `storedAt` of the active resume in localStorage so the
 *  dashboard's "Updated X ago" reflects a fresh user edit. No-op if no
 *  active resume is cached. */
export function persistEditedAt(at: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LAST_RESUME_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.graph_data?.person) return;
    parsed.storedAt = at;
    localStorage.setItem(LAST_RESUME_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new CustomEvent(RESUME_UPDATED_EVENT));
  } catch {
    /* noop */
  }
}

export function persistStoredResume(stored: StoredResume): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_RESUME_KEY, JSON.stringify(stored));
    // Remove any in-progress builder state so the newly-selected resume
    // loads cleanly in Resume Lab instead of mixing with prior edits.
    localStorage.removeItem(RESUME_BUILDER_KEY);
    window.dispatchEvent(new CustomEvent(RESUME_UPDATED_EVENT));
  } catch {
    /* storage can be unavailable in private mode — non-fatal */
  }
}

export function clearStoredResume(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LAST_RESUME_KEY);
    localStorage.removeItem(RESUME_BUILDER_KEY);
    window.dispatchEvent(new CustomEvent(RESUME_UPDATED_EVENT));
  } catch {
    /* noop */
  }
}

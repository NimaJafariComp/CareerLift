"use client";

import { useEffect, useState } from "react";
import { useActiveResume } from "@/hooks/useActiveResume";
import { getSavedJobs } from "@/lib/jobFinderApi";

export type ApplicationStatus =
  | "Pending"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected";

export interface SavedApplication {
  id: string;
  title: string;
  company: string;
  salary?: string;
  url?: string;
  source: string;
  dateApplied: string;
  status: ApplicationStatus;
}

const STORAGE_KEY = "careerlift_applications";

function readStored(): SavedApplication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedApplication[]) : [];
  } catch {
    return [];
  }
}

function writeStored(apps: SavedApplication[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    /* noop */
  }
}

export function useApplications() {
  const [applications, setApplications] = useState<SavedApplication[]>([]);
  const activeResume = useActiveResume();

  useEffect(() => {
    setApplications(readStored());
  }, []);

  // Backfill: ensure every backend-saved job for the active resume has a
  // local Application entry. Idempotent — entries are deduped by id and
  // by url (older saves used different id schemes).
  useEffect(() => {
    if (!activeResume?.resume_id) return;
    let cancelled = false;
    getSavedJobs(activeResume.resume_id)
      .then((data) => {
        if (cancelled || !data?.jobs) return;
        setApplications((prev) => {
          const backendUrls = new Set(
            data.jobs.map((j) => j.apply_url).filter(Boolean) as string[],
          );

          // Migration: any pre-existing entry whose URL matches a backend
          // saved job AND still carries the legacy "Applied" status (set by
          // an earlier backfill before "Pending" existed) gets promoted to
          // Pending. Entries the user has actively moved to Interview /
          // Offer / Rejected are left alone.
          let mutated = false;
          const migrated = prev.map((a) => {
            if (
              a.status === "Applied" &&
              a.url &&
              backendUrls.has(a.url)
            ) {
              mutated = true;
              return { ...a, status: "Pending" as ApplicationStatus };
            }
            return a;
          });

          // Insert any saved jobs that don't yet have a local entry.
          const byId = new Set(migrated.map((a) => a.id));
          const byUrl = new Set(
            migrated.map((a) => a.url).filter(Boolean) as string[],
          );
          const additions: SavedApplication[] = [];
          for (const job of data.jobs) {
            const url = job.apply_url || "";
            if (url && byUrl.has(url)) continue;
            const id = url || `${job.job_title}-${job.company || ""}`;
            if (byId.has(id)) continue;
            additions.push({
              id,
              title: job.job_title,
              company: job.company || "",
              salary: undefined,
              url: url || undefined,
              source: job.source || "graph",
              dateApplied: job.saved_at
                ? new Date(job.saved_at).toLocaleDateString()
                : new Date().toLocaleDateString(),
              status: "Pending",
            });
            byId.add(id);
            if (url) byUrl.add(url);
          }

          if (!mutated && additions.length === 0) return prev;
          const next = [...migrated, ...additions];
          writeStored(next);
          return next;
        });
      })
      .catch(() => {
        /* non-fatal */
      });
    return () => {
      cancelled = true;
    };
  }, [activeResume?.resume_id]);

  const saveApplication = (
    job: Omit<SavedApplication, "dateApplied" | "status">,
  ) => {
    setApplications((prev) => {
      // Dedup by id AND by url so backend-backfilled entries don't collide
      // with optimistic Job Finder saves that may use a different id scheme.
      if (prev.find((a) => a.id === job.id)) return prev;
      if (job.url && prev.find((a) => a.url === job.url)) return prev;
      const next: SavedApplication[] = [
        ...prev,
        {
          ...job,
          dateApplied: new Date().toLocaleDateString(),
          status: "Pending",
        },
      ];
      writeStored(next);
      return next;
    });
  };

  const updateStatus = (id: string, status: ApplicationStatus) => {
    setApplications((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, status } : a));
      writeStored(next);
      return next;
    });
  };

  const removeApplication = (id: string) => {
    setApplications((prev) => {
      const next = prev.filter((a) => a.id !== id);
      writeStored(next);
      return next;
    });
  };

  const isApplied = (id: string) => applications.some((a) => a.id === id);

  return {
    applications,
    saveApplication,
    updateStatus,
    removeApplication,
    isApplied,
  };
}

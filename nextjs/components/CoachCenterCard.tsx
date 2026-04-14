"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { listResumes } from "@/lib/jobFinderApi";
import SkillGapAnalysisComponent from "@/components/SkillGapAnalysis";

export default function CoachCenterCard() {
  const [resumes, setResumes] = useState<any[]>([]);
  const [resumesLoading, setResumesLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [selectedResumeName, setSelectedResumeName] = useState<string>("");

  useEffect(() => {
    listResumes()
      .then((data) => setResumes(data))
      .catch(() => {})
      .finally(() => setResumesLoading(false));
  }, []);

  const handleSelect = (id: string, name: string) => {
    setSelectedResumeId(id);
    setSelectedResumeName(name);
  };

  return (
    <div className="card hover-ring flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="card-header">Skill Gap Analysis</h2>
        <Link
          href="/coach-center"
          className="text-xs text-muted hover:text-white transition-colors shrink-0"
        >
          Coach Center →
        </Link>
      </div>

      {resumesLoading ? (
        <p className="text-sm text-muted">Loading resumes…</p>
      ) : resumes.length === 0 ? (
        <p className="text-sm text-muted flex-1 flex items-center justify-center py-4">
          No resumes found.{" "}
          <Link href="/resume-lab" className="ml-1 text-teal-400 hover:underline">
            Create one →
          </Link>
        </p>
      ) : !selectedResumeId ? (
        <>
          <p className="text-xs text-muted mb-3">Select a resume to analyze skill gaps:</p>
          <ul className="flex flex-col gap-2 flex-1">
            {resumes.map((r) => (
              <li key={r.resume_id}>
                <button
                  onClick={() => handleSelect(r.resume_id, r.resume_name)}
                  className="w-full text-left rounded-lg border border-(--border-color) px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                >
                  <p className="font-medium text-white">{r.resume_name}</p>
                  <p className="text-xs text-muted">{r.person_name}</p>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedResumeId(null)}
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors"
            >
              ← Change
            </button>
            <span className="text-xs text-muted truncate">{selectedResumeName}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SkillGapAnalysisComponent resumeId={selectedResumeId} />
          </div>
        </>
      )}
    </div>
  );
}

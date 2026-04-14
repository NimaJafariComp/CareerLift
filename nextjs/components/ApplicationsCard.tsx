"use client";

import React from "react";
import Link from "next/link";
import { useApplications, ApplicationStatus } from "@/hooks/useApplications";

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  Applied: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Interview: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Offer: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Rejected: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function ApplicationsCard() {
  const { applications } = useApplications();

  const counts: Record<ApplicationStatus, number> = {
    Applied: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
  };
  for (const app of applications) counts[app.status]++;

  const recent = [...applications]
    .sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime())
    .slice(0, 3);

  return (
    <div className="card hover-ring flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="card-header">Applications</h2>
        <Link
          href="/applications"
          className="text-xs text-muted hover:text-white transition-colors shrink-0"
        >
          View all →
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(["Applied", "Interview", "Offer", "Rejected"] as ApplicationStatus[]).map((status) => (
          <div
            key={status}
            className={`rounded-lg border px-2 py-2 text-center ${STATUS_COLORS[status]}`}
          >
            <p className="text-lg font-bold">{counts[status]}</p>
            <p className="text-[10px] leading-tight opacity-80">{status}</p>
          </div>
        ))}
      </div>

      {/* Recent applications */}
      {applications.length === 0 ? (
        <p className="text-sm text-muted flex-1 flex items-center justify-center py-4">
          No applications yet.{" "}
          <Link href="/job-finder" className="ml-1 text-teal-400 hover:underline">
            Find jobs →
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-2 flex-1">
          {recent.map((app) => (
            <li
              key={app.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-(--border-color) px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{app.title}</p>
                <p className="text-muted text-xs truncate">{app.company}</p>
              </div>
              <span
                className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[app.status]}`}
              >
                {app.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

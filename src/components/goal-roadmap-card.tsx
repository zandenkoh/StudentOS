"use client";

import { CheckCircle2, ChevronRight, Route } from "lucide-react";
import { SourceChip } from "@/components/source-chip";

export function GoalRoadmapCard({
  onView,
  roadmapAdded,
  goalTitle = "Learn coding by December",
  summaryLines
}: {
  onView: () => void;
  roadmapAdded: boolean;
  goalTitle?: string;
  summaryLines?: string[];
}) {
  const lines = summaryLines?.length
    ? summaryLines
    : [
        "6 steps scheduled across Jun-Dec.",
        "Next action: 30 min coding fundamentals.",
        "Risk: consistency, not deadline proximity.",
      ];

  return (
    <section className="rounded-[26px] border border-neutral-200 bg-white p-5 shadow-[0_12px_45px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-ink">
            <Route className="size-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Goal roadmap
            </p>
            <h2 className="mt-1 text-[17px] font-semibold text-ink">
              {goalTitle}
            </h2>
          </div>
        </div>
        {roadmapAdded ? (
          <SourceChip tone="success">
            <CheckCircle2 className="mr-1 size-3.5" />
            Added
          </SourceChip>
        ) : null}
      </div>

      <div className="space-y-2 rounded-[20px] bg-neutral-50 p-3 text-[13px] font-semibold text-neutral-600">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <button
        type="button"
        onClick={onView}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-white shadow-soft"
      >
        View goal roadmap
        <ChevronRight className="size-4" />
      </button>
    </section>
  );
}

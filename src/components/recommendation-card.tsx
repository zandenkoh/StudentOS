"use client";

import { ListChecks } from "lucide-react";
import { SecondaryButton } from "@/components/buttons";
import type { AIConflictAnalysis } from "@/lib/studentos-ai-types";

const actions = [
  "Keep fixed-time items explicit",
  "Move flexible work around confirmed overlaps",
  "Confirm missing times before locking the plan",
  "Update the timeline after each instruction",
];

const manualActions = [
  "Apply the manual instruction as the priority constraint",
  "Mark any changed task as updated",
  "Recheck fixed-time overlaps",
  "Ask for clarification if timing is still missing",
];

export function RecommendationCard({
  resolved,
  resolutionMode,
  onEdit,
  conflict
}: {
  resolved: boolean;
  resolutionMode: "recommended" | "manual" | null;
  onEdit: () => void;
  conflict?: AIConflictAnalysis;
}) {
  const usingManual = resolutionMode === "manual";
  const visibleActions = usingManual
    ? conflict?.manualActions ?? manualActions
    : conflict?.recommendedActions ?? actions;

  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100">
          <ListChecks className="size-5" />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold">
            {usingManual ? "Manual instruction applied" : "Suggested fix ready"}
          </h2>
          <p className="text-[13px] text-muted">
            {usingManual ? "StudentOS rebuilt the conflict state." : "Cleanest schedule found."}
          </p>
        </div>
      </div>
      <p className="text-[14px] leading-6 text-neutral-700">
        {usingManual
          ? conflict?.resolvedSummary ?? "StudentOS applied the manual instruction and rebuilt the conflict state."
          : conflict?.recommendationSummary ??
            "Keep fixed commitments stable, move flexible work first, and ask for clarification if exact timing is missing."}
      </p>
      <div className="mt-4 space-y-2">
        {visibleActions.map((action) => (
          <div key={action} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-sm">
            <span className="size-1.5 rounded-full bg-ink" />
            {action}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {!resolved ? (
          <SecondaryButton onClick={onEdit} className="w-full">Edit manually</SecondaryButton>
        ) : null}
      </div>
    </section>
  );
}

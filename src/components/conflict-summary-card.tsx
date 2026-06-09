import { TriangleAlert } from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import { cn } from "@/lib/utils";
import type { AIConflictAnalysis } from "@/lib/studentos-ai-types";

export function ConflictSummaryCard({
  resolved,
  resolutionMode,
  conflict
}: {
  resolved: boolean;
  resolutionMode?: "recommended" | "manual" | null;
  conflict?: AIConflictAnalysis;
}) {
  const manual = resolutionMode === "manual";
  const title = resolved
    ? manual
      ? "Manual instruction applied"
      : conflict?.resolvedTitle ?? "Conflict resolved"
    : conflict?.title ?? "CCA briefing overlaps with tuition";
  const summary = resolved
    ? manual
      ? "Tuition no longer clashes with CCA."
      : conflict?.resolvedSummary ?? "Suggested deconflict applied."
    : conflict?.unresolvedSummary ?? "You cannot attend both fully.";

  return (
    <section
      className={cn(
        "rounded-[28px] border p-5 shadow-soft",
        resolved ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
      )}
    >
      {resolved ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-white text-emerald-700">
              <TriangleAlert className="size-5" />
            </span>
            <div>
              <h2 className="text-[17px] font-semibold text-emerald-950">
                {title}
              </h2>
              <p className="text-[13px] text-emerald-800">
                {summary}
              </p>
            </div>
          </div>
          <SourceChip tone="success">Resolved</SourceChip>
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          <SourceChip tone="danger">Needs decision</SourceChip>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>
            {conflict?.fixedEventTitle ?? "Tuition"}
          </p>
          <p className="mt-1 font-semibold">{conflict?.fixedEventTime ?? "4:30-6:30 PM"}</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>
            {conflict?.conflictingEventTitle ?? "CCA briefing"}
          </p>
          <p className="mt-1 font-semibold">{conflict?.conflictingEventTime ?? "5:30-6:15 PM"}</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>Overlap</p>
          <p className="mt-1 font-semibold">{resolved ? "Handled" : conflict?.overlapLabel ?? "45 min"}</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>Impact</p>
          <p className="mt-1 font-semibold">
            {resolved ? conflict?.resolvedImpactLabel ?? "Plan ready" : conflict?.impactLabel ?? "Decision needed"}
          </p>
        </div>
      </div>
    </section>
  );
}

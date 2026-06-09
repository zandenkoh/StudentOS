import { TriangleAlert } from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import { cn } from "@/lib/utils";

export function ConflictSummaryCard({
  resolved,
  resolutionMode
}: {
  resolved: boolean;
  resolutionMode?: "recommended" | "manual" | null;
}) {
  const manual = resolutionMode === "manual";

  return (
    <section
      className={cn(
        "rounded-[28px] border p-5 shadow-soft",
        resolved ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-full bg-white",
              resolved ? "text-emerald-700" : "text-red-700"
            )}
          >
            <TriangleAlert className="size-5" />
          </span>
          <div>
            <h2 className={cn("text-[17px] font-semibold", resolved ? "text-emerald-950" : "text-red-950")}>
              {resolved ? (manual ? "Manual instruction applied" : "Conflict resolved") : "CCA briefing overlaps with tuition"}
            </h2>
            <p className={cn("text-[13px]", resolved ? "text-emerald-800" : "text-red-800")}>
              {resolved
                ? manual
                  ? "Tuition no longer clashes with CCA."
                  : "Suggested deconflict applied."
                : "You cannot attend both fully."}
            </p>
          </div>
        </div>
        <SourceChip tone={resolved ? "success" : "danger"}>
          {resolved ? "Resolved" : "Needs decision"}
        </SourceChip>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>Tuition</p>
          <p className="mt-1 font-semibold">4:30-6:30 PM</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>CCA briefing</p>
          <p className="mt-1 font-semibold">5:30-6:15 PM</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>Overlap</p>
          <p className="mt-1 font-semibold">{resolved ? "Handled" : "45 min"}</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className={cn("text-xs font-semibold", resolved ? "text-emerald-700" : "text-red-700")}>Impact</p>
          <p className="mt-1 font-semibold">{resolved ? "Plan ready" : "Decision needed"}</p>
        </div>
      </div>
    </section>
  );
}

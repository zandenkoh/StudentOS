import { TriangleAlert } from "lucide-react";
import { SourceChip } from "@/components/source-chip";

export function ConflictSummaryCard({ resolved }: { resolved: boolean }) {
  return (
    <section className="rounded-[28px] border border-red-200 bg-red-50 p-5 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-red-700">
            <TriangleAlert className="size-5" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-red-950">
              {resolved ? "Conflict resolved" : "CCA briefing overlaps with tuition"}
            </h2>
            <p className="text-[13px] text-red-800">You cannot attend both fully.</p>
          </div>
        </div>
        <SourceChip tone={resolved ? "success" : "danger"}>
          {resolved ? "Resolved" : "Needs decision"}
        </SourceChip>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/75 p-3">
          <p className="text-xs font-semibold text-red-700">Tuition</p>
          <p className="mt-1 font-semibold">4:30-6:30 PM</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className="text-xs font-semibold text-red-700">CCA briefing</p>
          <p className="mt-1 font-semibold">5:30-6:15 PM</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className="text-xs font-semibold text-red-700">Overlap</p>
          <p className="mt-1 font-semibold">45 min</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-3">
          <p className="text-xs font-semibold text-red-700">Impact</p>
          <p className="mt-1 font-semibold">Decision needed</p>
        </div>
      </div>
    </section>
  );
}

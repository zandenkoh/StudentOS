"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { DurationBadge, UncertaintyBadge } from "@/components/badges";
import { SourceChip } from "@/components/source-chip";
import type { Commitment } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function CommitmentCard({
  commitment,
  onClick,
  onSourceClick
}: {
  commitment: Commitment;
  onClick: () => void;
  onSourceClick?: () => void;
}) {
  const uncertain =
    commitment.state === "needs_clarification" || commitment.state === "unsure";
  const typeLabel = `${commitment.type.charAt(0).toUpperCase()}${commitment.type.slice(1)}`;

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        "w-full cursor-pointer rounded-[24px] border p-4 text-left shadow-[0_12px_45px_rgba(0,0,0,0.045)] transition",
        uncertain
          ? "border-red-200 bg-red-50/70"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-5 text-ink">{commitment.title}</p>
          <p className="mt-2 text-[13px] leading-5 text-muted">{commitment.explanation}</p>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-neutral-300" />
      </div>
      <div className="flex flex-wrap gap-2">
        <SourceChip>{typeLabel}</SourceChip>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSourceClick?.();
          }}
          className="rounded-full transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          aria-label={`Open source for ${commitment.title}`}
        >
          <SourceChip>{commitment.source}</SourceChip>
        </button>
        <DurationBadge value={commitment.estimatedDuration} />
        <UncertaintyBadge state={commitment.state} />
      </div>
      <p className={cn("mt-3 text-xs font-semibold", uncertain ? "text-red-700" : "text-neutral-400")}>
        {uncertain ? "Tap to clarify" : "Tap to edit"}
      </p>
    </motion.div>
  );
}

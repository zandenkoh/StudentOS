"use client";

import { motion } from "framer-motion";
import { SourceChip } from "@/components/source-chip";
import type { ChaosInput } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function ChaosFloatingCard({
  card,
  compacting
}: {
  card: ChaosInput;
  compacting: boolean;
}) {
  const Icon = card.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18, rotate: card.rotate }}
      animate={
        compacting
          ? { opacity: 0, x: card.id.length % 2 ? 68 : -72, y: 160, scale: 0.65, rotate: 0 }
          : { opacity: 1, x: 0, y: 0, scale: 1, rotate: card.rotate }
      }
      transition={{ duration: compacting ? 0.62 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "absolute rounded-[24px] border bg-white/95 p-4 shadow-lift backdrop-blur",
        card.tone === "uncertain" ? "border-red-200" : "border-neutral-200",
        card.className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex size-9 items-center justify-center rounded-full bg-neutral-100">
          <Icon className="size-4 text-neutral-700" />
        </span>
        <SourceChip tone={card.tone === "danger" ? "danger" : "neutral"}>
          {card.tone === "danger" ? "Due soon" : card.chip}
        </SourceChip>
      </div>
      <p className="truncate text-[15px] font-semibold leading-5 text-ink">{card.text}</p>
      {card.tone === "uncertain" ? (
        <p className="mt-2 text-xs font-semibold text-red-700">Needs context</p>
      ) : null}
    </motion.div>
  );
}

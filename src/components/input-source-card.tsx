"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import type { InputSource } from "@/lib/demo-data";

export function InputSourceCard({ source }: { source: InputSource }) {
  const Icon = source.icon;
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.985 }}
      className="flex items-center gap-3 rounded-[20px] border border-neutral-200 bg-white p-3 shadow-[0_10px_35px_rgba(0,0,0,0.035)]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-100">
        <Icon className="size-5 text-neutral-700" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-ink">{source.title}</p>
        </div>
        <p className="truncate text-[13px] text-muted">{source.snippet}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <SourceChip>{source.source}</SourceChip>
        <ChevronRight className="size-4 text-neutral-300" />
      </div>
    </motion.div>
  );
}

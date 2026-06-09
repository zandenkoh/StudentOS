"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ProcessingStepData } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function ProcessingStep({
  step,
  index,
  activeIndex
}: {
  step: ProcessingStepData;
  index: number;
  activeIndex: number;
}) {
  const done = index < activeIndex;
  const active = index === activeIndex;
  return (
    <motion.div
      animate={{ opacity: index <= activeIndex ? 1 : 0.45 }}
      className="relative flex items-center gap-4"
    >
      <span
        className={cn(
          "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-white",
          done && "border-emerald-200 bg-emerald-50 text-emerald-700",
          active && "border-neutral-300 text-ink",
          !done && !active && "border-neutral-200 text-neutral-300"
        )}
      >
        {done ? (
          <CheckCircle2 className="size-5" />
        ) : active ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <span className="size-2 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0 flex-1 rounded-[20px] border border-neutral-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[15px] font-semibold">{step.label}</p>
          {step.sponsor ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-500">
              {step.sponsor}
            </span>
          ) : null}
        </div>
        {active ? (
          <motion.div
            className="mt-3 h-1 rounded-full bg-neutral-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full rounded-full bg-ink"
              animate={{ width: ["18%", "86%", "42%"] }}
              transition={{ repeat: Infinity, duration: 1.25, ease: "easeInOut" }}
            />
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}

export function ProcessingPipeline({
  steps,
  activeIndex
}: {
  steps: ProcessingStepData[];
  activeIndex: number;
}) {
  return (
    <section className="relative rounded-[28px] border border-neutral-200 bg-[#F7F7F8] p-4 shadow-soft">
      <div className="absolute bottom-8 left-[35px] top-8 w-px bg-neutral-200" />
      <div className="space-y-4">
        {steps.map((step, index) => (
          <ProcessingStep key={step.id} step={step} index={index} activeIndex={activeIndex} />
        ))}
      </div>
    </section>
  );
}

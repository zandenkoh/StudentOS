"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { PrimaryButton } from "@/components/buttons";
import { SourceChip } from "@/components/source-chip";
import type { DemoPlanTask } from "@/lib/demo-data";

export function FocusActionCard({
  onComplete,
  task
}: {
  onExplain?: () => void;
  onComplete?: (task: DemoPlanTask) => void;
  task?: DemoPlanTask;
}) {
  const [isCompleting, setIsCompleting] = useState(false);

  // Reset completion state when the task changes
  useEffect(() => {
    setIsCompleting(false);
  }, [task?.id]);

  if (!task) {
    return (
      <section className="rounded-[28px] border border-neutral-200 bg-ink p-6 text-white shadow-lift flex flex-col items-center justify-center text-center py-8">
        <CheckCircle2 className="size-12 text-emerald-400 mb-3" />
        <h2 className="text-[22px] font-semibold leading-snug">All tasks completed!</h2>
        <p className="mt-2 text-[14px] text-white/72 max-w-[280px]">
          Your day is clear and fully checked off. Great job staying on track!
        </p>
      </section>
    );
  }

  const title = task.title;
  const duration = task.estimatedMinutes ? `${task.estimatedMinutes} min` : "35 min";
  const deadline = task.deadline ? `Due ${task.deadline}` : "Due tomorrow 8 AM";
  const priority = task.reason ?? "High priority";

  const handleComplete = () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setTimeout(() => {
      onComplete?.(task);
    }, 600); // 600ms transition time
  };

  return (
    <section 
      className={`rounded-[28px] border p-5 text-white shadow-lift transition-all duration-500 ease-in-out ${
        isCompleting
          ? "border-emerald-500 bg-emerald-600 scale-[0.98] opacity-95"
          : "border-neutral-200 bg-ink"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Do this now</p>
        <SourceChip tone={isCompleting ? "neutral" : "success"}>
          {isCompleting ? "Done!" : "Conflict resolved"}
        </SourceChip>
      </div>
      <h2 className="text-[26px] font-semibold leading-[1.05]">{title}</h2>
      <p className="mt-3 text-[15px] leading-6 text-white/72">
        {duration} · {deadline} · {priority}
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <PrimaryButton 
          onClick={handleComplete} 
          className={`bg-white text-ink transition-all duration-300 ${
            isCompleting ? "opacity-75 cursor-not-allowed" : "hover:bg-neutral-100"
          }`}
        >
          <CheckCircle2 className="size-4" />
          {isCompleting ? "Completing..." : "Mark as complete"}
        </PrimaryButton>
      </div>
    </section>
  );
}


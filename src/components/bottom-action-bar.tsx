"use client";

import { CalendarPlus, Plus, Sparkles } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function BottomActionBar({
  onExport,
  onReasoning,
  onAddTask,
}: {
  onExport: () => void;
  onReasoning: () => void;
  onAddTask?: () => void;
}) {
  return (
    <div className="fixed-bottom-action">
      <div className={onAddTask ? "grid grid-cols-2 gap-3" : ""}>
        <PrimaryButton onClick={onExport}>
          <CalendarPlus className="size-4" />
          Export
        </PrimaryButton>
        {onAddTask ? (
          <SecondaryButton onClick={onAddTask} className="w-full">
            <Plus className="size-4" />
            Add task
          </SecondaryButton>
        ) : null}
      </div>
      <div className="mt-3">
        <SecondaryButton onClick={onReasoning} className="w-full">
          <Sparkles className="size-4" />
          Why this plan?
        </SecondaryButton>
      </div>
    </div>
  );
}

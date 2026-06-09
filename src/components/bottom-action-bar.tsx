"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function BottomActionBar({
  onExport,
  onAddTask,
}: {
  onExport: () => void;
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
    </div>
  );
}

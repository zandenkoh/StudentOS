"use client";

import { CalendarPlus, Sparkles } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function BottomActionBar({
  onExport,
  onReasoning
}: {
  onExport: () => void;
  onReasoning: () => void;
}) {
  return (
    <div className="fixed-bottom-action">
      <PrimaryButton onClick={onExport}>
        <CalendarPlus className="size-4" />
        Export to Calendar
      </PrimaryButton>
      <div className="mt-3">
        <SecondaryButton onClick={onReasoning} className="w-full">
          <Sparkles className="size-4" />
          View reasoning
        </SecondaryButton>
      </div>
    </div>
  );
}

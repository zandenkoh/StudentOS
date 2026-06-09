"use client";

import { CalendarPlus, MessageSquare, Sparkles } from "lucide-react";
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
      <div className="mt-3 grid grid-cols-2 gap-3">
        <SecondaryButton className="w-full">
          <MessageSquare className="size-4" />
          Send reminder
        </SecondaryButton>
        <SecondaryButton onClick={onReasoning} className="w-full">
          <Sparkles className="size-4" />
          View reasoning
        </SecondaryButton>
      </div>
    </div>
  );
}

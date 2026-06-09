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
    <div className="sticky bottom-0 z-20 border-t border-neutral-100 bg-white/88 p-4 backdrop-blur-xl">
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

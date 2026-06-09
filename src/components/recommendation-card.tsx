"use client";

import { ListChecks } from "lucide-react";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

const actions = [
  "Keep tuition at 4:30 PM",
  "Ask CCA lead for briefing notes",
  "Move revision after dinner",
  "Start Physics at 8:00 PM",
  "Keep coding practice as a weekly goal block"
];

export function RecommendationCard({
  resolved,
  onApply,
  onEdit
}: {
  resolved: boolean;
  onApply: () => void;
  onEdit: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-neutral-100">
          <ListChecks className="size-5" />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold">Recommended fix</h2>
          <p className="text-[13px] text-muted">Cleanest schedule found.</p>
        </div>
      </div>
      <p className="text-[14px] leading-6 text-neutral-700">
        Keep tuition fixed, ask your CCA lead for briefing notes, and move revision after
        dinner. Physics stays first because it is due tomorrow morning.
      </p>
      <div className="mt-4 space-y-2">
        {actions.map((action) => (
          <div key={action} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-sm">
            <span className="size-1.5 rounded-full bg-ink" />
            {action}
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        <PrimaryButton onClick={onApply}>{resolved ? "Continue to plan" : "Apply this plan"}</PrimaryButton>
        <SecondaryButton onClick={onEdit} className="w-full">Edit manually</SecondaryButton>
      </div>
    </section>
  );
}

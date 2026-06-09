"use client";

import { Command, Sparkles } from "lucide-react";
import { PrimaryButton } from "@/components/buttons";

export function GoalCommandInput({
  value,
  onChange,
  onSubmit
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-neutral-200 bg-[#F7F7F8] p-4 shadow-soft">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-white">
          <Command className="size-5" />
        </span>
        <div>
          <p className="text-[17px] font-semibold">Goal command</p>
          <p className="text-xs text-muted">Turn intent into commitments.</p>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-36 w-full resize-none rounded-[22px] border border-neutral-200 bg-white p-4 text-[18px] font-semibold leading-7 outline-none placeholder:text-neutral-300 focus:border-neutral-400 focus:ring-0"
      />
      <div className="fixed-bottom-action">
        <PrimaryButton onClick={onSubmit}>
          <Sparkles className="size-4" />
          Plan this goal
        </PrimaryButton>
      </div>
      <p className="mt-4 text-[13px] leading-5 text-muted">
        StudentOS will clarify the goal, break it down, and schedule it around your week.
      </p>
    </section>
  );
}

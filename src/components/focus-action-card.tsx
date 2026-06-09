"use client";

import { CheckCircle2, Play } from "lucide-react";
import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";
import { SourceChip } from "@/components/source-chip";

export function FocusActionCard({
  onExplain
}: {
  onExplain: () => void;
}) {
  const [started, setStarted] = useState(false);

  return (
    <section className="rounded-[28px] border border-neutral-200 bg-ink p-5 text-white shadow-lift">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Do this now</p>
        <SourceChip tone="success">Conflict resolved</SourceChip>
      </div>
      <h2 className="text-[26px] font-semibold leading-[1.05]">Finish Physics worksheet</h2>
      <p className="mt-3 text-[15px] leading-6 text-white/72">
        35 min · Due tomorrow 8 AM · High priority
      </p>
      {started ? (
        <div className="mt-4 flex items-center gap-2 rounded-[18px] border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white">
          <CheckCircle2 className="size-4" />
          Focus block started
        </div>
      ) : null}
      <div className="mt-6 flex flex-col gap-3">
        <PrimaryButton onClick={() => setStarted(true)} className="bg-white text-ink hover:bg-neutral-100">
          {started ? <CheckCircle2 className="size-4" /> : <Play className="size-4" />}
          {started ? "Focus block running" : "Start focus block"}
        </PrimaryButton>
        <SecondaryButton onClick={onExplain} className="w-full border-white/15 bg-white/10 text-white">
          Explain why
        </SecondaryButton>
      </div>
    </section>
  );
}

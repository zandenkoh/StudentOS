"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Route } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/buttons";
import { GoalRoadmapTimeline } from "@/components/goal-roadmap-timeline";
import { SourceChip } from "@/components/source-chip";
import { goalRoadmapSteps } from "@/lib/demo-data";

export default function RoadmapPage() {
  const router = useRouter();
  const [roadmapAdded, setRoadmapAdded] = useState(true);

  useEffect(() => {
    window.localStorage.setItem("studentos_roadmap_added", "true");
    setRoadmapAdded(true);
  }, []);

  function backToPlan() {
    window.localStorage.setItem("studentos_resume_step", "plan");
    router.push("/commitments");
  }

  return (
    <AppShell stepLabel="Goal Roadmap" progress={1} hideHeader={false}>
      <div className="safe-bottom-padding space-y-6 px-5 pt-2">
        <header>
          <button
            type="button"
            onClick={backToPlan}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-[13px] font-semibold text-neutral-600 shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
          >
            <ArrowLeft className="size-4" />
            Back to plan
          </button>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
            Goal roadmap
          </h1>
          <p className="mt-1 text-[16px] font-semibold text-neutral-600">
            Learn coding by December
          </p>
        </header>

        <section className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-[0_14px_45px_rgba(0,0,0,0.045)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-ink text-white">
                <Route className="size-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold text-ink">On track after today&apos;s plan</h2>
                <p className="mt-1 text-[13px] text-muted">6 steps scheduled across Jun-Dec.</p>
              </div>
            </div>
            <SourceChip tone="success">
              <CheckCircle2 className="mr-1 size-3.5" />
              Added
            </SourceChip>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Deadline
              </p>
              <p className="mt-1 text-[13px] font-semibold text-ink">December</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Cadence
              </p>
              <p className="mt-1 text-[13px] font-semibold text-ink">2 sessions/week</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Progress
              </p>
              <p className="mt-1 text-[13px] font-semibold text-ink">0-10%</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                Status
              </p>
              <p className="mt-1 text-[13px] font-semibold text-ink">On track</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-700">
              <Clock3 className="size-4" />
              Next scheduled action
            </p>
            <p className="mt-1 text-[14px] font-semibold text-ink">
              Coding fundamentals — Session 1
            </p>
          </div>
        </section>

        <GoalRoadmapTimeline steps={goalRoadmapSteps} />

        <div className="fixed-bottom-action">
          <PrimaryButton onClick={backToPlan}>
            <ArrowLeft className="size-4" />
            Back to plan
          </PrimaryButton>
          <div className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-[14px] font-semibold text-emerald-800">
            <CheckCircle2 className="size-4" />
            {roadmapAdded ? "Roadmap added to schedule" : "Add roadmap to schedule"}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

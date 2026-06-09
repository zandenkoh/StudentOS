"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, HelpCircle, Route, Search } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/buttons";
import { GoalRoadmapTimeline } from "@/components/goal-roadmap-timeline";
import { SourceChip } from "@/components/source-chip";
import { goalRoadmapSteps, type DemoGoalRoadmapStep } from "@/lib/demo-data";
import type { StudentOSAgentFootprint } from "@/lib/studentos-ai-types";

export default function RoadmapPage() {
  const router = useRouter();
  const [roadmapAdded, setRoadmapAdded] = useState(true);
  const [steps, setSteps] = useState<DemoGoalRoadmapStep[]>(goalRoadmapSteps);
  const [goalTitle, setGoalTitle] = useState("Learn coding by December");
  const [goalResearch, setGoalResearch] = useState<StudentOSAgentFootprint["goalResearch"]>();

  useEffect(() => {
    try {
      const rawFootprint =
        window.localStorage.getItem("studentos_ai_footprint") ??
        window.localStorage.getItem("studentos_commitment_footprint");

      if (rawFootprint) {
        const footprint = JSON.parse(rawFootprint) as StudentOSAgentFootprint;
        if (Array.isArray(footprint.roadmapSteps) && footprint.roadmapSteps.length > 0) {
          setSteps(footprint.roadmapSteps);
        }
        const goal = footprint.commitments.find((item) => item.type === "goal");
        if (goal) setGoalTitle(goal.title);
        setGoalResearch(footprint.goalResearch);
      }
    } catch {
      setSteps(goalRoadmapSteps);
    }

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
            {goalTitle}
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
                <p className="mt-1 text-[13px] text-muted">{steps.length} steps scheduled across Jun-Dec.</p>
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
              {steps.flatMap((step) => step.tasks)[0]?.title ?? "Coding fundamentals - Session 1"}
            </p>
          </div>

          {goalResearch ? (
            <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  <Search className="size-3.5" />
                  Deep context from Exa
                </p>
                <SourceChip tone="success">
                  {goalResearch.searchQueries?.length ?? 1} searches
                </SourceChip>
              </div>
              <p className="mt-2 text-[13px] font-semibold leading-5 text-ink">
                {goalResearch.summary}
              </p>

              {goalResearch.sections?.length ? (
                <div className="mt-3 space-y-3">
                  {goalResearch.sections.slice(0, 3).map((section) => (
                    <div key={section.title} className="border-t border-neutral-200 pt-3">
                      <p className="text-[13px] font-bold text-ink">{section.title}</p>
                      <ul className="mt-1 space-y-1">
                        {section.bullets.slice(0, 3).map((bullet) => (
                          <li key={bullet} className="text-[12px] leading-5 text-neutral-600">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}

              {goalResearch.clarificationQuestions?.length ? (
                <div className="mt-3 border-t border-neutral-200 pt-3">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                    <HelpCircle className="size-4" />
                    Questions before finalizing
                  </p>
                  <ul className="mt-1 space-y-1">
                    {goalResearch.clarificationQuestions.slice(0, 3).map((item) => (
                      <li key={item.question} className="text-[12px] leading-5 text-neutral-600">
                        {item.question}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {goalResearch.citations.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
                  {goalResearch.citations.slice(0, 4).map((citation) => (
                    <a
                      key={citation.url}
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-600"
                    >
                      <span className="truncate">{citation.title}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <GoalRoadmapTimeline steps={steps} />

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

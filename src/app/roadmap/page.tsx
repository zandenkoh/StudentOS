"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, ExternalLink, HelpCircle, Route } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/buttons";
import { GoalRoadmapTimeline } from "@/components/goal-roadmap-timeline";
import { SourceChip } from "@/components/source-chip";
import { goalRoadmapSteps, type DemoGoalRoadmapStep } from "@/lib/demo-data";
import { cleanResearchCopy, compactResearchCopy } from "@/lib/sponsor-tech/research-format";
import type { StudentOSAgentFootprint } from "@/lib/studentos-ai-types";
import { ensureTaskTimeRanges } from "@/lib/time-scheduling";

type GoalResearch = NonNullable<StudentOSAgentFootprint["goalResearch"]>;

function researchTakeaways(goalResearch: GoalResearch) {
  const summary = cleanResearchCopy(goalResearch.summary);
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => compactResearchCopy(sentence, 150))
    .filter(Boolean);

  if (sentences.length >= 2) return sentences.slice(0, 2);
  if (sentences.length === 1) return sentences;

  const sectionBullets = goalResearch.sections?.flatMap((section) => section.bullets) ?? [];
  const takeaways = sectionBullets
    .map((bullet) => compactResearchCopy(bullet, 150))
    .filter(Boolean)
    .slice(0, 2);

  return takeaways.length ? takeaways : ["Exa returned live research context for this roadmap."];
}

function stepsWithClockRanges(steps: DemoGoalRoadmapStep[]) {
  return steps.map((step) => ({
    ...step,
    tasks: ensureTaskTimeRanges(step.tasks),
  }));
}

export default function RoadmapPage() {
  const router = useRouter();
  const [roadmapAdded, setRoadmapAdded] = useState(true);
  const [steps, setSteps] = useState<DemoGoalRoadmapStep[]>(() => stepsWithClockRanges(goalRoadmapSteps));
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
          setSteps(stepsWithClockRanges(footprint.roadmapSteps));
        }
        const goal = footprint.commitments.find((item) => item.type === "goal");
        if (goal) setGoalTitle(goal.title);
        setGoalResearch(footprint.goalResearch);
      }
    } catch {
      setSteps(stepsWithClockRanges(goalRoadmapSteps));
    }

    window.localStorage.setItem("studentos_roadmap_added", "true");
    setRoadmapAdded(true);
  }, []);

  function backToPlan() {
    window.localStorage.setItem("studentos_resume_step", "plan");
    window.localStorage.setItem(
      "studentos_flow_state",
      JSON.stringify({
        step: "plan",
        conflictResolved: true,
        resolutionMode: "recommended",
        roadmapAdded: true,
      }),
    );
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
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-[18px] font-bold leading-tight text-ink">
                      Why this roadmap?
                    </p>
                    <p className="mt-1 text-[13px] font-semibold leading-5 text-emerald-800">
                      StudentOS checked source context before choosing milestones, cadence, and next questions.
                    </p>
                  </div>
                </div>
                <SourceChip tone="success">
                  {goalResearch.searchQueries?.length ?? 5} {(goalResearch.searchQueries?.length ?? 5) === 1 ? "source" : "sources"}
                </SourceChip>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Key takeaways
                </p>
                <ul className="mt-2 list-disc space-y-2 pl-4">
                  {researchTakeaways(goalResearch).map((takeaway, index) => (
                    <li key={`${takeaway}-${index}`} className="text-[14px] font-semibold leading-6 text-ink">
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </div>

              {goalResearch.sections?.length ? (
                <div className="mt-3 space-y-2">
                  {goalResearch.sections.map((section) => (
                    <div key={section.title} className="rounded-2xl border border-emerald-100 bg-white p-4">
                      <p className="flex items-center gap-2 text-[15px] font-bold leading-5 text-ink">
                        <BookOpenCheck className="size-4 text-emerald-700" />
                        {section.title}
                      </p>
                      <ul className="mt-2 list-disc space-y-1.5 pl-4">
                        {section.bullets.map((bullet, index) => (
                          <li key={`${section.title}-${index}`} className="text-[13px] font-medium leading-5 text-neutral-600">
                            {cleanResearchCopy(bullet)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}

              {goalResearch.clarificationQuestions?.length ? (
                <div className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4">
                  <p className="flex items-center gap-1.5 text-[15px] font-bold text-ink">
                    <HelpCircle className="size-4" />
                    Questions before finalizing
                  </p>
                  <ul className="mt-2 space-y-2">
                    {goalResearch.clarificationQuestions.slice(0, 2).map((item) => (
                      <li key={item.question} className="rounded-xl bg-neutral-50 px-3 py-2 text-[13px] font-semibold leading-5 text-neutral-700">
                        {compactResearchCopy(item.question, 105)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {goalResearch.researchGaps?.length ? (
                <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[15px] font-bold text-ink">Research gaps</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-4">
                    {goalResearch.researchGaps.map((gap, index) => (
                      <li key={`${gap}-${index}`} className="text-[13px] font-semibold leading-5 text-amber-800">
                        {compactResearchCopy(gap, 140)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {goalResearch.citations.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {goalResearch.citations.map((citation) => (
                    <a
                      key={citation.url}
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[12px] font-bold text-emerald-800 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
                    >
                      <span className="truncate">{compactResearchCopy(citation.title, 44)}</span>
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

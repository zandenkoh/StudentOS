"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CheckCircle2, ChevronRight, Pencil, Sparkles, MessageSquare, Mail, Calendar, School, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AgentActivityPanel } from "@/components/agent-activity-panel";
import { AppShell } from "@/components/app-shell";
import { BottomActionBar } from "@/components/bottom-action-bar";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";
import { ChaosFloatingCard } from "@/components/chaos-floating-card";
import { ClarificationBottomSheet } from "@/components/clarification-bottom-sheet";
import { CommitmentCard } from "@/components/commitment-card";
import { ConflictSummaryCard } from "@/components/conflict-summary-card";
import { ExportSuccessSheet } from "@/components/export-success-sheet";
import { FocusActionCard } from "@/components/focus-action-card";
import { InputInbox } from "@/components/input-inbox";
import { MobileTimeline } from "@/components/mobile-timeline";
import { PlanSection } from "@/components/plan-section";
import { ProcessingPipeline } from "@/components/processing-pipeline";
import { RecommendationCard } from "@/components/recommendation-card";
import { ScreenHeader } from "@/components/screen-header";
import { SourceChip } from "@/components/source-chip";
import {
  agentLogs,
  baseCommitments,
  chaosInputs,
  inputSources,
  planSections,
  processingSteps,
  resolvedTimelineEvents,
  timelineEvents,
  type Commitment,
  type TimelineEvent
} from "@/lib/demo-data";

type DemoStep = "landing" | "mess" | "input" | "processing" | "commitments" | "conflict" | "plan";

const stepOrder: DemoStep[] = ["landing", "mess", "input", "processing", "commitments", "conflict", "plan"];
const labels: Record<DemoStep, string> = {
  landing: "Landing",
  mess: "Before input",
  input: "Captured input",
  processing: "Processing",
  commitments: "Commitments",
  conflict: "Conflict",
  plan: "Your plan"
};

function stepProgress(step: DemoStep) {
  if (step === "landing") return 0;
  // Progress starts from "mess" (index 1) to "plan" (index 6)
  return stepOrder.indexOf(step) / (stepOrder.length - 1);
}

function pageMotion(key: string, children: React.ReactNode) {
  return (
    <motion.div
      key={key}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="px-5 pb-24"
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [step, setStep] = useState<DemoStep>("landing");
  const [compacting, setCompacting] = useState(false);
  const [pipelineIndex, setPipelineIndex] = useState(0);
  const [commitments, setCommitments] = useState<Commitment[]>(baseCommitments);
  const [clarifying, setClarifying] = useState<"goal" | "team" | null>(null);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [conflictResolved, setConflictResolved] = useState(false);
  const [toast, setToast] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const unresolvedCount = commitments.filter(
    (item) => item.state === "needs_clarification" || item.state === "unsure"
  ).length;

  const activeAgentIndex = useMemo(() => {
    if (step === "landing" || step === "mess") return 0;
    if (step === "input") return 2;
    if (step === "processing") return Math.min(5 + pipelineIndex, agentLogs.length - 1);
    if (step === "commitments") return unresolvedCount ? 6 : 8;
    if (step === "conflict") return conflictResolved ? 11 : 10;
    return 13;
  }, [conflictResolved, pipelineIndex, step, unresolvedCount]);

  useEffect(() => {
    if (step !== "processing") return;
    setPipelineIndex(0);
    const timer = window.setInterval(() => {
      setPipelineIndex((current) => {
        if (current >= processingSteps.length) {
          window.clearInterval(timer);
          window.setTimeout(() => setStep("commitments"), 450);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "a") setAgentOpen(true);
      if (event.key === "r") reset();
      if (event.key === "ArrowRight") {
        setStep((current) => stepOrder[Math.min(stepOrder.length - 1, stepOrder.indexOf(current) + 1)]);
      }
      if (event.key === "ArrowLeft") {
        setStep((current) => stepOrder[Math.max(0, stepOrder.indexOf(current) - 1)]);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function reset() {
    setStep("landing");
    setCompacting(false);
    setPipelineIndex(0);
    setCommitments(baseCommitments);
    setConflictResolved(false);
    setToast(false);
    setExportOpen(false);
    setReasoningOpen(false);
  }

  function startOrganising() {
    setCompacting(true);
    window.setTimeout(() => setStep("input"), 680);
  }

  function clarify(kind: "goal" | "team") {
    setCommitments((current) =>
      current.map((item) => {
        if (kind === "goal" && item.id === "coding") {
          return {
            ...item,
            state: "confirmed",
            confidence: 92,
            explanation: "Broken into weekly coding blocks."
          };
        }
        if (kind === "team" && item.id === "team") {
          return {
            ...item,
            state: "confirmed",
            confidence: 88,
            title: "Ask teammate first",
            explanation: "Converted tentative voice note into a 3 min action."
          };
        }
        return item;
      })
    );
    setClarifying(null);
  }

  function applyConflictPlan() {
    if (conflictResolved) {
      setStep("plan");
      return;
    }
    setConflictResolved(true);
    setToast(true);
    window.setTimeout(() => setToast(false), 1800);
  }

  return (
    <AppShell
      onAgentClick={() => setAgentOpen(true)}
      onReset={reset}
      stepLabel={labels[step]}
      progress={stepProgress(step)}
      hideHeader={step === "landing"}
    >
      <AnimatePresence mode="wait">
        {step === "landing" &&
          pageMotion(
            "landing",
            <div className="flex flex-col min-h-[calc(100vh-1px)] bg-[#FAF9F6] px-6 pb-12 pt-4 -mx-5 -mt-4">
              {/* Brand Pill */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                  <span>Student</span>
                  <span className="flex size-[15px] items-center justify-center rounded-full bg-ink text-[8px] font-semibold text-white leading-none">
                    OS
                  </span>
                  <span className="ml-0.5 text-neutral-300 font-normal">·</span>
                  <span>Demo</span>
                </div>
              </div>

              {/* Hero Section */}
              <div className="text-center mb-8">
                <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink mb-4 px-2">
                  Turn school chaos into a plan you can actually follow.
                </h1>
                <p className="text-[14px] font-medium leading-relaxed text-muted px-3">
                  Drop screenshots, messages, PDFs, or voice notes. StudentOS extracts commitments, resolves clashes, and builds your day.
                </p>
              </div>

              {/* CTA Button */}
              <div className="mb-8">
                <PrimaryButton onClick={() => setStep("mess")} className="justify-between px-6">
                  <span className="text-[15px] font-semibold">Start Demo</span>
                  <ChevronRight className="size-4" />
                </PrimaryButton>
              </div>

              {/* Trust Row */}
              <div className="mb-10 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  Works seamlessly with
                </p>
                <div className="mt-4 flex items-center justify-center gap-6 text-neutral-400">
                  <MessageSquare className="size-5" />
                  <Mail className="size-5" />
                  <Calendar className="size-5" />
                  <School className="size-5 animate-pulse" />
                  <FileText className="size-5" />
                </div>
              </div>

              {/* Preview Card */}
              <div className="rounded-[28px] border border-neutral-200/80 bg-white p-5 shadow-soft">
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-4">
                  Today’s brain dump
                </h3>
                <div className="space-y-3">
                  {/* Commitment 1 */}
                  <div className="flex items-center justify-between rounded-[20px] border border-neutral-100 bg-[#FAFAFA] p-4">
                    <div>
                      <h4 className="text-[14px] font-semibold text-ink">Physics worksheet due tomorrow</h4>
                      <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Screenshot extracted</p>
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-xl bg-white text-neutral-400 border border-neutral-100 shadow-sm">
                      <FileText className="size-4" />
                    </div>
                  </div>

                  {/* Commitment 2 */}
                  <div className="flex items-center justify-between rounded-[20px] border border-neutral-100 bg-[#FAFAFA] p-4">
                    <div>
                      <h4 className="text-[14px] font-semibold text-ink">CCA briefing clash</h4>
                      <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Audio note transcribed</p>
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-xl bg-white text-neutral-400 border border-neutral-100 shadow-sm">
                      <MessageSquare className="size-4" />
                    </div>
                  </div>

                  {/* Commitment 3 */}
                  <div className="flex items-center justify-between rounded-[20px] border border-neutral-100 bg-[#FAFAFA] p-4">
                    <div>
                      <h4 className="text-[14px] font-semibold text-ink">Coding goal: 5h/week</h4>
                      <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Recurring habit detected</p>
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-xl bg-white text-neutral-400 border border-neutral-100 shadow-sm">
                      <Calendar className="size-4" />
                    </div>
                  </div>
                </div>

                {/* Status Pill */}
                <div className="mt-5 flex justify-center">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white">
                    <CheckCircle2 className="size-3.5" />
                    <span>Clean plan ready</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {step === "mess" &&
          pageMotion(
            "mess",
            <div className="relative min-h-[calc(100vh-116px)] overflow-hidden">
              <ScreenHeader
                title="Everything is everywhere."
                subtitle="Screenshots, PDFs, reminders, voice notes, deadlines, and goals are scattered across your day."
              />
              <div className="relative mt-4 h-[610px]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: compacting ? 1 : 0.18, scale: compacting ? 1 : 0.92 }}
                  className="absolute left-1/2 top-[19rem] size-28 -translate-x-1/2 rounded-[32px] border border-neutral-200 bg-[#F7F7F8]"
                />
                {chaosInputs.map((card, index) => (
                  <motion.div
                    key={card.id}
                    transition={{ delay: index * 0.04 }}
                  >
                    <ChaosFloatingCard card={card} compacting={compacting} />
                  </motion.div>
                ))}
              </div>
              <div className="sticky bottom-4">
                <PrimaryButton onClick={startOrganising}>
                  <Sparkles className="size-4" />
                  Let StudentOS organise this
                </PrimaryButton>
              </div>
            </div>
          )}

        {step === "input" &&
          pageMotion(
            "input",
            <div className="space-y-6">
              <ScreenHeader
                title="Captured your school mess"
                subtitle="StudentOS gathered realistic inputs from images, files, audio, links, and typed notes."
              />
              <InputInbox sources={inputSources} />
              <div className="rounded-[24px] bg-neutral-50 p-4 text-[13px] font-medium text-muted">
                Calendar will be checked after extraction.
              </div>
              <div className="flex flex-col gap-3">
                <PrimaryButton onClick={() => setStep("processing")}>Analyse commitments</PrimaryButton>
                <SecondaryButton className="w-full">Add more</SecondaryButton>
              </div>
            </div>
          )}

        {step === "processing" &&
          pageMotion(
            "processing",
            <div className="space-y-6">
              <ScreenHeader
                title="Analysing your inputs"
                subtitle="StudentOS is turning scattered sources into commitments."
              />
              <div className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-soft">
                <div className="grid grid-cols-7 gap-2">
                  {inputSources.map((source) => {
                    const Icon = source.icon;
                    return (
                      <motion.div
                        key={source.id}
                        animate={{ y: [0, -6, 0], opacity: [0.65, 1, 0.65] }}
                        transition={{ repeat: Infinity, duration: 1.8, delay: source.id.length * 0.04 }}
                        className="flex aspect-square items-center justify-center rounded-2xl bg-neutral-100"
                      >
                        <Icon className="size-4 text-neutral-500" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              <ProcessingPipeline steps={processingSteps} activeIndex={pipelineIndex} />
            </div>
          )}

        {step === "commitments" &&
          pageMotion(
            "commitments",
            <div className="space-y-6">
              <ScreenHeader
                title="Commitments identified"
                subtitle="Tap any commitment to edit, confirm, or give more context."
              />
              <div className="space-y-3">
                {commitments.map((commitment) => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    onClick={() => {
                      if (commitment.state === "needs_clarification") setClarifying("goal");
                      else if (commitment.state === "unsure") setClarifying("team");
                      else setEditing(commitment);
                    }}
                  />
                ))}
              </div>
              <PrimaryButton
                disabled={unresolvedCount > 0}
                onClick={() => setStep("conflict")}
              >
                {unresolvedCount > 0
                  ? `Clarify ${unresolvedCount} items to continue`
                  : "Continue to conflicts"}
              </PrimaryButton>
            </div>
          )}

        {step === "conflict" &&
          pageMotion(
            "conflict",
            <div className="space-y-6">
              <ScreenHeader
                title={conflictResolved ? "Conflict resolved" : "Conflict found"}
                subtitle={
                  conflictResolved
                    ? "StudentOS updated the day without moving fixed commitments."
                    : "CCA briefing overlaps with tuition. StudentOS found a cleaner schedule."
                }
              />
              <ConflictSummaryCard resolved={conflictResolved} />
              <MobileTimeline
                events={conflictResolved ? resolvedTimelineEvents : timelineEvents}
                resolved={conflictResolved}
                onEventClick={setSelectedEvent}
              />
              <RecommendationCard
                resolved={conflictResolved}
                onApply={applyConflictPlan}
                onEdit={() => setSelectedEvent(timelineEvents[2])}
              />
            </div>
          )}

        {step === "plan" &&
          pageMotion(
            "plan",
            <div className="space-y-6">
              <ScreenHeader title="Your plan is ready" subtitle="The day is clean, sequenced, and ready to execute." />
              <FocusActionCard onExplain={() => setReasoningOpen(true)} />
              <div className="space-y-6">
                {planSections.map((section) => (
                  <PlanSection key={section.title} title={section.title} items={section.items} />
                ))}
              </div>
            </div>
          )}
      </AnimatePresence>

      {step === "plan" ? (
        <BottomActionBar onExport={() => setExportOpen(true)} onReasoning={() => setReasoningOpen(true)} />
      ) : null}

      <ClarificationBottomSheet
        open={clarifying !== null}
        kind={clarifying ?? "goal"}
        onClose={() => setClarifying(null)}
        onSubmit={() => clarifying && clarify(clarifying)}
      />

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit commitment"
        subtitle="Mock controls keep the demo safe while showing how a student can correct extracted details."
      >
        {editing ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Title</span>
              <input
                defaultValue={editing.title}
                className="mt-2 h-12 w-full rounded-[18px] border border-neutral-200 px-4 text-[15px] focus:border-neutral-400 focus:ring-0"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] bg-neutral-50 p-3">
                <p className="text-xs font-semibold text-neutral-400">Type</p>
                <p className="mt-1 text-sm font-semibold capitalize">{editing.type}</p>
              </div>
              <div className="rounded-[18px] bg-neutral-50 p-3">
                <p className="text-xs font-semibold text-neutral-400">Source</p>
                <p className="mt-1 text-sm font-semibold">{editing.source}</p>
              </div>
            </div>
            <PrimaryButton onClick={() => setEditing(null)}>
              <Pencil className="size-4" />
              Save changes
            </PrimaryButton>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? "Edit event"}
        subtitle={selectedEvent ? `${selectedEvent.time} · ${selectedEvent.chip}` : undefined}
      >
        <div className="space-y-3">
          {["Keep fixed", "Move later", "Mark as handled", "Cancel"].map((action) => (
            <button
              key={action}
              onClick={() => setSelectedEvent(null)}
              className="flex h-13 w-full items-center justify-between rounded-[18px] border border-neutral-200 px-4 py-3 text-left text-[15px] font-semibold"
            >
              {action}
              <ChevronRight className="size-4 text-neutral-300" />
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={reasoningOpen}
        onClose={() => setReasoningOpen(false)}
        title="Why this plan?"
        subtitle="StudentOS prioritised the Physics worksheet because it is due tomorrow morning, kept tuition fixed, handled the CCA clash by asking for notes, moved flexible revision later, and split your coding goal into weekly blocks."
      >
        <div className="flex flex-wrap gap-2">
          {["Urgency", "Fixed events", "Energy", "Deadline", "Weekly goal"].map((chip) => (
            <SourceChip key={chip}>{chip}</SourceChip>
          ))}
        </div>
      </BottomSheet>

      <ExportSuccessSheet open={exportOpen} onClose={() => setExportOpen(false)} />

      <AgentActivityPanel
        open={agentOpen}
        rows={agentLogs}
        activeIndex={activeAgentIndex}
        onClose={() => setAgentOpen(false)}
      />

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift"
          >
            <CheckCircle2 className="size-4" />
            Plan updated
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="hidden">
        <CalendarDays />
      </div>
    </AppShell>
  );
}

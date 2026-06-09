"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Pencil } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BottomActionBar } from "@/components/bottom-action-bar";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton } from "@/components/buttons";
import { ClarificationBottomSheet } from "@/components/clarification-bottom-sheet";
import { CommitmentCard } from "@/components/commitment-card";
import { ConflictSummaryCard } from "@/components/conflict-summary-card";
import { ExportSuccessSheet } from "@/components/export-success-sheet";
import { FocusActionCard } from "@/components/focus-action-card";
import { MobileTimeline } from "@/components/mobile-timeline";
import { PlanSection } from "@/components/plan-section";
import { RecommendationCard } from "@/components/recommendation-card";
import { ScreenHeader } from "@/components/screen-header";
import { SourceChip } from "@/components/source-chip";

import {
  baseCommitments,
  planSections,
  resolvedTimelineEvents,
  timelineEvents,
  type Commitment,
  type TimelineEvent
} from "@/lib/demo-data";

type CommitmentsStep = "commitments" | "conflict" | "plan";

const labels: Record<CommitmentsStep, string> = {
  commitments: "Commitments",
  conflict: "Conflict Solver",
  plan: "Your plan"
};

const progressMap: Record<CommitmentsStep, number> = {
  commitments: 0.65,
  conflict: 0.85,
  plan: 1.0
};

export default function CommitmentsPage() {
  const router = useRouter();
  const [step, setStep] = useState<CommitmentsStep>("commitments");
  const [commitments, setCommitments] = useState<Commitment[]>(baseCommitments);
  const [clarifying, setClarifying] = useState<"goal" | "team" | null>(null);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [conflictResolved, setConflictResolved] = useState(false);
  const [toast, setToast] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const unresolvedCount = commitments.filter(
    (item) => item.state === "needs_clarification" || item.state === "unsure"
  ).length;

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

  function reset() {
    router.push("/");
  }

  return (
    <AppShell
      onReset={reset}
      stepLabel={labels[step]}
      progress={progressMap[step]}
      hideHeader={false}
    >
      <div className="safe-bottom-padding px-5 pt-2">
        <AnimatePresence mode="wait">
          {step === "commitments" && (
            <motion.div
              key="commitments"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <ScreenHeader
                title="Commitments identified"
                subtitle="Tap any commitment to edit, confirm, or give more context."
              />
              <div className="space-y-3 pb-8">
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

              {/* Fixed Bottom Action Button */}
              <div className="fixed-bottom-action">
                <button
                  disabled={unresolvedCount > 0}
                  onClick={() => setStep("conflict")}
                  className={`w-full flex h-13 items-center justify-center gap-2 rounded-full font-bold text-[15px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
                    unresolvedCount === 0 
                      ? "bg-ink text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <span>
                    {unresolvedCount > 0
                      ? `Clarify ${unresolvedCount} items to continue`
                      : "Continue to conflicts"}
                  </span>
                  <ChevronRight className="size-4.5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "conflict" && (
            <motion.div
              key="conflict"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
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

              {/* Fixed Bottom Action Button when resolved */}
              <div className="fixed-bottom-action">
                <button
                  disabled={!conflictResolved}
                  onClick={() => setStep("plan")}
                  className={`w-full flex h-13 items-center justify-center gap-2 rounded-full font-bold text-[15px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
                    conflictResolved 
                      ? "bg-ink text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
                      : "bg-ink text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  <span>Continue to plan</span>
                  <ChevronRight className="size-4.5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === "plan" && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <ScreenHeader title="Your plan is ready" subtitle="The day is clean, sequenced, and ready to execute." />
              <FocusActionCard onExplain={() => setReasoningOpen(true)} />
              <div className="space-y-6">
                {planSections.map((section) => (
                  <PlanSection key={section.title} title={section.title} items={section.items} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed-bottom-toast flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift animate-bounce"
          >
            <CheckCircle2 className="size-4" />
            Plan updated
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

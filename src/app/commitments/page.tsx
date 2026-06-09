"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AudioLines, CheckCircle2, ChevronRight, FileText, Globe2, Pencil, Trash2 } from "lucide-react";

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
  commitments: "Review",
  conflict: "Conflict Solver",
  plan: "Your plan"
};

const progressMap: Record<CommitmentsStep, number> = {
  commitments: 0.65,
  conflict: 0.85,
  plan: 1.0
};

type SourcePreview = {
  title: string;
  source: string;
  fileSize: string;
  fileType: "image" | "text" | "link" | "audio";
  snippet: string;
  filePath?: string;
};

type EditDraft = {
  title: string;
  type: Commitment["type"];
  estimatedDuration: string;
};

const commitmentSourcePreviews: Record<string, SourcePreview> = {
  physics: {
    title: "Screenshot 2026-06-09 121842.jpg",
    source: "Desktop Screenshot",
    fileSize: "324 KB",
    fileType: "image",
    snippet: "Physics assignment portal and due details",
    filePath: "/Screenshot%202026-06-09%20121842.jpg"
  },
  cca: {
    title: "Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg",
    source: "Mobile Screenshot",
    fileSize: "492 KB",
    fileType: "image",
    snippet: "CCA notification chat announcement",
    filePath: "/Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg"
  },
  competition: {
    title: "National Coding Challenge 2026 - Submissions",
    source: "Web Link",
    fileSize: "18 KB",
    fileType: "link",
    snippet: "Ensure all repository links, walkthrough recordings, and PDFs of design specifications are uploaded before the cutoff window."
  },
  coding: {
    title: "goalDemo.txt",
    source: "Assets File",
    fileSize: "1 KB",
    fileType: "text",
    snippet: "I currently have zero experience coding with python. I want to be proficient in data-handling Python libraries by the end of this year."
  },
  team: {
    title: "Team voice note",
    source: "Voice note",
    fileSize: "1:24",
    fileType: "audio",
    snippet: "Hey, about the project meeting tonight, Sarah mentioned she has a CCA briefing at 5:30 PM and tuition before that, so we might need to reschedule. Can we push to tomorrow morning?"
  }
};

const commitmentTypes: Commitment["type"][] = ["task", "event", "deadline", "goal", "conflict"];

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function CommitmentSourcePreview({ preview }: { preview: SourcePreview }) {
  if (preview.fileType === "image") {
    return (
      <div className="w-full pb-4">
        {preview.filePath ? (
          <div className="flex items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-[#FAFAFA] p-2 shadow-sm">
            <img
              src={preview.filePath}
              className="max-h-[50vh] w-auto rounded-lg object-contain shadow-sm"
              alt={preview.title}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-100 bg-[#FAFAFA] p-4 text-sm font-semibold text-neutral-600">
            {preview.snippet}
          </div>
        )}
      </div>
    );
  }

  if (preview.fileType === "link") {
    return (
      <div className="w-full pb-4">
        <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400">
            <Globe2 className="size-3.5" />
            <span className="font-mono">https://nationalcomp2026.org/portal</span>
          </div>
          <h4 className="mb-1 text-sm font-bold leading-snug text-ink">
            National Coding Challenge 2026 - Submissions
          </h4>
          <p className="mb-3 text-xs leading-normal text-neutral-500">{preview.snippet}</p>
          <div className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs font-semibold text-red-800">
            Deadline: 11 June, 12:00 AM
          </div>
        </div>
      </div>
    );
  }

  if (preview.fileType === "audio") {
    return (
      <div className="w-full pb-4">
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-ink text-white">
              <AudioLines className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">Teammate Voice Note</p>
              <p className="text-xs font-semibold text-neutral-400">Transcript summary · 1:24</p>
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Transcript summary
            </p>
            <p className="text-xs font-semibold italic leading-relaxed text-neutral-600">
              &quot;{preview.snippet}&quot;
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-4">
      <div className="space-y-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 font-mono text-xs text-neutral-700">
        <div className="flex justify-between border-b border-neutral-200 pb-2 font-sans text-[10px] font-semibold uppercase text-neutral-400">
          <span>{preview.title}</span>
          <span>Text Document</span>
        </div>
        <div className="flex items-center gap-2 font-sans text-sm font-bold text-ink">
          <FileText className="size-4" />
          Original text
        </div>
        <p className="whitespace-pre-wrap font-sans text-sm font-semibold leading-relaxed text-ink">
          {preview.snippet}
        </p>
      </div>
    </div>
  );
}

export default function CommitmentsPage() {
  const router = useRouter();
  const [step, setStep] = useState<CommitmentsStep>("commitments");
  const [commitments, setCommitments] = useState<Commitment[]>(baseCommitments);
  const [clarifying, setClarifying] = useState<"goal" | "team" | null>(null);
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    title: "",
    type: "task",
    estimatedDuration: ""
  });
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
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
            estimatedDuration: "5hr/week",
            explanation: "Broken into weekly coding blocks."
          };
        }
        if (kind === "team" && item.id === "team") {
          return {
            ...item,
            state: "confirmed",
            confidence: 88,
            estimatedDuration: "3min",
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

  function openEditor(commitment: Commitment) {
    setEditing(commitment);
    setEditDraft({
      title: commitment.title,
      type: commitment.type,
      estimatedDuration: commitment.estimatedDuration
    });
  }

  function saveEdit() {
    if (!editing) return;
    setCommitments((current) =>
      current.map((item) =>
        item.id === editing.id
          ? {
              ...item,
              title: editDraft.title.trim() || item.title,
              type: editDraft.type,
              estimatedDuration: editDraft.estimatedDuration.trim() || item.estimatedDuration
            }
          : item
      )
    );
    setEditing(null);
  }

  function deleteEditing() {
    if (!editing) return;
    setCommitments((current) => current.filter((item) => item.id !== editing.id));
    setEditing(null);
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
                title="Detected items"
                subtitle="Tap any item to edit, confirm, or give more context."
              />
              <div className="space-y-3 pb-8">
                {commitments.map((commitment) => (
                  <CommitmentCard
                    key={commitment.id}
                    commitment={commitment}
                    onClick={() => {
                      if (commitment.state === "needs_clarification") setClarifying("goal");
                      else if (commitment.state === "unsure") setClarifying("team");
                      else openEditor(commitment);
                    }}
                    onSourceClick={() => {
                      setSourcePreview(commitmentSourcePreviews[commitment.id] ?? null);
                    }}
                  />
                ))}
              </div>

              {/* Fixed Bottom Action Button */}
              <div className="fixed-bottom-action">
                <button
                  disabled={unresolvedCount > 0}
                  onClick={() => setStep("conflict")}
                  className={`flex h-[60px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
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
                  className={`flex h-[60px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
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
        title="Edit item"
        subtitle="Correct extracted details before StudentOS builds the day."
        headerAction={
          <button
            onClick={deleteEditing}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
            aria-label="Delete item"
          >
            <Trash2 className="size-4" />
          </button>
        }
      >
        {editing ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Title</span>
              <input
                value={editDraft.title}
                onChange={(event) => setEditDraft((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 h-12 w-full rounded-[18px] border border-neutral-200 px-4 text-[15px] focus:border-neutral-400 focus:ring-0"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-semibold">Type</span>
                <select
                  value={editDraft.type}
                  onChange={(event) =>
                    setEditDraft((current) => ({
                      ...current,
                      type: event.target.value as Commitment["type"]
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-[18px] border border-neutral-200 px-4 text-[15px] font-semibold focus:border-neutral-400 focus:ring-0"
                >
                  {commitmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {capitalize(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Duration</span>
                <input
                  value={editDraft.estimatedDuration}
                  onChange={(event) =>
                    setEditDraft((current) => ({
                      ...current,
                      estimatedDuration: event.target.value
                    }))
                  }
                  placeholder="30min"
                  className="mt-2 h-12 w-full rounded-[18px] border border-neutral-200 px-4 text-[15px] font-semibold focus:border-neutral-400 focus:ring-0"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => setSourcePreview(commitmentSourcePreviews[editing.id] ?? null)}
              className="flex min-h-12 w-full items-center justify-between rounded-[18px] border border-neutral-200 px-4 py-3 text-left text-[15px] font-semibold"
            >
              <span>
                Source
                <span className="ml-2 text-neutral-400">{editing.source}</span>
              </span>
              <ChevronRight className="size-4 text-neutral-300" />
            </button>
            <PrimaryButton onClick={saveEdit}>
              <Pencil className="size-4" />
              Save changes
            </PrimaryButton>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={sourcePreview !== null}
        onClose={() => setSourcePreview(null)}
        title={sourcePreview?.title ?? "Source preview"}
        subtitle={sourcePreview ? `${sourcePreview.source} · ${sourcePreview.fileSize}` : undefined}
      >
        {sourcePreview ? <CommitmentSourcePreview preview={sourcePreview} /> : null}
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
              className="flex h-[56px] w-full items-center justify-between rounded-[18px] border border-neutral-200 px-4 py-3 text-left text-[15px] font-semibold"
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  AudioLines,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe2,
  Image as ImageIcon,
  Paperclip,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BottomActionBar } from "@/components/bottom-action-bar";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton } from "@/components/buttons";
import { ClarificationBottomSheet } from "@/components/clarification-bottom-sheet";
import { CommitmentCard } from "@/components/commitment-card";
import { ConflictSummaryCard } from "@/components/conflict-summary-card";
import { ExportSuccessSheet } from "@/components/export-success-sheet";
import { FocusActionCard } from "@/components/focus-action-card";
import { GoalRoadmapCard } from "@/components/goal-roadmap-card";
import { ManualConflictSheet } from "@/components/manual-conflict-sheet";
import { MobileTimeline } from "@/components/mobile-timeline";
import { PlanSection } from "@/components/plan-section";
import { RecommendationCard } from "@/components/recommendation-card";
import { ScreenHeader } from "@/components/screen-header";
import { SourceChip } from "@/components/source-chip";
import { TaskEditBottomSheet } from "@/components/task-edit-bottom-sheet";

import {
  baseCommitments,
  demoScheduleDateOptions,
  initialPlanTasks,
  manualResolvedTimelineEvents,
  resolvedTimelineEvents,
  timelineEvents,
  type Commitment,
  type DemoPlanTask,
  type PlanTaskSection,
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

type PlanDisplaySection = {
  title: string;
  section: PlanTaskSection;
  items: DemoPlanTask[];
};

type ResolutionMode = "recommended" | "manual" | null;

const MANUAL_CONFLICT_INSTRUCTION =
  "Physics teacher has granted extension for worksheet deadline to 16 June. Reschedule tuition accordingly, so that it no longer clashes with CCA briefing.";

type SponsorTraceItem = {
  provider: string;
  action: string;
  status: "success" | "fallback" | "error";
  detail: string;
};

type ProcessTextSourceResponse = {
  provider: string;
  warning?: string;
  source?: {
    sourceId: string;
    source: string;
    snippet: string;
    s3Key?: string;
    sponsorStatus?: string;
  };
  trace?: SponsorTraceItem[];
};

const planSectionOrder: Array<{ title: string; section: PlanTaskSection }> = [
  { title: "Do now", section: "do_now" },
  { title: "Do next", section: "do_next" },
  { title: "Subsequent days", section: "subsequent_days" }
];

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

function AddSourceButton({
  onClick,
  raised
}: {
  onClick: () => void;
  raised: boolean;
}) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 justify-end px-4"
      style={{
        bottom: raised
          ? "calc(max(0.75rem, env(safe-area-inset-bottom)) + 10.25rem)"
          : "calc(max(0.75rem, env(safe-area-inset-bottom)) + 5.6rem)"
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-[0_12px_35px_rgba(0,0,0,0.12)]"
      >
        <Plus className="size-4" />
        Add task
      </button>
    </div>
  );
}

function GoalCandidateCard({
  commitment,
  onClick,
  onSourceClick
}: {
  commitment: Commitment;
  onClick: () => void;
  onSourceClick?: () => void;
}) {
  const needsDirection = commitment.state === "needs_clarification";

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="w-full cursor-pointer rounded-[24px] border border-neutral-200 bg-white p-4 text-left shadow-[0_12px_45px_rgba(0,0,0,0.045)] transition hover:bg-neutral-50"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SourceChip>Goal</SourceChip>
            <SourceChip tone={needsDirection ? "danger" : "success"}>
              {needsDirection ? "Needs direction" : "Roadmap ready"}
            </SourceChip>
          </div>
          <p className="text-[16px] font-semibold leading-5 text-ink">
            {commitment.title}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            StudentOS will break this into scheduled steps.
          </p>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-neutral-300" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSourceClick?.();
          }}
          className="rounded-full transition hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          aria-label={`Open source for ${commitment.title}`}
        >
          <SourceChip>{commitment.source}</SourceChip>
        </button>
        <SourceChip>{commitment.estimatedDuration}</SourceChip>
      </div>
      <p
        className={`mt-3 text-xs font-semibold ${
          needsDirection ? "text-red-700" : "text-emerald-700"
        }`}
      >
        {needsDirection ? "Tap to clarify roadmap" : "Roadmap ready"}
      </p>
    </motion.div>
  );
}

function dateOptionFor(dateId: string) {
  return demoScheduleDateOptions.find((date) => date.id === dateId);
}

function dateIndexFor(task: DemoPlanTask | null) {
  if (!task?.scheduledDateId) return -1;
  return demoScheduleDateOptions.findIndex((date) => date.id === task.scheduledDateId);
}

function canMoveTaskDate(task: DemoPlanTask | null, direction: -1 | 1) {
  const currentIndex = dateIndexFor(task);
  if (currentIndex < 0) return false;
  const nextDate = demoScheduleDateOptions[currentIndex + direction];
  if (!nextDate) return false;
  if (direction > 0 && task?.deadlineDateId && nextDate.id > task.deadlineDateId) {
    return false;
  }
  return true;
}

function baseTaskTitle(title: string) {
  return title.replace(/\s+— Session \d+$/, "");
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
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>(null);
  const [manualConflictOpen, setManualConflictOpen] = useState(false);
  const [manualConflictInstruction, setManualConflictInstruction] = useState(
    MANUAL_CONFLICT_INSTRUCTION
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [sourceDraft, setSourceDraft] = useState("");
  const [sourceProcessing, setSourceProcessing] = useState(false);
  const [addedSourceKey, setAddedSourceKey] = useState<string | null>(null);
  const [impactOpen, setImpactOpen] = useState(false);
  const [chemistryAdded, setChemistryAdded] = useState(false);
  const [roadmapAdded, setRoadmapAdded] = useState(true);
  const [planHydrated, setPlanHydrated] = useState(false);
  const [planTasks, setPlanTasks] = useState<DemoPlanTask[]>(initialPlanTasks);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<DemoPlanTask | null>(null);

  const unresolvedCount = commitments.filter(
    (item) => item.state === "needs_clarification" || item.state === "unsure"
  ).length;
  const displayedPlanSections = useMemo<PlanDisplaySection[]>(() => {
    return planSectionOrder.map((section) => ({
      ...section,
      items: planTasks.filter((task) => task.section === section.section)
    }));
  }, [planTasks]);
  const commitmentItems = commitments.filter((item) => item.type !== "goal");
  const goalItems = commitments.filter((item) => item.type === "goal");
  const visibleTimelineEvents = !conflictResolved
    ? timelineEvents
    : resolutionMode === "manual"
      ? manualResolvedTimelineEvents
      : resolvedTimelineEvents;
  const selectedTask = useMemo(() => {
    if (!selectedTaskForEdit) return null;
    return planTasks.find((task) => task.id === selectedTaskForEdit.id) ?? selectedTaskForEdit;
  }, [planTasks, selectedTaskForEdit]);
  const canScheduleEarlier = canMoveTaskDate(selectedTask, -1);
  const canScheduleLater = canMoveTaskDate(selectedTask, 1);

  useEffect(() => {
    try {
      const savedPlan = window.localStorage.getItem("studentos_plan_overrides");
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan) as DemoPlanTask[];
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
          setPlanTasks(parsedPlan);
        }
      }

      if (window.localStorage.getItem("studentos_extra_source_added")) {
        setChemistryAdded(true);
      }

      window.localStorage.setItem("studentos_roadmap_added", "true");
      setRoadmapAdded(true);

      if (window.localStorage.getItem("studentos_resume_step") === "plan") {
        setStep("plan");
        setConflictResolved(true);
        setResolutionMode("recommended");
      }
    } catch {
      setPlanTasks(initialPlanTasks);
    } finally {
      setPlanHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!planHydrated) return;
    window.localStorage.setItem("studentos_plan_overrides", JSON.stringify(planTasks));
  }, [planHydrated, planTasks]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function addSponsorTrace(item: SponsorTraceItem) {
    const existing = window.localStorage.getItem("studentos_sponsor_trace");
    let trace: SponsorTraceItem[] = [];

    if (existing) {
      try {
        trace = JSON.parse(existing) as SponsorTraceItem[];
      } catch {
        trace = [];
      }
    }

    window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify([item, ...trace].slice(0, 8)));
  }

  function clarify(kind: "goal" | "team") {
    setCommitments((current) =>
      current.map((item) => {
        if (kind === "goal" && item.id === "coding") {
          return {
            ...item,
            state: "confirmed",
            confidence: 92,
            estimatedDuration: "2 sessions/week",
            explanation: "Roadmap ready: 6 steps scheduled across Jun-Dec."
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

  function applySuggestedConflict(continueToPlan = false) {
    if (!conflictResolved) {
      setConflictResolved(true);
      setResolutionMode("recommended");
      showToast("Suggested deconflict applied");
    }

    if (continueToPlan) {
      setStep("plan");
    }
  }

  function applyManualInstruction() {
    setConflictResolved(true);
    setResolutionMode("manual");
    setManualConflictOpen(false);
    showToast("Manual instruction applied");
  }

  function applyAndContinue() {
    if (!conflictResolved) {
      applySuggestedConflict(true);
      return;
    }
    setStep("plan");
  }

  function reset() {
    router.push("/");
  }

  function openAddSource() {
    setSourceDraft("");
    setAddSourceOpen(true);
  }

  async function submitAdditionalSource() {
    if (sourceProcessing) return;

    const text = sourceDraft.trim() || "Chemistry worksheet due 8 PM tonight";
    setSourceProcessing(true);
    setSourceDraft(text);

    try {
      const response = await fetch("/api/sponsor/aws/process-text-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: "mid_flow_add",
          title: "Mid-flow added source",
          text,
        }),
      });
      const result = (await response.json()) as ProcessTextSourceResponse;

      result.trace?.forEach(addSponsorTrace);
      setAddedSourceKey(result.source?.s3Key ?? null);
    } catch (error) {
      addSponsorTrace({
        provider: "AWS",
        action: "Stored added source",
        status: "fallback",
        detail: error instanceof Error ? error.message : "Added source storage failed.",
      });
      setAddedSourceKey(null);
    } finally {
      setSourceProcessing(false);
      setAddSourceOpen(false);
      setImpactOpen(true);
    }
  }

  function updatePlanWithChemistry() {
    if (chemistryAdded) {
      setImpactOpen(false);
      showToast("Chemistry already in plan");
      return;
    }

    const chemistryTask: DemoPlanTask = {
      id: "chemistry-worksheet",
      title: "Chemistry worksheet",
      section: "do_next",
      estimatedMinutes: 30,
      timeLabel: "Before 8 PM",
      deadline: "8 PM tonight",
      deadlineDateId: "2026-06-09",
      reason: "New commitment inserted before the evening deadline",
      source: "Added task",
      updated: true
    };

    setPlanTasks((current) => {
      if (current.some((task) => task.id === chemistryTask.id)) return current;

      const updatedTasks = current.map((task) =>
        task.id === "coding-practice"
          ? {
              ...task,
              timeLabel: "9:45 PM",
              reason: "Moved later after Chemistry",
              updated: true
            }
          : task
      );
      const codingIndex = updatedTasks.findIndex((task) => task.id === "coding-practice");

      if (codingIndex < 0) {
        const firstFutureIndex = updatedTasks.findIndex(
          (task) => task.section === "subsequent_days"
        );
        if (firstFutureIndex < 0) return [...updatedTasks, chemistryTask];
        return [
          ...updatedTasks.slice(0, firstFutureIndex),
          chemistryTask,
          ...updatedTasks.slice(firstFutureIndex)
        ];
      }

      return [
        ...updatedTasks.slice(0, codingIndex),
        chemistryTask,
        ...updatedTasks.slice(codingIndex)
      ];
    });
    setChemistryAdded(true);
    window.localStorage.setItem("studentos_extra_source_added", "chemistry_worksheet_due_8pm");
    setImpactOpen(false);
    showToast("Plan updated");
  }

  function updateSelectedTaskDate(dateId: string) {
    if (!selectedTask) return;
    const date = dateOptionFor(dateId);
    if (!date) return;

    setPlanTasks((current) =>
      current.map((task) =>
        task.id === selectedTask.id
          ? {
              ...task,
              scheduledDateId: date.id,
              scheduledDate: date.label,
              scheduledDateRange: undefined,
              updated: true
            }
          : task
      )
    );
    showToast("Schedule updated");
  }

  function moveSelectedTaskDate(direction: -1 | 1) {
    if (!selectedTask) return;
    const currentIndex = dateIndexFor(selectedTask);
    const nextDate = demoScheduleDateOptions[currentIndex + direction];
    if (!nextDate) return;
    if (direction > 0 && selectedTask.deadlineDateId && nextDate.id > selectedTask.deadlineDateId) {
      return;
    }
    updateSelectedTaskDate(nextDate.id);
  }

  function splitSelectedTask() {
    if (!selectedTask) return;

    const baseTitle = baseTaskTitle(selectedTask.title);
    const firstDuration = selectedTask.estimatedMinutes
      ? Math.ceil(selectedTask.estimatedMinutes / 2)
      : undefined;
    const secondDuration = selectedTask.estimatedMinutes
      ? Math.floor(selectedTask.estimatedMinutes / 2)
      : undefined;
    const nextDateIndex = dateIndexFor(selectedTask) + 1;
    const nextDate = selectedTask.section === "subsequent_days"
      ? demoScheduleDateOptions[nextDateIndex]
      : undefined;
    const sessionOne: DemoPlanTask = {
      ...selectedTask,
      id: `${selectedTask.id}-session-1`,
      title: `${baseTitle} — Session 1`,
      estimatedMinutes: firstDuration,
      updated: true
    };
    const sessionTwo: DemoPlanTask = {
      ...selectedTask,
      id: `${selectedTask.id}-session-2`,
      title: `${baseTitle} — Session 2`,
      estimatedMinutes: secondDuration,
      scheduledDateId: nextDate?.id ?? selectedTask.scheduledDateId,
      scheduledDate: nextDate?.label ?? selectedTask.scheduledDate,
      scheduledDateRange: undefined,
      timeLabel:
        selectedTask.section === "subsequent_days"
          ? selectedTask.timeLabel
          : selectedTask.timeLabel
            ? "Next session"
            : undefined,
      updated: true
    };

    setPlanTasks((current) =>
      current.flatMap((task) => (task.id === selectedTask.id ? [sessionOne, sessionTwo] : [task]))
    );
    setSelectedTaskForEdit(null);
    showToast("Task split into 2 sessions");
  }

  function viewRoadmap() {
    window.localStorage.setItem("studentos_roadmap_added", "true");
    window.localStorage.setItem("studentos_resume_step", "plan");
    window.localStorage.setItem("studentos_plan_overrides", JSON.stringify(planTasks));
    setRoadmapAdded(true);
    router.push("/roadmap");
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
                title="Review extracted items"
                subtitle="StudentOS separated obligations from longer-term goals."
              />
              <div className="space-y-6 pb-8">
                <section className="space-y-3">
                  <div className="px-1">
                    <h2 className="text-[18px] font-semibold text-ink">Commitments</h2>
                    <p className="mt-1 text-[13px] leading-5 text-muted">
                      Tasks, fixed events, and deadlines StudentOS must schedule around.
                    </p>
                  </div>
                  {commitmentItems.map((commitment) => (
                    <CommitmentCard
                      key={commitment.id}
                      commitment={commitment}
                      onClick={() => {
                        if (commitment.state === "unsure") setClarifying("team");
                        else openEditor(commitment);
                      }}
                      onSourceClick={() => {
                        setSourcePreview(commitmentSourcePreviews[commitment.id] ?? null);
                      }}
                    />
                  ))}
                </section>

                <section className="space-y-3">
                  <div className="px-1">
                    <h2 className="text-[18px] font-semibold text-ink">Goals</h2>
                    <p className="mt-1 text-[13px] leading-5 text-muted">
                      Self-directed ambitions that need a roadmap, not a single checkbox.
                    </p>
                  </div>
                  {goalItems.map((commitment) => (
                    <GoalCandidateCard
                      key={commitment.id}
                      commitment={commitment}
                      onClick={() => {
                        if (commitment.state === "needs_clarification") setClarifying("goal");
                        else openEditor(commitment);
                      }}
                      onSourceClick={() => {
                        setSourcePreview(commitmentSourcePreviews[commitment.id] ?? null);
                      }}
                    />
                  ))}
                </section>
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
                    ? resolutionMode === "manual"
                      ? "StudentOS used your instruction and rebuilt the clash."
                      : "StudentOS updated the day without moving fixed commitments."
                    : "CCA briefing overlaps with tuition. StudentOS found a cleaner schedule."
                }
              />
              <ConflictSummaryCard resolved={conflictResolved} resolutionMode={resolutionMode} />
              
              <MobileTimeline
                events={visibleTimelineEvents}
                resolved={conflictResolved}
                onEventClick={setSelectedEvent}
              />
              
              <RecommendationCard
                resolved={conflictResolved}
                resolutionMode={resolutionMode}
                onApply={() => {
                  if (conflictResolved) setStep("plan");
                  else applySuggestedConflict(false);
                }}
                onEdit={() => setManualConflictOpen(true)}
              />

              <div className="fixed-bottom-action">
                <button
                  onClick={applyAndContinue}
                  className="flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Apply and continue</span>
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
              <GoalRoadmapCard onView={viewRoadmap} roadmapAdded={roadmapAdded} />
              <div className="space-y-6">
                {displayedPlanSections.map((section) => (
                  <PlanSection
                    key={section.title}
                    title={section.title}
                    items={section.items}
                    onTaskClick={setSelectedTaskForEdit}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddSourceButton onClick={openAddSource} raised={step === "plan"} />

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
        title={selectedEvent?.title ?? "Schedule detail"}
        subtitle={selectedEvent ? `${selectedEvent.time} · ${selectedEvent.chip}` : undefined}
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Rationale for Schedule
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-neutral-700">
              {conflictResolved
                ? "This block is now handled in the rebuilt schedule."
                : "This block is part of the CCA and tuition clash."}
            </p>
          </div>
          {!conflictResolved ? (
            <PrimaryButton
              onClick={() => {
                setSelectedEvent(null);
                setManualConflictOpen(true);
              }}
            >
              Edit manually
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => setSelectedEvent(null)}>Done</PrimaryButton>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={reasoningOpen}
        onClose={() => setReasoningOpen(false)}
        title="Why this plan?"
        subtitle={`StudentOS prioritised the Physics worksheet because it is due tomorrow morning, ${resolutionMode === "manual" ? "used your manual instruction to move tuition away from CCA," : "kept tuition fixed and handled the CCA clash,"} moved flexible revision later,${chemistryAdded ? " inserted Chemistry before 8 PM," : ""} and scheduled your coding roadmap across future days.`}
      >
        <div className="flex flex-wrap gap-2">
          {["Urgency", "Fixed events", "Energy", "Deadline", ...(chemistryAdded ? ["Updated"] : []), "Goal roadmap"].map((chip) => (
            <SourceChip key={chip}>{chip}</SourceChip>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={addSourceOpen}
        onClose={() => setAddSourceOpen(false)}
        title="Add task"
        subtitle="StudentOS will work it into your plan."
      >
        <div className="space-y-4">
          <textarea
            value={sourceDraft}
            onChange={(event) => setSourceDraft(event.target.value)}
            rows={4}
            placeholder="Paste a task, deadline, reminder, or goal..."
            className="min-h-28 w-full resize-none rounded-[22px] border border-neutral-200 bg-white px-4 py-3 text-[15px] font-semibold leading-6 text-ink outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-0"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500"
                aria-label="Attach file"
              >
                <Paperclip className="size-4.5" />
              </button>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-neutral-500"
                aria-label="Add photo"
              >
                <ImageIcon className="size-4.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={submitAdditionalSource}
              disabled={sourceProcessing}
              className="flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-soft"
              aria-label="Add task"
            >
              <ArrowUp className={`size-5 stroke-[2.5] ${sourceProcessing ? "animate-pulse" : ""}`} />
            </button>
          </div>
          <div className="rounded-[18px] border border-neutral-100 bg-neutral-50 p-3 text-xs font-semibold leading-5 text-neutral-500">
            {sourceProcessing
              ? "Saving added source through AWS..."
              : "Demo fallback: Chemistry worksheet due 8 PM tonight."}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={impactOpen}
        onClose={() => setImpactOpen(false)}
        title={chemistryAdded ? "Already in your plan" : "1 new commitment found"}
        subtitle={chemistryAdded ? "Chemistry is already scheduled before 8 PM." : "This affects today’s plan."}
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Added</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-ink">
              <span className="size-1.5 rounded-full bg-ink" />
              Chemistry worksheet due 8 PM
            </div>
            {addedSourceKey ? (
              <p className="mt-3 rounded-[14px] border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] font-semibold leading-5 text-sky-800">
                AWS cached this added source at <span className="font-mono">{addedSourceKey}</span>.
              </p>
            ) : null}
          </div>

          <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Plan impact</p>
            <div className="mt-3 space-y-2">
              {[
                "Add Chemistry worksheet before 8 PM",
                "Keep Physics worksheet as first focus block",
                "Move coding practice later"
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-700">
                  <span className="size-1.5 rounded-full bg-ink" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {chemistryAdded ? (
            <PrimaryButton onClick={() => setImpactOpen(false)}>Done</PrimaryButton>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <PrimaryButton onClick={updatePlanWithChemistry}>Update plan</PrimaryButton>
              <button
                type="button"
                onClick={() => setImpactOpen(false)}
                className="inline-flex h-[60px] w-full items-center justify-center rounded-full border border-neutral-200 bg-white px-5 text-[15px] font-semibold text-ink shadow-[0_10px_35px_rgba(0,0,0,0.04)] transition hover:bg-neutral-50"
              >
                Keep current plan
              </button>
            </div>
          )}
        </div>
      </BottomSheet>

      <TaskEditBottomSheet
        task={selectedTask}
        dateOptions={demoScheduleDateOptions}
        canScheduleEarlier={canScheduleEarlier}
        canScheduleLater={canScheduleLater}
        onClose={() => setSelectedTaskForEdit(null)}
        onScheduleEarlier={() => moveSelectedTaskDate(-1)}
        onScheduleLater={() => moveSelectedTaskDate(1)}
        onDateChange={updateSelectedTaskDate}
        onSplit={splitSelectedTask}
      />

      <ManualConflictSheet
        open={manualConflictOpen}
        instruction={manualConflictInstruction}
        onInstructionChange={setManualConflictInstruction}
        onApply={applyManualInstruction}
        onClose={() => setManualConflictOpen(false)}
      />

      <ExportSuccessSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        includeChemistry={chemistryAdded}
        includeRoadmap={roadmapAdded}
        onSaved={() => showToast("Saved to calendar")}
      />

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed-bottom-toast flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift animate-bounce"
          >
            <CheckCircle2 className="size-4" />
            {toastMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

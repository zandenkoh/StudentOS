"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  Trash2
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AgentActivityPanel } from "@/components/agent-activity-panel";
import { BottomActionBar } from "@/components/bottom-action-bar";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";
import {
  ClarificationBottomSheet,
  goalQuestions,
  teamQuestions,
  type ClarificationAnswers,
  type ClarificationQuestion
} from "@/components/clarification-bottom-sheet";
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
import { resetScreenScroll } from "@/components/scroll-to-screen-top";
import { SourceChip } from "@/components/source-chip";
import { SponsorProofStrip } from "@/components/sponsor-proof-strip";
import { TaskEditBottomSheet } from "@/components/task-edit-bottom-sheet";

import {
  baseCommitments,
  initialPlanTasks,
  manualResolvedTimelineEvents,
  resolvedTimelineEvents,
  timelineEvents,
  type Commitment,
  type DemoPlanTask,
  type PlanTaskSection,
  type TimelineEvent
} from "@/lib/demo-data";
import {
  appendAgentRunEvent,
  appendAgentRunTrace,
  completeAgentRun,
  createAgentEvent,
  diffCommitments,
  diffPlanTasks,
  type AgentActivityStreamEvent,
  type AgentRunStatus,
} from "@/lib/agent-activity";
import type {
  AIConflictAnalysis,
  AIClarificationQuestion,
  StudentOSAgentFootprint
} from "@/lib/studentos-ai-types";
import { validateTimelineConflicts } from "@/lib/schedule-conflicts";
import { ensureTaskTimeRange, ensureTaskTimeRanges } from "@/lib/time-scheduling";
import {
  addDaysToDateId,
  baseTaskTitle,
  canMoveTaskDate,
  canUseScheduleDate,
  commitmentsWithAddedCommitment,
  completionToastForTask,
  enrichPlanTasksWithRationales,
  fallbackPlanBullets,
  fallbackPlanSummary,
  formatScheduleDateLabel,
  interpretAddedSource,
  nextDayForTask,
  planTasksWithEditedCommitment,
  planTasksWithAddedTask,
  planTasksWithoutCommitment,
  scheduleLabelForTask,
  scheduleRationaleForEvent,
  sortSubsequentDayTasks,
  todayDateId,
  upsertClarifiedCommitmentTask,
  type AddedCommitmentInterpretation,
  type PlanDisplaySection,
} from "@/app/commitments/commitment-helpers";
import {
  CommitmentSourcePreview,
  resolveCommitmentSourcePreview,
  type SourcePreview,
} from "@/app/commitments/source-preview";
import { useAgentRuns, type ReplanTrigger } from "@/app/commitments/use-agent-runs";

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

const defaultConflictValidation = validateTimelineConflicts(timelineEvents);
const defaultConflictGroup = defaultConflictValidation.groups[0];
const defaultConflictEvents = defaultConflictGroup
  ? timelineEvents.filter((event) => defaultConflictGroup.eventIds.includes(event.id))
  : [];
const defaultFixedEvent = defaultConflictEvents[0];
const defaultConflictingEvent = defaultConflictEvents[1];
const defaultConflictTitle = defaultFixedEvent && defaultConflictingEvent
  ? `${defaultFixedEvent.title} overlaps with ${defaultConflictingEvent.title}`
  : "Schedule conflict";

const defaultConflictAnalysis: AIConflictAnalysis = {
  title: defaultConflictTitle,
  unresolvedSummary: defaultConflictGroup
    ? `${defaultConflictTitle}. StudentOS found a cleaner schedule.`
    : "StudentOS reviewed the schedule for fixed-time overlaps.",
  resolvedTitle: "Conflict resolved",
  resolvedSummary: "StudentOS kept fixed commitments explicit and moved flexible work first.",
  fixedEventTitle: defaultFixedEvent?.title ?? "Fixed item",
  fixedEventTime: defaultFixedEvent?.duration ?? defaultFixedEvent?.time ?? "Time reviewed",
  conflictingEventTitle: defaultConflictingEvent?.title ?? "Other item",
  conflictingEventTime: defaultConflictingEvent?.duration ?? defaultConflictingEvent?.time ?? "Not confirmed",
  overlapLabel: defaultConflictGroup?.overlapLabel ?? "Not confirmed",
  impactLabel: "Decision needed",
  resolvedImpactLabel: "Plan ready",
  recommendationSummary:
    "Keep fixed commitments stable, move flexible work first, and ask for clarification if exact timing is missing.",
  recommendedActions: [
    "Keep fixed-time items explicit",
    "Move flexible work around confirmed overlaps",
    "Confirm missing times before locking the plan",
    "Update the timeline after each instruction",
  ],
  manualActions: [
    "Apply the manual instruction as the priority constraint",
    "Mark any changed task as updated",
    "Recheck fixed-time overlaps",
    "Ask for clarification if timing is still missing",
  ],
};

type EditDraft = {
  title: string;
  type: Commitment["type"];
  estimatedDuration: string;
};

type ResolutionMode = "recommended" | "manual" | null;

type ClarifyingState = {
  kind: AIClarificationQuestion["kind"];
  commitmentId: string;
} | null;

type ClarificationAnswerRecord = {
  commitmentId: string;
  commitmentTitle: string;
  kind: AIClarificationQuestion["kind"];
  question: string;
  answer: string;
  answeredAt: string;
};

const MANUAL_CONFLICT_INSTRUCTION = "";

type SponsorTraceItem = {
  provider: string;
  action: string;
  status: "success" | "fallback" | "error";
  detail: string;
};

function mergeSponsorTraces(...groups: SponsorTraceItem[][]) {
  const seen = new Set<string>();

  return groups
    .flat()
    .filter((item) => {
      const key = `${item.provider}:${item.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

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

type PlanDayResponse = {
  provider: "vercel-ai-gateway" | "fallback";
  status: "success" | "fallback" | "error";
  model?: string;
  rationale: {
    summary: string;
    bullets: string[];
  };
  dailyPlan?: {
    focus: string;
  };
  trace?: SponsorTraceItem[];
};

type ReplanAgentResponse = {
  provider: "vercel-ai-gateway" | "fallback";
  status: "success" | "fallback" | "error";
  model?: string;
  trigger: ReplanTrigger;
  commitments: Commitment[];
  planTasks: DemoPlanTask[];
  timelineEvents: TimelineEvent[];
  resolvedTimelineEvents: TimelineEvent[];
  conflict: AIConflictAnalysis;
  rationale: PlanDayResponse["rationale"];
  dailyPlan: {
    focus: string;
  };
  trace?: SponsorTraceItem[];
};

const planSectionOrder: Array<{ title: string; section: PlanTaskSection }> = [
  { title: "Do now", section: "do_now" },
  { title: "Do next", section: "do_next" },
  { title: "Subsequent days", section: "subsequent_days" }
];

const commitmentTypes: Commitment["type"][] = ["task", "event", "deadline", "goal", "conflict"];

const SAVED_COMMITMENTS_KEY = "studentos_commitment_overrides";
const SAVED_PLAN_TASKS_KEY = "studentos_plan_overrides";
const SAVED_FLOW_STATE_KEY = "studentos_flow_state";
const ACTIVE_FOOTPRINT_SIGNATURE_KEY = "studentos_active_footprint_signature";
const SAVED_COMMITMENTS_FOOTPRINT_KEY = "studentos_commitment_overrides_footprint";
const SAVED_PLAN_FOOTPRINT_KEY = "studentos_plan_overrides_footprint";
const COMPLETED_TASK_IDS_KEY = "studentos_completed_task_ids";

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
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
              {needsDirection ? "Need clarification" : "Understand"}
            </SourceChip>
            {!needsDirection && (
              <SourceChip tone="success">Ready</SourceChip>
            )}
          </div>
          <p className="text-[16px] font-semibold leading-5 text-ink">
            {commitment.title}
          </p>
          <p className="mt-2 truncate whitespace-nowrap text-[13px] leading-5 text-muted">
            {commitment.explanation}
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
    </motion.div>
  );
}

function looksLikeAssignmentDetailsQuestion(question: string) {
  return /assignment|worksheet|homework|page|question|prompt|due/i.test(question);
}

function looksLikeFieldPickerOptions(options: AIClarificationQuestion["options"]) {
  const labels = options.map((option) => option.label.toLowerCase()).join(" | ");

  return (
    /\b(prompt text|question range|page numbers|question numbers|both)\b/.test(labels) ||
    (/\bunsure\b/.test(labels) && /\b(page|question|prompt|range)\b/.test(labels))
  );
}

function assignmentDetailOptions(question: string): ClarificationQuestion["options"] {
  const lowerQuestion = question.toLowerCase();
  const asksForWorksheetScope = /worksheet|page|question number|question range/.test(lowerQuestion);

  if (asksForWorksheetScope) {
    return [
      { label: "Whole worksheet", recommended: true },
      { label: "Selected questions" },
      { label: "Need to check" },
      { label: "Ask teacher first" },
    ];
  }

  return [
    { label: "Use full prompt", recommended: true },
    { label: "Selected questions" },
    { label: "Need to check" },
    { label: "Ask teacher first" },
  ];
}

function normalizedOptionsForSheet(question: AIClarificationQuestion) {
  if (
    looksLikeAssignmentDetailsQuestion(question.question) &&
    looksLikeFieldPickerOptions(question.options)
  ) {
    return assignmentDetailOptions(question.question);
  }

  return question.options;
}

function questionsForSheet(questions: AIClarificationQuestion[]): ClarificationQuestion[] | undefined {
  if (!questions.length) return undefined;

  return questions.map((question) => ({
    question: question.question,
    options: normalizedOptionsForSheet(question),
    customPlaceholder: question.customPlaceholder,
  }));
}

function savedAnswersForQuestions(
  commitmentId: string,
  questions: AIClarificationQuestion[],
  records: ClarificationAnswerRecord[],
) {
  const commitmentRecords = records.filter((record) => record.commitmentId === commitmentId);
  const answers: ClarificationAnswers = {};

  if (!questions.length) {
    commitmentRecords.forEach((record, index) => {
      if (record.answer) answers[index] = record.answer;
    });
    return answers;
  }

  questions.forEach((question, index) => {
    const matchingRecord =
      commitmentRecords.find((record) => record.question === question.question) ??
      commitmentRecords[index];

    if (matchingRecord?.answer) {
      answers[index] = matchingRecord.answer;
    }
  });

  return answers;
}

function clarificationRecordsSignature(records: ClarificationAnswerRecord[]) {
  return JSON.stringify(
    records
      .map((record) => ({
        commitmentId: record.commitmentId,
        question: record.question,
        answer: record.answer,
      }))
      .sort((left, right) =>
        `${left.commitmentId}:${left.question}`.localeCompare(
          `${right.commitmentId}:${right.question}`,
        ),
      ),
  );
}

function clarificationAnswerValueSignature(records: ClarificationAnswerRecord[]) {
  return JSON.stringify(records.map((record) => record.answer.trim()).filter(Boolean));
}

function persistCommitments(commitments: Commitment[]) {
  window.localStorage.setItem(SAVED_COMMITMENTS_KEY, JSON.stringify(commitments));
  const activeFootprintSignature = window.localStorage.getItem(ACTIVE_FOOTPRINT_SIGNATURE_KEY);
  if (activeFootprintSignature) {
    window.localStorage.setItem(SAVED_COMMITMENTS_FOOTPRINT_KEY, activeFootprintSignature);
  } else {
    window.localStorage.removeItem(SAVED_COMMITMENTS_FOOTPRINT_KEY);
  }
}

function persistPlanTasks(tasks: DemoPlanTask[]) {
  window.localStorage.setItem(SAVED_PLAN_TASKS_KEY, JSON.stringify(tasks));
  const activeFootprintSignature = window.localStorage.getItem(ACTIVE_FOOTPRINT_SIGNATURE_KEY);
  if (activeFootprintSignature) {
    window.localStorage.setItem(SAVED_PLAN_FOOTPRINT_KEY, activeFootprintSignature);
  } else {
    window.localStorage.removeItem(SAVED_PLAN_FOOTPRINT_KEY);
  }
}

function commitmentListSignature(commitments: Commitment[]) {
  return JSON.stringify(
    commitments.map((commitment) => ({
      id: commitment.id,
      title: commitment.title,
      source: commitment.source,
      type: commitment.type,
    })),
  );
}

function clearAiPlanCaches() {
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("studentos_vercel_plan_day_"))
    .forEach((key) => window.localStorage.removeItem(key));
}

function cacheKeyForText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function completedTaskIds() {
  const raw = window.localStorage.getItem(COMPLETED_TASK_IDS_KEY);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

function persistCompletedTask(taskId: string) {
  const ids = completedTaskIds();
  ids.add(taskId);
  window.localStorage.setItem(COMPLETED_TASK_IDS_KEY, JSON.stringify([...ids]));
}

function withoutCompletedTasks(tasks: DemoPlanTask[]) {
  const completedIds = completedTaskIds();
  if (completedIds.size === 0) return tasks;
  return tasks.filter((task) => !completedIds.has(task.id));
}

function persistFlowState(state: {
  step?: CommitmentsStep;
  conflictResolved?: boolean;
  resolutionMode?: ResolutionMode;
  roadmapAdded?: boolean;
  addedTaskApplied?: boolean;
  chemistryAdded?: boolean;
}) {
  const existing = window.localStorage.getItem(SAVED_FLOW_STATE_KEY);
  let current: Record<string, unknown> = {};

  if (existing) {
    try {
      current = JSON.parse(existing) as Record<string, unknown>;
    } catch {
      current = {};
    }
  }

  window.localStorage.setItem(SAVED_FLOW_STATE_KEY, JSON.stringify({ ...current, ...state }));
}

function firstFlexiblePlanTaskId(tasks: DemoPlanTask[]) {
  const target = tasks.find((task) => {
    const text = `${task.title} ${task.reason ?? ""} ${task.source ?? ""}`.toLowerCase();
    return task.section !== "do_now" && !/\bfixed\b|calendar|appointment|class|lesson/.test(text);
  });

  return target?.id ?? tasks[0]?.id;
}

function applyManualInstructionToPlanTasks(tasks: DemoPlanTask[], instruction: string) {
  const targetId = firstFlexiblePlanTaskId(tasks);
  if (!targetId) return tasks;

  return tasks.map((task) =>
    task.id === targetId
      ? {
          ...task,
          reason: "Updated after manual instruction",
          scheduleRationale: `StudentOS is rebuilding this item around the user's manual conflict instruction: ${instruction}.`,
          updated: true,
        }
      : task,
  );
}

function insertMissingPreservedPlanTasks(
  resultTasks: DemoPlanTask[],
  baselineTasks: DemoPlanTask[],
  preservePlanTaskIds: string[],
) {
  if (!preservePlanTaskIds.length) return resultTasks;

  const resultIds = new Set(resultTasks.map((task) => task.id));
  const missingTasks = baselineTasks.filter(
    (task) => preservePlanTaskIds.includes(task.id) && !resultIds.has(task.id),
  );

  return missingTasks.reduce((tasks, missingTask) => {
    const firstFutureIndex = tasks.findIndex((task) => task.section === "subsequent_days");
    const sameSectionLastIndex = tasks.reduce(
      (lastIndex, task, index) => (task.section === missingTask.section ? index : lastIndex),
      -1,
    );
    const insertionIndex =
      sameSectionLastIndex >= 0
        ? sameSectionLastIndex + 1
        : firstFutureIndex >= 0 && missingTask.section !== "subsequent_days"
          ? firstFutureIndex
          : tasks.length;

    return [
      ...tasks.slice(0, insertionIndex),
      missingTask,
      ...tasks.slice(insertionIndex),
    ];
  }, resultTasks);
}

export default function CommitmentsPage() {
  const router = useRouter();
  const [step, setStep] = useState<CommitmentsStep>("commitments");
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [clarifying, setClarifying] = useState<ClarifyingState>(null);
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
  const [addedSourceText, setAddedSourceText] = useState<string | null>(null);
  const [addedInterpretation, setAddedInterpretation] =
    useState<AddedCommitmentInterpretation | null>(null);
  const [impactOpen, setImpactOpen] = useState(false);
  const [addedTaskApplied, setAddedTaskApplied] = useState(false);
  const [roadmapAdded, setRoadmapAdded] = useState(true);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [planHydrated, setPlanHydrated] = useState(false);
  const [planTasks, setPlanTasks] = useState<DemoPlanTask[]>([]);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<DemoPlanTask | null>(null);
  const [clarificationAnswerRecords, setClarificationAnswerRecords] = useState<ClarificationAnswerRecord[]>([]);
  const [aiPlan, setAiPlan] = useState<PlanDayResponse | null>(null);
  const [sponsorTrace, setSponsorTrace] = useState<SponsorTraceItem[]>([]);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [replanLoading, setReplanLoading] = useState(false);
  const { agentRuns, beginAgentRun, updateAgentRun } = useAgentRuns();
  const [aiFootprint, setAiFootprint] = useState<StudentOSAgentFootprint | null>(null);
  const [baseTimeline, setBaseTimeline] = useState<TimelineEvent[]>([]);
  const [aiResolvedTimeline, setAiResolvedTimeline] = useState<TimelineEvent[]>([]);
  const [conflictAnalysis, setConflictAnalysis] = useState<AIConflictAnalysis | undefined>();
  const aiPlanRequestStarted = useRef(false);

  const unresolvedCount = commitments.filter(
    (item) => item.state === "needs_clarification" || item.state === "unsure"
  ).length;
  const displayedPlanSections = useMemo<PlanDisplaySection[]>(() => {
    return planSectionOrder.map((section) => {
      const items = planTasks.filter((task) => task.section === section.section);

      return {
        ...section,
        items: section.section === "subsequent_days" ? sortSubsequentDayTasks(items) : items
      };
    });
  }, [planTasks]);
  const commitmentItems = useMemo(
    () => commitments.filter((item) => item.type !== "goal"),
    [commitments],
  );
  const goalItems = useMemo(
    () => commitments.filter((item) => item.type === "goal"),
    [commitments],
  );
  const hasExtractedItems = commitmentItems.length > 0 || goalItems.length > 0;
  const visibleTimelineEvents = useMemo(() => {
    if (!conflictResolved) return baseTimeline;
    if (aiResolvedTimeline.length > 0) return aiResolvedTimeline;
    return resolutionMode === "manual" ? manualResolvedTimelineEvents : resolvedTimelineEvents;
  }, [aiResolvedTimeline, baseTimeline, conflictResolved, resolutionMode]);
  const hasConfirmedConflict = useMemo(
    () => validateTimelineConflicts(baseTimeline).groups.length > 0,
    [baseTimeline],
  );
  const selectedTask = useMemo(() => {
    if (!selectedTaskForEdit) return null;
    return planTasks.find((task) => task.id === selectedTaskForEdit.id) ?? selectedTaskForEdit;
  }, [planTasks, selectedTaskForEdit]);
  const selectedEventRationale = useMemo(
    () => scheduleRationaleForEvent(selectedEvent, planTasks),
    [planTasks, selectedEvent],
  );
  const canScheduleEarlier = canMoveTaskDate(selectedTask, -1);
  const canScheduleLater = canMoveTaskDate(selectedTask, 1);
  const aiPlanSummary = aiPlan?.rationale.summary ?? fallbackPlanSummary(commitments, planTasks);
  const aiPlanBullets = aiPlan?.rationale.bullets ?? fallbackPlanBullets(commitments, planTasks);
  const activeClarifications = useMemo(() => {
    if (!clarifying) return [];

    return aiFootprint?.clarificationQuestions.filter(
      (question) => question.commitmentId === clarifying.commitmentId,
    ) ?? [];
  }, [aiFootprint?.clarificationQuestions, clarifying]);
  const activeClarification = activeClarifications[0];
  const activeClarificationQuestionsForSheet = useMemo(
    () => questionsForSheet(activeClarifications),
    [activeClarifications],
  );
  const activeClarificationInitialAnswers = useMemo(
    () =>
      clarifying
        ? savedAnswersForQuestions(
            clarifying.commitmentId,
            activeClarifications,
            clarificationAnswerRecords,
          )
        : {},
    [activeClarifications, clarificationAnswerRecords, clarifying],
  );
  const focusTask = planTasks.find((task) => task.section === "do_now") ?? planTasks[0];
  const roadmapGoal = goalItems[0];
  const nextRoadmapTask = planTasks.find((task) => task.isRoadmapTask);
  const roadmapTaskCount = aiFootprint?.roadmapSteps.length ?? planTasks.filter((task) => task.isRoadmapTask).length;
  const roadmapSummaryLines = [
    `${roadmapTaskCount || 0} roadmap step${roadmapTaskCount === 1 ? "" : "s"} scheduled.`,
    nextRoadmapTask
      ? `Next action: ${nextRoadmapTask.estimatedMinutes ? `${nextRoadmapTask.estimatedMinutes} min ` : ""}${nextRoadmapTask.title}.`
      : roadmapGoal
        ? `Next action: clarify ${roadmapGoal.title}.`
        : "Next action: no roadmap task yet.",
    aiFootprint?.goalResearch
      ? "Plan grounded in checked source context."
      : "Risk: consistency, not deadline proximity.",
  ];

  useLayoutEffect(() => {
    resetScreenScroll();
    const frameId = window.requestAnimationFrame(resetScreenScroll);

    return () => window.cancelAnimationFrame(frameId);
  }, [step]);

  useEffect(() => {
    if (step !== "plan" || !highlightedTaskId) return;

    let clearTimer: number | undefined;
    const frameId = window.requestAnimationFrame(() => {
      const element = document.getElementById(`plan-task-${highlightedTaskId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      clearTimer = window.setTimeout(() => {
        setHighlightedTaskId((current) => (current === highlightedTaskId ? null : current));
      }, 2600);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, [highlightedTaskId, planTasks, step]);

  useEffect(() => {
    try {
      let persistedTrace: SponsorTraceItem[] = [];
      let hasSubmittedSources = false;
      const rawTrace = window.localStorage.getItem("studentos_sponsor_trace");
      if (rawTrace) {
        const parsedTrace = JSON.parse(rawTrace) as SponsorTraceItem[];
        if (Array.isArray(parsedTrace)) {
          persistedTrace = parsedTrace.slice(0, 8);
          setSponsorTrace(persistedTrace);
        }
      }
      const rawCapturedSources = window.localStorage.getItem("studentos_captured_sources");
      if (rawCapturedSources) {
        try {
          const parsedSources = JSON.parse(rawCapturedSources) as unknown[];
          hasSubmittedSources = Array.isArray(parsedSources) && parsedSources.length > 0;
        } catch {
          hasSubmittedSources = true;
        }
      }

      const rawFootprint =
        window.localStorage.getItem("studentos_ai_footprint") ??
        window.localStorage.getItem("studentos_commitment_footprint");
      let hydratedFootprintSignature: string | null = null;

      if (rawFootprint) {
        const parsedFootprint = JSON.parse(rawFootprint) as StudentOSAgentFootprint;

        if (
          Array.isArray(parsedFootprint.commitments) &&
          Array.isArray(parsedFootprint.planTasks) &&
          parsedFootprint.rationale
        ) {
          hydratedFootprintSignature = commitmentListSignature(parsedFootprint.commitments);
          window.localStorage.setItem(ACTIVE_FOOTPRINT_SIGNATURE_KEY, hydratedFootprintSignature);
          setAiFootprint(parsedFootprint);
          setCommitments(parsedFootprint.commitments);
          setPlanTasks(enrichPlanTasksWithRationales(withoutCompletedTasks(parsedFootprint.planTasks)));
          setBaseTimeline(parsedFootprint.timelineEvents);
          setAiResolvedTimeline(parsedFootprint.resolvedTimelineEvents);
          setConflictAnalysis(parsedFootprint.conflict);
          setSponsorTrace(mergeSponsorTraces(parsedFootprint.sponsorTrace, persistedTrace));
          setAiPlan({
            provider: parsedFootprint.provider,
            status: parsedFootprint.status,
            model: parsedFootprint.model,
            rationale: parsedFootprint.rationale,
            dailyPlan: {
              focus:
                parsedFootprint.planTasks.find((task) => task.section === "do_now")?.title ??
                parsedFootprint.planTasks[0]?.title ??
                "Today's focus",
            },
            trace: parsedFootprint.sponsorTrace,
          });
          aiPlanRequestStarted.current = true;
        }
      }

      if (!hydratedFootprintSignature) {
        window.localStorage.removeItem(ACTIVE_FOOTPRINT_SIGNATURE_KEY);
        if (!hasSubmittedSources) {
          setCommitments(baseCommitments);
          setPlanTasks(enrichPlanTasksWithRationales(withoutCompletedTasks(initialPlanTasks)));
          setBaseTimeline(timelineEvents);
          setAiResolvedTimeline(resolvedTimelineEvents);
          setConflictAnalysis(defaultConflictAnalysis);
        }
      }

      const savedCommitments = window.localStorage.getItem(SAVED_COMMITMENTS_KEY);
      if (savedCommitments) {
        const savedFootprintSignature = window.localStorage.getItem(SAVED_COMMITMENTS_FOOTPRINT_KEY);
        const savedCommitmentsMatchFootprint =
          !hydratedFootprintSignature || savedFootprintSignature === hydratedFootprintSignature;
        const parsedCommitments = JSON.parse(savedCommitments) as Commitment[];
        if (Array.isArray(parsedCommitments) && parsedCommitments.length > 0 && savedCommitmentsMatchFootprint) {
          setCommitments(parsedCommitments);
        } else if (hydratedFootprintSignature) {
          window.localStorage.removeItem(SAVED_COMMITMENTS_KEY);
          window.localStorage.removeItem(SAVED_COMMITMENTS_FOOTPRINT_KEY);
        }
      }

      const savedPlan = window.localStorage.getItem(SAVED_PLAN_TASKS_KEY);
      if (savedPlan) {
        const savedFootprintSignature = window.localStorage.getItem(SAVED_PLAN_FOOTPRINT_KEY);
        const savedPlanMatchesFootprint =
          !hydratedFootprintSignature || savedFootprintSignature === hydratedFootprintSignature;
        const parsedPlan = JSON.parse(savedPlan) as DemoPlanTask[];
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0 && savedPlanMatchesFootprint) {
          setPlanTasks(enrichPlanTasksWithRationales(withoutCompletedTasks(parsedPlan)));
        } else if (hydratedFootprintSignature) {
          window.localStorage.removeItem(SAVED_PLAN_TASKS_KEY);
          window.localStorage.removeItem(SAVED_PLAN_FOOTPRINT_KEY);
        }
      }

      const savedClarifications = window.localStorage.getItem("studentos_clarification_answers");
      if (savedClarifications) {
        const parsedClarifications = JSON.parse(savedClarifications) as ClarificationAnswerRecord[];
        if (Array.isArray(parsedClarifications)) {
          setClarificationAnswerRecords(parsedClarifications);
        }
      }

      if (window.localStorage.getItem("studentos_extra_source_added")) {
        setAddedTaskApplied(true);
      }

      window.localStorage.setItem("studentos_roadmap_added", "true");
      setRoadmapAdded(true);

      const savedFlowState = window.localStorage.getItem(SAVED_FLOW_STATE_KEY);
      if (savedFlowState) {
        const parsedFlowState = JSON.parse(savedFlowState) as {
          step?: CommitmentsStep;
          conflictResolved?: boolean;
          resolutionMode?: ResolutionMode;
          roadmapAdded?: boolean;
          addedTaskApplied?: boolean;
          chemistryAdded?: boolean;
        };

        if (
          parsedFlowState.step === "commitments" ||
          parsedFlowState.step === "conflict" ||
          parsedFlowState.step === "plan"
        ) {
          setStep(parsedFlowState.step);
        }
        if (typeof parsedFlowState.conflictResolved === "boolean") {
          setConflictResolved(parsedFlowState.conflictResolved);
        }
        if (
          parsedFlowState.resolutionMode === "recommended" ||
          parsedFlowState.resolutionMode === "manual" ||
          parsedFlowState.resolutionMode === null
        ) {
          setResolutionMode(parsedFlowState.resolutionMode);
        }
        if (typeof parsedFlowState.roadmapAdded === "boolean") {
          setRoadmapAdded(parsedFlowState.roadmapAdded);
        }
        if (typeof parsedFlowState.addedTaskApplied === "boolean") {
          setAddedTaskApplied(parsedFlowState.addedTaskApplied);
        } else if (typeof parsedFlowState.chemistryAdded === "boolean") {
          setAddedTaskApplied(parsedFlowState.chemistryAdded);
        }
      }

      if (window.localStorage.getItem("studentos_resume_step") === "plan") {
        setStep("plan");
        setConflictResolved(true);
        setResolutionMode("recommended");
        persistFlowState({
          step: "plan",
          conflictResolved: true,
          resolutionMode: "recommended",
        });
      }
    } catch {
      setCommitments([]);
      setPlanTasks([]);
      setBaseTimeline([]);
      setAiResolvedTimeline([]);
      setConflictAnalysis(undefined);
    } finally {
      setPlanHydrated(true);
    }
  }, []);

  const addSponsorTrace = useCallback((item: SponsorTraceItem) => {
    const existing = window.localStorage.getItem("studentos_sponsor_trace");
    let trace: SponsorTraceItem[] = [];

    if (existing) {
      try {
        trace = JSON.parse(existing) as SponsorTraceItem[];
      } catch {
        trace = [];
      }
    }

    const nextTrace = mergeSponsorTraces([item], trace);

    window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify(nextTrace));
    setSponsorTrace(nextTrace);
  }, []);

  function persistReplannedFootprint(result: ReplanAgentResponse) {
    const keys = ["studentos_ai_footprint", "studentos_commitment_footprint"];

    keys.forEach((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as StudentOSAgentFootprint;
        window.localStorage.setItem(
          key,
          JSON.stringify({
            ...parsed,
            commitments: result.commitments,
            planTasks: result.planTasks,
            timelineEvents: result.timelineEvents,
            resolvedTimelineEvents: result.resolvedTimelineEvents,
            conflict: result.conflict,
            rationale: result.rationale,
            sponsorTrace: result.trace?.length ? result.trace : parsed.sponsorTrace,
          }),
        );
      } catch {
        // Keep existing stored footprint if it cannot be parsed.
      }
    });
  }

  function applyReplanResult(result: ReplanAgentResponse) {
    const nextTasks = enrichPlanTasksWithRationales(withoutCompletedTasks(result.planTasks));

    setCommitments(result.commitments);
    persistCommitments(result.commitments);
    setPlanTasks(nextTasks);
    persistPlanTasks(nextTasks);
    setBaseTimeline(result.timelineEvents);
    setAiResolvedTimeline(result.resolvedTimelineEvents);
    setConflictAnalysis(result.conflict);
    setAiPlan({
      provider: result.provider,
      status: result.status,
      model: result.model,
      rationale: result.rationale,
      dailyPlan: result.dailyPlan,
      trace: result.trace,
    });
    aiPlanRequestStarted.current = true;
    result.trace?.forEach(addSponsorTrace);
    persistReplannedFootprint(result);
  }

  async function runAgentReplan({
    trigger,
    nextCommitments = commitments,
    nextPlanTasks = planTasks,
    nextClarificationAnswers = clarificationAnswerRecords,
    manualInstruction,
    nextConflictResolved = conflictResolved,
    nextResolutionMode = resolutionMode,
    beforeCommitments = commitments,
    beforePlanTasks = planTasks,
    runId,
    sourceContext,
    preservePlanTaskIds = [],
    focusPlanTaskId,
  }: {
    trigger: ReplanTrigger;
    nextCommitments?: Commitment[];
    nextPlanTasks?: DemoPlanTask[];
    nextClarificationAnswers?: ClarificationAnswerRecord[];
    manualInstruction?: string;
    nextConflictResolved?: boolean;
    nextResolutionMode?: ResolutionMode;
    beforeCommitments?: Commitment[];
    beforePlanTasks?: DemoPlanTask[];
    runId?: string;
    sourceContext?: Record<string, unknown>;
    preservePlanTaskIds?: string[];
    focusPlanTaskId?: string;
  }) {
    const activeRunId = runId ?? beginAgentRun(trigger).runId;

    setReplanLoading(true);
    setAiPlanLoading(true);

    try {
      const response = await fetch("/api/sponsor/ai/replan?stream=1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          trigger,
          currentDate: todayDateId(),
          commitments: nextCommitments,
          planTasks: nextPlanTasks,
          timelineEvents: baseTimeline,
          resolvedTimelineEvents: nextConflictResolved
            ? (aiResolvedTimeline.length ? aiResolvedTimeline : visibleTimelineEvents)
            : aiResolvedTimeline,
          conflict: conflictAnalysis,
          clarificationAnswers: nextClarificationAnswers,
          manualConflictInstruction: manualInstruction,
          sourceContext: {
            conflictResolution: nextResolutionMode ?? "none",
            addedSource: addedSourceText ?? undefined,
            addedSourceKey,
            addedCommitment: addedInterpretation?.commitment,
            ...sourceContext,
          },
        }),
      });

      if (!response.ok) {
        let message = "Replanning route returned an error.";

        try {
          const payload = (await response.json()) as { detail?: string; error?: string };
          message = payload.detail ?? payload.error ?? message;
        } catch {
          // Keep the route-level message when the error body is not JSON.
        }

        throw new Error(message);
      }

      if (!response.body) throw new Error("Replanning stream was not available.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: ReplanAgentResponse | null = null;
      let streamError = "";

      const handleStreamEvent = (event: AgentActivityStreamEvent) => {
        if (event.type === "event") {
          updateAgentRun(activeRunId, (run) => appendAgentRunEvent(run, event.event));
          return;
        }

        if (event.type === "trace") {
          addSponsorTrace(event.trace);
          updateAgentRun(activeRunId, (run) => appendAgentRunTrace(run, event.trace));
          return;
        }

        if (event.type === "result") {
          finalResult = event.result as ReplanAgentResponse;
          return;
        }

        streamError = event.error;
      };

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        handleStreamEvent(JSON.parse(trimmed) as AgentActivityStreamEvent);
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(processLine);
      }

      buffer += decoder.decode();
      processLine(buffer);

      if (!finalResult) {
        throw new Error(streamError || "Replanning stream ended before the final result.");
      }

      const result = finalResult as ReplanAgentResponse;
      const effectiveResult: ReplanAgentResponse = {
        ...result,
        planTasks: insertMissingPreservedPlanTasks(
          result.planTasks,
          nextPlanTasks,
          preservePlanTaskIds,
        ),
      };
      const afterTasks = enrichPlanTasksWithRationales(withoutCompletedTasks(effectiveResult.planTasks));
      const changedCommitments = diffCommitments(beforeCommitments, effectiveResult.commitments);
      const changedPlanTasks = diffPlanTasks(beforePlanTasks, afterTasks);
      const runStatus: AgentRunStatus =
        effectiveResult.status === "success"
          ? "success"
          : effectiveResult.status === "error"
            ? "error"
            : "fallback";
      const fallbackReason = effectiveResult.trace?.find((item) => item.status === "fallback")?.detail;

      applyReplanResult(effectiveResult);
      if (focusPlanTaskId) {
        setHighlightedTaskId(focusPlanTaskId);
      }
      if (trigger === "manual_conflict") {
        const stillHasConflict = validateTimelineConflicts(effectiveResult.resolvedTimelineEvents).groups.length > 0;
        setConflictResolved(!stillHasConflict);
        setResolutionMode("manual");
        persistFlowState({
          conflictResolved: !stillHasConflict,
          resolutionMode: "manual",
        });
      }
      updateAgentRun(activeRunId, (run) =>
        completeAgentRun(run, {
          status: runStatus,
          currentStep:
            runStatus === "success"
              ? "Plan updated"
              : runStatus === "fallback"
                ? "Fallback applied"
                : "Replanning error",
          changedCommitments,
          changedPlanTasks,
          fallbackReason,
        }),
      );
      showToast(
        trigger === "manual_conflict"
          ? "Schedule rebuilt from instruction"
          : trigger === "add_task"
            ? "Plan updated with added task"
            : "Schedule updated from clarification",
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Replanning failed.";

      addSponsorTrace({
        provider: "StudentOS",
        action:
          trigger === "manual_conflict"
            ? "Agent replanned manual conflict"
            : trigger === "add_task"
              ? "Agent replanned added task"
              : "Agent replanned after clarification",
        status: "error",
        detail,
      });
      updateAgentRun(activeRunId, (run) =>
        completeAgentRun(
          appendAgentRunEvent(
            run,
            createAgentEvent({
              id: `${activeRunId}-client-error`,
              kind: "error",
              title: "Replanning failed",
              body: detail,
              provider: "StudentOS",
              status: "error",
            }),
            "Replanning failed",
          ),
          {
            status: "error",
            currentStep: "Replanning failed",
            error: detail,
          },
        ),
      );
      showToast("Replanning failed; kept current plan");
    } finally {
      setReplanLoading(false);
      setAiPlanLoading(false);
    }
  }

  useEffect(() => {
    if (!planHydrated) return;
    persistPlanTasks(planTasks);
  }, [planHydrated, planTasks]);

  useEffect(() => {
    if (!planHydrated) return;
    persistCommitments(commitments);
  }, [commitments, planHydrated]);

  useEffect(() => {
    if (!planHydrated) return;
    window.localStorage.setItem(
      "studentos_clarification_answers",
      JSON.stringify(clarificationAnswerRecords),
    );
  }, [clarificationAnswerRecords, planHydrated]);

  useEffect(() => {
    if (planHydrated && step === "conflict" && !hasConfirmedConflict) {
      setConflictResolved(true);
      setResolutionMode("recommended");
      setStep("plan");
      persistFlowState({
        step: "plan",
        conflictResolved: true,
        resolutionMode: "recommended",
      });
    }
  }, [hasConfirmedConflict, planHydrated, step]);

  useEffect(() => {
    if (
      !planHydrated ||
      !hasExtractedItems ||
      step !== "plan" ||
      aiPlan ||
      aiPlanRequestStarted.current ||
      replanLoading
    ) return;

    aiPlanRequestStarted.current = true;

    const clarificationSignature = clarificationAnswerRecords
      .map((item) => `${item.commitmentId}:${item.question}:${item.answer}`)
      .join("|");
    const cacheKey = `studentos_vercel_plan_day_${resolutionMode ?? "base"}_${addedInterpretation?.commitment.id ?? "standard"}_${cacheKeyForText(clarificationSignature)}`;
    const cached = window.localStorage.getItem(cacheKey);

    if (cached) {
      try {
        setAiPlan(JSON.parse(cached) as PlanDayResponse);
        setAiPlanLoading(false);
        return;
      } catch {
        window.localStorage.removeItem(cacheKey);
      }
    }

    const controller = new AbortController();
    setAiPlanLoading(true);

    async function requestAiPlan() {
      try {
        const response = await fetch("/api/sponsor/ai/plan-day", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            currentDate: todayDateId(),
            commitments: commitments.map((item) => ({
              id: item.id,
              title: item.title,
              type: item.type,
              state: item.state,
              estimatedDuration: item.estimatedDuration,
              source: item.source,
              explanation: item.explanation,
            })),
            goals: goalItems.map((item) => ({
              id: item.id,
              title: item.title,
              estimatedDuration: item.estimatedDuration,
              state: item.state,
            })),
            fixedEvents: visibleTimelineEvents
              .filter((event) => event.chip === "Fixed" || event.chip === "Rescheduled")
              .map((event) => ({
                id: event.id,
                time: event.time,
                title: event.title,
                duration: event.duration,
                status: event.chip,
              })),
            clarificationAnswers: clarificationAnswerRecords,
            sourceContext: {
              narrative: "AWS extracted messy screenshots, PDFs, and text sources before this Vercel planning step.",
              conflictResolution: resolutionMode ?? "recommended",
              addedSource: addedSourceText ?? undefined,
              addedSourceKey,
              addedCommitment: addedInterpretation?.commitment,
              clarificationSummary:
                clarificationAnswerRecords.length > 0
                  ? clarificationAnswerRecords.map((item) => `${item.question}: ${item.answer}`)
                  : undefined,
            },
          }),
        });

        const result = (await response.json()) as PlanDayResponse;
        if (!response.ok) throw new Error("Planner route returned an error.");

        setAiPlan(result);
        window.localStorage.setItem(cacheKey, JSON.stringify(result));
        result.trace?.forEach(addSponsorTrace);
      } catch (error) {
        if (controller.signal.aborted) return;

          const fallback: PlanDayResponse = {
            provider: "fallback",
            status: "fallback",
            rationale: {
              summary: fallbackPlanSummary(commitments, planTasks),
              bullets: fallbackPlanBullets(commitments, planTasks),
            },
            dailyPlan: {
              focus: focusTask?.title ?? planTasks[0]?.title ?? "Review current plan",
            },
          trace: [
            {
              provider: "Vercel AI Gateway",
              action: "Vercel AI Gateway fallback planning",
              status: "fallback",
              detail: error instanceof Error ? error.message : "Planner request failed.",
            },
          ],
        };

        setAiPlan(fallback);
        fallback.trace?.forEach(addSponsorTrace);
      } finally {
        if (!controller.signal.aborted) setAiPlanLoading(false);
      }
    }

    void requestAiPlan();

    return () => controller.abort();
  }, [
    addSponsorTrace,
    addedSourceKey,
    addedSourceText,
    aiPlan,
    addedInterpretation,
    addedTaskApplied,
    clarificationAnswerRecords,
    commitments,
    focusTask?.title,
    goalItems,
    hasExtractedItems,
    planHydrated,
    planTasks,
    resolutionMode,
    replanLoading,
    step,
    visibleTimelineEvents,
  ]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function handleCompleteTask(task: DemoPlanTask) {
    const now = new Date();
    showToast(completionToastForTask(task, now));

    const updatedTasks = planTasks.filter((t) => t.id !== task.id);
    const firstDoNext = updatedTasks.find((t) => t.section === "do_next");
    if (firstDoNext) {
      const idx = updatedTasks.findIndex((t) => t.id === firstDoNext.id);
      if (idx !== -1) {
        updatedTasks[idx] = ensureTaskTimeRange({
          ...firstDoNext,
          section: "do_now",
          timeLabel: undefined,
        });
      }
    }
    const nextTasks = ensureTaskTimeRanges(updatedTasks);
    setPlanTasks(nextTasks);
    persistCompletedTask(task.id);
    persistPlanTasks(nextTasks);
  }

  function clarify(target: NonNullable<ClarifyingState>, answers: ClarificationAnswers = {}) {
    const matchingQuestions =
      aiFootprint?.clarificationQuestions.filter(
        (item) => item.commitmentId === target.commitmentId,
      ) ?? [];
    const fallbackQuestions = target.kind === "goal" ? goalQuestions : teamQuestions;
    const questionTexts = matchingQuestions.length
      ? matchingQuestions.map((item) => item.question)
      : fallbackQuestions.map((item) => item.question);
    const question = matchingQuestions[0];
    const currentCommitment = commitments.find((item) => item.id === target.commitmentId);
    const selectedAnswer = Object.values(answers).find((answer) => answer && answer !== "Skipped");
    const selectedOption = selectedAnswer
      ? question?.options.find((option) => option.label === selectedAnswer)
      : undefined;
    const resolved = question?.resolvedCommitment;
    const answeredAt = new Date().toISOString();
    const answeredRecords = Object.entries(answers)
      .map(([index, answer]) => {
        const cleanAnswer = answer.trim();
        if (!cleanAnswer || cleanAnswer === "Skipped") return null;

        const matchingQuestion = matchingQuestions[Number(index)];
        return {
          commitmentId: target.commitmentId,
          commitmentTitle: currentCommitment?.title ?? target.commitmentId,
          kind: target.kind,
          question: matchingQuestion?.question ?? questionTexts[Number(index)] ?? `Clarification ${Number(index) + 1}`,
          answer: cleanAnswer,
          answeredAt,
        } satisfies ClarificationAnswerRecord;
      })
      .filter((item): item is ClarificationAnswerRecord => Boolean(item));
    const clarificationSummary = answeredRecords.length
      ? answeredRecords.map((item) => `${item.question} ${item.answer}`).join("; ")
      : selectedAnswer ?? "confirmed";
    const existingRecordsForCommitment = clarificationAnswerRecords.filter(
      (item) => item.commitmentId === target.commitmentId,
    );
    const answersChanged =
      clarificationRecordsSignature(existingRecordsForCommitment) !==
        clarificationRecordsSignature(answeredRecords) &&
      clarificationAnswerValueSignature(existingRecordsForCommitment) !==
        clarificationAnswerValueSignature(answeredRecords);

    if (
      answeredRecords.length > 0 &&
      !answersChanged &&
      currentCommitment &&
      currentCommitment.state !== "needs_clarification" &&
      currentCommitment.state !== "unsure"
    ) {
      setClarifying(null);
      showToast("Answer unchanged");
      return;
    }

    let resolvedCommitmentForPlan: Commitment | undefined;

    if (currentCommitment && resolved) {
      const resolvedState =
        resolved.state === "needs_clarification" || resolved.state === "unsure"
          ? "resolved"
          : resolved.state ?? "confirmed";

      resolvedCommitmentForPlan = {
        ...currentCommitment,
        title: resolved.title ?? currentCommitment.title,
        state: resolvedState,
        confidence: resolved.confidence ?? currentCommitment.confidence,
        estimatedDuration: resolved.estimatedDuration ?? currentCommitment.estimatedDuration,
        explanation:
          resolved.explanation ??
          `Clarified from answer: ${selectedOption?.label ?? selectedAnswer ?? "confirmed"}.`,
      };
    } else if (currentCommitment && target.kind === "goal" && currentCommitment.id === "coding") {
      resolvedCommitmentForPlan = {
        ...currentCommitment,
        state: "confirmed",
        confidence: 92,
        estimatedDuration: "2 sessions/week",
        explanation: "Roadmap ready: 6 steps scheduled across Jun-Dec.",
      };
    } else if (currentCommitment && target.kind === "team" && currentCommitment.id === "team") {
      resolvedCommitmentForPlan = {
        ...currentCommitment,
        state: "confirmed",
        confidence: 88,
        estimatedDuration: "3min",
        title: "Ask teammate first",
        explanation: "Converted tentative voice note into a 3 min action.",
      };
    } else if (currentCommitment) {
      resolvedCommitmentForPlan = {
        ...currentCommitment,
        state: "confirmed",
        confidence: Math.max(currentCommitment.confidence, 82),
        explanation: `Clarified from answer: ${selectedAnswer ?? "confirmed"}.`,
      };
    }

    const nextCommitments = commitments.map((item) =>
      item.id === target.commitmentId && resolvedCommitmentForPlan
        ? resolvedCommitmentForPlan
        : item,
    );
    const nextClarificationRecords = answeredRecords.length > 0
      ? [
          ...clarificationAnswerRecords.filter((item) => item.commitmentId !== target.commitmentId),
          ...answeredRecords,
        ]
      : clarificationAnswerRecords;
    const nextPlanTasks = resolvedCommitmentForPlan
      ? upsertClarifiedCommitmentTask(planTasks, resolvedCommitmentForPlan, clarificationSummary)
      : planTasks;

    setCommitments(nextCommitments);
    persistCommitments(nextCommitments);
    if (answeredRecords.length > 0) {
      setClarificationAnswerRecords(nextClarificationRecords);
    }
    if (resolvedCommitmentForPlan) {
      setPlanTasks(nextPlanTasks);
      persistPlanTasks(nextPlanTasks);
    }
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
    clearAiPlanCaches();
    setClarifying(null);
    void runAgentReplan({
      trigger: "clarification",
      nextCommitments,
      nextPlanTasks,
      nextClarificationAnswers: nextClarificationRecords,
      beforeCommitments: commitments,
      beforePlanTasks: planTasks,
    });
  }

  function openCommitmentItem(commitment: Commitment) {
    const aiQuestion = aiFootprint?.clarificationQuestions.find(
      (question) => question.commitmentId === commitment.id,
    );
    const hasSavedClarification = clarificationAnswerRecords.some(
      (record) => record.commitmentId === commitment.id,
    );

    if (aiQuestion || hasSavedClarification) {
      setClarifying({
        kind: aiQuestion?.kind ?? (commitment.type === "goal" ? "goal" : "team"),
        commitmentId: commitment.id,
      });
      return;
    }

    if (commitment.state === "needs_clarification" || commitment.state === "unsure") {
      setClarifying({
        kind: commitment.type === "goal" ? "goal" : "team",
        commitmentId: commitment.id,
      });
      return;
    }

    openEditor(commitment);
  }

  function applySuggestedConflict(continueToPlan = false) {
    if (!conflictResolved) {
      setConflictResolved(true);
      setResolutionMode("recommended");
      persistFlowState({ conflictResolved: true, resolutionMode: "recommended" });
      showToast("Suggested deconflict applied");
    }

    if (continueToPlan) {
      setStep("plan");
      persistFlowState({ step: "plan" });
    }
  }

  function applyManualInstruction() {
    const instruction = manualConflictInstruction.trim();
    if (!instruction) {
      showToast("Add a manual instruction first");
      return;
    }

    const nextPlanTasks = applyManualInstructionToPlanTasks(planTasks, instruction);
    const focusPlanTaskId = firstFlexiblePlanTaskId(nextPlanTasks);

    setPlanTasks(nextPlanTasks);
    persistPlanTasks(nextPlanTasks);
    setResolutionMode("manual");
    setManualConflictOpen(false);
    persistFlowState({ resolutionMode: "manual" });
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
    showToast("Manual instruction sent to agent");
    void runAgentReplan({
      trigger: "manual_conflict",
      nextPlanTasks,
      manualInstruction: instruction,
      nextConflictResolved: true,
      nextResolutionMode: "manual",
      beforeCommitments: commitments,
      beforePlanTasks: planTasks,
      preservePlanTaskIds: focusPlanTaskId ? [focusPlanTaskId] : [],
      focusPlanTaskId,
    });
  }

  function applyAndContinue() {
    if (!conflictResolved && resolutionMode !== "manual") {
      applySuggestedConflict(true);
      return;
    }
    setStep("plan");
    persistFlowState({ step: "plan" });
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

    const text = sourceDraft.trim();
    if (!text) {
      showToast("Add a task first");
      return;
    }

    const interpretation = interpretAddedSource(text);
    const { commitment, task, clarificationQuestion } = interpretation;
    const beforeCommitments = commitments;
    const beforePlanTasks = planTasks;
    const nextCommitments = commitmentsWithAddedCommitment(commitments, commitment);
    const nextPlanTasks = planTasksWithAddedTask(planTasks, commitment, task);
    const run = beginAgentRun("add_task");
    let nextSourceKey: string | null = null;

    setSourceProcessing(true);
    setSourceDraft(text);
    setAddedSourceText(text);
    setAddedInterpretation(interpretation);
    setCommitments(nextCommitments);
    persistCommitments(nextCommitments);
    setPlanTasks(nextPlanTasks);
    persistPlanTasks(nextPlanTasks);

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

      result.trace?.forEach((trace) => {
        addSponsorTrace(trace);
        updateAgentRun(run.runId, (currentRun) => appendAgentRunTrace(currentRun, trace));
      });
      if ((!result.trace || result.trace.length === 0) && result.warning) {
        const fallbackTrace: SponsorTraceItem = {
          provider: "AWS",
          action: "Stored added source",
          status: "fallback",
          detail: result.warning,
        };

        addSponsorTrace(fallbackTrace);
        updateAgentRun(run.runId, (currentRun) => appendAgentRunTrace(currentRun, fallbackTrace));
      }
      nextSourceKey = result.source?.s3Key ?? null;
      setAddedSourceKey(nextSourceKey);
    } catch (error) {
      const fallbackTrace: SponsorTraceItem = {
        provider: "AWS",
        action: "Stored added source",
        status: "fallback",
        detail: error instanceof Error ? error.message : "Added source storage failed.",
      };

      addSponsorTrace(fallbackTrace);
      updateAgentRun(run.runId, (currentRun) => appendAgentRunTrace(currentRun, fallbackTrace));
      setAddedSourceKey(null);
    } finally {
      setSourceProcessing(false);
      setAddSourceOpen(false);
      if (commitment.state !== "needs_clarification") {
        setHighlightedTaskId(null);
        window.setTimeout(() => setHighlightedTaskId(task.id), 0);
      }
    }

    if (clarificationQuestion) {
      setAiFootprint((current) => {
        const nextQuestion = {
          ...clarificationQuestion,
          options: clarificationQuestion.options ?? [],
        };

        if (!current) {
          return {
            createdAt: new Date().toISOString(),
            currentDate: todayDateId(),
            provider: "fallback",
            status: "fallback",
            sourceSummary: {
              totalSources: 1,
              realSources: 1,
              ocrReadySources: 0,
            },
            sources: [],
            commitments: [commitment],
            clarificationQuestions: [nextQuestion],
            timelineEvents,
            resolvedTimelineEvents,
            conflict: defaultConflictAnalysis,
            planTasks: initialPlanTasks,
            roadmapSteps: [],
            rationale: {
              summary: "Additional item needs clarification before scheduling.",
              bullets: ["The added text did not include enough scheduling detail."],
            },
            agentLogs: [],
            sponsorTrace: [],
          };
        }

        return {
          ...current,
          clarificationQuestions: [
            ...current.clarificationQuestions.filter(
              (item) => item.commitmentId !== commitment.id,
            ),
            nextQuestion,
          ],
        };
      });
    }

    setAddedTaskApplied(true);
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
    clearAiPlanCaches();
    window.localStorage.setItem("studentos_extra_source_added", commitment.id);
    persistFlowState({ addedTaskApplied: true });

    void runAgentReplan({
      trigger: "add_task",
      nextCommitments,
      nextPlanTasks,
      runId: run.runId,
      beforeCommitments,
      beforePlanTasks,
      preservePlanTaskIds: commitment.state === "needs_clarification" ? [] : [task.id],
      focusPlanTaskId: commitment.state === "needs_clarification" ? undefined : task.id,
      sourceContext: {
        addedSource: text,
        addedSourceKey: nextSourceKey ?? undefined,
        addedCommitment: commitment,
        addedPlanTask: task,
      },
    }).then(() => {
      if (commitment.state === "needs_clarification") {
        setClarifying({ kind: "general", commitmentId: commitment.id });
      }
    });
  }

  function updatePlanWithAddedTask() {
    if (!addedInterpretation) {
      setImpactOpen(false);
      return;
    }

    if (addedTaskApplied) {
      setImpactOpen(false);
      showToast("Already in plan");
      return;
    }

    const { commitment, task, clarificationQuestion } = addedInterpretation;

    setCommitments((current) => {
      if (current.some((item) => item.id === commitment.id)) return current;

      const updated = [...current, commitment];
      persistCommitments(updated);
      return updated;
    });

    if (clarificationQuestion) {
      setAiFootprint((current) => {
        const nextQuestion = {
          ...clarificationQuestion,
          options: clarificationQuestion.options ?? [],
        };

        if (!current) {
          return {
            createdAt: new Date().toISOString(),
            currentDate: todayDateId(),
            provider: "fallback",
            status: "fallback",
            sourceSummary: {
              totalSources: 1,
              realSources: 1,
              ocrReadySources: 0,
            },
            sources: [],
            commitments: [commitment],
            clarificationQuestions: [nextQuestion],
            timelineEvents,
            resolvedTimelineEvents,
            conflict: defaultConflictAnalysis,
            planTasks: initialPlanTasks,
            roadmapSteps: [],
            rationale: {
              summary: "Additional item needs clarification before scheduling.",
              bullets: ["The added text did not include enough scheduling detail."],
            },
            agentLogs: [],
            sponsorTrace: [],
          };
        }

        return {
          ...current,
          clarificationQuestions: [
            ...current.clarificationQuestions.filter(
              (item) => item.commitmentId !== commitment.id,
            ),
            nextQuestion,
          ],
        };
      });
    }

    setPlanTasks((current) => {
      const updated = planTasksWithAddedTask(current, commitment, task);
      persistPlanTasks(updated);
      return updated;
    });
    if (commitment.state !== "needs_clarification") {
      setHighlightedTaskId(task.id);
    }
    setAddedTaskApplied(true);
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
    clearAiPlanCaches();
    window.localStorage.setItem("studentos_extra_source_added", commitment.id);
    persistFlowState({ addedTaskApplied: true });
    setImpactOpen(false);
    if (commitment.state === "needs_clarification") {
      setClarifying({ kind: "general", commitmentId: commitment.id });
      showToast("Clarification needed");
      return;
    }
    showToast("Plan updated");
  }

  function updateSelectedTaskDate(dateId: string) {
    if (!selectedTask) return;
    if (!canUseScheduleDate(selectedTask, dateId)) {
      showToast("Choose a date after today and before the deadline");
      return;
    }

    const dateLabel = formatScheduleDateLabel(dateId);

    setPlanTasks((current) => {
      const updated = current.map((task) =>
        task.id === selectedTask.id
          ? {
              ...task,
              scheduledDateId: dateId,
              scheduledDate: dateLabel,
              scheduledDateRange: undefined,
              scheduleRationale: `StudentOS moved ${baseTaskTitle(task.title)} to ${scheduleLabelForTask({
                ...task,
                scheduledDateId: dateId,
                scheduledDate: dateLabel,
                scheduledDateRange: undefined,
              })} because the student selected that date and it remains after today and before the task deadline.`,
              updated: true
            }
          : task
      );
      persistPlanTasks(updated);
      return updated;
    });
    showToast("Schedule updated");
  }

  function moveSelectedTaskDate(direction: -1 | 1) {
    if (!selectedTask) return;
    if (!selectedTask.scheduledDateId) return;
    const nextDateId = addDaysToDateId(selectedTask.scheduledDateId, direction);
    if (!canUseScheduleDate(selectedTask, nextDateId)) {
      return;
    }
    updateSelectedTaskDate(nextDateId);
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
    const nextDateId =
      selectedTask.section === "subsequent_days" ? nextDayForTask(selectedTask) : undefined;
    const nextDateIsValid = nextDateId ? canUseScheduleDate(selectedTask, nextDateId) : false;
    const nextDateLabel = nextDateId && nextDateIsValid ? formatScheduleDateLabel(nextDateId) : undefined;
    const sessionOne: DemoPlanTask = {
      ...selectedTask,
      id: `${selectedTask.id}-session-1`,
      title: `${baseTitle} — Session 1`,
      estimatedMinutes: firstDuration,
      scheduleRationale: `StudentOS keeps the first half on ${scheduleLabelForTask(selectedTask)} so progress starts in the original slot without overloading one session.`,
      updated: true
    };
    const sessionTwo: DemoPlanTask = {
      ...selectedTask,
      id: `${selectedTask.id}-session-2`,
      title: `${baseTitle} — Session 2`,
      estimatedMinutes: secondDuration,
      scheduledDateId: nextDateIsValid ? nextDateId : selectedTask.scheduledDateId,
      scheduledDate: nextDateLabel ?? selectedTask.scheduledDate,
      scheduledDateRange: undefined,
      timeLabel:
        selectedTask.section === "subsequent_days"
          ? selectedTask.timeLabel
          : selectedTask.timeLabel
            ? "Next session"
            : undefined,
      scheduleRationale: `StudentOS places the second half on ${nextDateLabel ?? scheduleLabelForTask(selectedTask)} so the task gets recovery space instead of becoming one long low-quality block.`,
      updated: true
    };

    setPlanTasks((current) => {
      const updated = current.flatMap((task) =>
        task.id === selectedTask.id ? [sessionOne, sessionTwo] : [task],
      );
      persistPlanTasks(updated);
      return updated;
    });
    setSelectedTaskForEdit(null);
    showToast("Task split into 2 sessions");
  }

  function viewRoadmap() {
    window.localStorage.setItem("studentos_roadmap_added", "true");
    window.localStorage.setItem("studentos_resume_step", "plan");
    persistPlanTasks(planTasks);
    persistFlowState({ step: "plan", roadmapAdded: true });
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

  function openSourcePreview(commitment: Commitment, options?: { closeEditor?: boolean }) {
    const preview =
      resolveCommitmentSourcePreview(commitment, aiFootprint) ?? {
        title: commitment.source,
        source: "Captured source",
        fileSize: "Source",
        fileType: "text" as const,
        snippet: commitment.explanation,
      };

    if (options?.closeEditor) {
      setEditing(null);
    }

    setSourcePreview(preview);
  }

  function saveEdit() {
    if (!editing) return;
    const previousCommitment = editing;
    const nextCommitment: Commitment = {
      ...editing,
      title: editDraft.title.trim() || editing.title,
      type: editDraft.type,
      estimatedDuration: editDraft.estimatedDuration.trim() || editing.estimatedDuration,
      explanation: `${editing.explanation} Edited by user.`,
    };
    const nextCommitments = commitments.map((item) =>
      item.id === editing.id ? nextCommitment : item,
    );
    const nextPlanTasks = enrichPlanTasksWithRationales(
      planTasksWithEditedCommitment(planTasks, previousCommitment, nextCommitment),
    );

    setCommitments(nextCommitments);
    persistCommitments(nextCommitments);
    setPlanTasks(nextPlanTasks);
    persistPlanTasks(nextPlanTasks);
    setSelectedTaskForEdit((current) => {
      if (!current) return current;
      return nextPlanTasks.find((task) => task.id === current.id) ?? current;
    });
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
    clearAiPlanCaches();
    setEditing(null);
    showToast("Item updated");
  }

  function deleteEditing() {
    if (!editing) return;
    const removedCommitment = editing;
    const nextCommitments = commitments.filter((item) => item.id !== removedCommitment.id);
    const nextPlanTasks = planTasksWithoutCommitment(planTasks, removedCommitment);

    setCommitments(nextCommitments);
    persistCommitments(nextCommitments);
    setPlanTasks(nextPlanTasks);
    persistPlanTasks(nextPlanTasks);
    setSelectedTaskForEdit((current) =>
      current && nextPlanTasks.some((task) => task.id === current.id) ? current : null,
    );
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
    clearAiPlanCaches();
    setEditing(null);
    showToast("Item deleted");
  }

  const editHasUnsavedChanges = Boolean(
    editing &&
      (editDraft.title !== editing.title ||
        editDraft.type !== editing.type ||
        editDraft.estimatedDuration !== editing.estimatedDuration),
  );
  const addSourceHasUnsavedChanges = addSourceOpen && sourceDraft.trim().length > 0;

  return (
    <AppShell
      onReset={reset}
      stepLabel={labels[step]}
      progress={progressMap[step]}
      hideHeader={false}
      sidePanel={<SponsorProofStrip trace={sponsorTrace} />}
    >
      <div className="safe-bottom-padding px-5 pt-2">
        <>
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
              <div className="lg:hidden">
                <SponsorProofStrip trace={sponsorTrace} />
              </div>
              <div className="space-y-6 pb-8">
                <section className="space-y-3">
                  <div className="px-1">
                    <h2 className="text-[18px] font-semibold text-ink">Commitments</h2>
                    <p className="mt-1 text-[13px] leading-5 text-muted">
                      Tasks, fixed events, and deadlines StudentOS must schedule around.
                    </p>
                  </div>
                  {planHydrated && !hasExtractedItems ? (
                    <div className="rounded-[18px] border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
                      No source-backed commitments were found for this run. Go back to Inbox Capture and add a readable source before building the day.
                    </div>
                  ) : null}
                  {!planHydrated ? (
                    <div className="rounded-[18px] border border-neutral-100 bg-white p-4 text-sm font-semibold text-muted shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                      Loading extracted items...
                    </div>
                  ) : null}
                  {commitmentItems.map((commitment) => (
                    <CommitmentCard
                      key={commitment.id}
                      commitment={commitment}
                      onClick={() => openCommitmentItem(commitment)}
                      onSourceClick={() => openSourcePreview(commitment)}
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
                      onClick={() => openCommitmentItem(commitment)}
                      onSourceClick={() => openSourcePreview(commitment)}
                    />
                  ))}
                </section>
              </div>

              {/* Fixed Bottom Action Button */}
              <div className="fixed-bottom-action">
                <button
                  disabled={!planHydrated || !hasExtractedItems || unresolvedCount > 0 || replanLoading}
                  onClick={() => {
                    const nextStep = hasConfirmedConflict ? "conflict" : "plan";
                    setStep(nextStep);
                    persistFlowState({ step: nextStep });
                  }}
                  className={`flex h-[60px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
                    planHydrated && hasExtractedItems && unresolvedCount === 0 && !replanLoading
                      ? "bg-ink text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <span>
                    {!planHydrated
                      ? "Loading extracted items"
                      : !hasExtractedItems
                        ? "Add a source-backed item to continue"
                        : unresolvedCount > 0
                          ? `Clarify ${unresolvedCount} items to continue`
                          : hasConfirmedConflict
                            ? "Continue to conflicts"
                            : "Continue to plan"}
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
                      : conflictAnalysis?.resolvedSummary ?? "StudentOS updated the day without moving fixed commitments."
                    : conflictAnalysis?.unresolvedSummary ?? "StudentOS found a fixed-time overlap and a cleaner schedule."
                }
              />
              <div className="lg:hidden">
                <SponsorProofStrip trace={sponsorTrace} />
              </div>
              <ConflictSummaryCard
                resolved={conflictResolved}
                resolutionMode={resolutionMode}
                conflict={conflictAnalysis}
              />
              
              <MobileTimeline
                events={visibleTimelineEvents}
                resolved={conflictResolved}
                onEventClick={setSelectedEvent}
              />
              
              <RecommendationCard
                resolved={conflictResolved}
                resolutionMode={resolutionMode}
                onEdit={() => setManualConflictOpen(true)}
                conflict={conflictAnalysis}
              />

              <div className="fixed-bottom-action">
                <button
                  disabled={replanLoading}
                  onClick={applyAndContinue}
                  className="flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-white"
                >
                  <span>Apply fix and continue</span>
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
              <SecondaryButton onClick={() => setReasoningOpen(true)} className="h-[48px] w-full justify-between rounded-[18px] px-4">
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="size-4" />
                  Why this plan?
                </span>
                <ChevronRight className="size-4 text-neutral-400" />
              </SecondaryButton>
              <FocusActionCard
                conflictResolved={hasConfirmedConflict && conflictResolved}
                onExplain={() => setReasoningOpen(true)}
                onComplete={handleCompleteTask}
                task={focusTask}
              />
              <GoalRoadmapCard
                onView={viewRoadmap}
                roadmapAdded={roadmapAdded}
                goalTitle={roadmapGoal?.title}
                summaryLines={roadmapSummaryLines}
                hasDeepResearch={Boolean(aiFootprint?.goalResearch)}
              />
              <div className="space-y-6">
                {displayedPlanSections.map((section) => (
                  <PlanSection
                    key={section.title}
                    title={section.title}
                    items={section.items}
                    highlightedTaskId={highlightedTaskId}
                    onTaskClick={setSelectedTaskForEdit}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </>
      </div>

      <AgentActivityPanel runs={agentRuns} mobileRaised={step === "plan"} />
      {step !== "plan" ? <AddSourceButton onClick={openAddSource} raised={false} /> : null}

      {step === "plan" ? (
        <BottomActionBar
          onExport={() => setExportOpen(true)}
          onAddTask={openAddSource}
        />
      ) : null}

      <ClarificationBottomSheet
        open={clarifying !== null}
        kind={clarifying?.kind === "goal" ? "goal" : "team"}
        onClose={() => setClarifying(null)}
        onSubmit={(answers) => clarifying && clarify(clarifying, answers)}
        questionsOverride={activeClarificationQuestionsForSheet}
        titleOverride={activeClarification?.title}
        subtitleOverride={activeClarification?.subtitle}
        initialAnswers={activeClarificationInitialAnswers}
      />

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        confirmClose={editHasUnsavedChanges}
        onSaveBeforeClose={saveEdit}
        onDiscardBeforeClose={() => setEditing(null)}
        closeConfirmationTitle="Save item changes?"
        closeConfirmationSubtitle="You edited the extracted commitment details."
        closeConfirmationSaveLabel="Save changes"
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
            <div className="rounded-[18px] border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                Summary
              </p>
              <p className="mt-2 text-[14px] font-semibold leading-6 text-neutral-700">
                {editing.explanation}
              </p>
            </div>
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
              onClick={() => openSourcePreview(editing, { closeEditor: true })}
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
              {selectedEventRationale}
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
        subtitle={aiPlanLoading ? "Generating a planning rationale through Vercel AI Gateway..." : aiPlanSummary}
      >
        <div className="space-y-4">
          {aiPlanBullets.length > 0 ? (
            <div className="space-y-2">
              {aiPlanBullets.map((bullet) => (
                <div key={bullet} className="flex gap-3 rounded-[18px] bg-neutral-50 px-3 py-2 text-[13px] font-semibold leading-5 text-neutral-700">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {["Urgency", "Fixed events", "Energy", "Deadline", ...(addedTaskApplied ? ["Updated"] : []), "Goal roadmap"].map((chip) => (
              <SourceChip key={chip}>{chip}</SourceChip>
            ))}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={addSourceOpen}
        onClose={() => setAddSourceOpen(false)}
        confirmClose={addSourceHasUnsavedChanges}
        onSaveBeforeClose={submitAdditionalSource}
        onDiscardBeforeClose={() => {
          setSourceDraft("");
          setAddSourceOpen(false);
        }}
        closeConfirmationTitle="Save this task?"
        closeConfirmationSubtitle="StudentOS has not added this task to your plan yet."
        closeConfirmationSaveLabel={sourceProcessing ? "Saving..." : "Add task"}
        closeConfirmationSaveDisabled={sourceProcessing || !sourceDraft.trim()}
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
              : "StudentOS will use the text you enter here as the source of truth."}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={impactOpen}
        onClose={() => setImpactOpen(false)}
        title={addedTaskApplied ? "Already in your plan" : "1 new commitment found"}
        subtitle={
          addedTaskApplied
            ? `${addedInterpretation?.commitment.title ?? "This item"} is already in your plan.`
            : addedInterpretation?.commitment.state === "needs_clarification"
              ? "StudentOS needs one detail before scheduling it."
              : "This affects today's plan."
        }
      >
        <div className="space-y-4">
          <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">Added</p>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-ink">
              <span className="size-1.5 rounded-full bg-ink" />
              {addedInterpretation?.commitment.title ?? addedSourceText ?? "Added task"}
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
              {(addedInterpretation?.impactItems ?? ["Review the added task"]).map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-700">
                  <span className="size-1.5 rounded-full bg-ink" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {addedTaskApplied ? (
            <PrimaryButton onClick={() => setImpactOpen(false)}>Done</PrimaryButton>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <PrimaryButton onClick={updatePlanWithAddedTask}>Update plan</PrimaryButton>
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
        applying={replanLoading}
      />

      <ExportSuccessSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        includeAddedTask={addedTaskApplied}
        includeRoadmap={roadmapAdded}
        focusTitle={focusTask?.title}
        scheduledBlockCount={planTasks.length}
        conflictResolved={hasConfirmedConflict && conflictResolved}
        onViewFinalPlan={() => {
          setExportOpen(false);
          window.localStorage.setItem(
            "studentos_end_summary",
            JSON.stringify({
              focusTitle: focusTask?.title ?? "Review current plan",
              scheduledBlockCount: planTasks.length,
              conflictResolved: hasConfirmedConflict && conflictResolved,
              roadmapAdded,
              addedTaskApplied,
            }),
          );
          router.push("/end");
        }}
        onStartOver={reset}
        onSaved={() => {
          window.localStorage.setItem("studentos_calendar_saved", "true");
          showToast("Saved to calendar");
        }}
      />

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed-bottom-toast flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black shadow-lift"
          >
            <CheckCircle2 className="size-3.5" />
            {toastMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}

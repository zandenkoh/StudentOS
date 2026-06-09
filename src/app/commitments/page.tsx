"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Server,
  Trash2
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { BottomActionBar } from "@/components/bottom-action-bar";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton } from "@/components/buttons";
import {
  ClarificationBottomSheet,
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
import type {
  AIConflictAnalysis,
  AIClarificationQuestion,
  CapturedSourceForAI,
  StudentOSAgentFootprint
} from "@/lib/studentos-ai-types";
import { validateTimelineConflicts } from "@/lib/schedule-conflicts";

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

const defaultConflictAnalysis: AIConflictAnalysis = {
  title: "CCA briefing overlaps with tuition",
  unresolvedSummary: "CCA briefing overlaps with tuition. StudentOS found a cleaner schedule.",
  resolvedTitle: "Conflict resolved",
  resolvedSummary: "StudentOS keeps tuition fixed and handles CCA with a notes request.",
  fixedEventTitle: "Tuition",
  fixedEventTime: "4:30-6:30 PM",
  conflictingEventTitle: "CCA briefing",
  conflictingEventTime: "5:30-6:15 PM",
  overlapLabel: validateTimelineConflicts(timelineEvents).groups[0]?.overlapLabel ?? "Not confirmed",
  impactLabel: "Decision needed",
  resolvedImpactLabel: "Plan ready",
  recommendationSummary:
    "Keep tuition fixed, ask your CCA lead for briefing notes, and move revision after dinner. Physics stays first because it is due tomorrow morning.",
  recommendedActions: [
    "Keep tuition at 4:30 PM",
    "Ask CCA lead for briefing notes",
    "Move revision after dinner",
    "Start Physics at 8:00 PM",
    "Keep coding practice as a weekly goal block",
  ],
  manualActions: [
    "Record Physics extension to 16 June",
    "Reschedule tuition away from CCA briefing",
    "Keep CCA briefing as fixed",
    "Protect coding practice as a weekly goal block",
  ],
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

type ClarifyingState = {
  kind: AIClarificationQuestion["kind"];
  commitmentId: string;
} | null;

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

const fallbackPlanReasoning =
  "StudentOS prioritised the Physics worksheet because it is due tomorrow morning, kept fixed commitments stable, handled the CCA clash, moved flexible revision later, and scheduled your coding roadmap across future days.";

const commitmentSourceKeywords: Record<string, RegExp> = {
  physics: /physics|homework|worksheet|chapter|teacher/i,
  cca: /cca|briefing|announcement/i,
  competition: /competition|submission|portal|web/i,
  coding: /coding|python|goal|data-handling/i,
  team: /voice|teammate|team|project|whatsapp/i,
};

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceTextForMatch(source: CapturedSourceForAI) {
  return normalizeSearchText(
    [
      source.id,
      source.title,
      source.source,
      source.snippet,
      source.sourceSummary,
      source.ocrText,
      source.textractText,
      source.extractedTasks?.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function previewFromCapturedSource(source: CapturedSourceForAI): SourcePreview {
  const rawFileType = source.fileType?.toLowerCase();
  const isImage =
    rawFileType === "image" || /\.(png|jpe?g|webp|gif|heic)$/i.test(source.title);
  const isAudio = rawFileType === "audio";
  const isLink = rawFileType === "link" || /^https?:\/\//i.test(source.source);
  const snippet =
    source.sourceSummary ||
    source.snippet ||
    source.ocrText ||
    source.textractText ||
    "Original source";

  return {
    title: source.title,
    source: source.source,
    fileSize: source.fileSize ?? (source.s3Key ? "AWS source" : "Source"),
    fileType: isImage ? "image" : isAudio ? "audio" : isLink ? "link" : "text",
    snippet,
    filePath: source.filePath,
  };
}

function resolveCommitmentSourcePreview(
  commitment: Commitment,
  footprint?: StudentOSAgentFootprint | null,
) {
  const staticPreview = commitmentSourcePreviews[commitment.id];
  const sources = footprint?.sources ?? [];

  if (sources.length === 0) return staticPreview ?? null;

  const commitmentText = normalizeSearchText(
    [commitment.id, commitment.title, commitment.source, commitment.explanation].join(" "),
  );
  const sourceLabel = normalizeSearchText(commitment.source);
  const keywordMatcher = commitmentSourceKeywords[commitment.id];

  const rankedSources = sources
    .map((source) => {
      const searchable = sourceTextForMatch(source);
      let score = 0;

      if (source.id === commitment.id) score += 12;
      if (source.id.includes(commitment.id) || commitment.id.includes(source.id)) score += 8;
      if (sourceLabel && searchable.includes(sourceLabel)) score += 5;
      if (keywordMatcher?.test(searchable)) score += 5;

      for (const token of commitmentText.split(" ").filter((token) => token.length > 3)) {
        if (searchable.includes(token)) score += 1;
      }

      return { source, score };
    })
    .sort((a, b) => b.score - a.score);

  const matchedSource = rankedSources.find((item) => item.score >= 5)?.source;

  if (!matchedSource) return staticPreview ?? null;

  const matchedPreview = previewFromCapturedSource(matchedSource);

  if (
    staticPreview?.fileType === "image" &&
    matchedPreview.fileType !== "image" &&
    !matchedPreview.filePath
  ) {
    return staticPreview;
  }

  return matchedPreview;
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

function scheduleLabelForTask(task: DemoPlanTask) {
  return task.scheduledDateRange ?? task.scheduledDate ?? task.timeLabel ?? "the selected slot";
}

const defaultScheduleRationales: Record<string, string> = {
  "physics-focus":
    "StudentOS makes Physics the immediate focus because it is due tomorrow at 8 AM and needs the clearest remaining attention before the evening gets fragmented.",
  "message-teammate":
    "The teammate message is placed after Physics because it is a 3 minute clarification task that should not interrupt the high-focus deadline work.",
  "cca-notes":
    "StudentOS schedules this before the briefing so the CCA lead can capture notes during the event while the student stays in tuition.",
  tuition:
    "Tuition is kept at 4:30-6:30 PM because it is externally fixed; the planner moves flexible work around it instead of pretending it can bend.",
  revision:
    "Revision moves to 7:45 PM because it is flexible and lighter than deadline homework, making it a better post-dinner block.",
  "coding-practice":
    "Coding practice is scheduled at 9:00 PM because it advances the December goal without stealing the student’s strongest focus from tomorrow’s Physics deadline.",
  "coding-fundamentals-session-1":
    "The first coding fundamentals session starts on 17 June so the student gets a near-term next action after immediate school deadlines clear.",
  "mini-project-brief":
    "The mini-project brief is placed on 24 June after a fundamentals session so the student defines a build only after getting basic syntax context.",
  "physics-circuits":
    "Circuits revision is scheduled on 16 June to create a buffer before the Friday deadline while avoiding the overloaded conflict day.",
  "project-meeting-prep":
    "Project meeting prep lands on 18 June because it is close enough to the 19 June discussion to stay relevant without competing with immediate homework.",
};

function defaultScheduleRationale(task: DemoPlanTask) {
  const baseId = task.id.replace(/-session-\d+$/, "");
  if (defaultScheduleRationales[task.id]) return defaultScheduleRationales[task.id];
  if (defaultScheduleRationales[baseId]) return defaultScheduleRationales[baseId];
  return `StudentOS placed ${baseTaskTitle(task.title)} at ${scheduleLabelForTask(task)} because that slot best balances urgency, fixed events, and the student's likely energy.`;
}

function enrichPlanTasksWithRationales(tasks: DemoPlanTask[]) {
  return tasks.map((task) => ({
    ...task,
    scheduleRationale: task.scheduleRationale ?? defaultScheduleRationale(task),
  }));
}

function scheduleRationaleForTask(task: DemoPlanTask) {
  return task.scheduleRationale ?? defaultScheduleRationale(task);
}

function taskForTimelineEvent(event: TimelineEvent | null, tasks: DemoPlanTask[]) {
  if (!event) return undefined;

  const aliases: Record<string, string[]> = {
    coding: ["coding-practice"],
    notes: ["cca-notes"],
    physics: ["physics-focus"],
  };
  const candidates = [event.id, ...(aliases[event.id] ?? [])];
  return tasks.find((task) => candidates.includes(task.id));
}

function scheduleRationaleForEvent(event: TimelineEvent | null, tasks: DemoPlanTask[]) {
  if (!event) return "";
  const matchingTask = taskForTimelineEvent(event, tasks);
  return matchingTask ? scheduleRationaleForTask(matchingTask) : event.scheduleRationale ?? "StudentOS placed this block around fixed events, urgency, and the student’s remaining focus for the day.";
}

function movedScheduleRationale(task: DemoPlanTask, schedule: string) {
  const deadline = task.deadline ? ` before ${task.deadline}` : "";
  return `StudentOS moved ${baseTaskTitle(task.title)} to ${schedule} because it still fits${deadline} while reducing pressure on the original slot.`;
}

function questionForSheet(question?: AIClarificationQuestion): ClarificationQuestion[] | undefined {
  if (!question) return undefined;

  return [
    {
      question: question.question,
      options: question.options,
      customPlaceholder: question.customPlaceholder,
    },
  ];
}

export default function CommitmentsPage() {
  const router = useRouter();
  const [step, setStep] = useState<CommitmentsStep>("commitments");
  const [commitments, setCommitments] = useState<Commitment[]>(baseCommitments);
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
  const [impactOpen, setImpactOpen] = useState(false);
  const [chemistryAdded, setChemistryAdded] = useState(false);
  const [roadmapAdded, setRoadmapAdded] = useState(true);
  const [planHydrated, setPlanHydrated] = useState(false);
  const [planTasks, setPlanTasks] = useState<DemoPlanTask[]>(() =>
    enrichPlanTasksWithRationales(initialPlanTasks)
  );
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<DemoPlanTask | null>(null);
  const [aiPlan, setAiPlan] = useState<PlanDayResponse | null>(null);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [aiFootprint, setAiFootprint] = useState<StudentOSAgentFootprint | null>(null);
  const [baseTimeline, setBaseTimeline] = useState<TimelineEvent[]>(timelineEvents);
  const [aiResolvedTimeline, setAiResolvedTimeline] = useState<TimelineEvent[]>(resolvedTimelineEvents);
  const [conflictAnalysis, setConflictAnalysis] = useState<AIConflictAnalysis | undefined>(defaultConflictAnalysis);
  const aiPlanRequestStarted = useRef(false);

  const unresolvedCount = commitments.filter(
    (item) => item.state === "needs_clarification" || item.state === "unsure"
  ).length;
  const displayedPlanSections = useMemo<PlanDisplaySection[]>(() => {
    return planSectionOrder.map((section) => ({
      ...section,
      items: planTasks.filter((task) => task.section === section.section)
    }));
  }, [planTasks]);
  const commitmentItems = useMemo(
    () => commitments.filter((item) => item.type !== "goal"),
    [commitments],
  );
  const goalItems = useMemo(
    () => commitments.filter((item) => item.type === "goal"),
    [commitments],
  );
  const visibleTimelineEvents = useMemo(() => {
    if (!conflictResolved) return baseTimeline;
    return resolutionMode === "manual" ? manualResolvedTimelineEvents : aiResolvedTimeline;
  }, [aiResolvedTimeline, baseTimeline, conflictResolved, resolutionMode]);
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
  const aiPlanSummary = aiPlan?.rationale.summary ?? fallbackPlanReasoning;
  const aiPlanBullets = aiPlan?.rationale.bullets ?? [];
  const aiPlanStatusLabel = aiPlanLoading
    ? "Planning"
    : aiPlan?.status === "success"
      ? "Gateway"
      : "Fallback";
  const activeClarification = clarifying
    ? aiFootprint?.clarificationQuestions.find(
        (question) => question.commitmentId === clarifying.commitmentId,
      )
    : undefined;
  const focusTask = planTasks.find((task) => task.section === "do_now") ?? planTasks[0];
  const roadmapGoal = goalItems[0];
  const nextRoadmapTask = planTasks.find((task) => task.isRoadmapTask);
  const roadmapSummaryLines = [
    `${aiFootprint?.roadmapSteps.length ?? 6} steps scheduled across Jun-Dec.`,
    nextRoadmapTask
      ? `Next action: ${nextRoadmapTask.estimatedMinutes ? `${nextRoadmapTask.estimatedMinutes} min ` : ""}${nextRoadmapTask.title}.`
      : "Next action: 30 min coding fundamentals.",
    aiFootprint?.goalResearch
      ? "Grounded with Exa goal research."
      : "Risk: consistency, not deadline proximity.",
  ];

  useEffect(() => {
    try {
      const rawFootprint =
        window.localStorage.getItem("studentos_ai_footprint") ??
        window.localStorage.getItem("studentos_commitment_footprint");
      let loadedFootprint = false;

      if (rawFootprint) {
        const parsedFootprint = JSON.parse(rawFootprint) as StudentOSAgentFootprint;

        if (
          Array.isArray(parsedFootprint.commitments) &&
          Array.isArray(parsedFootprint.planTasks) &&
          parsedFootprint.rationale
        ) {
          loadedFootprint = true;
          setAiFootprint(parsedFootprint);
          setCommitments(parsedFootprint.commitments);
          setPlanTasks(enrichPlanTasksWithRationales(parsedFootprint.planTasks));
          setBaseTimeline(parsedFootprint.timelineEvents);
          setAiResolvedTimeline(parsedFootprint.resolvedTimelineEvents);
          setConflictAnalysis(parsedFootprint.conflict);
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

      const savedPlan = window.localStorage.getItem("studentos_plan_overrides");
      if (!loadedFootprint && savedPlan) {
        const parsedPlan = JSON.parse(savedPlan) as DemoPlanTask[];
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
          setPlanTasks(enrichPlanTasksWithRationales(parsedPlan));
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
      setPlanTasks(enrichPlanTasksWithRationales(initialPlanTasks));
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

    window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify([item, ...trace].slice(0, 8)));
  }, []);

  useEffect(() => {
    if (!planHydrated) return;
    window.localStorage.setItem("studentos_plan_overrides", JSON.stringify(planTasks));
  }, [planHydrated, planTasks]);

  useEffect(() => {
    if (!planHydrated || step !== "plan" || aiPlan || aiPlanRequestStarted.current) return;

    aiPlanRequestStarted.current = true;

    const cacheKey = `studentos_vercel_plan_day_${resolutionMode ?? "base"}_${chemistryAdded ? "chemistry" : "standard"}`;
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
            currentDate: "2026-06-09",
            commitments: commitments.map((item) => ({
              id: item.id,
              title: item.title,
              type: item.type,
              state: item.state,
              estimatedDuration: item.estimatedDuration,
              source: item.source,
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
            sourceContext: {
              narrative: "AWS extracted messy screenshots, PDFs, and text sources before this Vercel planning step.",
              conflictResolution: resolutionMode ?? "recommended",
              addedSource: chemistryAdded ? "Chemistry worksheet due 8 PM" : undefined,
              addedSourceKey,
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
            summary: fallbackPlanReasoning,
            bullets: [
              "Physics is due tomorrow morning.",
              "Fixed events stay protected.",
              "Flexible work moves around the conflict.",
              "The coding goal remains a scheduled roadmap.",
            ],
          },
          dailyPlan: {
            focus: "Finish Physics worksheet",
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
    aiPlan,
    chemistryAdded,
    commitments,
    goalItems,
    planHydrated,
    resolutionMode,
    step,
    visibleTimelineEvents,
  ]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }

  function clarify(target: NonNullable<ClarifyingState>, answers: ClarificationAnswers = {}) {
    const question = aiFootprint?.clarificationQuestions.find(
      (item) => item.commitmentId === target.commitmentId,
    );
    const selectedAnswer = Object.values(answers).find((answer) => answer && answer !== "Skipped");
    const selectedOption = selectedAnswer
      ? question?.options.find((option) => option.label === selectedAnswer)
      : undefined;
    const resolved = question?.resolvedCommitment;

    setCommitments((current) =>
      current.map((item) => {
        if (item.id === target.commitmentId && resolved) {
          const resolvedState =
            resolved.state === "needs_clarification" || resolved.state === "unsure"
              ? "resolved"
              : resolved.state ?? "confirmed";

          return {
            ...item,
            ...resolved,
            state: resolvedState,
            explanation:
              resolved.explanation ??
              `Clarified from answer: ${selectedOption?.label ?? selectedAnswer ?? "confirmed"}.`,
          };
        }
        if (target.kind === "goal" && item.id === "coding") {
          return {
            ...item,
            state: "confirmed",
            confidence: 92,
            estimatedDuration: "2 sessions/week",
            explanation: "Roadmap ready: 6 steps scheduled across Jun-Dec."
          };
        }
        if (target.kind === "team" && item.id === "team") {
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

  function openCommitmentItem(commitment: Commitment) {
    const aiQuestion = aiFootprint?.clarificationQuestions.find(
      (question) => question.commitmentId === commitment.id,
    );

    if (aiQuestion) {
      setClarifying({ kind: aiQuestion.kind, commitmentId: commitment.id });
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
      scheduleRationale:
        "Chemistry is inserted before 8 PM because it has a same-day deadline; coding moves later because goal practice is less urgent and can tolerate night fatigue better than deadline work.",
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
              scheduleRationale:
                "Coding practice moves to 9:45 PM because Chemistry now owns the pre-8 PM deadline slot, while coding remains a lower-urgency December goal block.",
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
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
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
              scheduleRationale: movedScheduleRationale(task, date.label),
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
      scheduleRationale: `StudentOS keeps the first half on ${scheduleLabelForTask(selectedTask)} so progress starts in the original slot without overloading one session.`,
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
      scheduleRationale: `StudentOS places the second half on ${nextDate?.label ?? scheduleLabelForTask(selectedTask)} so the task gets recovery space instead of becoming one long low-quality block.`,
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
                      : conflictAnalysis?.resolvedSummary ?? "StudentOS updated the day without moving fixed commitments."
                    : conflictAnalysis?.unresolvedSummary ?? "CCA briefing overlaps with tuition. StudentOS found a cleaner schedule."
                }
              />
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
                onApply={() => {
                  if (conflictResolved) setStep("plan");
                  else applySuggestedConflict(false);
                }}
                onEdit={() => setManualConflictOpen(true)}
                conflict={conflictAnalysis}
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
              <section className="rounded-[8px] border border-neutral-200 bg-white p-4 shadow-[0_12px_38px_rgba(0,0,0,0.04)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
                      <Server className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-ink">Vercel AI Gateway planner</p>
                      <p className="truncate text-[11px] font-semibold text-neutral-400">
                        {aiPlan?.model ?? "Structured fallback"} rationale
                      </p>
                    </div>
                  </div>
                  <SourceChip tone={aiPlan?.status === "success" ? "success" : "neutral"}>
                    {aiPlanStatusLabel}
                  </SourceChip>
                </div>
                <p className="text-[13px] leading-5 text-neutral-600">
                  {aiPlanLoading ? "Generating a planning rationale through Vercel AI Gateway..." : aiPlanSummary}
                </p>
              </section>
              <FocusActionCard onExplain={() => setReasoningOpen(true)} task={focusTask} />
              <GoalRoadmapCard
                onView={viewRoadmap}
                roadmapAdded={roadmapAdded}
                goalTitle={roadmapGoal?.title}
                summaryLines={roadmapSummaryLines}
              />
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
        </>
      </div>

      <AddSourceButton onClick={openAddSource} raised={step === "plan"} />

      {step === "plan" ? (
        <BottomActionBar onExport={() => setExportOpen(true)} onReasoning={() => setReasoningOpen(true)} />
      ) : null}

      <ClarificationBottomSheet
        open={clarifying !== null}
        kind={clarifying?.kind === "goal" ? "goal" : "team"}
        onClose={() => setClarifying(null)}
        onSubmit={(answers) => clarifying && clarify(clarifying, answers)}
        questionsOverride={questionForSheet(activeClarification)}
        titleOverride={activeClarification?.title}
        subtitleOverride={activeClarification?.subtitle}
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
        subtitle={aiPlanSummary}
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
            {["Urgency", "Fixed events", "Energy", "Deadline", ...(chemistryAdded ? ["Updated"] : []), "Goal roadmap"].map((chip) => (
              <SourceChip key={chip}>{chip}</SourceChip>
            ))}
          </div>
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

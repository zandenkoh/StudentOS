"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  Loader2,
  Paperclip,
  Pencil,
  Plus,
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
import type {
  AIConflictAnalysis,
  AIClarificationQuestion,
  CapturedSourceForAI,
  StudentOSAgentFootprint
} from "@/lib/studentos-ai-types";
import { validateTimelineConflicts } from "@/lib/schedule-conflicts";
import { ensureTaskTimeRange, ensureTaskTimeRanges, scheduleLabelWithTimeRange } from "@/lib/time-scheduling";

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
  durationSeconds?: number;
  provider?: string;
  sponsorStatus?: string;
  sourceSummary?: string;
  extractedTasks?: string[];
  extractedEvidence?: string[];
  sourceConfidence?: number;
  languageNotes?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
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

type ClarificationAnswerRecord = {
  commitmentId: string;
  commitmentTitle: string;
  kind: AIClarificationQuestion["kind"];
  question: string;
  answer: string;
  answeredAt: string;
};

const MANUAL_CONFLICT_INSTRUCTION =
  "Physics teacher has granted extension for worksheet deadline to 16 June. Reschedule tuition accordingly, so that it no longer clashes with CCA briefing.";

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

type AddedCommitmentInterpretation = {
  commitment: Commitment;
  task: DemoPlanTask;
  impactItems: string[];
  clarificationQuestion?: AIClarificationQuestion;
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

type ReplanTrigger = "clarification" | "manual_conflict";

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

const SAVED_COMMITMENTS_KEY = "studentos_commitment_overrides";
const SAVED_PLAN_TASKS_KEY = "studentos_plan_overrides";
const SAVED_FLOW_STATE_KEY = "studentos_flow_state";
const COMPLETED_TASK_IDS_KEY = "studentos_completed_task_ids";
const USER_DECIDED_SCHEDULE_RATIONALE = "This was a user-decided schedule";

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
      source.extractedEvidence?.join(" "),
      source.languageNotes,
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
    durationSeconds: source.durationSeconds,
    provider: source.provider,
    sponsorStatus: source.sponsorStatus,
    sourceSummary: source.sourceSummary,
    extractedTasks: source.extractedTasks,
    extractedEvidence: source.extractedEvidence,
    sourceConfidence: source.sourceConfidence,
    languageNotes: source.languageNotes,
    needsClarification: source.needsClarification,
    clarificationPrompt: source.clarificationPrompt,
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

function EvidenceMetadata({ preview }: { preview: SourcePreview }) {
  if (
    !preview.provider &&
    !preview.sourceSummary &&
    !preview.extractedTasks?.length &&
    !preview.extractedEvidence?.length &&
    !preview.languageNotes &&
    !preview.clarificationPrompt
  ) {
    return null;
  }

  return (
    <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-700">
        <span>Interpreted evidence</span>
        {preview.provider ? <span>{preview.provider}</span> : null}
        {preview.sponsorStatus ? <span>{preview.sponsorStatus}</span> : null}
        {typeof preview.sourceConfidence === "number" ? (
          <span>{Math.round(preview.sourceConfidence * 100)}% confidence</span>
        ) : null}
      </div>
      {preview.sourceSummary ? <p>{preview.sourceSummary}</p> : null}
      {preview.extractedTasks?.length ? (
        <div className="mt-2 rounded-lg border border-emerald-200/70 bg-white/60 p-2">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-emerald-700">
            Extracted commitments
          </p>
          <ul className="space-y-1">
            {preview.extractedTasks.slice(0, 4).map((task) => (
              <li key={task} className="leading-snug">- {task}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.extractedEvidence?.length ? (
        <p className="mt-2 border-l-2 border-emerald-200 pl-2 text-emerald-800">
          Evidence: {preview.extractedEvidence.slice(0, 2).join(" | ")}
        </p>
      ) : null}
      {preview.languageNotes ? <p className="mt-2 text-emerald-800">{preview.languageNotes}</p> : null}
      {preview.needsClarification && preview.clarificationPrompt ? (
        <p className="mt-2 text-amber-800">Uncertainty: {preview.clarificationPrompt}</p>
      ) : null}
    </div>
  );
}

function CommitmentSourcePreview({ preview }: { preview: SourcePreview }) {
  if (preview.fileType === "image") {
    return (
      <div className="w-full pb-4">
        <EvidenceMetadata preview={preview} />
        {preview.filePath ? (
          <div className="flex items-center justify-center overflow-hidden rounded-xl border border-neutral-100 bg-[#FAFAFA] p-2 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <EvidenceMetadata preview={preview} />
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
    const formatAudioDuration = (secs?: number) => {
      if (!secs) return "1:24";
      const minutes = Math.floor(secs / 60);
      const seconds = secs % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
      <div className="w-full pb-4">
        <EvidenceMetadata preview={preview} />
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-ink text-white">
              <AudioLines className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{preview.title}</p>
              <p className="text-xs font-semibold text-neutral-400">
                Transcript summary · {preview.durationSeconds ? formatAudioDuration(preview.durationSeconds) : preview.fileSize || "1:24"}
              </p>
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
      <EvidenceMetadata preview={preview} />
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

function dateIdFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDateId() {
  return dateIdFromDate(new Date());
}

function addDaysToDateId(dateId: string, days: number) {
  const date = dateFromDateId(dateId);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return dateIdFromDate(date);
}

function formatScheduleDateLabel(dateId: string) {
  const date = dateFromDateId(dateId);
  if (!date) return dateId;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function validRescheduleBounds(task: DemoPlanTask | null) {
  if (!task || task.section !== "subsequent_days") return null;
  const min = addDaysToDateId(todayDateId(), 1);
  const max = task.deadlineDateId ? addDaysToDateId(task.deadlineDateId, -1) : undefined;
  return { min, max };
}

function canUseScheduleDate(task: DemoPlanTask | null, dateId: string) {
  const bounds = validRescheduleBounds(task);
  if (!bounds || !dateId) return false;
  if (dateId < bounds.min) return false;
  if (bounds.max && dateId > bounds.max) return false;
  return true;
}

function canMoveTaskDate(task: DemoPlanTask | null, direction: -1 | 1) {
  if (!task?.scheduledDateId) return false;
  return canUseScheduleDate(task, addDaysToDateId(task.scheduledDateId, direction));
}

function nextDayForTask(task: DemoPlanTask) {
  const dateId = task.scheduledDateId ?? todayDateId();
  return addDaysToDateId(dateId, 1);
}

function baseTaskTitle(title: string) {
  return title.replace(/\s+— Session \d+$/, "");
}

function scheduleLabelForTask(task: DemoPlanTask) {
  return scheduleLabelWithTimeRange(task) ?? "the selected slot";
}

const monthOrder: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function dateSortValue(task: DemoPlanTask) {
  if (task.scheduledDateId) {
    const timestamp = Date.parse(`${task.scheduledDateId}T00:00:00`);
    if (Number.isFinite(timestamp)) return timestamp;
  }

  const label = task.scheduledDate ?? task.scheduledDateRange;
  if (!label) return Number.POSITIVE_INFINITY;

  const normalized = label.toLowerCase();
  const monthMatch = normalized.match(
    /january|february|march|april|may|june|july|august|september|october|november|december/,
  );
  if (!monthMatch) return Number.POSITIVE_INFINITY;

  const dayMatch = normalized.match(/\b\d{1,2}\b/);
  const month = monthOrder[monthMatch[0]];
  const day = dayMatch ? Number(dayMatch[0]) : 1;
  return Date.UTC(2026, month - 1, day);
}

function sortSubsequentDayTasks(tasks: DemoPlanTask[]) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const byDate = dateSortValue(a.task) - dateSortValue(b.task);
      return byDate || a.index - b.index;
    })
    .map(({ task }) => task);
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
  return ensureTaskTimeRanges(tasks).map((task) => ({
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

function dateFromDateId(dateId: string) {
  const [year, month, day] = dateId.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function calendarDayDiff(from: Date, to: Date) {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((toDay - fromDay) / 86400000);
}

function formatDayDistance(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function parseDeadlineTime(task: DemoPlanTask, date: Date) {
  const match = task.deadline?.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const deadline = new Date(date);
  deadline.setHours(hours, minutes, 0, 0);
  return deadline;
}

function completionToastForTask(task: DemoPlanTask, now: Date) {
  if (task.deadlineDateId) {
    const deadlineDate = dateFromDateId(task.deadlineDateId);

    if (deadlineDate) {
      const daysUntilDeadline = calendarDayDiff(now, deadlineDate);

      if (daysUntilDeadline > 0) {
        return `Completed. Deadline is ${formatDayDistance(daysUntilDeadline)}.`;
      }

      if (daysUntilDeadline === 0) {
        const deadlineTime = parseDeadlineTime(task, deadlineDate);
        if (!deadlineTime) return "Completed before today's deadline.";

        const minutesUntilDeadline = Math.round((deadlineTime.getTime() - now.getTime()) / 60000);
        if (minutesUntilDeadline >= 0) {
          const hours = Math.floor(minutesUntilDeadline / 60);
          const mins = minutesUntilDeadline % 60;
          const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
          return `Completed ${timeStr} before the deadline.`;
        }

        return "Completed after the deadline.";
      }

      return "Completed after the deadline.";
    }
  }

  if (task.scheduledDateId) {
    const scheduledDate = dateFromDateId(task.scheduledDateId);
    if (scheduledDate) {
      const daysUntilScheduled = calendarDayDiff(now, scheduledDate);
      if (daysUntilScheduled > 0) {
        return `Completed early. This was scheduled ${formatDayDistance(daysUntilScheduled)}.`;
      }
    }
  }

  return "Completed. Plan updated.";
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

function estimatedMinutesFromDuration(value: string, type: Commitment["type"]) {
  const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*h/i);
  if (hourMatch) return Math.max(15, Math.round(Number(hourMatch[1]) * 60));

  const minuteMatch = value.match(/(\d+)\s*m/i);
  if (minuteMatch) return Math.max(1, Number(minuteMatch[1]));

  if (type === "event") return 30;
  if (type === "goal") return 30;
  return 25;
}

function slugFromText(value: string) {
  return normalizeSearchText(value).split(" ").slice(0, 5).join("-") || "added-task";
}

function titleFromAddedText(text: string) {
  const withoutDeadline = text
    .replace(/\b(due|by|before)\b.+$/i, "")
    .replace(/\b(today|tonight|tomorrow|tmr)\b/gi, "")
    .trim();
  const title = withoutDeadline || text.trim();

  return title.length > 70 ? `${title.slice(0, 67).trim()}...` : title;
}

function deadlineFromAddedText(text: string) {
  const timeMatch = text.match(/\b(?:due|by|before)\s+((?:\d{1,2})(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\b/i);
  const dayMatch = text.match(/\b(today|tonight|tomorrow|tmr)\b/i);
  const rawTime = timeMatch?.[1]?.replace(/\./g, "").replace(/\s+/g, " ").trim();

  if (!rawTime && !dayMatch) return null;

  const timeLabel = rawTime ? rawTime.toUpperCase().replace(/([0-9])([AP]M)$/i, "$1 $2") : "";
  const dayLabel = dayMatch?.[1]?.toLowerCase();
  const isTomorrow = dayLabel === "tomorrow" || dayLabel === "tmr";

  return {
    label: [timeLabel, dayLabel && !isTomorrow ? "tonight" : isTomorrow ? "tomorrow" : ""]
      .filter(Boolean)
      .join(" "),
    dateId: isTomorrow ? "2026-06-10" : "2026-06-09",
    timeLabel: timeLabel ? `Before ${timeLabel}` : "After current focus",
  };
}

function typeFromAddedText(text: string): Commitment["type"] {
  if (/\b(goal|learn|improve|practice|become|proficient)\b/i.test(text)) return "goal";
  if (/\b(meet|meeting|tuition|briefing|training|class|lesson|event)\b/i.test(text)) return "event";
  if (/\b(due|deadline|submit|submission|by|before)\b/i.test(text)) return "deadline";
  return "task";
}

function interpretAddedSource(text: string): AddedCommitmentInterpretation {
  const normalized = text.trim();
  const isUnclear = normalized.length < 8 || !/[a-z0-9]/i.test(normalized);
  const title = isUnclear ? "Clarify added task" : titleFromAddedText(normalized);
  const type = isUnclear ? "task" : typeFromAddedText(normalized);
  const deadline = isUnclear ? null : deadlineFromAddedText(normalized);
  const id = `added-${slugFromText(normalized)}`;
  const estimatedDuration = type === "event" ? "30min" : type === "goal" ? "30min/session" : "30min";
  const commitment: Commitment = {
    id,
    title: capitalize(title),
    type,
    state: isUnclear ? "needs_clarification" : "confirmed",
    confidence: isUnclear ? 45 : deadline ? 88 : 76,
    source: "Added task",
    estimatedDuration,
    explanation: isUnclear
      ? "The added text did not include enough detail to schedule confidently."
      : `Interpreted from added input: "${normalized}".`,
  };
  const task: DemoPlanTask = {
    id,
    title: type === "goal" ? `Plan next step for ${commitment.title}` : commitment.title,
    section: "do_next",
    estimatedMinutes: estimatedMinutesFromDuration(estimatedDuration, type),
    timeLabel: deadline?.timeLabel ?? "After current focus",
    deadline: deadline?.label,
    deadlineDateId: deadline?.dateId,
    reason: deadline ? "New commitment inserted before its deadline" : "New commitment added mid-plan",
    scheduleRationale: deadline
      ? `StudentOS schedules ${commitment.title} before ${deadline.label} because that deadline came from the added input.`
      : `StudentOS adds ${commitment.title} after the current focus because the added input did not include a fixed deadline.`,
    source: "Added task",
    goalId: type === "goal" ? id : undefined,
    isRoadmapTask: type === "goal" ? true : undefined,
    updated: true,
  };
  const impactItems = [
    isUnclear ? "Ask for details before scheduling" : `Add ${commitment.title}`,
    deadline ? `Schedule before ${deadline.label}` : "Place after current focus",
    "Keep existing fixed commitments stable",
  ];

  return {
    commitment,
    task: ensureTaskTimeRange(task),
    impactItems,
    clarificationQuestion: isUnclear
      ? {
          id: `${id}-clarification`,
          commitmentId: id,
          kind: "general",
          title: "Clarify added task",
          subtitle: "Choose the closest type so StudentOS can ask for only the missing details.",
          question: "What kind of item should this become?",
          options: [
            { label: "School task", recommended: true },
            { label: "Deadline" },
            { label: "Fixed event" },
            { label: "Personal goal" },
          ],
          customPlaceholder: "Type details, like 'Chemistry worksheet due tonight by 8 PM'",
          resolvedCommitment: {
            title: "Clarified added task",
            state: "confirmed",
            confidence: 82,
            estimatedDuration: "30min",
            explanation: "Clarified from the user's added task details.",
          },
        }
      : undefined,
  };
}

function commitmentHasScheduledTask(commitment: Commitment, tasks: DemoPlanTask[]) {
  const title = normalizeSearchText(commitment.title);
  return tasks.some((task) => {
    const taskTitle = normalizeSearchText(task.title);
    return (
      task.id === commitment.id ||
      task.id === `clarified-${commitment.id}` ||
      task.goalId === commitment.id ||
      taskTitle.includes(title) ||
      title.includes(taskTitle)
    );
  });
}

function taskFromClarifiedCommitment(
  commitment: Commitment,
  clarificationSummary: string,
): DemoPlanTask {
  const title =
    commitment.type === "goal"
      ? `Plan next step for ${commitment.title}`
      : commitment.title;

  return ensureTaskTimeRange({
    id: `clarified-${commitment.id}`,
    title,
    section: "do_next",
    estimatedMinutes: estimatedMinutesFromDuration(commitment.estimatedDuration, commitment.type),
    timeLabel: "After current focus",
    reason: "Added after user clarification resolved the missing context",
    scheduleRationale: `StudentOS schedules this because the earlier ambiguity was resolved by the user's clarification: ${clarificationSummary}.`,
    source: commitment.source,
    goalId: commitment.type === "goal" ? commitment.id : undefined,
    isRoadmapTask: commitment.type === "goal" ? true : undefined,
    updated: true,
  });
}

function upsertClarifiedCommitmentTask(
  tasks: DemoPlanTask[],
  commitment: Commitment,
  clarificationSummary: string,
) {
  if (commitmentHasScheduledTask(commitment, tasks)) return tasks;

  const task = taskFromClarifiedCommitment(commitment, clarificationSummary);
  const futureIndex = tasks.findIndex((item) => item.section === "subsequent_days");
  if (futureIndex < 0) return [...tasks, task];

  return [...tasks.slice(0, futureIndex), task, ...tasks.slice(futureIndex)];
}

function persistCommitments(commitments: Commitment[]) {
  window.localStorage.setItem(SAVED_COMMITMENTS_KEY, JSON.stringify(commitments));
}

function persistPlanTasks(tasks: DemoPlanTask[]) {
  window.localStorage.setItem(SAVED_PLAN_TASKS_KEY, JSON.stringify(tasks));
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

function AgentReplanStatus({ active, status }: { active: boolean; status: string | null }) {
  if (!active && !status) return null;

  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-semibold leading-5 text-emerald-900">
      {active ? <Loader2 className="size-4 shrink-0 animate-spin text-emerald-700" /> : <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />}
      <span>{status ?? "Agent replanning complete."}</span>
    </div>
  );
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
  const [addedSourceText, setAddedSourceText] = useState<string | null>(null);
  const [addedInterpretation, setAddedInterpretation] =
    useState<AddedCommitmentInterpretation | null>(null);
  const [impactOpen, setImpactOpen] = useState(false);
  const [chemistryAdded, setChemistryAdded] = useState(false);
  const [roadmapAdded, setRoadmapAdded] = useState(true);
  const [planHydrated, setPlanHydrated] = useState(false);
  const [planTasks, setPlanTasks] = useState<DemoPlanTask[]>(() =>
    enrichPlanTasksWithRationales(initialPlanTasks)
  );
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<DemoPlanTask | null>(null);
  const [clarificationAnswerRecords, setClarificationAnswerRecords] = useState<ClarificationAnswerRecord[]>([]);
  const [aiPlan, setAiPlan] = useState<PlanDayResponse | null>(null);
  const [sponsorTrace, setSponsorTrace] = useState<SponsorTraceItem[]>([]);
  const [aiPlanLoading, setAiPlanLoading] = useState(false);
  const [replanLoading, setReplanLoading] = useState(false);
  const [replanStatus, setReplanStatus] = useState<string | null>(null);
  const [aiFootprint, setAiFootprint] = useState<StudentOSAgentFootprint | null>(null);
  const [baseTimeline, setBaseTimeline] = useState<TimelineEvent[]>(timelineEvents);
  const [aiResolvedTimeline, setAiResolvedTimeline] = useState<TimelineEvent[]>(resolvedTimelineEvents);
  const [conflictAnalysis, setConflictAnalysis] = useState<AIConflictAnalysis | undefined>(defaultConflictAnalysis);
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
  const aiPlanSummary = aiPlan?.rationale.summary ?? fallbackPlanReasoning;
  const aiPlanBullets = aiPlan?.rationale.bullets ?? [];
  const activeClarification = clarifying
    ? aiFootprint?.clarificationQuestions.find(
        (question) => question.commitmentId === clarifying.commitmentId,
      )
    : undefined;
  const activeClarifications = clarifying
    ? aiFootprint?.clarificationQuestions.filter(
        (question) => question.commitmentId === clarifying.commitmentId,
      ) ?? []
    : [];
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

  useLayoutEffect(() => {
    resetScreenScroll();
    const frameId = window.requestAnimationFrame(resetScreenScroll);

    return () => window.cancelAnimationFrame(frameId);
  }, [step]);

  useEffect(() => {
    try {
      let persistedTrace: SponsorTraceItem[] = [];
      const rawTrace = window.localStorage.getItem("studentos_sponsor_trace");
      if (rawTrace) {
        const parsedTrace = JSON.parse(rawTrace) as SponsorTraceItem[];
        if (Array.isArray(parsedTrace)) {
          persistedTrace = parsedTrace.slice(0, 8);
          setSponsorTrace(persistedTrace);
        }
      }

      const rawFootprint =
        window.localStorage.getItem("studentos_ai_footprint") ??
        window.localStorage.getItem("studentos_commitment_footprint");

      if (rawFootprint) {
        const parsedFootprint = JSON.parse(rawFootprint) as StudentOSAgentFootprint;

        if (
          Array.isArray(parsedFootprint.commitments) &&
          Array.isArray(parsedFootprint.planTasks) &&
          parsedFootprint.rationale
        ) {
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

      const savedCommitments = window.localStorage.getItem(SAVED_COMMITMENTS_KEY);
      if (savedCommitments) {
        const parsedCommitments = JSON.parse(savedCommitments) as Commitment[];
        if (Array.isArray(parsedCommitments) && parsedCommitments.length > 0) {
          setCommitments(parsedCommitments);
        }
      }

      const savedPlan = window.localStorage.getItem(SAVED_PLAN_TASKS_KEY);
      if (savedPlan) {
        const parsedPlan = JSON.parse(savedPlan) as DemoPlanTask[];
        if (Array.isArray(parsedPlan) && parsedPlan.length > 0) {
          setPlanTasks(enrichPlanTasksWithRationales(withoutCompletedTasks(parsedPlan)));
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
        setChemistryAdded(true);
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
        if (typeof parsedFlowState.chemistryAdded === "boolean") {
          setChemistryAdded(parsedFlowState.chemistryAdded);
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
      setPlanTasks(enrichPlanTasksWithRationales(withoutCompletedTasks(initialPlanTasks)));
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
  }: {
    trigger: ReplanTrigger;
    nextCommitments?: Commitment[];
    nextPlanTasks?: DemoPlanTask[];
    nextClarificationAnswers?: ClarificationAnswerRecord[];
    manualInstruction?: string;
    nextConflictResolved?: boolean;
    nextResolutionMode?: ResolutionMode;
  }) {
    const status =
      trigger === "manual_conflict"
        ? "Agent is rebuilding the schedule from your manual instruction..."
        : "Agent is reviewing clarification answers and rescheduling...";

    setReplanLoading(true);
    setAiPlanLoading(true);
    setReplanStatus(status);

    try {
      const response = await fetch("/api/sponsor/ai/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger,
          currentDate: "2026-06-09",
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
          },
        }),
      });

      const result = (await response.json()) as ReplanAgentResponse;
      if (!response.ok) throw new Error("Replanning route returned an error.");

      applyReplanResult(result);
      showToast(trigger === "manual_conflict" ? "Schedule rebuilt from instruction" : "Schedule updated from clarification");
    } catch (error) {
      addSponsorTrace({
        provider: "StudentOS",
        action: trigger === "manual_conflict" ? "Agent replanned manual conflict" : "Agent replanned after clarification",
        status: "error",
        detail: error instanceof Error ? error.message : "Replanning failed.",
      });
      showToast("Replanning failed; kept current plan");
    } finally {
      setReplanLoading(false);
      setAiPlanLoading(false);
      window.setTimeout(() => setReplanStatus(null), 1800);
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
    if (!planHydrated || step !== "plan" || aiPlan || aiPlanRequestStarted.current || replanLoading) return;

    aiPlanRequestStarted.current = true;

    const clarificationSignature = clarificationAnswerRecords
      .map((item) => `${item.commitmentId}:${item.question}:${item.answer}`)
      .join("|");
    const cacheKey = `studentos_vercel_plan_day_${resolutionMode ?? "base"}_${addedInterpretation?.commitment.id ?? "standard"}_${clarificationSignature.length}`;
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
    addedSourceText,
    aiPlan,
    addedInterpretation,
    chemistryAdded,
    clarificationAnswerRecords,
    commitments,
    goalItems,
    planHydrated,
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
    setPlanTasks(updatedTasks);
    persistCompletedTask(task.id);
    persistPlanTasks(updatedTasks);
  }

  function clarify(target: NonNullable<ClarifyingState>, answers: ClarificationAnswers = {}) {
    const matchingQuestions =
      aiFootprint?.clarificationQuestions.filter(
        (item) => item.commitmentId === target.commitmentId,
      ) ?? [];
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
          question: matchingQuestion?.question ?? `Clarification ${Number(index) + 1}`,
          answer: cleanAnswer,
          answeredAt,
        } satisfies ClarificationAnswerRecord;
      })
      .filter((item): item is ClarificationAnswerRecord => Boolean(item));
    const clarificationSummary = answeredRecords.length
      ? answeredRecords.map((item) => `${item.question} ${item.answer}`).join("; ")
      : selectedAnswer ?? "confirmed";
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
    setClarifying(null);
    void runAgentReplan({
      trigger: "clarification",
      nextCommitments,
      nextPlanTasks,
      nextClarificationAnswers: nextClarificationRecords,
    });
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

    setConflictResolved(true);
    setResolutionMode("manual");
    setManualConflictOpen(false);
    persistFlowState({ conflictResolved: true, resolutionMode: "manual" });
    showToast("Manual instruction sent to agent");
    void runAgentReplan({
      trigger: "manual_conflict",
      manualInstruction: instruction,
      nextConflictResolved: true,
      nextResolutionMode: "manual",
    });
  }

  function applyAndContinue() {
    if (!conflictResolved) {
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
    const interpretation = interpretAddedSource(text);
    setSourceProcessing(true);
    setSourceDraft(text);
    setAddedSourceText(text);
    setAddedInterpretation(interpretation);

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
    if (!addedInterpretation) {
      setImpactOpen(false);
      return;
    }

    if (chemistryAdded) {
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
            currentDate: "2026-06-09",
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
      if (current.some((item) => item.id === task.id) || commitment.state === "needs_clarification") {
        return current;
      }

      const updatedTasks = current.map((task) =>
        task.id === "coding-practice"
          ? {
              ...task,
              timeLabel: "9:45-10:45 PM",
              reason: `Moved later after ${commitment.title}`,
              scheduleRationale:
                `Coding practice moves to 9:45 PM because ${commitment.title} now needs the earlier flexible slot.`,
              updated: true
            }
          : task
      );
      const codingIndex = updatedTasks.findIndex((task) => task.id === "coding-practice");

      if (codingIndex < 0) {
        const firstFutureIndex = updatedTasks.findIndex(
          (task) => task.section === "subsequent_days"
        );
        if (firstFutureIndex < 0) {
          const updated = [...updatedTasks, task];
          persistPlanTasks(updated);
          return updated;
        }
        const updated = [
          ...updatedTasks.slice(0, firstFutureIndex),
          task,
          ...updatedTasks.slice(firstFutureIndex)
        ];
        persistPlanTasks(updated);
        return updated;
      }

      const updated = [
        ...updatedTasks.slice(0, codingIndex),
        task,
        ...updatedTasks.slice(codingIndex)
      ];
      persistPlanTasks(updated);
      return updated;
    });
    setChemistryAdded(true);
    setAiPlan(null);
    aiPlanRequestStarted.current = false;
    window.localStorage.setItem("studentos_extra_source_added", commitment.id);
    persistFlowState({ chemistryAdded: true });
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
              scheduleRationale: USER_DECIDED_SCHEDULE_RATIONALE,
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
    setCommitments((current) => {
      const updated = current.map((item) =>
        item.id === editing.id
          ? {
              ...item,
              title: editDraft.title.trim() || item.title,
              type: editDraft.type,
              estimatedDuration: editDraft.estimatedDuration.trim() || item.estimatedDuration
            }
          : item
      );
      persistCommitments(updated);
      return updated;
    });
    setEditing(null);
  }

  function deleteEditing() {
    if (!editing) return;
    setCommitments((current) => {
      const updated = current.filter((item) => item.id !== editing.id);
      persistCommitments(updated);
      return updated;
    });
    setEditing(null);
  }

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
              <AgentReplanStatus active={replanLoading} status={replanStatus} />
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
                  disabled={unresolvedCount > 0 || replanLoading}
                  onClick={() => {
                    const nextStep = hasConfirmedConflict ? "conflict" : "plan";
                    setStep(nextStep);
                    persistFlowState({ step: nextStep });
                  }}
                  className={`flex h-[60px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
                    unresolvedCount === 0 && !replanLoading
                      ? "bg-ink text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
                      : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  <span>
                    {unresolvedCount > 0
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
                    : conflictAnalysis?.unresolvedSummary ?? "CCA briefing overlaps with tuition. StudentOS found a cleaner schedule."
                }
              />
              <div className="lg:hidden">
                <SponsorProofStrip trace={sponsorTrace} />
              </div>
              <AgentReplanStatus active={replanLoading} status={replanStatus} />
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
              <div className="lg:hidden">
                <SponsorProofStrip trace={sponsorTrace} />
              </div>
              <AgentReplanStatus active={replanLoading} status={replanStatus} />
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
        questionsOverride={questionsForSheet(activeClarifications)}
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
              : "StudentOS will use the text you enter here as the source of truth."}
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={impactOpen}
        onClose={() => setImpactOpen(false)}
        title={chemistryAdded ? "Already in your plan" : "1 new commitment found"}
        subtitle={
          chemistryAdded
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
        includeChemistry={chemistryAdded}
        includeRoadmap={roadmapAdded}
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

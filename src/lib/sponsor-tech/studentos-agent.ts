import "server-only";

import { generateText } from "ai";
import { z } from "zod";
import { deepResearchGoal } from "@/lib/sponsor-tech/exa";
import { isExaReady, isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";
import { validateTimelineConflicts, type ConfirmedConflictGroup } from "@/lib/schedule-conflicts";
import { MAX_STUDY_SESSION_MINUTES, splitLongStudyTask, splitLongStudyTasks } from "@/lib/session-splitting";
import type {
  AIAgentLog,
  AISponsorTraceItem,
  AnalyseStudentChaosStreamEvent,
  CapturedSourceForAI,
  StudentOSAgentFootprint,
} from "@/lib/studentos-ai-types";

const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  snippet: z.string(),
  fileType: z.string().optional(),
  fileSize: z.string().optional(),
  filePath: z.string().optional(),
  s3Key: z.string().optional(),
  provider: z.string().optional(),
  sponsorStatus: z.string().optional(),
  ocrText: z.string().optional(),
  textractText: z.string().optional(),
  sourceSummary: z.string().optional(),
  extractedTasks: z.array(z.string()).optional(),
  needsClarification: z.boolean().optional(),
  clarificationPrompt: z.string().optional(),
});

const CommitmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["task", "event", "deadline", "goal", "conflict"]),
  source: z.string(),
  confidence: z.number().int().min(0).max(100),
  estimatedDuration: z.string(),
  state: z.enum(["confirmed", "needs_clarification", "unsure", "resolved"]),
  explanation: z.string(),
});

const TimelineEventSchema = z.object({
  id: z.string(),
  time: z.string(),
  title: z.string(),
  duration: z.string().optional(),
  chip: z.string(),
  tone: z.enum(["conflict", "success", "priority"]).optional(),
  conflictGroupId: z.string().optional(),
  scheduleRationale: z.string().optional(),
});

const PlanTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  section: z.enum(["do_now", "do_next", "subsequent_days"]),
  estimatedMinutes: z.number().int().positive().optional(),
  timeLabel: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledDateId: z.string().optional(),
  scheduledDateRange: z.string().optional(),
  deadline: z.string().optional(),
  deadlineDateId: z.string().optional(),
  reason: z.string().optional(),
  scheduleRationale: z.string().optional(),
  source: z.string().optional(),
  goalId: z.string().optional(),
  isRoadmapTask: z.boolean().optional(),
  updated: z.boolean().optional(),
});

const RoadmapStepSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledDateRange: z.string().optional(),
  tasks: z.array(PlanTaskSchema).min(1),
  status: z.enum(["scheduled", "in_progress", "upcoming"]),
});

const ClarificationQuestionSchema = z.object({
  id: z.string(),
  commitmentId: z.string(),
  kind: z.enum(["goal", "team", "general"]),
  title: z.string(),
  subtitle: z.string(),
  question: z.string(),
  options: z.array(z.object({
    label: z.string(),
    description: z.string().max(80).optional(),
    recommended: z.boolean().optional(),
  })).min(2).max(4),
  customPlaceholder: z.string(),
  resolvedCommitment: z.object({
    title: z.string().optional(),
    state: z.enum(["confirmed", "needs_clarification", "unsure", "resolved"]).optional(),
    confidence: z.number().int().min(0).max(100).optional(),
    estimatedDuration: z.string().optional(),
    explanation: z.string().optional(),
  }),
});

const ConflictSchema = z.object({
  title: z.string(),
  unresolvedSummary: z.string(),
  resolvedTitle: z.string(),
  resolvedSummary: z.string(),
  fixedEventTitle: z.string(),
  fixedEventTime: z.string(),
  conflictingEventTitle: z.string(),
  conflictingEventTime: z.string(),
  overlapLabel: z.string(),
  impactLabel: z.string(),
  resolvedImpactLabel: z.string(),
  recommendationSummary: z.string(),
  recommendedActions: z.array(z.string()).min(3).max(6),
  manualActions: z.array(z.string()).min(3).max(6),
});

const RationaleSchema = z.object({
  summary: z.string(),
  bullets: z.array(z.string()).min(3).max(6),
});

const AgentLogSchema = z.object({
  id: z.string(),
  at: z.number().int().min(0),
  kind: z.enum(["thought", "analysis", "tool", "decision", "footprint"]),
  title: z.string(),
  body: z.string(),
  detail: z.string().optional(),
  tool: z.object({
    provider: z.enum(["AWS", "Exa", "Vercel AI Gateway", "StudentOS"]),
    result: z.string(),
  }).optional(),
});

const GoalResearchSchema = z.object({
  query: z.string(),
  summary: z.string(),
  model: z.string().optional(),
  searchQueries: z.array(z.string()).optional(),
  sections: z.array(z.object({
    title: z.string(),
    bullets: z.array(z.string()),
  })).optional(),
  clarificationQuestions: z.array(z.object({
    question: z.string(),
    why: z.string(),
  })).optional(),
  researchGaps: z.array(z.string()).optional(),
  citations: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })).max(8),
});

const GeneratedTimelineEventSchema = z.object({
  id: z.string(),
  time: z.string(),
  title: z.string(),
  duration: z.string(),
  chip: z.string(),
  tone: z.enum(["none", "conflict", "success", "priority"]),
  conflictGroupId: z.string(),
  scheduleRationale: z.string(),
});

const GeneratedPlanTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  section: z.enum(["do_now", "do_next", "subsequent_days"]),
  estimatedMinutes: z.number().int().min(0),
  timeLabel: z.string(),
  scheduledDate: z.string(),
  scheduledDateId: z.string(),
  scheduledDateRange: z.string(),
  deadline: z.string(),
  deadlineDateId: z.string(),
  reason: z.string(),
  scheduleRationale: z.string(),
  source: z.string(),
  goalId: z.string(),
  isRoadmapTask: z.boolean(),
  updated: z.boolean(),
});

const GeneratedClarificationQuestionSchema = z.object({
  id: z.string(),
  commitmentId: z.string(),
  kind: z.enum(["goal", "team", "general"]),
  title: z.string(),
  subtitle: z.string(),
  question: z.string(),
  options: z.array(z.object({
    label: z.string().max(42),
    description: z.string().max(80).optional(),
    recommended: z.boolean(),
  })).min(2).max(4),
  customPlaceholder: z.string(),
  resolvedCommitment: z.object({
    title: z.string(),
    state: z.enum(["confirmed", "needs_clarification", "unsure", "resolved"]),
    confidence: z.number().int().min(0).max(100),
    estimatedDuration: z.string(),
    explanation: z.string(),
  }),
});

const GeneratedRoadmapStepSchema = z.object({
  id: z.string(),
  goalId: z.string(),
  title: z.string(),
  description: z.string(),
  scheduledDate: z.string(),
  scheduledDateRange: z.string(),
  tasks: z.array(GeneratedPlanTaskSchema).min(1).max(4),
  status: z.enum(["scheduled", "in_progress", "upcoming"]),
});

const GeneratedCoreSchema = z.object({
  commitments: z.array(CommitmentSchema).min(1).max(8),
  clarificationQuestions: z.array(GeneratedClarificationQuestionSchema).min(1).max(6),
  timelineEvents: z.array(GeneratedTimelineEventSchema).min(3).max(8),
  resolvedTimelineEvents: z.array(GeneratedTimelineEventSchema).min(3).max(8),
  conflict: ConflictSchema,
  planTasks: z.array(GeneratedPlanTaskSchema).min(1).max(10),
  roadmapSteps: z.array(GeneratedRoadmapStepSchema).min(1).max(6),
  rationale: RationaleSchema,
});

const FootprintSchema = z.object({
  createdAt: z.string(),
  currentDate: z.string(),
  provider: z.enum(["vercel-ai-gateway", "fallback"]),
  status: z.enum(["success", "fallback", "error"]),
  model: z.string().optional(),
  sourceSummary: z.object({
    totalSources: z.number().int().min(0),
    realSources: z.number().int().min(0),
    ocrReadySources: z.number().int().min(0),
  }),
  sources: z.array(SourceSchema),
  commitments: z.array(CommitmentSchema).min(1),
  clarificationQuestions: z.array(ClarificationQuestionSchema).min(1),
  timelineEvents: z.array(TimelineEventSchema).min(1),
  resolvedTimelineEvents: z.array(TimelineEventSchema).min(1),
  conflict: ConflictSchema,
  planTasks: z.array(PlanTaskSchema).min(1),
  roadmapSteps: z.array(RoadmapStepSchema).min(1),
  rationale: RationaleSchema,
  goalResearch: GoalResearchSchema.optional(),
  agentLogs: z.array(AgentLogSchema).min(5),
  sponsorTrace: z.array(z.object({
    provider: z.string(),
    action: z.string(),
    status: z.enum(["success", "fallback", "error"]),
    detail: z.string(),
  })),
});

export const AnalyseStudentChaosRequestSchema = z.object({
  currentDate: z.string().default("2026-06-09"),
  sources: z.array(SourceSchema).default([]),
  sourceContext: z.unknown().optional(),
});

export type AnalyseStudentChaosRequest = z.infer<typeof AnalyseStudentChaosRequestSchema>;
type GeneratedCore = z.infer<typeof GeneratedCoreSchema>;
type GeneratedTimelineEvent = z.infer<typeof GeneratedTimelineEventSchema>;
type GeneratedPlanTask = z.infer<typeof GeneratedPlanTaskSchema>;
type GeneratedClarificationQuestion = z.infer<typeof GeneratedClarificationQuestionSchema>;
type GeneratedRoadmapStep = z.infer<typeof GeneratedRoadmapStepSchema>;
type AnalyseStudentChaosOptions = {
  onEvent?: (event: AnalyseStudentChaosStreamEvent) => void | Promise<void>;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function parseJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Planner response did not contain a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

const defaultSources: CapturedSourceForAI[] = [
  {
    id: "whatsapp-screenshot",
    title: "WhatsApp project chat.jpg",
    source: "WhatsApp Screenshot",
    snippet: "Team chat: project meeting may move because Sarah has CCA and tuition.",
    fileType: "image",
  },
  {
    id: "physics-homework-pdf",
    title: "Physics Chapter 12 homework.pdf",
    source: "Homework PDF",
    snippet: "Worksheet due tomorrow 8 AM with Chapter 12 induction questions.",
    fileType: "pdf",
  },
  {
    id: "calendar-conflict",
    title: "Tuition calendar clash.png",
    source: "Calendar Conflict",
    snippet: "Tuition is fixed from 4:30-6:30 PM, overlapping the CCA briefing.",
    fileType: "image",
  },
  {
    id: "cca-screenshot",
    title: "CCA announcement screenshot.jpg",
    source: "CCA Announcement",
    snippet: "Briefing starts at 5:30 PM today in the auditorium.",
    fileType: "image",
  },
  {
    id: "coding-goal",
    title: "goalDemo.txt",
    source: "Long-term Coding Goal",
    snippet: "I have zero Python experience and want to be proficient with data-handling libraries by year end.",
    fileType: "text",
  },
  {
    id: "team-project-message",
    title: "Team project follow-up",
    source: "Team Message",
    snippet: "Ask teammate first before locking tonight's project discussion.",
    fileType: "text",
  },
];

function sourceText(source: CapturedSourceForAI) {
  return [
    source.title,
    source.source,
    source.snippet,
    source.sourceSummary,
    source.extractedTasks?.join("\n"),
    source.clarificationPrompt,
    source.ocrText,
    source.textractText,
  ]
    .filter(Boolean)
    .join("\n");
}

function sourceStats(sources: CapturedSourceForAI[]) {
  return {
    totalSources: sources.length,
    realSources: sources.filter((source) => source.provider && source.provider !== "mock").length,
    ocrReadySources: sources.filter((source) => source.ocrText || source.textractText || source.sourceSummary || source.sponsorStatus === "extracted").length,
  };
}

function broadGoalEvidence(sources: CapturedSourceForAI[]) {
  return sources
    .map(sourceText)
    .find((text) => /goal|learn|coding|python|hackathon|competition|scholarship|portfolio/i.test(text));
}

function defaultObservableLogs(
  sources: CapturedSourceForAI[],
  reason: string,
  goalResearch?: StudentOSAgentFootprint["goalResearch"],
): AIAgentLog[] {
  const stats = sourceStats(sources);

  return [
    {
      id: "source-evidence",
      at: 0,
      kind: "analysis",
      title: "Reading captured sources",
      body: `Loaded ${stats.totalSources} submitted ${stats.totalSources === 1 ? "source" : "sources"} from the input step.`,
      detail:
        stats.ocrReadySources > 0
          ? `${stats.ocrReadySources} source ${stats.ocrReadySources === 1 ? "has" : "have"} OCR or interpreted text attached.`
          : "No OCR or interpreted text was attached, so StudentOS used titles, snippets, and manual text.",
    },
    {
      id: "source-summary",
      at: 250,
      kind: "tool",
      title: "Source evidence loaded",
      body: "StudentOS prepared the source packet for planning.",
      tool: {
        provider: "StudentOS",
        result: `${stats.realSources} provider-backed sources, ${stats.ocrReadySources} OCR/text-ready sources.`,
      },
    },
    {
      id: "goal-research",
      at: 500,
      kind: "tool",
      title: goalResearch ? "Goal research attached" : "Goal research skipped",
      body: goalResearch
        ? "Exa context is included in the final planning input."
        : "No live goal research was available for this run.",
      tool: {
        provider: "Exa",
        result: goalResearch
          ? `${goalResearch.citations.length} citations for ${goalResearch.query}.`
          : "Planner continued with supplied evidence only.",
      },
    },
    {
      id: "planner-fallback",
      at: 750,
      kind: "decision",
      title: "Fallback planner selected",
      body: "StudentOS used its fallback footprint because the live planner could not complete this run.",
      detail: reason,
    },
    {
      id: "fallback-footprint",
      at: 1000,
      kind: "footprint",
      title: "Fallback footprint ready",
      body: "The review screen can render commitments, questions, conflicts, roadmap, and plan data.",
      tool: {
        provider: "StudentOS",
        result: "Structured fallback footprint assembled.",
      },
    },
  ];
}

function fallbackFootprint(
  input: AnalyseStudentChaosRequest,
  reason: string,
  goalResearch?: StudentOSAgentFootprint["goalResearch"],
  agentLogs?: AIAgentLog[],
): StudentOSAgentFootprint {
  const sources = input.sources.length ? input.sources : defaultSources;
  const trace: StudentOSAgentFootprint["sponsorTrace"] = [
    {
      provider: "Vercel AI Gateway",
      action: "Generated student chaos analysis fallback",
      status: "fallback" as const,
      detail: reason,
    },
  ];

  if (goalResearch) {
    trace.unshift({
      provider: goalResearch.model ? "Vercel AI Gateway + Exa" : "Exa",
      action: "Deep researched broad goal context",
      status: "success" as const,
      detail: `${goalResearch.searchQueries?.length ?? 1} Exa searches and ${goalResearch.citations.length} citations returned for ${goalResearch.query}.`,
    });
  }

  return {
    createdAt: new Date().toISOString(),
    currentDate: input.currentDate,
    provider: "fallback",
    status: "fallback",
    sourceSummary: sourceStats(sources),
    sources,
    commitments: [
      {
        id: "physics",
        title: "Physics worksheet due tomorrow 8 AM",
        type: "task",
        source: "AWS Textract",
        confidence: 94,
        estimatedDuration: "35min",
        state: "confirmed",
        explanation: "Detected from the uploaded homework source.",
      },
      {
        id: "cca",
        title: "CCA briefing at 5:30 PM",
        type: "event",
        source: "CCA announcement",
        confidence: 91,
        estimatedDuration: "45min",
        state: "confirmed",
        explanation: "Fixed event extracted from the CCA source.",
      },
      {
        id: "competition",
        title: "Competition submission: 11 June, 12 AM",
        type: "deadline",
        source: "Web link",
        confidence: 92,
        estimatedDuration: "30min",
        state: "confirmed",
        explanation: "Deadline item with near-term urgency.",
      },
      {
        id: "coding",
        title: "Learn Python data handling by December",
        type: "goal",
        source: goalResearch ? "Exa research + goal note" : "Written note",
        confidence: 84,
        estimatedDuration: "5hr/week",
        state: "needs_clarification",
        explanation: "Broad goal needs target outcome, cadence, and starting point.",
      },
      {
        id: "team",
        title: "Team meeting may need reschedule",
        type: "event",
        source: "Voice note",
        confidence: 66,
        estimatedDuration: "3min",
        state: "unsure",
        explanation: "The source is tentative, so StudentOS asks before scheduling it as fixed.",
      },
    ],
    clarificationQuestions: [
      {
        id: "clarify-coding",
        commitmentId: "coding",
        kind: "goal",
        title: "Clarify coding goal",
        subtitle: "StudentOS needs a few quick details to plan this properly.",
        question: "What does success look like?",
        options: [
          { label: "Build a small app", recommended: true },
          { label: "Portfolio readiness" },
          { label: "Competition prep" },
        ],
        customPlaceholder: "Type your target outcome...",
        resolvedCommitment: {
          state: "confirmed",
          confidence: 92,
          estimatedDuration: "2 sessions/week",
          explanation: "Roadmap ready from AI + Exa context: 6 steps scheduled across Jun-Dec.",
        },
      },
      {
        id: "clarify-team",
        commitmentId: "team",
        kind: "team",
        title: "Clarify team meeting",
        subtitle: "Resolve the uncertainty before StudentOS builds the day.",
        question: "Is this a confirmed meeting or a possible one?",
        options: [
          { label: "Confirmed" },
          { label: "Possible" },
          { label: "Cancelled" },
          { label: "Ask teammate first", recommended: true },
        ],
        customPlaceholder: "Type what this should become...",
        resolvedCommitment: {
          title: "Ask teammate first",
          state: "confirmed",
          confidence: 88,
          estimatedDuration: "3min",
          explanation: "Converted tentative voice note into a 3 minute action.",
        },
      },
    ],
    timelineEvents: [
      { id: "revision", time: "3:30 PM", title: "Revision block", chip: "Flexible" },
      { id: "tuition", time: "4:30 PM", title: "Tuition", duration: "4:30-6:30 PM", chip: "Fixed", conflictGroupId: "tuition-cca" },
      { id: "cca", time: "5:30 PM", title: "CCA briefing", duration: "5:30-6:15 PM", chip: "Needs decision", tone: "conflict", conflictGroupId: "tuition-cca" },
      { id: "dinner", time: "7:00 PM", title: "Dinner", chip: "Fixed" },
      { id: "physics", time: "8:00 PM", title: "Physics worksheet", chip: "High priority", tone: "priority" },
      { id: "coding", time: "9:00 PM", title: "Coding practice", chip: "Weekly goal" },
    ],
    resolvedTimelineEvents: [
      { id: "tuition", time: "4:30 PM", title: "Tuition", duration: "4:30-6:30 PM", chip: "Fixed" },
      { id: "notes", time: "6:40 PM", title: "Get CCA briefing notes", chip: "Handled", tone: "success" },
      { id: "dinner", time: "7:00 PM", title: "Dinner", chip: "Fixed" },
      { id: "revision", time: "7:45 PM", title: "Revision block", chip: "Moved" },
      { id: "physics", time: "8:00 PM", title: "Physics worksheet", chip: "High priority", tone: "priority" },
      { id: "coding", time: "9:00 PM", title: "Coding practice", chip: "Weekly goal" },
    ],
    conflict: {
      title: "CCA briefing overlaps with tuition",
      unresolvedSummary: "You cannot attend both fully.",
      resolvedTitle: "Conflict resolved",
      resolvedSummary: "StudentOS keeps tuition fixed and handles CCA with a notes request.",
      fixedEventTitle: "Tuition",
      fixedEventTime: "4:30-6:30 PM",
      conflictingEventTitle: "CCA briefing",
      conflictingEventTime: "5:30-6:15 PM",
      overlapLabel: "45 min",
      impactLabel: "Decision needed",
      resolvedImpactLabel: "Plan ready",
      recommendationSummary: "Keep tuition fixed, ask your CCA lead for briefing notes, and move revision after dinner.",
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
    },
    planTasks: [
      { id: "physics-focus", title: "Finish Physics worksheet", section: "do_now", estimatedMinutes: 35, timeLabel: "Now", deadline: "tomorrow 8 AM", deadlineDateId: "2026-06-10", reason: "Submit before school", scheduleRationale: "StudentOS makes Physics the immediate focus because it is due tomorrow at 8 AM and needs the clearest remaining attention before the evening gets fragmented.", source: "AWS Textract" },
      { id: "message-teammate", title: "Message teammate", section: "do_next", estimatedMinutes: 3, timeLabel: "After Physics", reason: "Clarifies the tentative team meeting", scheduleRationale: "The teammate message is placed after Physics because it is a 3 minute clarification task that should not interrupt the high-focus deadline work.", source: "Voice note" },
      { id: "cca-notes", title: "Ask CCA lead for briefing notes", section: "do_next", estimatedMinutes: 5, timeLabel: "Before briefing", reason: "Resolves the CCA and tuition clash", scheduleRationale: "StudentOS schedules this before the briefing so the CCA lead can capture notes during the event while the student stays in tuition.", source: "CCA announcement" },
      { id: "tuition", title: "Tuition", section: "do_next", timeLabel: "4:30-6:30 PM", reason: "Fixed calendar block", scheduleRationale: "Tuition is kept at 4:30-6:30 PM because it is externally fixed; the planner moves flexible work around it instead of pretending it can bend.", source: "Calendar" },
      { id: "revision", title: "Revision block", section: "do_next", estimatedMinutes: 45, timeLabel: "7:45 PM", reason: "Moved after dinner", scheduleRationale: "Revision moves to 7:45 PM because it is flexible and lighter than deadline homework, making it a better post-dinner block.", source: "Plan" },
      { id: "coding-practice", title: "Python data-handling practice", section: "do_next", estimatedMinutes: 60, timeLabel: "9:00 PM", deadline: "December", deadlineDateId: "2026-12-31", reason: "Exa-grounded goal roadmap started", scheduleRationale: "Coding practice is scheduled at 9:00 PM because it advances the December goal without stealing the student’s strongest focus from tomorrow’s Physics deadline.", source: "Exa + Goal", goalId: "learn-coding", isRoadmapTask: true },
      { id: "coding-fundamentals-session-1", title: "Coding fundamentals - Session 1", section: "subsequent_days", estimatedMinutes: 30, scheduledDate: "17 June", scheduledDateId: "2026-06-17", deadline: "December", deadlineDateId: "2026-12-31", reason: "First scheduled step for the coding goal", scheduleRationale: "The first coding fundamentals session starts on 17 June so the student gets a near-term next action after immediate school deadlines clear.", source: "Goal roadmap", goalId: "learn-coding", isRoadmapTask: true },
      { id: "mini-project-brief", title: "Build mini project brief", section: "subsequent_days", estimatedMinutes: 45, scheduledDate: "24 June", scheduledDateId: "2026-06-24", deadline: "December", deadlineDateId: "2026-12-31", reason: "Turns the broad goal into a concrete build", scheduleRationale: "The mini-project brief is placed on 24 June after a fundamentals session so the student defines a build only after getting basic syntax context.", source: "Goal roadmap", goalId: "learn-coding", isRoadmapTask: true },
    ],
    roadmapSteps: [
      {
        id: "define-outcome",
        goalId: "learn-coding",
        title: "Define target outcome",
        scheduledDate: "16 June",
        description: "Choose whether success means an app, portfolio readiness, or competition prep.",
        status: "scheduled",
        tasks: [{ id: "define-coding-outcome", title: "Define coding target outcome", section: "subsequent_days", estimatedMinutes: 20, scheduledDate: "16 June", scheduledDateId: "2026-06-16", deadline: "December", deadlineDateId: "2026-12-31", goalId: "learn-coding", isRoadmapTask: true }],
      },
      {
        id: "fundamentals",
        goalId: "learn-coding",
        title: "Python fundamentals sprint",
        scheduledDateRange: "17-30 June",
        description: "Build syntax confidence before moving into data handling.",
        status: "in_progress",
        tasks: [{ id: "coding-fundamentals-session-1", title: "Coding fundamentals - Session 1", section: "subsequent_days", estimatedMinutes: 30, scheduledDate: "17 June", scheduledDateId: "2026-06-17", deadline: "December", deadlineDateId: "2026-12-31", goalId: "learn-coding", isRoadmapTask: true }],
      },
      {
        id: "data-handling-project",
        goalId: "learn-coding",
        title: "Data-handling mini project",
        scheduledDateRange: "July-August",
        description: "Use pandas or similar tooling on a real CSV so the goal becomes demonstrable.",
        status: "upcoming",
        tasks: [{ id: "mini-project-brief", title: "Build mini project brief", section: "subsequent_days", estimatedMinutes: 45, scheduledDate: "24 June", scheduledDateId: "2026-06-24", deadline: "December", deadlineDateId: "2026-12-31", goalId: "learn-coding", isRoadmapTask: true }],
      },
    ],
    rationale: {
      summary: "StudentOS extracted real commitments, researched the broad coding goal, kept fixed events stable, resolved the CCA clash, and turned the evening into a realistic execution plan.",
      bullets: [
        "Physics stays first because it has the nearest hard deadline.",
        "Tuition is treated as fixed, so CCA gets a lightweight notes request.",
        "The broad coding goal becomes scheduled roadmap work instead of a vague intention.",
        "Flexible revision moves after dinner to avoid crowding the deadline task.",
      ],
    },
    goalResearch,
    agentLogs: agentLogs?.length ? agentLogs : defaultObservableLogs(sources, reason, goalResearch),
    sponsorTrace: trace,
  };
}

function mergeSponsorTrace(
  primary: StudentOSAgentFootprint["sponsorTrace"],
  fallback: StudentOSAgentFootprint["sponsorTrace"],
) {
  const seen = new Set(primary.map((item) => `${item.provider}:${item.action}`));

  return [
    ...primary,
    ...fallback.filter((item) => {
      const key = `${item.provider}:${item.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}

async function researchGoalContext(sources: CapturedSourceForAI[]): Promise<StudentOSAgentFootprint["goalResearch"] | undefined> {
  const broadGoal = broadGoalEvidence(sources);

  if (!broadGoal || !isExaReady()) return undefined;

  return withTimeout(
    deepResearchGoal(broadGoal.slice(0, 1200)),
    8000,
    "Exa fast goal research",
  );
}

function optionalText(value: string) {
  return value.trim() ? value : undefined;
}

function normalizeTimelineEvent(event: GeneratedTimelineEvent) {
  return {
    id: event.id,
    time: event.time,
    title: event.title,
    duration: optionalText(event.duration),
    chip: event.chip,
    tone: event.tone === "none" ? undefined : event.tone,
    conflictGroupId: optionalText(event.conflictGroupId),
    scheduleRationale: optionalText(event.scheduleRationale),
  };
}

function normalizePlanTask(task: GeneratedPlanTask) {
  return {
    id: task.id,
    title: task.title,
    section: task.section,
    estimatedMinutes: task.estimatedMinutes > 0 ? task.estimatedMinutes : undefined,
    timeLabel: optionalText(task.timeLabel),
    scheduledDate: optionalText(task.scheduledDate),
    scheduledDateId: optionalText(task.scheduledDateId),
    scheduledDateRange: optionalText(task.scheduledDateRange),
    deadline: optionalText(task.deadline),
    deadlineDateId: optionalText(task.deadlineDateId),
    reason: optionalText(task.reason),
    scheduleRationale: optionalText(task.scheduleRationale),
    source: optionalText(task.source),
    goalId: optionalText(task.goalId),
    isRoadmapTask: task.isRoadmapTask || undefined,
    updated: task.updated || undefined,
  };
}

function normalizeClarificationQuestion(question: GeneratedClarificationQuestion) {
  return {
    ...question,
    options: question.options.map((option) => ({
      label: option.label,
      description: optionalText(option.description ?? ""),
      recommended: option.recommended || undefined,
    })),
    resolvedCommitment: {
      title: optionalText(question.resolvedCommitment.title),
      state: question.resolvedCommitment.state,
      confidence: question.resolvedCommitment.confidence,
      estimatedDuration: question.resolvedCommitment.estimatedDuration,
      explanation: question.resolvedCommitment.explanation,
    },
  };
}

function normalizeRoadmapStep(step: GeneratedRoadmapStep) {
  return {
    id: step.id,
    goalId: step.goalId,
    title: step.title,
    description: optionalText(step.description),
    scheduledDate: optionalText(step.scheduledDate),
    scheduledDateRange: optionalText(step.scheduledDateRange),
    tasks: step.tasks.flatMap((task) => splitLongStudyTask(normalizePlanTask(task))),
    status: step.status,
  };
}

function normalizeConflictAnalysis(
  conflict: GeneratedCore["conflict"],
  groups: ConfirmedConflictGroup[],
) {
  const firstConfirmedGroup = groups[0];

  if (firstConfirmedGroup) {
    return {
      ...conflict,
      overlapLabel: firstConfirmedGroup.overlapLabel,
    };
  }

  return {
    ...conflict,
    title: "Potential timing conflict needs confirmation",
    unresolvedSummary: "No confirmed overlap was found from the supplied start and end times.",
    resolvedTitle: "Timing reviewed",
    resolvedSummary: "StudentOS removed the conflict flag until exact overlapping times are confirmed.",
    overlapLabel: "Not confirmed",
    impactLabel: "Confirm times",
    resolvedImpactLabel: "No conflict flagged",
    recommendationSummary: "Confirm exact start and end times before treating these tasks as a calendar conflict.",
  };
}

function buildFootprintFromCore({
  core,
  input,
  goalResearch,
  model,
  sponsorTrace,
  agentLogs,
}: {
  core: GeneratedCore;
  input: AnalyseStudentChaosRequest;
  goalResearch?: StudentOSAgentFootprint["goalResearch"];
  model: string;
  sponsorTrace: StudentOSAgentFootprint["sponsorTrace"];
  agentLogs: AIAgentLog[];
}): StudentOSAgentFootprint {
  const sources = input.sources.length ? input.sources : defaultSources;
  const timelineValidation = validateTimelineConflicts(core.timelineEvents.map(normalizeTimelineEvent));
  const resolvedTimelineValidation = validateTimelineConflicts(core.resolvedTimelineEvents.map(normalizeTimelineEvent));
  const footprint: StudentOSAgentFootprint = {
    createdAt: new Date().toISOString(),
    currentDate: input.currentDate,
    provider: "vercel-ai-gateway",
    status: "success",
    model,
    sourceSummary: sourceStats(sources),
    sources,
    commitments: core.commitments,
    clarificationQuestions: core.clarificationQuestions.map(normalizeClarificationQuestion),
    timelineEvents: timelineValidation.events,
    resolvedTimelineEvents: resolvedTimelineValidation.events,
    conflict: normalizeConflictAnalysis(core.conflict, timelineValidation.groups),
    planTasks: splitLongStudyTasks(core.planTasks.map(normalizePlanTask)),
    roadmapSteps: core.roadmapSteps.map(normalizeRoadmapStep),
    rationale: core.rationale,
    goalResearch,
    agentLogs,
    sponsorTrace,
  };

  return FootprintSchema.parse(footprint);
}

async function generateFootprintCore(model: string, input: AnalyseStudentChaosRequest, goalResearch?: StudentOSAgentFootprint["goalResearch"]) {
  const sources = input.sources.length ? input.sources : defaultSources;

  const { text } = await generateText({
    model,
    system:
      "You are StudentOS, an AI chief-of-staff for ambitious students. Return only valid JSON. Do not wrap it in Markdown. Do not expose hidden chain-of-thought; provide concise user-facing rationale only. Preserve the StudentOS narrative: messy sources plus goals plus constraints become commitments, clarification questions, conflict handling, roadmap, realistic daily plan, and replanning data.",
    prompt: JSON.stringify(
      {
        currentDate: input.currentDate,
        sourceContext: input.sourceContext,
        sources: sources.map((source) => ({
          ...source,
          interpretedSummary: source.sourceSummary,
          interpretedTasks: source.extractedTasks,
          sourceNeedsClarification: source.needsClarification,
          sourceClarificationPrompt: source.clarificationPrompt,
          evidenceText: sourceText(source).slice(0, 1400),
        })),
        exaGoalResearch: goalResearch,
        outputContract: {
          commitments: "1-8 items with id, title, type task|event|deadline|goal|conflict, source, confidence 0-100, estimatedDuration, state confirmed|needs_clarification|unsure|resolved, explanation.",
          clarificationQuestions: "1-6 items with id, commitmentId, kind goal|team|general, title, subtitle, question, 2-4 options, customPlaceholder, resolvedCommitment. Every option must include label and recommended boolean.",
          timelineEvents: "3-8 items with id, time, title, duration, chip, tone none|conflict|success|priority, conflictGroupId, scheduleRationale.",
          resolvedTimelineEvents: "3-8 items with same shape as timelineEvents.",
          conflict: "title, unresolvedSummary, resolvedTitle, resolvedSummary, fixedEventTitle, fixedEventTime, conflictingEventTitle, conflictingEventTime, overlapLabel, impactLabel, resolvedImpactLabel, recommendationSummary, 3-6 recommendedActions, 3-6 manualActions.",
          planTasks: "1-10 items with id, title, section do_now|do_next|subsequent_days, estimatedMinutes number, timeLabel, scheduledDate, scheduledDateId, scheduledDateRange, deadline, deadlineDateId, reason, scheduleRationale, source, goalId, isRoadmapTask boolean, updated boolean.",
          roadmapSteps: "1-6 items with id, goalId, title, description, scheduledDate, scheduledDateRange, tasks, status scheduled|in_progress|upcoming.",
          rationale: "summary plus 3-6 bullets.",
          emptyFields: "For unknown optional text, use an empty string. For no tone, use tone='none'. For no estimated minutes, use 0. Do not omit keys from objects.",
        },
        requirements: [
          "Extract commitments from evidence, not generic todo items.",
          "Prefer interpretedSummary and interpretedTasks over raw OCR when they conflict.",
          "If OCR only shows an exam cover page, worksheet cover page, candidate instructions, names, class fields, or index-number boilerplate, do not invent the worksheet task. Create one unclear commitment and ask enough clarification questions to schedule it later, including which worksheet/page/question numbers and when it is due if missing.",
          "If OCR appears to have dropped Chinese or other non-English text, use the interpreted summary when available; otherwise mark the source unclear and ask a review-page clarification.",
          "If one source contains multiple worksheets or actionable messages, split them into separate commitments only when the evidence identifies distinct actions.",
          "Mark broad goals or tentative items with clarification questions. If a commitment is excluded from today's plan for lack of clarity, create 2-3 concrete clarification questions for that commitment rather than relying on a single generic question.",
          "Create a conflict timeline and a resolved timeline.",
          "Only set conflictGroupId for two or more confirmed fixed-time items whose explicit start-end time ranges overlap. Never set conflictGroupId for time-flexible tasks; schedule them around fixed-time items instead. If a time is tentative, missing, or only a possibility, leave conflictGroupId empty and ask a clarification question instead.",
          "Set conflict.overlapLabel to the actual overlap duration calculated from the event time ranges. Do not default to 45 min.",
          "Create a daily plan with do_now, do_next, and subsequent_days tasks.",
          `Where possible, break big goals into steps that each fit within ${MAX_STUDY_SESSION_MINUTES} minutes.`,
          `If a big step cannot be made smaller, split it into multiple non-back-to-back sessions, each no longer than ${MAX_STUDY_SESSION_MINUTES} minutes, titled '[Goal Step] — Session N'.`,
          "For every scheduled task and timeline event, include scheduleRationale: one concise user-facing agent rationale for why that exact time slot or date is a good assignment for that task.",
          "Create roadmap steps for any broad goal, using Exa context when provided.",
          "When Exa goal research includes clarificationQuestions, convert the most important unanswered items into goal clarification questions before finalizing the roadmap.",
          "When Exa goal research includes sections, reflect eligibility, criteria, scope, application steps, deadlines, or deliverables in roadmap tasks instead of only summarizing the topic.",
          "For clarification options, keep label short enough for a button, ideally 2-6 words and at most 42 characters. Put any needed explanation in description, capped at one short line under 80 characters. If no explanation is needed, return an empty description.",
          "For any unknown optional text field, return an empty string. For no tone, return tone='none'. For no estimated minutes, return 0.",
          "Keep titles short enough for a mobile UI.",
        ],
      },
      null,
      2,
    ),
  });

  return GeneratedCoreSchema.parse(parseJsonObject(text));
}

export async function analyseStudentChaos(
  input: AnalyseStudentChaosRequest,
  options: AnalyseStudentChaosOptions = {},
): Promise<StudentOSAgentFootprint> {
  const sources = input.sources.length ? input.sources : defaultSources;
  const normalizedInput = { ...input, sources };
  const startedAt = Date.now();
  const streamedLogs: AIAgentLog[] = [];
  const stats = sourceStats(sources);
  let logSequence = 0;

  let goalResearch: StudentOSAgentFootprint["goalResearch"];
  const sponsorTrace: StudentOSAgentFootprint["sponsorTrace"] = [];

  const observableLogs = () => streamedLogs.slice().sort((a, b) => a.at - b.at);
  const logId = (seed: string) => {
    logSequence += 1;
    const normalizedSeed = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42);
    return `${logSequence}-${normalizedSeed || "event"}`;
  };
  const emitLog = async (log: Omit<AIAgentLog, "id" | "at"> & Partial<Pick<AIAgentLog, "id" | "at">>) => {
    const fullLog: AIAgentLog = {
      id: log.id ?? logId(log.title),
      at: log.at ?? Math.max(0, Date.now() - startedAt),
      kind: log.kind,
      title: log.title,
      body: log.body,
      detail: log.detail,
      tool: log.tool,
    };

    streamedLogs.push(fullLog);
    await options.onEvent?.({ type: "log", log: fullLog });
    return fullLog;
  };
  const emitTrace = async (trace: AISponsorTraceItem) => {
    sponsorTrace.push(trace);
    await options.onEvent?.({ type: "trace", trace });
  };

  await emitLog({
    id: "source-evidence",
    kind: "analysis",
    title: "Reading captured sources",
    body: `Loaded ${stats.totalSources} submitted ${stats.totalSources === 1 ? "source" : "sources"} from the input step.`,
    detail:
      stats.ocrReadySources > 0
        ? `${stats.ocrReadySources} source ${stats.ocrReadySources === 1 ? "has" : "have"} OCR or interpreted text attached.`
        : "No OCR or interpreted text was attached, so StudentOS will use titles, snippets, and manual text.",
  });
  await emitTrace({
    provider: "StudentOS",
    action: "Loaded source evidence",
    status: "success",
    detail: `${stats.totalSources} sources available, ${stats.ocrReadySources} OCR/text-ready.`,
  });
  await emitLog({
    id: "source-evidence-loaded",
    kind: "tool",
    title: "Source evidence loaded",
    body: "Prepared the source packet that will be sent to the planner.",
    tool: {
      provider: "StudentOS",
      result: `${stats.realSources} provider-backed sources, ${stats.ocrReadySources} OCR/text-ready sources.`,
    },
  });

  const goalCandidate = broadGoalEvidence(sources);
  await emitLog({
    id: "goal-research-check",
    kind: "analysis",
    title: "Checking for broad goals",
    body: goalCandidate
      ? "Detected goal-like evidence that may benefit from live research context."
      : "No broad goal evidence needed live research for this run.",
    detail: goalCandidate && !isExaReady() ? "Exa is not configured, so research will be skipped." : undefined,
  });

  try {
    goalResearch = await researchGoalContext(sources);
    const trace: AISponsorTraceItem = {
      provider: goalResearch?.model ? "Vercel AI Gateway + Exa" : "Exa",
      action: "Deep researched broad goal context",
      status: goalResearch ? "success" : "fallback",
      detail: goalResearch
          ? `${goalResearch.searchQueries?.length ?? 1} Exa searches and ${goalResearch.citations.length} citations returned for ${goalResearch.query}.`
          : "No Exa search was needed or Exa was unavailable.",
    };
    await emitTrace(trace);
    await emitLog({
      id: goalResearch ? "goal-research-complete" : "goal-research-skipped",
      kind: "tool",
      title: goalResearch ? "Goal research complete" : "Goal research skipped",
      body: goalResearch
        ? "Attached live goal research context to the planning request."
        : "Continuing with the submitted evidence only.",
      tool: {
        provider: "Exa",
        result: trace.detail,
      },
    });
  } catch (error) {
    const trace: AISponsorTraceItem = {
      provider: "Exa",
      action: "Deep researched broad goal context",
      status: "fallback",
      detail: error instanceof Error ? error.message : "Exa research failed.",
    };
    await emitTrace(trace);
    await emitLog({
      id: "goal-research-failed",
      kind: "tool",
      title: "Goal research failed",
      body: "The planner will continue with the submitted evidence only.",
      tool: {
        provider: "Exa",
        result: trace.detail,
      },
    });
  }

  if (!isVercelAiReady()) {
    const reason = "USE_REAL_VERCEL_AI is disabled or AI_GATEWAY_API_KEY is missing.";
    await emitLog({
      id: "gateway-unavailable",
      kind: "decision",
      title: "Live planner unavailable",
      body: "StudentOS cannot call Vercel AI Gateway in this environment.",
      detail: reason,
    });
    const fallback = fallbackFootprint(normalizedInput, reason, goalResearch, observableLogs());
    await emitLog({
      id: "fallback-footprint-ready",
      kind: "footprint",
      title: "Fallback footprint ready",
      body: "The review screen can render commitments, questions, conflicts, roadmap, and plan data.",
      tool: {
        provider: "StudentOS",
        result: "Structured fallback footprint assembled.",
      },
    });

    return {
      ...fallback,
      sponsorTrace: mergeSponsorTrace(sponsorTrace, fallback.sponsorTrace),
      agentLogs: observableLogs(),
    };
  }

  const primaryModel = sponsorEnv.aiGatewayModel;

  await emitLog({
    id: "gateway-call-started",
    kind: "tool",
    title: "Calling Vercel AI Gateway",
    body: "Sending normalized evidence, current date, and optional Exa context to the planning model.",
    tool: {
      provider: "Vercel AI Gateway",
      result: primaryModel,
    },
  });

  try {
    const result = await withTimeout(
      generateFootprintCore(primaryModel, normalizedInput, goalResearch),
      24000,
      `Vercel AI Gateway ${primaryModel}`,
    );
    await emitTrace({
      provider: "Vercel AI Gateway",
      action: "Generated live StudentOS analysis",
      status: "success",
      detail: `${primaryModel} returned commitments, questions, roadmap, and plan JSON.`,
    });
    await emitLog({
      id: "gateway-response-received",
      kind: "tool",
      title: "Gateway response received",
      body: "The live planner returned structured JSON for commitments, questions, conflicts, roadmap, and plan tasks.",
      tool: {
        provider: "Vercel AI Gateway",
        result: `${primaryModel} completed the planning call.`,
      },
    });
    await emitLog({
      id: "schema-validation",
      kind: "analysis",
      title: "Validating structured footprint",
      body: "Checking the returned JSON against the app schema before storing it for the review screen.",
      detail: "Commitments, clarification questions, timeline events, roadmap steps, and plan tasks are validated together.",
    });

    const footprint = buildFootprintFromCore({
      core: result,
      input: normalizedInput,
      goalResearch,
      model: primaryModel,
      sponsorTrace,
      agentLogs: observableLogs(),
    });

    await emitLog({
      id: "live-footprint-ready",
      kind: "footprint",
      title: "Live footprint ready",
      body: "The review screen can render the completed live analysis.",
      detail: `${footprint.commitments.length} commitments, ${footprint.clarificationQuestions.length} clarification questions, ${footprint.planTasks.length} plan tasks.`,
      tool: {
        provider: "StudentOS",
        result: "Validated footprint stored for the next screen.",
      },
    });

    return {
      ...footprint,
      agentLogs: observableLogs(),
    };
  } catch (primaryError) {
    const reason = primaryError instanceof Error
      ? `${primaryError.message.replace(/\.$/, "")}. Skipped model retry to preserve the 30 second transition budget.`
      : "Unknown Gateway error. Skipped model retry to preserve the 30 second transition budget.";
    await emitTrace({
      provider: "Vercel AI Gateway",
      action: "Generated student chaos analysis fallback",
      status: "fallback",
      detail: reason,
    });
    await emitLog({
      id: "gateway-fallback-selected",
      kind: "decision",
      title: "Gateway fallback selected",
      body: "The live planner did not complete cleanly, so StudentOS is keeping the flow moving with a fallback footprint.",
      detail: reason,
    });
    const fallback = fallbackFootprint(
      normalizedInput,
      reason,
      goalResearch,
      observableLogs(),
    );
    await emitLog({
      id: "fallback-footprint-ready",
      kind: "footprint",
      title: "Fallback footprint ready",
      body: "The review screen can render commitments, questions, conflicts, roadmap, and plan data.",
      tool: {
        provider: "StudentOS",
        result: "Structured fallback footprint assembled.",
      },
    });

    return {
      ...fallback,
      sponsorTrace: mergeSponsorTrace(sponsorTrace, fallback.sponsorTrace),
      agentLogs: observableLogs(),
    };
  }
}

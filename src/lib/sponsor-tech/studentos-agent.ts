import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { deepResearchGoal } from "@/lib/sponsor-tech/exa";
import { isExaReady, isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";
import type { StudentOSAgentFootprint, CapturedSourceForAI } from "@/lib/studentos-ai-types";

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
    label: z.string(),
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

const GeneratedAgentLogSchema = z.object({
  id: z.string(),
  at: z.number().int().min(0),
  kind: z.enum(["thought", "analysis", "tool", "decision", "footprint"]),
  title: z.string(),
  body: z.string(),
  detail: z.string(),
  toolProvider: z.enum(["none", "AWS", "Exa", "Vercel AI Gateway", "StudentOS"]),
  toolResult: z.string(),
});

const GeneratedCoreSchema = z.object({
  commitments: z.array(CommitmentSchema).min(1).max(8),
  clarificationQuestions: z.array(GeneratedClarificationQuestionSchema).min(1).max(4),
  timelineEvents: z.array(GeneratedTimelineEventSchema).min(3).max(8),
  resolvedTimelineEvents: z.array(GeneratedTimelineEventSchema).min(3).max(8),
  conflict: ConflictSchema,
  planTasks: z.array(GeneratedPlanTaskSchema).min(1).max(10),
  roadmapSteps: z.array(GeneratedRoadmapStepSchema).min(1).max(6),
  rationale: RationaleSchema,
  agentLogs: z.array(GeneratedAgentLogSchema).min(5).max(8),
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
type GeneratedAgentLog = z.infer<typeof GeneratedAgentLogSchema>;

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

function fallbackFootprint(
  input: AnalyseStudentChaosRequest,
  reason: string,
  goalResearch?: StudentOSAgentFootprint["goalResearch"],
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
    agentLogs: [
      { id: "read", at: 0, kind: "thought", title: "Reading source packet", body: "StudentOS is using the captured sources as evidence, including OCR text when AWS returned it.", detail: `${sources.length} sources available.` },
      { id: "aws", at: 900, kind: "tool", title: "Using AWS extraction", body: "Loaded source snippets and Textract-ready text from the input layer.", tool: { provider: "AWS", result: `${sourceStats(sources).ocrReadySources} OCR/text-ready sources.` } },
      { id: "exa", at: 1900, kind: "tool", title: "Researching broad goal context", body: goalResearch ? "Exa returned web context for the broad coding goal." : "Exa was unavailable, so StudentOS used a fallback goal roadmap.", tool: { provider: "Exa", result: goalResearch ? `${goalResearch.citations.length} citations returned.` : "Fallback roadmap used." } },
      { id: "extract", at: 3100, kind: "analysis", title: "Extracting commitments and questions", body: "The agent separated fixed events, deadlines, tentative items, and long-term goals." },
      { id: "conflict", at: 4700, kind: "decision", title: "Resolving schedule conflict", body: "Tuition and CCA overlap, so StudentOS recommends preserving tuition and requesting CCA notes." },
      { id: "plan", at: 6500, kind: "footprint", title: "Building live execution plan", body: "The final plan is now written as structured JSON for the review and roadmap screens.", tool: { provider: "Vercel AI Gateway", result: reason } },
    ],
    sponsorTrace: trace,
  };
}

async function researchGoalContext(sources: CapturedSourceForAI[]): Promise<StudentOSAgentFootprint["goalResearch"] | undefined> {
  const broadGoal = sources
    .map(sourceText)
    .find((text) => /goal|learn|coding|python|hackathon|competition|scholarship|portfolio/i.test(text));

  if (!broadGoal || !isExaReady()) return undefined;

  return withTimeout(
    deepResearchGoal(broadGoal.slice(0, 1200)),
    90000,
    "Vercel AI Gateway + Exa deep research",
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
    tasks: step.tasks.map(normalizePlanTask),
    status: step.status,
  };
}

function normalizeAgentLog(log: GeneratedAgentLog) {
  return {
    id: log.id,
    at: log.at,
    kind: log.kind,
    title: log.title,
    body: log.body,
    detail: optionalText(log.detail),
    tool:
      log.toolProvider === "none"
        ? undefined
        : {
            provider: log.toolProvider,
            result: log.toolResult,
          },
  };
}

function buildFootprintFromCore({
  core,
  input,
  goalResearch,
  model,
  sponsorTrace,
}: {
  core: GeneratedCore;
  input: AnalyseStudentChaosRequest;
  goalResearch?: StudentOSAgentFootprint["goalResearch"];
  model: string;
  sponsorTrace: StudentOSAgentFootprint["sponsorTrace"];
}): StudentOSAgentFootprint {
  const sources = input.sources.length ? input.sources : defaultSources;
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
    timelineEvents: core.timelineEvents.map(normalizeTimelineEvent),
    resolvedTimelineEvents: core.resolvedTimelineEvents.map(normalizeTimelineEvent),
    conflict: core.conflict,
    planTasks: core.planTasks.map(normalizePlanTask),
    roadmapSteps: core.roadmapSteps.map(normalizeRoadmapStep),
    rationale: core.rationale,
    goalResearch,
    agentLogs: core.agentLogs.map(normalizeAgentLog),
    sponsorTrace,
  };

  return FootprintSchema.parse(footprint);
}

async function generateFootprintCore(model: string, input: AnalyseStudentChaosRequest, goalResearch?: StudentOSAgentFootprint["goalResearch"]) {
  const sources = input.sources.length ? input.sources : defaultSources;

  const { output } = await generateText({
    model,
    output: Output.object({ schema: GeneratedCoreSchema }),
    system:
      "You are StudentOS, an AI chief-of-staff for ambitious students. Return structured data only. Do not expose hidden chain-of-thought; instead provide concise observable agent actions, decisions, and user-facing rationale. Preserve the StudentOS narrative: messy sources plus goals plus constraints become commitments, clarification questions, conflict handling, roadmap, realistic daily plan, and replanning data.",
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
        requirements: [
          "Extract commitments from evidence, not generic todo items.",
          "Prefer interpretedSummary and interpretedTasks over raw OCR when they conflict.",
          "If OCR only shows an exam cover page, worksheet cover page, candidate instructions, names, class fields, or index-number boilerplate, do not invent the worksheet task. Create one unclear commitment and a clarification question asking which worksheet/page/question numbers the student wants handled.",
          "If OCR appears to have dropped Chinese or other non-English text, use the interpreted summary when available; otherwise mark the source unclear and ask a review-page clarification.",
          "If one source contains multiple worksheets or actionable messages, split them into separate commitments only when the evidence identifies distinct actions.",
          "Mark broad goals or tentative items with clarification questions.",
          "Create a conflict timeline and a resolved timeline.",
          "Create a daily plan with do_now, do_next, and subsequent_days tasks.",
          "For every scheduled task and timeline event, include scheduleRationale: one concise user-facing agent rationale for why that exact time slot or date is a good assignment for that task.",
          "Create roadmap steps for any broad goal, using Exa context when provided.",
          "When Exa goal research includes clarificationQuestions, convert the most important unanswered items into goal clarification questions before finalizing the roadmap.",
          "When Exa goal research includes sections, reflect eligibility, criteria, scope, application steps, deadlines, or deliverables in roadmap tasks instead of only summarizing the topic.",
          "For any unknown optional text field, return an empty string. For no tone, return tone='none'. For no estimated minutes, return 0.",
          "Agent logs must describe observable actions only: reading evidence, using AWS, researching with Exa, extracting commitments, resolving conflict, building plan.",
          "Keep titles short enough for a mobile UI.",
        ],
      },
      null,
      2,
    ),
  });

  return output;
}

export async function analyseStudentChaos(input: AnalyseStudentChaosRequest): Promise<StudentOSAgentFootprint> {
  const sources = input.sources.length ? input.sources : defaultSources;
  const normalizedInput = { ...input, sources };

  let goalResearch: StudentOSAgentFootprint["goalResearch"];
  const sponsorTrace: StudentOSAgentFootprint["sponsorTrace"] = [
    {
      provider: "AWS",
      action: "Loaded source evidence",
      status: "success" as const,
      detail: `${sourceStats(sources).totalSources} sources available, ${sourceStats(sources).ocrReadySources} OCR/text-ready.`,
    },
  ];

  try {
    goalResearch = await researchGoalContext(sources);
    sponsorTrace.push({
      provider: goalResearch?.model ? "Vercel AI Gateway + Exa" : "Exa",
      action: "Deep researched broad goal context",
      status: goalResearch ? "success" : "fallback",
      detail: goalResearch
        ? `${goalResearch.searchQueries?.length ?? 1} Exa searches and ${goalResearch.citations.length} citations returned for ${goalResearch.query}.`
        : "No Exa search was needed or Exa was unavailable.",
    });
  } catch (error) {
    sponsorTrace.push({
      provider: "Exa",
      action: "Deep researched broad goal context",
      status: "fallback",
      detail: error instanceof Error ? error.message : "Exa research failed.",
    });
  }

  if (!isVercelAiReady()) {
    const fallback = fallbackFootprint(normalizedInput, "USE_REAL_VERCEL_AI is disabled or AI_GATEWAY_API_KEY is missing.", goalResearch);
    return {
      ...fallback,
      sponsorTrace: [...sponsorTrace, ...fallback.sponsorTrace],
    };
  }

  const primaryModel = sponsorEnv.aiGatewayModel;
  const fallbackModel = sponsorEnv.aiGatewayFallbackModel;

  try {
    const result = await withTimeout(
      generateFootprintCore(primaryModel, normalizedInput, goalResearch),
      26000,
      `Vercel AI Gateway ${primaryModel}`,
    );
    const trace = [
      ...sponsorTrace,
      {
        provider: "Vercel AI Gateway",
        action: "Generated live StudentOS analysis",
        status: "success" as const,
        detail: `${primaryModel} returned commitments, questions, roadmap, and plan JSON.`,
      },
    ];

    return buildFootprintFromCore({
      core: result,
      input: normalizedInput,
      goalResearch,
      model: primaryModel,
      sponsorTrace: trace,
    });
  } catch (primaryError) {
    if (fallbackModel && fallbackModel !== primaryModel) {
      try {
        const result = await withTimeout(
          generateFootprintCore(fallbackModel, normalizedInput, goalResearch),
          18000,
          `Vercel AI Gateway ${fallbackModel}`,
        );
        const trace = [
          ...sponsorTrace,
          {
            provider: "Vercel AI Gateway",
            action: "Generated live StudentOS analysis",
            status: "success" as const,
            detail: `${fallbackModel} returned structured JSON after ${primaryModel} failed.`,
          },
        ];

        return buildFootprintFromCore({
          core: result,
          input: normalizedInput,
          goalResearch,
          model: fallbackModel,
          sponsorTrace: trace,
        });
      } catch (fallbackError) {
        const fallback = fallbackFootprint(
          normalizedInput,
          `Gateway failed: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : primaryError instanceof Error
                ? primaryError.message
                : "Unknown Gateway error"
          }`,
          goalResearch,
        );

        return {
          ...fallback,
          sponsorTrace: [...sponsorTrace, ...fallback.sponsorTrace],
        };
      }
    }

    const fallback = fallbackFootprint(
      normalizedInput,
      primaryError instanceof Error ? primaryError.message : "Unknown Gateway error",
      goalResearch,
    );

    return {
      ...fallback,
      sponsorTrace: [...sponsorTrace, ...fallback.sponsorTrace],
    };
  }
}

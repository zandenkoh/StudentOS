import "server-only";

import { streamText } from "ai";
import { z } from "zod";
import { deepResearchGoal, generateResearchQueryPlan } from "@/lib/sponsor-tech/exa";
import { gatewayLanguageModel } from "@/lib/sponsor-tech/ai-gateway-model";
import { isExaReady, isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";
import { isFixedTimeConflictCandidate, validateTimelineConflicts, type ConfirmedConflictGroup } from "@/lib/schedule-conflicts";
import { MAX_STUDY_SESSION_MINUTES, splitLongStudyTask, splitLongStudyTasks } from "@/lib/session-splitting";
import { ensureTaskTimeRanges, type BusyTimeBlock } from "@/lib/time-scheduling";
import type {
  AIAgentLog,
  AISponsorTraceItem,
  AnalyseStudentChaosStreamEvent,
  CapturedSourceForAI,
  StudentOSAgentFootprint,
} from "@/lib/studentos-ai-types";

const FAST_CONTEXT_RESEARCH_TIMEOUT_MS = 4500;
const GATEWAY_FOOTPRINT_TIMEOUT_MS = 12000;
const GATEWAY_REASONING_BUDGET_TOKENS = 2000;
const GATEWAY_REASONING_LOG_MIN_INTERVAL_MS = 250;

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
  extractedEvidence: z.array(z.string()).optional(),
  sourceConfidence: z.number().min(0).max(1).optional(),
  languageNotes: z.string().optional(),
  needsClarification: z.boolean().optional(),
  clarificationPrompt: z.string().optional(),
  durationSeconds: z.number().optional(),
});

const DurationLabelSchema = z.union([z.string(), z.number()]).transform((value) =>
  typeof value === "number" ? `${value}min` : value,
);

const CommitmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["task", "event", "deadline", "goal", "conflict"]),
  source: z.string(),
  confidence: z.number().int().min(0).max(100),
  estimatedDuration: DurationLabelSchema,
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
    estimatedDuration: DurationLabelSchema.optional(),
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
  filteredResultCount: z.number().optional(),
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
    estimatedDuration: DurationLabelSchema,
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
  currentDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  sources: z.array(SourceSchema).default([]),
  sourceContext: z.unknown().optional(),
  strictJudgeMode: z.boolean().optional(),
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
type GatewayReasoningDeltaHandler = (text: string) => void | Promise<void>;

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

function gatewayReasoningProviderOptions(model: string) {
  const isClaude46 = /claude-(?:opus|sonnet)-4\.6/i.test(model);

  if (isClaude46) {
    return {
      anthropic: {
        thinking: { type: "adaptive" },
      },
      bedrock: {
        reasoningConfig: { type: "adaptive" },
      },
    };
  }

  return {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: GATEWAY_REASONING_BUDGET_TOKENS,
      },
    },
    bedrock: {
      reasoningConfig: {
        type: "enabled",
        budgetTokens: GATEWAY_REASONING_BUDGET_TOKENS,
      },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function enumValue<const T extends readonly string[]>(value: unknown, options: T, fallback: T[number]) {
  return typeof value === "string" && options.includes(value) ? value : fallback;
}

function slugFrom(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return slug || fallback;
}

function coerceActionArray(value: unknown, fallbacks: string[]) {
  const actions = Array.isArray(value)
    ? value.map((item) => textValue(item)).filter(Boolean)
    : [];

  for (const fallback of fallbacks) {
    if (actions.length >= 3) break;
    if (!actions.includes(fallback)) actions.push(fallback);
  }

  return actions.slice(0, 6);
}

function looksLikeAssignmentDetailsQuestion(question: string) {
  return /assignment|worksheet|homework|page|question|prompt|due/i.test(question);
}

function looksLikeFieldPickerOptions(options: Array<{ label: string; recommended: boolean }>) {
  const labels = options.map((option) => option.label.toLowerCase()).join(" | ");

  return (
    /\b(prompt text|question range|page numbers|question numbers|both)\b/.test(labels) ||
    (/\bunsure\b/.test(labels) && /\b(page|question|prompt|range)\b/.test(labels))
  );
}

function assignmentDetailOptions(question: string) {
  const lowerQuestion = question.toLowerCase();
  const asksForWorksheetScope = /worksheet|page|question number|question range/.test(lowerQuestion);

  if (asksForWorksheetScope) {
    return [
      { label: "Whole worksheet", recommended: true },
      { label: "Selected questions", recommended: false },
      { label: "Need to check", recommended: false },
      { label: "Ask teacher first", recommended: false },
    ];
  }

  return [
    { label: "Use full prompt", recommended: true },
    { label: "Selected questions", recommended: false },
    { label: "Need to check", recommended: false },
    { label: "Ask teacher first", recommended: false },
  ];
}

function guidedGoalClarificationOptions(question: string) {
  const lowerQuestion = question.toLowerCase();

  if (/session|cadence|week|time|often|schedule/.test(lowerQuestion)) {
    return [
      { label: "1 session/week", recommended: false },
      { label: "2 sessions/week", recommended: true },
      { label: "3 sessions/week", recommended: false },
      { label: "Short daily reps", recommended: false },
    ];
  }

  if (/starting|start|level|experience|background|already|know/.test(lowerQuestion)) {
    return [
      { label: "Starting from basics", recommended: true },
      { label: "Some experience", recommended: false },
      { label: "Already practicing", recommended: false },
      { label: "Need diagnostic first", recommended: false },
    ];
  }

  if (/deadline|when|target date|date|finish/.test(lowerQuestion)) {
    return [
      { label: "This week", recommended: false },
      { label: "This month", recommended: true },
      { label: "This term", recommended: false },
      { label: "No fixed deadline", recommended: false },
    ];
  }

  return [
    { label: "Build a project", recommended: true },
    { label: "Improve grades", recommended: false },
    { label: "Learn a skill", recommended: false },
    { label: "Prepare for event", recommended: false },
  ];
}

function guidedGeneralClarificationOptions(question: string) {
  const lowerQuestion = question.toLowerCase();

  if (/event|meeting|confirmed|possible/.test(lowerQuestion)) {
    return [
      { label: "Confirmed event", recommended: true },
      { label: "Possible event", recommended: false },
      { label: "Need to confirm", recommended: false },
      { label: "Cancel it", recommended: false },
    ];
  }

  if (/due|deadline|when/.test(lowerQuestion)) {
    return [
      { label: "Due today", recommended: false },
      { label: "Due tomorrow", recommended: true },
      { label: "Due this week", recommended: false },
      { label: "No clear deadline", recommended: false },
    ];
  }

  return [
    { label: "School task", recommended: true },
    { label: "Personal goal", recommended: false },
    { label: "Fixed event", recommended: false },
    { label: "Need to check", recommended: false },
  ];
}

function guidedOptionsForClarification(kind: unknown, question: string) {
  return kind === "goal"
    ? guidedGoalClarificationOptions(question)
    : guidedGeneralClarificationOptions(question);
}

function broadGoalCommitments(core: Record<string, unknown>) {
  if (!Array.isArray(core.commitments)) return [];

  return core.commitments.filter((commitment): commitment is Record<string, unknown> => {
    if (!isRecord(commitment)) return false;

    const type = textValue(commitment.type);
    const state = textValue(commitment.state);
    const title = textValue(commitment.title);
    const explanation = textValue(commitment.explanation);

    return (
      type === "goal" &&
      (state === "needs_clarification" ||
        state === "unsure" ||
        /\b(vague|broad|unclear|unspecified|needs? clarification)\b/i.test(`${title} ${explanation}`))
    );
  });
}

function goalQuestionExists(
  questions: unknown[],
  commitmentId: string,
  patterns: RegExp[],
) {
  return questions.some((question) => {
    if (!isRecord(question) || textValue(question.commitmentId) !== commitmentId) return false;
    const questionText = textValue(question.question);
    return patterns.some((pattern) => pattern.test(questionText));
  });
}

function guidedGoalQuestionsForCommitment(
  commitment: Record<string, unknown>,
  questions: unknown[],
) {
  const commitmentId = textValue(commitment.id, "goal");
  const title = textValue(commitment.title, "this goal");
  const baseId = slugFrom(commitmentId || title, "goal");
  const templates = [
    {
      suffix: "outcome",
      patterns: [/success|outcome|aim|target|result|trying/i],
      question: "What outcome should this goal aim for first?",
      options: guidedGoalClarificationOptions("outcome"),
      customPlaceholder: "Type the first concrete outcome...",
    },
    {
      suffix: "cadence",
      patterns: [/session|cadence|week|time|often|schedule/i],
      question: "How often can you work on it?",
      options: guidedGoalClarificationOptions("sessions per week"),
      customPlaceholder: "Type a realistic study cadence...",
    },
    {
      suffix: "starting-point",
      patterns: [/starting|start|level|experience|background|already|know/i],
      question: "Where are you starting from?",
      options: guidedGoalClarificationOptions("starting point"),
      customPlaceholder: "Type your current level...",
    },
  ];

  return templates
    .filter((template) => !goalQuestionExists(questions, commitmentId, template.patterns))
    .map((template) => ({
      id: `${baseId}-${template.suffix}`,
      commitmentId,
      kind: "goal",
      title: `Clarify ${title}`,
      subtitle: "Choose the closest answer so StudentOS can break the goal down.",
      question: template.question,
      options: template.options,
      customPlaceholder: template.customPlaceholder,
      resolvedCommitment: {
        title,
        state: "confirmed",
        confidence: 82,
        estimatedDuration: "30min/session",
        explanation: "Clarified from guided goal choices.",
      },
    }));
}

function isClarifyOnlyGoalTask(task: unknown, broadGoalIds: Set<string>) {
  if (!isRecord(task)) return false;
  const goalId = textValue(task.goalId);
  const title = textValue(task.title);
  const reason = textValue(task.reason);
  const joinedText = `${title} ${reason}`;
  const isClarificationAction =
    /\b(clarify|specify|define scope|choose scope|decide scope|ask for details)\b/i.test(joinedText);

  return (
    isClarificationAction &&
    (broadGoalIds.has(goalId) || (broadGoalIds.size > 0 && /\bgoal\b/i.test(joinedText)))
  );
}

function coerceGeneratedPlanTask(
  value: unknown,
  fallbackTitle: string,
  index: number,
  defaults: Partial<GeneratedPlanTask> = {},
) {
  const record = isRecord(value) ? value : {};
  const stringValue = typeof value === "string" ? value : "";
  const title = textValue(record.title, textValue(stringValue, fallbackTitle));
  const goalId = textValue(record.goalId, defaults.goalId ?? "");

  return {
    id: textValue(record.id, `${slugFrom(title, "task")}-${index + 1}`),
    title,
    section: enumValue(record.section, ["do_now", "do_next", "subsequent_days"] as const, defaults.section ?? "subsequent_days"),
    estimatedMinutes: Math.max(0, Math.round(numberValue(record.estimatedMinutes, defaults.estimatedMinutes ?? 30))),
    timeLabel: textValue(record.timeLabel, defaults.timeLabel ?? ""),
    scheduledDate: textValue(record.scheduledDate, defaults.scheduledDate ?? ""),
    scheduledDateId: textValue(record.scheduledDateId, defaults.scheduledDateId ?? ""),
    scheduledDateRange: textValue(record.scheduledDateRange, defaults.scheduledDateRange ?? ""),
    deadline: textValue(record.deadline, defaults.deadline ?? ""),
    deadlineDateId: textValue(record.deadlineDateId, defaults.deadlineDateId ?? ""),
    reason: textValue(record.reason, defaults.reason ?? "Created from the live planning output."),
    scheduleRationale: textValue(
      record.scheduleRationale,
      defaults.scheduleRationale ?? "StudentOS placed this where it best fits the available evidence and schedule constraints.",
    ),
    source: textValue(record.source, defaults.source ?? "Vercel AI Gateway"),
    goalId,
    isRoadmapTask: booleanValue(record.isRoadmapTask, defaults.isRoadmapTask ?? Boolean(goalId)),
    updated: booleanValue(record.updated, defaults.updated ?? false),
  };
}

function coerceGeneratedCore(raw: unknown) {
  if (!isRecord(raw)) return raw;

  const core = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const broadGoals = broadGoalCommitments(core);
  const broadGoalIds = new Set(broadGoals.map((commitment) => textValue(commitment.id)).filter(Boolean));

  if (Array.isArray(core.clarificationQuestions)) {
    core.clarificationQuestions = core.clarificationQuestions.map((question, index) => {
      if (!isRecord(question)) return question;

      const title = textValue(question.title, `Clarification ${index + 1}`);
      const resolved = isRecord(question.resolvedCommitment) ? question.resolvedCommitment : {};
      const resolvedText = typeof question.resolvedCommitment === "string" ? question.resolvedCommitment : "";
      const rawOptions = Array.isArray(question.options) ? question.options : [];
      const options = rawOptions
        .map((option, optionIndex) => {
          if (isRecord(option)) {
            return {
              label: textValue(option.label, `Option ${optionIndex + 1}`),
              recommended: booleanValue(option.recommended, optionIndex === 0),
            };
          }

          return {
            label: textValue(option, `Option ${optionIndex + 1}`),
            recommended: optionIndex === 0,
          };
        })
        .filter((option) => option.label);

      const questionText = textValue(question.question, "");
      while (options.length < 2) {
        const guidedOption = guidedOptionsForClarification(question.kind, questionText)[options.length];
        options.push(guidedOption);
      }

      const safeOptions =
        looksLikeAssignmentDetailsQuestion(questionText) && looksLikeFieldPickerOptions(options)
          ? assignmentDetailOptions(questionText)
          : options;

      return {
        ...question,
        options: safeOptions.slice(0, 4),
        resolvedCommitment: {
          title: textValue(resolved.title, textValue(resolvedText, title)),
          state: enumValue(resolved.state, ["confirmed", "needs_clarification", "unsure", "resolved"] as const, "confirmed"),
          confidence: Math.max(0, Math.min(100, Math.round(numberValue(resolved.confidence, 82)))),
          estimatedDuration: textValue(resolved.estimatedDuration, "30min"),
          explanation: textValue(resolved.explanation, textValue(resolvedText, "Clarified from the student's answer.")),
        },
      };
    });
  } else {
    core.clarificationQuestions = [];
  }

  if (broadGoals.length && Array.isArray(core.clarificationQuestions)) {
    const existingQuestions = core.clarificationQuestions;
    const guidedQuestions = broadGoals.flatMap((commitment) =>
      guidedGoalQuestionsForCommitment(commitment, existingQuestions as unknown[]),
    );
    const existingLimit = Math.max(0, 6 - guidedQuestions.length);
    core.clarificationQuestions = [
      ...existingQuestions.slice(0, existingLimit),
      ...guidedQuestions,
    ].slice(0, 6);
  }

  if (isRecord(core.conflict)) {
    const conflict = core.conflict;
    const recommendationSummary = textValue(
      conflict.recommendationSummary,
      "Confirm exact timing before locking the schedule.",
    );

    core.conflict = {
      title: textValue(conflict.title, "Potential timing conflict needs confirmation"),
      unresolvedSummary: textValue(conflict.unresolvedSummary, "Some supplied times are missing, tentative, or flexible."),
      resolvedTitle: textValue(conflict.resolvedTitle, "Timing reviewed"),
      resolvedSummary: textValue(conflict.resolvedSummary, "StudentOS keeps tentative items flexible until confirmed."),
      fixedEventTitle: textValue(conflict.fixedEventTitle, "Fixed event"),
      fixedEventTime: textValue(conflict.fixedEventTime, "Time to confirm"),
      conflictingEventTitle: textValue(conflict.conflictingEventTitle, "Potential conflict"),
      conflictingEventTime: textValue(conflict.conflictingEventTime, "Time to confirm"),
      overlapLabel: textValue(conflict.overlapLabel, "Not confirmed"),
      impactLabel: textValue(conflict.impactLabel, "Confirm times"),
      resolvedImpactLabel: textValue(conflict.resolvedImpactLabel, "Plan can proceed"),
      recommendationSummary,
      recommendedActions: coerceActionArray(conflict.recommendedActions, [
        recommendationSummary,
        "Confirm exact start and end times.",
        "Keep flexible work movable until fixed events are clear.",
      ]),
      manualActions: coerceActionArray(conflict.manualActions, [
        "Manually mark confirmed fixed events.",
        "Move flexible tasks around any fixed overlap.",
        "Ask for clarification before locking tentative meetings.",
      ]),
    };
  }

  if (Array.isArray(core.planTasks)) {
    const filteredTasks = core.planTasks.filter((task) => !isClarifyOnlyGoalTask(task, broadGoalIds));
    const tasksToCoerce = filteredTasks.length ? filteredTasks : core.planTasks;

    core.planTasks = tasksToCoerce.map((task, index) =>
      coerceGeneratedPlanTask(task, `Plan task ${index + 1}`, index),
    );
  }

  if (Array.isArray(core.roadmapSteps)) {
    core.roadmapSteps = core.roadmapSteps.map((step, stepIndex) => {
      if (!isRecord(step)) return step;

      const title = textValue(step.title, `Roadmap step ${stepIndex + 1}`);
      const goalId = textValue(step.goalId, slugFrom(title, "goal"));
      const rawStepTasks = Array.isArray(step.tasks) && step.tasks.length ? step.tasks : [`${title} task`];
      const filteredStepTasks = rawStepTasks.filter((task) => !isClarifyOnlyGoalTask(task, broadGoalIds));
      const rawTasks = filteredStepTasks.length ? filteredStepTasks : rawStepTasks;

      return {
        ...step,
        id: textValue(step.id, `${slugFrom(title, "roadmap-step")}-${stepIndex + 1}`),
        goalId,
        title,
        description: textValue(step.description),
        scheduledDate: textValue(step.scheduledDate),
        scheduledDateRange: textValue(step.scheduledDateRange),
        status: enumValue(step.status, ["scheduled", "in_progress", "upcoming"] as const, "upcoming"),
        tasks: rawTasks.map((task, taskIndex) =>
          coerceGeneratedPlanTask(task, `${title} task ${taskIndex + 1}`, taskIndex, {
            section: "subsequent_days" as const,
            goalId,
            isRoadmapTask: true,
            source: "Roadmap",
          }),
        ),
      };
    });
  }

  return core;
}

function sourceText(source: CapturedSourceForAI) {
  return [
    source.title,
    source.source,
    source.snippet,
    source.sourceSummary,
    source.extractedTasks?.join("\n"),
    source.extractedEvidence?.join("\n"),
    source.languageNotes,
    source.clarificationPrompt,
    source.ocrText,
    source.textractText,
  ]
    .filter(Boolean)
    .join("\n");
}

const groundingStopwords = new Set([
  "about",
  "action",
  "added",
  "after",
  "before",
  "commitment",
  "complete",
  "confirm",
  "created",
  "deadline",
  "details",
  "event",
  "finish",
  "from",
  "goal",
  "have",
  "keep",
  "needs",
  "plan",
  "prepare",
  "review",
  "schedule",
  "source",
  "student",
  "studentos",
  "task",
  "that",
  "this",
  "uploaded",
  "with",
]);

const protectedDemoDetailPatterns = [
  /\bphysics\b/i,
  /\bchapter\s*12\b/i,
  /\binduction\b/i,
  /\bcca\b/i,
  /\btuition\b/i,
  /\bsarah\b/i,
  /\bauditorium\b/i,
  /\bpython\b/i,
  /\bdecember\b/i,
  /\b11\s*june\b/i,
];

function groundingTokens(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/['’]/g, "")
        .match(/[a-z0-9\u4e00-\u9fff]{2,}/gi)
        ?.map((token) => token.trim())
        .filter((token) => token.length >= 2 && !groundingStopwords.has(token)) ?? [],
    ),
  );
}

function hasGroundingSupport(candidate: string, corpus: string) {
  const candidateTokens = groundingTokens(candidate);
  if (candidateTokens.length === 0) return true;

  const corpusTokens = new Set(groundingTokens(corpus));
  const overlap = candidateTokens.filter((token) => corpusTokens.has(token)).length;
  const requiredOverlap = candidateTokens.length <= 2 ? 1 : 2;

  return overlap >= requiredOverlap;
}

function hasUngroundedProtectedDemoDetail(candidate: string, sourceCorpus: string) {
  return protectedDemoDetailPatterns.some(
    (pattern) => pattern.test(candidate) && !pattern.test(sourceCorpus),
  );
}

function generatedCoreEvidenceText(core: GeneratedCore) {
  return [
    core.commitments.map((commitment) => `${commitment.title}\n${commitment.source}\n${commitment.explanation}`).join("\n"),
    core.planTasks.map((task) => `${task.title}\n${task.reason}\n${task.source}`).join("\n"),
    core.roadmapSteps
      .map((step) =>
        [
          step.title,
          step.description,
          step.tasks.map((task) => `${task.title}\n${task.reason}\n${task.source}`).join("\n"),
        ].join("\n"),
      )
      .join("\n"),
  ].join("\n");
}

function assertGeneratedCoreGrounded(core: GeneratedCore, input: AnalyseStudentChaosRequest) {
  const sourceCorpus = input.sources.map(sourceText).join("\n");
  const sourceCorpusTokens = groundingTokens(sourceCorpus);

  if (sourceCorpusTokens.length === 0) return;

  const unsupportedCommitments = core.commitments.filter((commitment) => {
    const commitmentText = `${commitment.title}\n${commitment.explanation}`;

    return (
      hasUngroundedProtectedDemoDetail(commitmentText, sourceCorpus) ||
      !hasGroundingSupport(commitmentText, sourceCorpus)
    );
  });

  if (unsupportedCommitments.length > 0) {
    throw new Error(
      `Planner returned unsupported commitments: ${unsupportedCommitments
        .map((commitment) => commitment.title)
        .slice(0, 3)
        .join("; ")}`,
    );
  }

  const coreText = generatedCoreEvidenceText(core);
  const missingSourceItems = sourceFallbackItems(input.sources).filter(({ text }) => {
    const tokens = groundingTokens(text);
    if (tokens.length === 0) return false;
    return !hasGroundingSupport(text, coreText);
  });

  if (missingSourceItems.length > 0) {
    throw new Error(
      `Planner missed submitted source items: ${missingSourceItems
        .map((item) => item.text)
        .slice(0, 3)
        .join("; ")}`,
    );
  }
}

function sourceStats(sources: CapturedSourceForAI[]) {
  return {
    totalSources: sources.length,
    realSources: sources.filter((source) => source.provider && source.provider !== "mock").length,
    ocrReadySources: sources.filter((source) => source.ocrText || source.textractText || source.sourceSummary || source.sponsorStatus === "extracted").length,
  };
}

function researchContextEvidence(sources: CapturedSourceForAI[]) {
  const meaningfulTexts = sources
    .map(sourceText)
    .map((text) => text.trim())
    .filter((text) => text.replace(/\s+/g, " ").length >= 12);

  const externalContextPatterns = [
    /\b(goal|learn|course|coding|python|javascript|language|skill|proficient|master)\b/i,
    /\b(read|book|novel|story|chapter|article|text|audiobook|literature)\b/i,
    /\b(hackathon|competition|contest|olympiad|challenge|event|conference|tournament)\b/i,
    /\b(scholarship|internship|application|admission|apply|registration|eligibility)\b/i,
    /\b(project|portfolio|prototype|deliverable|presentation|essay|report|rubric)\b/i,
    /\b(deadline|due|by the end|before|duration|how long|full|complete|finish)\b/i,
    /["'“”‘’][^"'“”‘’]{3,120}["'“”‘’]/,
  ];

  return (
    meaningfulTexts.find((text) => externalContextPatterns.some((pattern) => pattern.test(text))) ??
    meaningfulTexts.find((text) => /\b(i|we)\s+(?:need|want|have|should|must|plan|aim|hope)\b/i.test(text)) ??
    meaningfulTexts[0]
  );
}

function researchEvidencePacket(sources: CapturedSourceForAI[]) {
  return sources
    .map((source, index) =>
      [
        `Source ${index + 1}: ${source.title}`,
        source.source ? `Source type: ${source.source}` : undefined,
        source.snippet ? `Student note: ${source.snippet}` : undefined,
        source.sourceSummary ? `Interpreted summary: ${source.sourceSummary}` : undefined,
        source.extractedTasks?.length ? `Extracted tasks: ${source.extractedTasks.join("; ")}` : undefined,
        source.extractedEvidence?.length ? `Evidence: ${source.extractedEvidence.join("; ")}` : undefined,
        typeof source.sourceConfidence === "number" ? `Source confidence: ${Math.round(source.sourceConfidence * 100)}%` : undefined,
        source.languageNotes ? `Language or OCR notes: ${source.languageNotes}` : undefined,
        source.clarificationPrompt ? `Clarification needed: ${source.clarificationPrompt}` : undefined,
        source.ocrText ? `OCR text: ${source.ocrText.slice(0, 1200)}` : undefined,
        source.textractText ? `Textract text: ${source.textractText.slice(0, 1200)}` : undefined,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .filter((text) => text.trim().length >= 12)
    .join("\n\n")
    .slice(0, 5000);
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
      title: goalResearch ? "Context research attached" : "Context research skipped",
      body: goalResearch
        ? "Exa context is included in the final planning input."
        : "No live context research was available for this run.",
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

function compactFallbackCopy(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...` : text;
}

function cleanFallbackItemText(value: string) {
  return compactFallbackCopy(
    value
      .replace(/^(source|source type|student note|manual input|goal command|interpreted summary|ocr text|textract text|extracted tasks?):\s*/i, "")
      .replace(/^[\-•*]\s*/, "")
      .trim(),
    96,
  );
}

function streamPartText(part: unknown, fields: string[]) {
  if (!part || typeof part !== "object") return "";
  const record = part as Record<string, unknown>;
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string") return value;
  }
  return "";
}

function sourceFallbackItems(sources: CapturedSourceForAI[]) {
  const items: Array<{ source: CapturedSourceForAI | undefined; text: string; index: number }> = [];
  const seen = new Set<string>();

  sources.forEach((source) => {
    const extractedTasks = source.extractedTasks?.map(cleanFallbackItemText).filter(Boolean) ?? [];
    const sourceLines = sourceText(source)
      .split(/\n|;|[•*]\s+|(?:^|\s)\d+[.)]\s+/)
      .map(cleanFallbackItemText)
      .filter((line) => line.length >= 4)
      .filter((line) => !/^(typed note|manual goal|manual input|goal command|upload|aws s3|aws textract)$/i.test(line));
    const candidates = extractedTasks.length ? extractedTasks : sourceLines;

    candidates.forEach((candidate) => {
      const key = candidate.toLowerCase();
      if (seen.has(key) || items.length >= 6) return;
      seen.add(key);
      items.push({ source, text: candidate, index: items.length });
    });
  });

  if (items.length) return items;

  return [
    {
      source: sources[0],
      text: sources[0] ? cleanFallbackItemText(sourceText(sources[0])) : "Review captured student input",
      index: 0,
    },
  ];
}

function fallbackCommitmentType(text: string) {
  if (/\b(roadmap|learn|zero\s+to\s+hero|prepare|preparation|course|skill|goal|proficient|master|build|portfolio)\b/i.test(text)) {
    return "goal" as const;
  }
  if (/\b(deadline|due|submit|submission|by\s+\d|before|tonight|tomorrow)\b/i.test(text)) {
    return "deadline" as const;
  }
  if (/\b(hackathon|competition|contest|challenge|meeting|briefing|class|tuition|event|workshop|conference|webinar)\b/i.test(text)) {
    return "event" as const;
  }
  return "task" as const;
}

function fallbackEstimatedDuration(type: ReturnType<typeof fallbackCommitmentType>) {
  if (type === "goal") return "2 sessions/week";
  if (type === "event") return "Confirm duration";
  if (type === "deadline") return "45min";
  return "30min";
}

function fallbackCommitmentState(type: ReturnType<typeof fallbackCommitmentType>, text: string) {
  if (type === "goal" || /\b(hackathon|competition|contest|challenge)\b/i.test(text)) {
    return "needs_clarification" as const;
  }
  return "confirmed" as const;
}

function sourceDrivenTrace(
  reason: string,
  goalResearch?: StudentOSAgentFootprint["goalResearch"],
): StudentOSAgentFootprint["sponsorTrace"] {
  const trace: StudentOSAgentFootprint["sponsorTrace"] = [
    {
      provider: "Vercel AI Gateway",
      action: "Generated student chaos analysis fallback",
      status: "fallback",
      detail: reason,
    },
  ];

  if (goalResearch) {
    trace.unshift({
      provider: goalResearch.model ? "Vercel AI Gateway + Exa" : "Exa",
      action: "Deep researched planning context",
      status: "success",
      detail: `${goalResearch.searchQueries?.length ?? 1} Exa searches, ${goalResearch.citations.length} citations, ${goalResearch.filteredResultCount ?? 0} unrelated results filtered for ${goalResearch.query}.`,
    });
  }

  return trace;
}

function sourceDrivenFallbackFootprint(
  input: AnalyseStudentChaosRequest,
  reason: string,
  goalResearch?: StudentOSAgentFootprint["goalResearch"],
  agentLogs?: AIAgentLog[],
): StudentOSAgentFootprint {
  const sources = input.sources;
  const evidenceItems = sourceFallbackItems(sources);
  const commitments = evidenceItems.map(({ source, text, index }) => {
    const type = fallbackCommitmentType(text);
    const title = compactFallbackCopy(text, 72);

    return {
      id: `${slugFrom(title, "commitment")}-${index + 1}`,
      title,
      type,
      source: source?.source || source?.title || "Submitted source",
      confidence: source?.sourceSummary || source?.ocrText || source?.textractText ? 78 : 68,
      estimatedDuration: fallbackEstimatedDuration(type),
      state: fallbackCommitmentState(type, text),
      explanation: "Created from the submitted source text because the live planner could not complete this run.",
    };
  });
  const firstCommitment = commitments[0];
  const roadmapBase =
    commitments.find((commitment) => commitment.type === "goal") ??
    commitments.find((commitment) => /\b(hackathon|competition|contest|challenge)\b/i.test(commitment.title)) ??
    firstCommitment;
  const roadmapGoalId = slugFrom(roadmapBase.title, "submitted-goal");
  const roadmapTitle = roadmapBase.type === "goal"
    ? roadmapBase.title
    : `Prepare for ${roadmapBase.title}`;
  const planSlots = ["3:30-4:00 PM", "4:15-4:45 PM", "5:00-5:30 PM", "7:30-8:00 PM", "8:15-8:45 PM", "9:00-9:30 PM"];
  const planTasks = commitments.slice(0, 6).map((commitment, index) => ({
    id: `${commitment.id}-task`,
    title: commitment.type === "event" && commitment.state !== "confirmed"
      ? `Confirm details for ${commitment.title}`
      : commitment.title,
    section: index === 0 ? "do_now" as const : index <= 2 ? "do_next" as const : "subsequent_days" as const,
    estimatedMinutes: commitment.type === "goal" ? 30 : 25,
    timeLabel: planSlots[index] ?? "9:00-9:30 PM",
    scheduledDate: index <= 2 ? "" : "This week",
    scheduledDateId: "",
    deadline: "",
    deadlineDateId: "",
    reason: "Keeps the submitted item visible even when live planning falls back.",
    scheduleRationale: "StudentOS uses a conservative short work block until exact deadlines, event details, and workload are confirmed.",
    source: commitment.source,
    goalId: commitment.type === "goal" ? roadmapGoalId : "",
    isRoadmapTask: commitment.type === "goal",
  }));
  const timelineEvents = [
    ...planTasks.slice(0, 3).map((task, index) => ({
      id: `${task.id}-timeline`,
      time: task.timeLabel?.split("-")[0] ?? ["3:30 PM", "4:15 PM", "5:00 PM"][index],
      title: task.title,
      duration: task.timeLabel,
      chip: index === 0 ? "Focus" : "Flexible",
      tone: index === 0 ? "priority" as const : undefined,
      scheduleRationale: task.scheduleRationale,
    })),
    {
      id: "fallback-review-buffer",
      time: "9:30 PM",
      title: "Review plan details",
      duration: "9:30-9:45 PM",
      chip: "Buffer",
      scheduleRationale: "A review buffer catches missing deadlines or event details before the schedule is locked.",
    },
    {
      id: "fallback-context-check",
      time: "9:45 PM",
      title: "Check external context",
      duration: "9:45-10:00 PM",
      chip: "Research",
      scheduleRationale: "This short check keeps external event or roadmap assumptions from becoming stale.",
    },
  ].slice(0, Math.max(3, Math.min(5, planTasks.length + 2)));
  const clarificationTarget =
    commitments.find((commitment) => commitment.state === "needs_clarification") ?? firstCommitment;
  const clarificationKind = clarificationTarget.type === "goal" ? "goal" as const : "general" as const;
  const clarificationQuestions = [
    {
      id: `clarify-${clarificationTarget.id}`,
      commitmentId: clarificationTarget.id,
      kind: clarificationKind,
      title: `Clarify ${compactFallbackCopy(clarificationTarget.title, 36)}`,
      subtitle: "StudentOS needs one detail before locking the schedule.",
      question: clarificationKind === "goal"
        ? "What should the first concrete outcome be?"
        : "Which detail should StudentOS confirm first?",
      options: clarificationKind === "goal"
        ? [
            { label: "Find official rules", recommended: true },
            { label: "Build first prototype" },
            { label: "Learn basics first" },
            { label: "Need to decide" },
          ]
        : [
            { label: "Deadline" },
            { label: "Exact time", recommended: true },
            { label: "Requirements" },
            { label: "Need to ask" },
          ],
      customPlaceholder: "Add exact details here...",
      resolvedCommitment: {
        title: clarificationTarget.title,
        state: "confirmed" as const,
        confidence: 82,
        estimatedDuration: clarificationTarget.estimatedDuration,
        explanation: "Clarified from the student's answer.",
      },
    },
  ];
  const roadmapSteps = [
    {
      id: `${roadmapGoalId}-scope`,
      goalId: roadmapGoalId,
      title: "Confirm source requirements",
      description: goalResearch
        ? "Use Exa context and the submitted note to verify official rules, deadlines, and deliverables."
        : "Verify the exact requirement, deadline, and expected output before scheduling deeper work.",
      scheduledDate: "This week",
      tasks: splitLongStudyTasks([
        {
          id: `${roadmapGoalId}-confirm-requirements`,
          title: `Confirm requirements for ${compactFallbackCopy(roadmapTitle, 42)}`,
          section: "subsequent_days" as const,
          estimatedMinutes: 30,
          scheduledDate: "This week",
          reason: "Avoids building a roadmap from an ambiguous source.",
          source: roadmapBase.source,
          goalId: roadmapGoalId,
          isRoadmapTask: true,
        },
      ]),
      status: "scheduled" as const,
    },
    {
      id: `${roadmapGoalId}-foundation`,
      goalId: roadmapGoalId,
      title: "Build the first foundation block",
      description: "Create a small beginner-friendly work block that moves the submitted goal forward.",
      scheduledDateRange: "Next 7 days",
      tasks: splitLongStudyTasks([
        {
          id: `${roadmapGoalId}-foundation-session`,
          title: `Start ${compactFallbackCopy(roadmapTitle, 48)}`,
          section: "subsequent_days" as const,
          estimatedMinutes: 45,
          scheduledDate: "Next 7 days",
          reason: "Turns the broad item into a visible first session.",
          source: roadmapBase.source,
          goalId: roadmapGoalId,
          isRoadmapTask: true,
        },
      ]),
      status: "upcoming" as const,
    },
    {
      id: `${roadmapGoalId}-deliverable`,
      goalId: roadmapGoalId,
      title: "Package the first deliverable",
      description: "Reserve time to produce something reviewable instead of only reading or researching.",
      scheduledDateRange: "After foundation",
      tasks: splitLongStudyTasks([
        {
          id: `${roadmapGoalId}-deliverable-session`,
          title: `Create first deliverable for ${compactFallbackCopy(roadmapTitle, 36)}`,
          section: "subsequent_days" as const,
          estimatedMinutes: 45,
          scheduledDate: "After foundation",
          reason: "Keeps preparation output-oriented.",
          source: roadmapBase.source,
          goalId: roadmapGoalId,
          isRoadmapTask: true,
        },
      ]),
      status: "upcoming" as const,
    },
  ];

  return {
    createdAt: new Date().toISOString(),
    currentDate: input.currentDate,
    provider: "fallback",
    status: "fallback",
    sourceSummary: sourceStats(sources),
    sources,
    commitments,
    clarificationQuestions,
    timelineEvents,
    resolvedTimelineEvents: timelineEvents,
    conflict: {
      title: "No confirmed conflict from submitted sources",
      unresolvedSummary: "The fallback planner did not find two fixed overlapping time ranges in the submitted evidence.",
      resolvedTitle: "Timing kept flexible",
      resolvedSummary: "StudentOS keeps the submitted items visible and asks for missing timing details before locking the plan.",
      fixedEventTitle: firstCommitment.title,
      fixedEventTime: "Time to confirm",
      conflictingEventTitle: "No confirmed overlap",
      conflictingEventTime: "Not confirmed",
      overlapLabel: "Not confirmed",
      impactLabel: "Confirm details",
      resolvedImpactLabel: "Plan can proceed",
      recommendationSummary: `Confirm the most important missing details for ${firstCommitment.title} before treating the schedule as final.`,
      recommendedActions: [
        `Confirm exact requirements for ${compactFallbackCopy(firstCommitment.title, 38)}`,
        "Keep flexible work movable until deadlines are verified",
        "Use researched context before sizing long preparation work",
      ],
      manualActions: [
        "Add exact deadline or event time",
        "Mark any fixed calendar block manually",
        "Split large preparation work into shorter sessions",
      ],
    },
    planTasks: splitLongStudyTasks(planTasks),
    roadmapSteps,
    rationale: {
      summary: "StudentOS used the submitted source text to build a conservative fallback plan instead of substituting demo commitments.",
      bullets: [
        "Every fallback commitment is derived from the captured source packet.",
        "Unclear external context stays as a clarification instead of becoming a fake fixed event.",
        "Broad preparation work becomes short roadmap sessions while details are confirmed.",
      ],
    },
    goalResearch,
    agentLogs: agentLogs?.length ? agentLogs : defaultObservableLogs(sources, reason, goalResearch),
    sponsorTrace: sourceDrivenTrace(reason, goalResearch),
  };
}

function fallbackFootprint(
  input: AnalyseStudentChaosRequest,
  reason: string,
  goalResearch?: StudentOSAgentFootprint["goalResearch"],
  agentLogs?: AIAgentLog[],
): StudentOSAgentFootprint {
  return sourceDrivenFallbackFootprint(input, reason, goalResearch, agentLogs);
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
  const researchContext = researchContextEvidence(sources);

  if (!researchContext || !isExaReady()) return undefined;

  const queryPlan = await generateResearchQueryPlan(researchEvidencePacket(sources) || researchContext);

  return withTimeout(
    deepResearchGoal(queryPlan.subject, {
      searchQueries: queryPlan.queries,
      model: queryPlan.model,
    }),
    FAST_CONTEXT_RESEARCH_TIMEOUT_MS,
    "Exa fast context research",
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

function busyBlocksFromTimeline(events: ReturnType<typeof normalizeTimelineEvent>[]): BusyTimeBlock[] {
  return events
    .filter(isFixedTimeConflictCandidate)
    .map((event) => ({
      label: event.duration ?? event.time,
    }));
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
  const sources = input.sources;
  const timelineValidation = validateTimelineConflicts(core.timelineEvents.map(normalizeTimelineEvent));
  const resolvedTimelineValidation = validateTimelineConflicts(core.resolvedTimelineEvents.map(normalizeTimelineEvent));
  const normalizedTasks = ensureTaskTimeRanges(
    splitLongStudyTasks(core.planTasks.map(normalizePlanTask)),
    busyBlocksFromTimeline(timelineValidation.events),
  );
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
    planTasks: normalizedTasks,
    roadmapSteps: core.roadmapSteps.map(normalizeRoadmapStep),
    rationale: core.rationale,
    goalResearch,
    agentLogs,
    sponsorTrace,
  };

  return FootprintSchema.parse(footprint);
}

async function generateFootprintCore(
  model: string,
  input: AnalyseStudentChaosRequest,
  goalResearch?: StudentOSAgentFootprint["goalResearch"],
  onReasoningDelta?: GatewayReasoningDeltaHandler,
) {
  const sources = input.sources;

  const text = await withTimeout(
    (async () => {
      const result = streamText({
        model: gatewayLanguageModel(model),
        timeout: GATEWAY_FOOTPRINT_TIMEOUT_MS,
        maxRetries: 0,
        providerOptions: gatewayReasoningProviderOptions(model),
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
              clarificationQuestions: "1-6 items with id, commitmentId, kind goal|team|general, title, subtitle, question, 2-4 options, customPlaceholder, resolvedCommitment. Every option must include label and recommended boolean. resolvedCommitment must always be an object with title, state, confidence, estimatedDuration, explanation; never a string, array, or null.",
              timelineEvents: "3-8 items with id, time, title, duration, chip, tone none|conflict|success|priority, conflictGroupId, scheduleRationale.",
              resolvedTimelineEvents: "3-8 items with same shape as timelineEvents.",
              conflict: "title, unresolvedSummary, resolvedTitle, resolvedSummary, fixedEventTitle, fixedEventTime, conflictingEventTitle, conflictingEventTime, overlapLabel, impactLabel, resolvedImpactLabel, recommendationSummary, recommendedActions, manualActions. recommendedActions and manualActions must each be arrays of 3-6 short strings.",
              planTasks: "1-10 items with id, title, section do_now|do_next|subsequent_days, estimatedMinutes number, timeLabel, scheduledDate, scheduledDateId, scheduledDateRange, deadline, deadlineDateId, reason, scheduleRationale, source, goalId, isRoadmapTask boolean, updated boolean. timeLabel must be an exact clock range like '4:30-5:15 PM', not 'After homework', 'Evening', or only a date.",
              roadmapSteps: "1-6 items with id, goalId, title, description, scheduledDate, scheduledDateRange, tasks, status scheduled|in_progress|upcoming. tasks must be an array of full plan task objects using the planTasks shape; never strings, arrays, or null.",
              rationale: "summary plus 3-6 bullets.",
              emptyFields: "For unknown optional text, use an empty string. For no tone, use tone='none'. For no estimated minutes, use 0. Do not omit keys from objects.",
            },
            requirements: [
              "Extract commitments from evidence, not generic todo items.",
          "The source field on each commitment and plan task must match a submitted source title, submitted source label, or a clear source-derived label.",
          "Every submitted interpretedTasks item must appear in commitments, planTasks, or roadmap step tasks. Do not drop a task just because another source has higher priority.",
          "Treat the submitted source text as the source of truth. For short manual inputs, preserve the exact named event, subject, or roadmap target in commitments, roadmap steps, and plan tasks.",
          "Never use built-in demo details such as Physics worksheet, CCA briefing, tuition, Python coding by December, Sarah, or the 11 June competition unless those exact details are explicitly present in the submitted sources.",
          "Prefer interpretedSummary and interpretedTasks over raw OCR when they conflict.",
          "If OCR only shows an exam cover page, worksheet cover page, candidate instructions, names, class fields, or index-number boilerplate, do not invent the worksheet task. Create one unclear commitment and ask enough clarification questions to schedule it later, including which worksheet/page/question numbers and when it is due if missing.",
          "If OCR appears to have dropped Chinese or other non-English text, use the interpreted summary when available; otherwise mark the source unclear and ask a review-page clarification.",
          "If one source contains multiple worksheets or actionable messages, split them into separate commitments only when the evidence identifies distinct actions.",
          "Mark broad goals or tentative items with clarification questions. If a commitment is excluded from today's plan for lack of clarity, create 2-3 concrete clarification questions for that commitment rather than relying on a single generic question.",
          "For very vague goals, never create a task whose main action is asking the student to clarify, specify, or scope the goal. Keep the goal as needs_clarification and ask guided multiple-choice clarification questions instead.",
          "Very vague goal clarification questions must be specific and answerable by choosing an option. Cover the first desired outcome, realistic cadence, and current starting point when those details are missing.",
          "Do not ask open-ended questions like 'What exactly do you want?' or 'Please specify the scope' without answer choices. Use 2-4 plausible answer options plus customPlaceholder for details that do not fit.",
          "Create a conflict timeline and a resolved timeline.",
          "Only set conflictGroupId for two or more confirmed fixed-time items whose explicit start-end time ranges overlap. Never set conflictGroupId for time-flexible tasks; schedule them around fixed-time items instead. If a time is tentative, missing, or only a possibility, leave conflictGroupId empty and ask a clarification question instead.",
          "Set conflict.overlapLabel to the actual overlap duration calculated from the event time ranges. Do not default to 45 min.",
          "Create a daily plan with do_now, do_next, and subsequent_days tasks.",
          "Every plan task must include an exact clock range in timeLabel. This applies to task-only uploads, goal-only uploads, and mixed uploads. Goal roadmap tasks may also include scheduledDate or scheduledDateRange, but must still include a concrete work window such as '5:15-6:00 PM'.",
          "Never schedule two plan tasks, timeline events, or a plan task and timeline event into overlapping clock ranges on the same day. Treat existing task and event ranges as busy unless the item is explicitly moved or resolved.",
          "For broad goals, schedule the next actionable sessions into specific time ranges instead of only assigning day intervals or month ranges.",
          `Where possible, break big goals into steps that each fit within ${MAX_STUDY_SESSION_MINUTES} minutes.`,
          `If a big step cannot be made smaller, split it into multiple non-back-to-back sessions, each no longer than ${MAX_STUDY_SESSION_MINUTES} minutes, titled '[Goal Step] — Session N'.`,
          "For every scheduled task and timeline event, include scheduleRationale: one concise user-facing agent rationale for why that exact time slot or date is a good assignment for that task.",
          "Create roadmap steps for any broad goal, reading target, application, project, event, or externally contextual task, using Exa context when provided.",
          "When Exa research includes clarificationQuestions, convert the most important unanswered items into clarification questions before finalizing the roadmap.",
          "When Exa research includes sections, reflect source scope, workload, requirements, criteria, deadlines, duration, deliverables, or milestones in roadmap tasks instead of only summarizing the topic.",
          "For clarification options, keep label short enough for a button, ideally 2-6 words and at most 42 characters. Do not include description fields on options.",
          "Clarification option labels must be plausible answers the student can choose, not categories or field names. Never use labels like 'Prompt text', 'Question range', 'Page numbers', 'Question numbers', or 'Both'. For missing worksheet details, use concrete choices like 'Whole worksheet', 'Selected questions', 'Need to check', or 'Ask teacher first', and rely on customPlaceholder for exact pasted details.",
          "For any unknown optional text field, return an empty string. For no tone, return tone='none'. For no estimated minutes, return 0.",
          "Nested objects must remain objects. Do not summarize resolvedCommitment or roadmap step tasks as strings.",
          "Every roadmap step task must repeat the full task fields even if the same task appears in planTasks.",
          "If there is no confirmed conflict, still return at least three recommendedActions and three manualActions that ask the student to confirm exact times, avoid locking tentative events, and keep flexible work movable.",
          "Keep titles short enough for a mobile UI.",
          ],
        },
        null,
        2,
      ),
      });
      let streamedText = "";

      for await (const part of result.fullStream) {
        if (part.type === "reasoning-delta") {
          await onReasoningDelta?.(streamPartText(part, ["delta", "text"]));
          continue;
        }

        if (part.type === "text-delta") {
          streamedText += streamPartText(part, ["textDelta", "text"]);
        }
      }

      return streamedText;
    })(),
    GATEWAY_FOOTPRINT_TIMEOUT_MS,
    `Gateway footprint model ${model}`,
  );

  const core = GeneratedCoreSchema.parse(coerceGeneratedCore(parseJsonObject(text)));
  assertGeneratedCoreGrounded(core, input);

  return core;
}

export async function analyseStudentChaos(
  input: AnalyseStudentChaosRequest,
  options: AnalyseStudentChaosOptions = {},
): Promise<StudentOSAgentFootprint> {
  const sources = input.sources;
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

    const existingIndex = streamedLogs.findIndex((item) => item.id === fullLog.id);
    if (existingIndex >= 0) {
      streamedLogs[existingIndex] = fullLog;
    } else {
      streamedLogs.push(fullLog);
    }
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

  const contextCandidate = researchContextEvidence(sources);
  await emitLog({
    id: "goal-research-check",
    kind: "analysis",
    title: "Checking for research context",
    body: contextCandidate
      ? "Detected evidence that may benefit from live research context."
      : "No evidence needed live research for this run.",
    detail: contextCandidate && !isExaReady() ? "Exa is not configured, so research will be skipped." : undefined,
  });

  if (contextCandidate && isExaReady()) {
    await emitLog({
      id: "research-query-planning",
      kind: "tool",
      title: "Generating research queries",
      body: "Analysing source evidence before calling Exa, so the search is not just the raw user prompt.",
      tool: {
        provider: isVercelAiReady() ? "Vercel AI Gateway" : "StudentOS",
        result: "Preparing focused Exa queries from OCR, interpretations, and manual notes.",
      },
    });
  }

  try {
    goalResearch = await researchGoalContext(sources);
    const searchQueryPreview = goalResearch?.searchQueries?.slice(0, 3).join(" | ");
    const trace: AISponsorTraceItem = {
      provider: goalResearch?.model ? "Vercel AI Gateway + Exa" : "Exa",
      action: "Deep researched planning context",
      status: goalResearch ? "success" : "fallback",
      detail: goalResearch
          ? `${goalResearch.searchQueries?.length ?? 1} Exa searches, ${goalResearch.citations.length} citations, ${goalResearch.filteredResultCount ?? 0} unrelated results filtered for ${goalResearch.query}.`
          : "No Exa search was needed or Exa was unavailable.",
    };
    await emitTrace(trace);
    await emitLog({
      id: goalResearch ? "goal-research-complete" : "goal-research-skipped",
      kind: "tool",
      title: goalResearch ? "Context research complete" : "Context research skipped",
      body: goalResearch
        ? "Attached live research context to the planning request."
        : "Continuing with the submitted evidence only.",
      tool: {
        provider: "Exa",
        result: searchQueryPreview || trace.detail,
      },
    });
  } catch (error) {
    const trace: AISponsorTraceItem = {
      provider: "Exa",
      action: "Deep researched planning context",
      status: "fallback",
      detail: error instanceof Error ? error.message : "Exa research failed.",
    };
    await emitTrace(trace);
    await emitLog({
      id: "goal-research-failed",
      kind: "tool",
      title: "Context research failed",
      body: "The planner will continue with the submitted evidence only.",
      tool: {
        provider: "Exa",
        result: trace.detail,
      },
    });
  }

  if (!isVercelAiReady()) {
    const reason = "USE_REAL_VERCEL_AI is disabled or Gateway auth is missing.";
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
  const fallbackModel = sponsorEnv.aiGatewayFallbackModel;
  let reasoningText = "";
  let lastReasoningLogAt = 0;
  const emitReasoningDelta: GatewayReasoningDeltaHandler = async (delta) => {
    reasoningText += delta;
    const now = Date.now();
    const shouldEmit =
      now - lastReasoningLogAt >= GATEWAY_REASONING_LOG_MIN_INTERVAL_MS ||
      reasoningText.length <= delta.length;

    if (!shouldEmit) return;
    lastReasoningLogAt = now;

    await emitLog({
      id: "gateway-reasoning-stream",
      kind: "thought",
      title: "Claude reasoning stream",
      body: reasoningText.trim() || "Claude has started provider-visible reasoning.",
      detail:
        "Provider-returned extended/adaptive thinking from Vercel AI Gateway. Claude 4.x may return summarized thinking rather than raw full hidden reasoning.",
      tool: {
        provider: "Vercel AI Gateway",
        result: primaryModel,
      },
    });
  };

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
    const result = await generateFootprintCore(primaryModel, normalizedInput, goalResearch, emitReasoningDelta);
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
    let finalError = primaryError;

    if (fallbackModel && fallbackModel !== primaryModel) {
      await emitLog({
        id: "gateway-fallback-model-started",
        kind: "tool",
        title: "Retrying Vercel AI Gateway",
        body: "The primary Gateway model failed, so StudentOS is retrying through the configured Gateway fallback model.",
        detail: primaryError instanceof Error ? primaryError.message : "Unknown primary Gateway error.",
        tool: {
          provider: "Vercel AI Gateway",
          result: fallbackModel,
        },
      });

      try {
        const result = await generateFootprintCore(fallbackModel, normalizedInput, goalResearch, emitReasoningDelta);

        await emitTrace({
          provider: "Vercel AI Gateway",
          action: "Generated live StudentOS analysis",
          status: "success",
          detail: `${fallbackModel} returned commitments, questions, roadmap, and plan JSON after ${primaryModel} failed.`,
        });
        await emitLog({
          id: "gateway-fallback-model-response",
          kind: "tool",
          title: "Fallback Gateway model responded",
          body: "The Gateway fallback model returned structured JSON for commitments, questions, conflicts, roadmap, and plan tasks.",
          tool: {
            provider: "Vercel AI Gateway",
            result: `${fallbackModel} completed the planning call.`,
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
          model: fallbackModel,
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
      } catch (fallbackError) {
        finalError = fallbackError;
      }
    }

    const reason = finalError instanceof Error
      ? finalError.message
      : "Unknown Gateway error.";
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

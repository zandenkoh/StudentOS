import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { validateTimelineConflicts } from "@/lib/schedule-conflicts";
import { ensureTaskTimeRanges } from "@/lib/time-scheduling";
import { gatewayLanguageModel } from "@/lib/sponsor-tech/ai-gateway-model";
import { isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";

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

const ClarificationAnswerSchema = z.object({
  commitmentId: z.string(),
  commitmentTitle: z.string(),
  kind: z.string(),
  question: z.string(),
  answer: z.string(),
  answeredAt: z.string(),
});

const SponsorTraceSchema = z.object({
  provider: z.string(),
  action: z.string(),
  status: z.enum(["success", "fallback", "error"]),
  detail: z.string(),
});

const ReplanAgentInputSchema = z.object({
  trigger: z.enum(["clarification", "manual_conflict"]),
  currentDate: z.string().min(1),
  commitments: z.array(CommitmentSchema).default([]),
  planTasks: z.array(PlanTaskSchema).default([]),
  timelineEvents: z.array(TimelineEventSchema).default([]),
  resolvedTimelineEvents: z.array(TimelineEventSchema).default([]),
  conflict: ConflictSchema.optional(),
  clarificationAnswers: z.array(ClarificationAnswerSchema).default([]),
  manualConflictInstruction: z.string().optional(),
  sourceContext: z.unknown().optional(),
});

const ReplanAgentOutputSchema = z.object({
  commitments: z.array(CommitmentSchema).min(1),
  planTasks: z.array(PlanTaskSchema).min(1),
  timelineEvents: z.array(TimelineEventSchema).min(1),
  resolvedTimelineEvents: z.array(TimelineEventSchema).min(1),
  conflict: ConflictSchema,
  rationale: z.object({
    summary: z.string(),
    bullets: z.array(z.string()).min(3).max(6),
  }),
  dailyPlan: z.object({
    focus: z.string(),
  }),
});

export type ReplanAgentInput = z.infer<typeof ReplanAgentInputSchema>;
export type ReplanAgentResponse = {
  provider: "vercel-ai-gateway" | "fallback";
  status: "success" | "fallback" | "error";
  model?: string;
  trigger: ReplanAgentInput["trigger"];
  commitments: z.infer<typeof CommitmentSchema>[];
  planTasks: z.infer<typeof PlanTaskSchema>[];
  timelineEvents: z.infer<typeof TimelineEventSchema>[];
  resolvedTimelineEvents: z.infer<typeof TimelineEventSchema>[];
  conflict: z.infer<typeof ConflictSchema>;
  rationale: z.infer<typeof ReplanAgentOutputSchema>["rationale"];
  dailyPlan: z.infer<typeof ReplanAgentOutputSchema>["dailyPlan"];
  trace: z.infer<typeof SponsorTraceSchema>[];
};

export { ReplanAgentInputSchema };

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function slugFrom(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return slug || fallback;
}

function estimatedMinutesFromDuration(value: string, fallback = 30) {
  const hours = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/i)?.[1];
  if (hours) return Math.max(15, Math.round(Number(hours) * 60));

  const minutes = value.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i)?.[1];
  if (minutes) return Math.max(5, Math.round(Number(minutes)));

  return fallback;
}

function normalizeTasks(tasks: z.infer<typeof PlanTaskSchema>[]) {
  return ensureTaskTimeRanges(tasks).map((task) => ({
    ...task,
    updated: task.updated || undefined,
  }));
}

function fallbackConflict(input: ReplanAgentInput, resolvedEvents: z.infer<typeof TimelineEventSchema>[]) {
  const validation = validateTimelineConflicts(resolvedEvents);
  const base = input.conflict;

  return {
    title: base?.title ?? "Schedule reviewed",
    unresolvedSummary: base?.unresolvedSummary ?? "StudentOS reviewed the current schedule for conflicts.",
    resolvedTitle: input.trigger === "manual_conflict" ? "Manual instruction applied" : "Clarification reviewed",
    resolvedSummary:
      input.trigger === "manual_conflict"
        ? `StudentOS rebuilt the schedule around: ${input.manualConflictInstruction?.trim() || "the manual instruction"}.`
        : "StudentOS rebuilt the schedule after reviewing the clarification answer.",
    fixedEventTitle: base?.fixedEventTitle ?? resolvedEvents[0]?.title ?? "Fixed event",
    fixedEventTime: base?.fixedEventTime ?? resolvedEvents[0]?.duration ?? resolvedEvents[0]?.time ?? "Time reviewed",
    conflictingEventTitle: base?.conflictingEventTitle ?? "No confirmed overlap",
    conflictingEventTime: base?.conflictingEventTime ?? "Not confirmed",
    overlapLabel: validation.groups[0]?.overlapLabel ?? "Not confirmed",
    impactLabel: base?.impactLabel ?? "Review complete",
    resolvedImpactLabel: validation.groups.length ? "Needs another pass" : "Plan ready",
    recommendationSummary:
      input.trigger === "manual_conflict"
        ? "Manual conflict instructions were treated as the scheduling source of truth."
        : "Clarification answers were used to update task sequence, duration, and rationale.",
    recommendedActions: [
      "Keep fixed commitments explicit",
      "Move flexible work around confirmed constraints",
      "Use clarified details before sizing the next work block",
    ],
    manualActions: [
      "Edit exact event times if needed",
      "Add missing deadline details",
      "Re-run manual instructions if constraints change",
    ],
  };
}

function fallbackReplan(input: ReplanAgentInput, reason: string): ReplanAgentResponse {
  const clarificationText = input.clarificationAnswers
    .map((item) => `${item.commitmentTitle}: ${item.answer}`)
    .join("; ");
  const manualInstruction = input.manualConflictInstruction?.trim();
  const nextCommitments = input.commitments.map((commitment) => {
    const matchedAnswer = input.clarificationAnswers.find((item) => item.commitmentId === commitment.id);
    if (!matchedAnswer) return commitment;

    return {
      ...commitment,
      state: commitment.state === "needs_clarification" || commitment.state === "unsure" ? "resolved" as const : commitment.state,
      confidence: Math.max(commitment.confidence, 84),
      explanation: `${commitment.explanation} Clarification reviewed: ${matchedAnswer.answer}.`,
    };
  });
  const existingTasks: z.infer<typeof PlanTaskSchema>[] = input.planTasks.length ? input.planTasks : nextCommitments.map((commitment, index) => ({
    id: `agent-${slugFrom(commitment.title, "task")}`,
    title: commitment.type === "goal" ? `Plan next step for ${commitment.title}` : commitment.title,
    section: index === 0 ? "do_now" as const : "do_next" as const,
    estimatedMinutes: estimatedMinutesFromDuration(commitment.estimatedDuration),
    reason: "Created by the replanning fallback from submitted commitments.",
    scheduleRationale: "StudentOS keeps this visible until the live replanning model is available.",
    source: commitment.source,
    goalId: commitment.type === "goal" ? commitment.id : undefined,
    isRoadmapTask: commitment.type === "goal" || undefined,
  }));
  const nextTasks = normalizeTasks(existingTasks.map((task, index) => ({
    ...task,
    reason:
      input.trigger === "manual_conflict" && manualInstruction
        ? `Replanned after manual conflict instruction: ${manualInstruction}`
        : input.trigger === "clarification" && clarificationText
          ? `Replanned after clarification: ${clarificationText}`
          : task.reason,
    scheduleRationale:
      input.trigger === "manual_conflict" && manualInstruction
        ? `StudentOS moved flexible work after applying the user's manual conflict instruction: ${manualInstruction}.`
        : input.trigger === "clarification" && clarificationText
          ? `StudentOS used the clarification answer before choosing this slot: ${clarificationText}.`
          : task.scheduleRationale,
    updated: index < 4 ? true : task.updated,
  })));
  const resolvedEvents = (input.resolvedTimelineEvents.length ? input.resolvedTimelineEvents : input.timelineEvents).map((event) => ({
    ...event,
    tone: event.tone === "conflict" ? undefined : event.tone,
    conflictGroupId: undefined,
    chip: event.chip === "Needs decision" ? "Resolved" : event.chip,
    scheduleRationale:
      input.trigger === "manual_conflict" && manualInstruction
        ? `Updated after manual instruction: ${manualInstruction}.`
        : event.scheduleRationale,
  }));
  const conflict = fallbackConflict(input, resolvedEvents);

  return {
    provider: "fallback",
    status: "fallback",
    trigger: input.trigger,
    commitments: nextCommitments,
    planTasks: nextTasks,
    timelineEvents: input.timelineEvents.length ? input.timelineEvents : resolvedEvents,
    resolvedTimelineEvents: resolvedEvents,
    conflict,
    rationale: {
      summary:
        input.trigger === "manual_conflict"
          ? "StudentOS applied the manual conflict instruction and rebuilt the visible schedule from the current commitments."
          : "StudentOS reviewed the clarification answer and rebuilt the visible schedule from the current commitments.",
      bullets: [
        "Replanning stayed grounded in current commitments.",
        "Updated tasks keep exact clock ranges.",
        "Flexible work remains movable around fixed constraints.",
      ],
    },
    dailyPlan: {
      focus: nextTasks.find((task) => task.section === "do_now")?.title ?? nextTasks[0]?.title ?? "Review current plan",
    },
    trace: [
      {
        provider: "StudentOS",
        action: input.trigger === "manual_conflict" ? "Manual conflict replanning fallback" : "Clarification replanning fallback",
        status: "fallback",
        detail: reason,
      },
    ],
  };
}

async function generateReplanWithModel(model: string, input: ReplanAgentInput) {
  const { output } = await generateText({
    model: gatewayLanguageModel(model),
    output: Output.object({ schema: ReplanAgentOutputSchema }),
    system:
      "You are the StudentOS Replanning Agent. You update a student's live plan after new information arrives. Return only structured JSON. Do not invent unrelated demo tasks. Preserve exact user-provided commitments, apply clarification answers or manual conflict instructions as source-of-truth, and update the schedule immediately.",
    prompt: JSON.stringify(
      {
        trigger: input.trigger,
        currentDate: input.currentDate,
        currentCommitments: input.commitments,
        currentPlanTasks: input.planTasks,
        currentTimelineEvents: input.timelineEvents,
        currentResolvedTimelineEvents: input.resolvedTimelineEvents,
        currentConflict: input.conflict,
        clarificationAnswers: input.clarificationAnswers,
        manualConflictInstruction: input.manualConflictInstruction,
        sourceContext: input.sourceContext,
        outputContract: {
          commitments:
            "Return the updated commitments. Resolve only commitments addressed by clarification answers or manual conflict instructions.",
          planTasks:
            "Return the updated visible plan tasks. Every task must include exact timeLabel clock ranges. Update scheduleRationale for changed tasks.",
          timelineEvents:
            "Return the unresolved/current timeline, preserving conflict flags if the conflict is not resolved.",
          resolvedTimelineEvents:
            "Return the live resolved timeline after the trigger. For manual_conflict, apply the user's manual instruction and remove obsolete conflictGroupId values when the conflict is resolved.",
          conflict:
            "Return updated conflict copy and actions. overlapLabel must be based on confirmed overlapping fixed ranges, otherwise use Not confirmed.",
          rationale: "Explain the replanning decision in one summary plus 3-6 bullets.",
        },
        rules: [
          "For trigger=clarification, review the clarification answers first, then reschedule the affected commitment or goal in the plan.",
          "For trigger=manual_conflict, only run if manualConflictInstruction is non-empty. Treat it as a high-priority scheduling constraint.",
          "Do not keep stale conflict text after a manual instruction resolves or changes the conflict.",
          "Do not replace the user's plan with Physics/CCA/demo data unless those exact items are in currentCommitments.",
          "Move flexible work before moving fixed events unless the manual instruction explicitly says a fixed event changed.",
          "Keep the UI mobile-friendly: short titles, exact time ranges, concise rationales.",
        ],
      },
      null,
      2,
    ),
  });

  return ReplanAgentOutputSchema.parse(output);
}

export async function replanWithAgent(input: ReplanAgentInput): Promise<ReplanAgentResponse> {
  if (input.trigger === "manual_conflict" && !input.manualConflictInstruction?.trim()) {
    return fallbackReplan(input, "Manual conflict replanning skipped because no instruction was provided.");
  }

  if (!isVercelAiReady()) {
    return fallbackReplan(input, "USE_REAL_VERCEL_AI is disabled or AI_GATEWAY_API_KEY is missing.");
  }

  const model = sponsorEnv.aiGatewayModel;

  try {
    const result = await generateReplanWithModel(model, input);
    const tasks = normalizeTasks(result.planTasks);
    const conflictValidation = validateTimelineConflicts(result.resolvedTimelineEvents);

    return {
      provider: "vercel-ai-gateway",
      status: "success",
      model,
      trigger: input.trigger,
      commitments: result.commitments,
      planTasks: tasks,
      timelineEvents: result.timelineEvents,
      resolvedTimelineEvents: result.resolvedTimelineEvents,
      conflict: {
        ...result.conflict,
        overlapLabel: conflictValidation.groups[0]?.overlapLabel ?? result.conflict.overlapLabel,
      },
      rationale: result.rationale,
      dailyPlan: result.dailyPlan,
      trace: [
        {
          provider: "Vercel AI Gateway",
          action: input.trigger === "manual_conflict" ? "Agent replanned manual conflict" : "Agent replanned after clarification",
          status: "success",
          detail: `${model} returned updated commitments, timeline, conflict copy, and plan tasks.`,
        },
      ],
    };
  } catch (error) {
    return fallbackReplan(
      input,
      error instanceof Error ? error.message : "Live replanning agent failed.",
    );
  }
}

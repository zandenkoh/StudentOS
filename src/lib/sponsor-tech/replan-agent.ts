import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { normalizeDurationLabel } from "@/lib/duration-label";
import { isFixedTimeConflictCandidate, validateTimelineConflicts } from "@/lib/schedule-conflicts";
import { ensureTaskTimeRanges, type BusyTimeBlock } from "@/lib/time-scheduling";
import { gatewayLanguageModel } from "@/lib/sponsor-tech/ai-gateway-model";
import { isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";

const CommitmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["task", "event", "deadline", "goal", "conflict"]),
  source: z.string(),
  confidence: z.number().int().min(0).max(100),
  estimatedDuration: z.union([z.string(), z.number()]).transform((value) => normalizeDurationLabel(value)),
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

const ReplanAgentInputSchema = z.object({
  trigger: z.enum(["clarification", "manual_conflict", "add_task"]),
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
type ReplanSponsorTrace = {
  provider: string;
  action: string;
  status: "success" | "fallback" | "error";
  detail: string;
};

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
  trace: ReplanSponsorTrace[];
};

export { ReplanAgentInputSchema };

function slugFrom(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return slug || fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringArrayValue(value: unknown, fallback: string[]) {
  const values = Array.isArray(value)
    ? value.map((item) => textValue(item)).filter(Boolean)
    : [];

  return values.length >= 3 ? values.slice(0, 6) : fallback;
}

function sourceContextRecord(input: ReplanAgentInput) {
  return isRecord(input.sourceContext) ? input.sourceContext : {};
}

function addedSourceText(input: ReplanAgentInput) {
  const sourceContext = sourceContextRecord(input);
  return textValue(sourceContext.addedSource, "");
}

function addedCommitmentId(input: ReplanAgentInput) {
  const sourceContext = sourceContextRecord(input);
  const addedCommitment = sourceContext.addedCommitment;

  if (isRecord(addedCommitment)) return textValue(addedCommitment.id, "");
  return "";
}

function estimatedMinutesFromDuration(value: string, fallback = 30) {
  const hours = value.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)/i)?.[1];
  if (hours) return Math.max(15, Math.round(Number(hours) * 60));

  const minutes = value.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i)?.[1];
  if (minutes) return Math.max(5, Math.round(Number(minutes)));

  return fallback;
}

function busyBlocksFromTimeline(events: z.infer<typeof TimelineEventSchema>[]): BusyTimeBlock[] {
  return events
    .filter(isFixedTimeConflictCandidate)
    .map((event) => ({
      label: event.duration ?? event.time,
    }));
}

function normalizeTasks(tasks: z.infer<typeof PlanTaskSchema>[], busyBlocks: BusyTimeBlock[] = []) {
  return ensureTaskTimeRanges(tasks, busyBlocks).map((task) => ({
    ...task,
    updated: task.updated || undefined,
  }));
}

function ensureUpdatedReplanTask(
  trigger: ReplanAgentInput["trigger"],
  tasks: z.infer<typeof PlanTaskSchema>[],
) {
  if (trigger !== "manual_conflict" || tasks.some((task) => task.updated)) return tasks;

  const targetIndex = tasks.findIndex((task) => {
    const text = `${task.title} ${task.reason ?? ""} ${task.source ?? ""}`.toLowerCase();
    return task.section !== "do_now" && !/\bfixed\b|calendar|appointment|class|lesson/.test(text);
  });
  const index = targetIndex >= 0 ? targetIndex : 0;

  return tasks.map((task, taskIndex) =>
    taskIndex === index
      ? {
          ...task,
          updated: true,
        }
      : task,
  );
}

function resolvedEventsForManualInstruction(input: ReplanAgentInput) {
  const manualInstruction = input.manualConflictInstruction?.trim() ?? "";
  const currentEvents = input.timelineEvents.length
    ? input.timelineEvents
    : input.resolvedTimelineEvents;

  return currentEvents.map((event) => {
    if (event.conflictGroupId || event.tone === "conflict" || /needs decision/i.test(event.chip)) {
      return {
        ...event,
        chip: "Manual review",
        tone: "success" as const,
        conflictGroupId: undefined,
        scheduleRationale: manualInstruction
          ? `Updated after manual instruction: ${manualInstruction}.`
          : event.scheduleRationale,
      };
    }

    return {
      ...event,
      scheduleRationale: manualInstruction
        ? event.scheduleRationale ?? `Reviewed against manual instruction: ${manualInstruction}.`
        : event.scheduleRationale,
    };
  });
}

function fallbackConflict(input: ReplanAgentInput, resolvedEvents: z.infer<typeof TimelineEventSchema>[]) {
  const validation = validateTimelineConflicts(resolvedEvents);
  const base = input.conflict;
  const manualInstruction = input.manualConflictInstruction?.trim();
  const addedSource = addedSourceText(input);
  const confirmedEventIds = validation.groups[0]?.eventIds ?? [];
  const firstConfirmedEvent = resolvedEvents.find((event) => event.id === confirmedEventIds[0]);
  const secondConfirmedEvent = resolvedEvents.find((event) => event.id === confirmedEventIds[1]);
  const firstTimedEvent = resolvedEvents.find((event) => event.duration || /\d/.test(event.time));
  const manualResolved = input.trigger === "manual_conflict" && validation.groups.length === 0;

  return {
    title: base?.title ?? "Schedule reviewed",
    unresolvedSummary: base?.unresolvedSummary ?? "StudentOS reviewed the current schedule for conflicts.",
    resolvedTitle:
      input.trigger === "manual_conflict"
        ? "Manual instruction applied"
        : input.trigger === "add_task"
          ? "Added task scheduled"
          : "Clarification reviewed",
    resolvedSummary:
      input.trigger === "manual_conflict"
        ? `StudentOS rebuilt the schedule around: ${manualInstruction || "the manual instruction"}.`
        : input.trigger === "add_task"
          ? `StudentOS folded the added task into the plan from the submitted text${addedSource ? `: ${addedSource}` : ""}.`
          : "StudentOS rebuilt the schedule after reviewing the clarification answer.",
    fixedEventTitle:
      firstConfirmedEvent?.title ?? base?.fixedEventTitle ?? firstTimedEvent?.title ?? "Time reviewed",
    fixedEventTime:
      firstConfirmedEvent?.duration ?? firstConfirmedEvent?.time ?? base?.fixedEventTime ?? firstTimedEvent?.duration ?? firstTimedEvent?.time ?? "Time reviewed",
    conflictingEventTitle:
      secondConfirmedEvent?.title ?? (manualResolved ? "No confirmed overlap" : base?.conflictingEventTitle ?? "No confirmed overlap"),
    conflictingEventTime:
      secondConfirmedEvent?.duration ?? secondConfirmedEvent?.time ?? (manualResolved ? "Not confirmed" : base?.conflictingEventTime ?? "Not confirmed"),
    overlapLabel: validation.groups[0]?.overlapLabel ?? "No confirmed overlap",
    impactLabel: base?.impactLabel ?? "Review complete",
    resolvedImpactLabel: validation.groups.length ? "Needs another pass" : "Plan ready",
    recommendationSummary:
      input.trigger === "manual_conflict"
        ? "Manual conflict instructions were treated as the scheduling source of truth."
        : input.trigger === "add_task"
          ? "The added task was scheduled from the submitted text while keeping existing fixed commitments stable."
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
  const addedText = addedSourceText(input);
  const addedId = addedCommitmentId(input);
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
  const nextTasks = normalizeTasks(existingTasks.map((task, index) => {
    const taskIsAdded =
      input.trigger === "add_task" &&
      (task.id === addedId || task.source === "Added task" || task.id.startsWith("added-"));
    const taskWasLocallyMoved = input.trigger === "add_task" && task.updated;
    const manualTargetIndex = input.trigger === "manual_conflict"
      ? existingTasks.findIndex((item) => {
          const text = `${item.title} ${item.reason ?? ""} ${item.source ?? ""}`.toLowerCase();
          return item.section !== "do_now" && !/\bfixed\b|calendar|appointment|class|lesson/.test(text);
        })
      : -1;
    const taskIsManualConflictTarget =
      input.trigger === "manual_conflict" && (index === manualTargetIndex || (manualTargetIndex < 0 && index === 0));

    return {
      ...task,
      reason:
        input.trigger === "manual_conflict" && manualInstruction
          ? "Updated after your conflict instruction"
          : input.trigger === "clarification" && clarificationText
            ? "Updated after clarification"
            : taskIsAdded
              ? "Added task scheduled"
              : task.reason,
      scheduleRationale:
        input.trigger === "manual_conflict" && manualInstruction
          ? `StudentOS reviewed this task after applying the user's manual conflict instruction: ${manualInstruction}.`
          : input.trigger === "clarification" && clarificationText
            ? `StudentOS used the clarification answer before choosing this slot: ${clarificationText}.`
            : taskIsAdded
              ? `StudentOS scheduled this from the submitted added task${addedText ? `: ${addedText}` : ""}.`
              : task.scheduleRationale,
      updated:
        input.trigger === "add_task"
          ? taskIsAdded || taskWasLocallyMoved || undefined
          : taskIsManualConflictTarget ? true : task.updated,
    };
  }), busyBlocksFromTimeline(input.timelineEvents.length ? input.timelineEvents : input.resolvedTimelineEvents));
  const candidateResolvedEvents =
    input.trigger === "manual_conflict"
      ? resolvedEventsForManualInstruction(input)
      : (input.resolvedTimelineEvents.length ? input.resolvedTimelineEvents : input.timelineEvents).map((event) => ({
          ...event,
          tone: event.tone === "conflict" ? undefined : event.tone,
          conflictGroupId: undefined,
          chip: event.chip === "Needs decision" ? "Resolved" : event.chip,
          scheduleRationale:
            input.trigger === "manual_conflict" && manualInstruction
              ? `Updated after manual instruction: ${manualInstruction}.`
              : event.scheduleRationale,
        }));
  const resolvedValidation = validateTimelineConflicts(candidateResolvedEvents);
  const resolvedEvents = resolvedValidation.events;
  const currentValidation = validateTimelineConflicts(input.timelineEvents.length ? input.timelineEvents : resolvedEvents);
  const conflict = fallbackConflict(input, resolvedEvents);

  return {
    provider: "fallback",
    status: "fallback",
    trigger: input.trigger,
    commitments: nextCommitments,
    planTasks: nextTasks,
    timelineEvents: currentValidation.events.length ? currentValidation.events : resolvedEvents,
    resolvedTimelineEvents: resolvedEvents,
    conflict,
    rationale: {
      summary:
        input.trigger === "manual_conflict"
          ? "StudentOS applied the manual conflict instruction and rebuilt the visible schedule from the current commitments."
          : input.trigger === "add_task"
            ? "StudentOS scheduled the added task from the submitted text and kept the rest of the plan grounded in current commitments."
            : "StudentOS reviewed the clarification answer and rebuilt the visible schedule from the current commitments.",
      bullets: [
        "Replanning stayed grounded in current commitments.",
        "Updated tasks keep exact clock ranges.",
        input.trigger === "add_task"
          ? "Fallback scheduling used the submitted added text only."
          : "Flexible work remains movable around fixed constraints.",
      ],
    },
    dailyPlan: {
      focus: nextTasks.find((task) => task.section === "do_now")?.title ?? nextTasks[0]?.title ?? "Review current plan",
    },
    trace: [
      {
        provider: "StudentOS",
        action:
          input.trigger === "manual_conflict"
            ? "Manual conflict replanning fallback"
            : input.trigger === "add_task"
              ? "Add-task replanning fallback"
              : "Clarification replanning fallback",
        status: "fallback",
        detail: reason,
      },
    ],
  };
}

function coerceReplanOutput(value: unknown, input: ReplanAgentInput) {
  const record = isRecord(value) ? value : {};
  const baseline = fallbackReplan(input, "Gateway response repair baseline.");
  const conflictRecord = isRecord(record.conflict) ? record.conflict : {};
  const rationaleRecord = isRecord(record.rationale) ? record.rationale : {};
  const dailyPlanRecord = isRecord(record.dailyPlan) ? record.dailyPlan : {};
  const commitments = arrayValue(record.commitments).length ? record.commitments : baseline.commitments;
  const planTasks = arrayValue(record.planTasks).length ? record.planTasks : baseline.planTasks;
  const timelineEvents = arrayValue(record.timelineEvents).length ? record.timelineEvents : baseline.timelineEvents;
  const resolvedTimelineEvents = arrayValue(record.resolvedTimelineEvents).length
    ? record.resolvedTimelineEvents
    : baseline.resolvedTimelineEvents;

  return {
    commitments,
    planTasks,
    timelineEvents,
    resolvedTimelineEvents,
    conflict: {
      ...baseline.conflict,
      ...conflictRecord,
      recommendedActions: stringArrayValue(conflictRecord.recommendedActions, baseline.conflict.recommendedActions),
      manualActions: stringArrayValue(conflictRecord.manualActions, baseline.conflict.manualActions),
    },
    rationale: {
      summary: textValue(rationaleRecord.summary, baseline.rationale.summary),
      bullets: stringArrayValue(rationaleRecord.bullets, baseline.rationale.bullets),
    },
    dailyPlan: {
      focus: textValue(
        dailyPlanRecord.focus,
        baseline.dailyPlan.focus,
      ),
    },
  };
}

async function generateReplanWithModel(model: string, input: ReplanAgentInput) {
  const { output } = await generateText({
    model: gatewayLanguageModel(model),
    output: Output.object({ schema: ReplanAgentOutputSchema }),
    system:
      "You are the StudentOS Replanning Agent. You update a student's live plan after new information arrives. Do not invent unrelated demo tasks. Preserve exact user-provided commitments, apply added-task text, clarification answers, or manual conflict instructions as source-of-truth, and update the schedule immediately.",
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
            "Return the updated commitments. Resolve only commitments addressed by clarification answers or manual conflict instructions. estimatedDuration must use min/hr units, for example 30 min, 1 hr, or 1 hr 30 min.",
          planTasks:
            "Return the updated visible plan tasks. Every task must include id, title, section, estimatedMinutes, and exact timeLabel clock ranges. Optional UI fields may be omitted when unknown. Keep reason under 8 words; put detailed explanation in scheduleRationale only.",
          timelineEvents:
            "Return the unresolved/current timeline, preserving conflict flags if the conflict is not resolved. Optional UI fields may be omitted when unknown.",
          resolvedTimelineEvents:
            "Return the live resolved timeline after the trigger. For manual_conflict, apply the user's manual instruction and remove obsolete conflictGroupId values when the conflict is resolved. Optional UI fields may be omitted when unknown.",
          conflict:
            "Return updated conflict copy and actions. overlapLabel must be based on confirmed overlapping fixed ranges, otherwise use Not confirmed.",
          rationale: "Explain the replanning decision in one summary plus 3-6 bullets.",
        },
        rules: [
          "For trigger=add_task, read sourceContext.addedSource first, classify the added commitment, and schedule it without inventing details not present in that text.",
          "For trigger=clarification, review the clarification answers first, then reschedule the affected commitment or goal in the plan.",
          "For trigger=manual_conflict, only run if manualConflictInstruction is non-empty. Treat it as a high-priority scheduling constraint.",
          "For trigger=add_task, preserve existing commitments and fixed events unless the added task creates a real scheduling constraint.",
          "Do not keep stale conflict text after a manual instruction resolves or changes the conflict.",
          "Do not replace the user's plan with Physics/CCA/demo data unless those exact items are in currentCommitments.",
          "Move flexible work before moving fixed events unless the manual instruction explicitly says a fixed event changed.",
          "Never schedule an added, clarified, or moved task into a clock range that overlaps an existing task or event on the same day.",
          "Keep the UI mobile-friendly: short titles, exact time ranges, concise rationales.",
          "Never copy full clarification answers, option labels, or semicolon-separated transcripts into planTasks.reason.",
          "Every commitment estimatedDuration must be a concrete duration using min/hr units. Never return vague labels such as confirm duration or sessions per week.",
        ],
      },
      null,
      2,
    ),
  });

  return ReplanAgentOutputSchema.parse(coerceReplanOutput(output, input));
}

export async function replanWithAgent(input: ReplanAgentInput): Promise<ReplanAgentResponse> {
  if (input.trigger === "manual_conflict" && !input.manualConflictInstruction?.trim()) {
    return fallbackReplan(input, "Manual conflict replanning skipped because no instruction was provided.");
  }

  if (!isVercelAiReady()) {
    return fallbackReplan(input, "USE_REAL_VERCEL_AI is disabled or Gateway auth is missing.");
  }

  const primaryModel = sponsorEnv.aiGatewayModel;
  const fallbackModel = sponsorEnv.aiGatewayFallbackModel;

  try {
    const result = await generateReplanWithModel(primaryModel, input);
    const currentConflictValidation = validateTimelineConflicts(result.timelineEvents);
    const resolvedConflictValidation = validateTimelineConflicts(result.resolvedTimelineEvents);
    const tasks = ensureUpdatedReplanTask(
      input.trigger,
      normalizeTasks(result.planTasks, busyBlocksFromTimeline(currentConflictValidation.events)),
    );
    const sanitizedResolvedEvents = resolvedConflictValidation.events;
    const confirmedEventIds = resolvedConflictValidation.groups[0]?.eventIds ?? [];
    const firstConfirmedEvent = sanitizedResolvedEvents.find((event) => event.id === confirmedEventIds[0]);
    const secondConfirmedEvent = sanitizedResolvedEvents.find((event) => event.id === confirmedEventIds[1]);
    const conflict = {
      ...result.conflict,
      ...(input.trigger === "manual_conflict"
        ? {
            fixedEventTitle: firstConfirmedEvent?.title ?? result.conflict.fixedEventTitle,
            fixedEventTime: firstConfirmedEvent?.duration ?? firstConfirmedEvent?.time ?? result.conflict.fixedEventTime,
            conflictingEventTitle:
              secondConfirmedEvent?.title ??
              (resolvedConflictValidation.groups.length ? result.conflict.conflictingEventTitle : "No confirmed overlap"),
            conflictingEventTime:
              secondConfirmedEvent?.duration ??
              secondConfirmedEvent?.time ??
              (resolvedConflictValidation.groups.length ? result.conflict.conflictingEventTime : "Not confirmed"),
          }
        : {}),
      overlapLabel: resolvedConflictValidation.groups[0]?.overlapLabel ?? "No confirmed overlap",
    };

    return {
      provider: "vercel-ai-gateway",
      status: "success",
      model: primaryModel,
      trigger: input.trigger,
      commitments: result.commitments,
      planTasks: tasks,
      timelineEvents: currentConflictValidation.events,
      resolvedTimelineEvents: sanitizedResolvedEvents,
      conflict,
      rationale: result.rationale,
      dailyPlan: result.dailyPlan,
      trace: [
        {
          provider: "Vercel AI Gateway",
          action:
            input.trigger === "manual_conflict"
              ? "Agent replanned manual conflict"
              : input.trigger === "add_task"
                ? "Agent replanned added task"
                : "Agent replanned after clarification",
          status: "success",
          detail: `${primaryModel} returned updated commitments, timeline, conflict copy, and plan tasks.`,
        },
      ],
    };
  } catch (primaryError) {
    if (fallbackModel && fallbackModel !== primaryModel) {
      try {
        const result = await generateReplanWithModel(fallbackModel, input);
        const currentConflictValidation = validateTimelineConflicts(result.timelineEvents);
        const resolvedConflictValidation = validateTimelineConflicts(result.resolvedTimelineEvents);
        const tasks = ensureUpdatedReplanTask(
          input.trigger,
          normalizeTasks(result.planTasks, busyBlocksFromTimeline(currentConflictValidation.events)),
        );
        const sanitizedResolvedEvents = resolvedConflictValidation.events;
        const confirmedEventIds = resolvedConflictValidation.groups[0]?.eventIds ?? [];
        const firstConfirmedEvent = sanitizedResolvedEvents.find((event) => event.id === confirmedEventIds[0]);
        const secondConfirmedEvent = sanitizedResolvedEvents.find((event) => event.id === confirmedEventIds[1]);
        const conflict = {
          ...result.conflict,
          ...(input.trigger === "manual_conflict"
            ? {
                fixedEventTitle: firstConfirmedEvent?.title ?? result.conflict.fixedEventTitle,
                fixedEventTime: firstConfirmedEvent?.duration ?? firstConfirmedEvent?.time ?? result.conflict.fixedEventTime,
                conflictingEventTitle:
                  secondConfirmedEvent?.title ??
                  (resolvedConflictValidation.groups.length ? result.conflict.conflictingEventTitle : "No confirmed overlap"),
                conflictingEventTime:
                  secondConfirmedEvent?.duration ??
                  secondConfirmedEvent?.time ??
                  (resolvedConflictValidation.groups.length ? result.conflict.conflictingEventTime : "Not confirmed"),
              }
            : {}),
          overlapLabel: resolvedConflictValidation.groups[0]?.overlapLabel ?? "No confirmed overlap",
        };

        return {
          provider: "vercel-ai-gateway",
          status: "success",
          model: fallbackModel,
          trigger: input.trigger,
          commitments: result.commitments,
          planTasks: tasks,
          timelineEvents: currentConflictValidation.events,
          resolvedTimelineEvents: sanitizedResolvedEvents,
          conflict,
          rationale: result.rationale,
          dailyPlan: result.dailyPlan,
          trace: [
            {
              provider: "Vercel AI Gateway",
              action:
                input.trigger === "manual_conflict"
                  ? "Agent replanned manual conflict"
                  : input.trigger === "add_task"
                    ? "Agent replanned added task"
                    : "Agent replanned after clarification",
              status: "success",
              detail: `${fallbackModel} returned updated schedule data after ${primaryModel} failed: ${
                primaryError instanceof Error ? primaryError.message : "Unknown primary model error"
              }`,
            },
          ],
        };
      } catch (fallbackError) {
        return fallbackReplan(
          input,
          `Primary and fallback Gateway replanning failed: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : primaryError instanceof Error
                ? primaryError.message
                : "Live replanning agent failed."
          }`,
        );
      }
    }

    return fallbackReplan(
      input,
      primaryError instanceof Error ? primaryError.message : "Live replanning agent failed.",
    );
  }
}

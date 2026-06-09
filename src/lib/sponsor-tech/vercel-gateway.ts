import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { gatewayLanguageModel } from "@/lib/sponsor-tech/ai-gateway-model";
import { isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";
import { MAX_STUDY_SESSION_MINUTES, splitLongStudyTasks } from "@/lib/session-splitting";
import type { AISponsorTraceItem } from "@/lib/studentos-ai-types";

const PlanItemSchema = z.object({
  title: z.string(),
  timeLabel: z.string(),
  estimatedMinutes: z.number().int().min(0),
  reason: z.string(),
});

const GatewayPlanSchema = z.object({
  summary: z.string(),
  bullets: z.array(z.string()).min(3).max(5),
  dailyPlan: z.object({
    focus: z.string(),
    doNow: z.array(PlanItemSchema).min(1).max(3),
    doNext: z.array(PlanItemSchema).min(1).max(6),
    later: z.array(PlanItemSchema).min(1).max(5),
  }),
});

const ClarificationReviewSchema = z.object({
  summary: z.string(),
  resolvedCommitments: z.array(z.object({
    commitmentId: z.string(),
    revisedTitle: z.string(),
    resolvedState: z.enum(["confirmed", "needs_clarification", "unsure", "resolved"]),
    estimatedDuration: z.string(),
    schedulingDirective: z.string(),
  })).max(8),
  planningDirectives: z.array(z.string()).min(1).max(6),
  remainingUncertainties: z.array(z.string()).max(6),
});

export type GatewayPlanResult = z.infer<typeof GatewayPlanSchema>;
type ClarificationReview = z.infer<typeof ClarificationReviewSchema>;

export type PlanDayInput = {
  currentDate: string;
  commitments: unknown[];
  goals: unknown[];
  fixedEvents: unknown[];
  clarificationAnswers?: unknown[];
  sourceContext?: unknown;
};

export type PlanDayTraceStatus = "success" | "fallback" | "error";

export type PlanDayResponse = {
  provider: "vercel-ai-gateway" | "fallback";
  status: PlanDayTraceStatus;
  model?: string;
  fallbackModel?: string;
  rationale: {
    summary: string;
    bullets: string[];
  };
  dailyPlan: GatewayPlanResult["dailyPlan"];
  trace: Array<{
    provider: "Vercel AI Gateway";
    action: "Reviewed clarification answers" | "Vercel AI Gateway generated planning rationale" | "Vercel AI Gateway fallback planning";
    status: PlanDayTraceStatus;
    detail: string;
  }>;
};

export async function gatewayHealthTrace(): Promise<AISponsorTraceItem> {
  if (!isVercelAiReady()) {
    return {
      provider: "Vercel AI Gateway",
      action: "Verified Gateway preflight",
      status: "fallback",
      detail: "USE_REAL_VERCEL_AI is disabled or Gateway auth is missing.",
    };
  }

  try {
    const result = await generateText({
      model: gatewayLanguageModel(sponsorEnv.aiGatewayModel),
      prompt: "Reply with exactly: StudentOS Gateway OK",
      temperature: 0,
      maxOutputTokens: 16,
    });
    const text = result.text.trim();

    return {
      provider: "Vercel AI Gateway",
      action: "Verified Gateway preflight",
      status: /studentos gateway ok/i.test(text) ? "success" : "fallback",
      detail: /studentos gateway ok/i.test(text)
        ? `${sponsorEnv.aiGatewayModel} completed a live preflight call through Gateway.`
        : `${sponsorEnv.aiGatewayModel} returned an unexpected preflight response.`,
    };
  } catch (error) {
    return {
      provider: "Vercel AI Gateway",
      action: "Verified Gateway preflight",
      status: "fallback",
      detail: error instanceof Error ? error.message : "Gateway preflight failed.",
    };
  }
}

const fallbackPlan: GatewayPlanResult = {
  summary:
    "StudentOS kept the fallback plan grounded in the submitted sources and avoided adding commitments that were not provided.",
  bullets: [
    "Fallback planning only used available commitments, goals, fixed events, and clarifications.",
    "Missing timing or duration stays explicit instead of becoming a fabricated conflict.",
    "The plan starts with review and clarification before deeper scheduling.",
    "No demo commitments were substituted into the result.",
  ],
  dailyPlan: {
    focus: "Review submitted commitments",
    doNow: [
      {
        title: "Review submitted commitments",
        timeLabel: "Next focused block",
        estimatedMinutes: 20,
        reason: "Confirms what is known before scheduling around uncertain details.",
      },
    ],
    doNext: [
      {
        title: "Clarify missing timing or duration",
        timeLabel: "After review",
        estimatedMinutes: 10,
        reason: "Prevents the fallback planner from inventing exact deadlines or conflicts.",
      },
      {
        title: "Schedule the clearest confirmed item",
        timeLabel: "Next available slot",
        estimatedMinutes: 25,
        reason: "Moves the plan forward while keeping uncertain items separate.",
      },
    ],
    later: [
      {
        title: "Continue remaining confirmed work",
        timeLabel: "Later today",
        estimatedMinutes: 30,
        reason: "Keeps momentum without substituting unrelated demo tasks.",
      },
    ],
  },
};

function normalizePlanItems(
  items: GatewayPlanResult["dailyPlan"]["doNow"],
  section: "do_now" | "do_next" | "subsequent_days",
) {
  return splitLongStudyTasks(items.map((item) => ({ ...item, section }))).map((item) => ({
    title: item.title,
    timeLabel: item.timeLabel || "Next scheduled session",
    estimatedMinutes: item.estimatedMinutes ?? MAX_STUDY_SESSION_MINUTES,
    reason: item.reason || "Continues the goal step without creating an oversized study block.",
  }));
}

function normalizeGatewayPlan(plan: GatewayPlanResult): GatewayPlanResult {
  return {
    ...plan,
    dailyPlan: {
      ...plan.dailyPlan,
      doNow: normalizePlanItems(plan.dailyPlan.doNow, "do_now"),
      doNext: normalizePlanItems(plan.dailyPlan.doNext, "do_next"),
      later: normalizePlanItems(plan.dailyPlan.later, "subsequent_days"),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sourceDrivenFallbackPlan(input?: PlanDayInput): GatewayPlanResult {
  const commitmentRecords = input?.commitments.filter(isRecord) ?? [];
  const goalRecords = input?.goals.filter(isRecord) ?? [];
  const items = [...commitmentRecords, ...goalRecords];

  if (!items.length) return fallbackPlan;

  const titles = items
    .map((item) => textValue(item.title))
    .filter(Boolean)
    .slice(0, 5);
  const firstTitle = titles[0] ?? "Review submitted commitment";
  const planItems = titles.map((title, index) => ({
    title,
    timeLabel: ["3:30-4:00 PM", "4:15-4:45 PM", "5:00-5:30 PM", "8:00-8:30 PM", "8:45-9:15 PM"][index] ?? "8:45-9:15 PM",
    estimatedMinutes: /goal|roadmap|learn|prepare|read/i.test(title) ? 30 : 25,
    reason: "Fallback plan item derived from the submitted commitment instead of demo data.",
  }));

  return {
    summary: `StudentOS kept the fallback plan grounded in the submitted item: ${firstTitle}.`,
    bullets: [
      "Fallback planning used submitted commitments and clarification answers only.",
      "Flexible work stays in short blocks until exact deadlines and durations are confirmed.",
      "No demo commitments were substituted into this plan.",
    ],
    dailyPlan: {
      focus: firstTitle,
      doNow: [planItems[0]],
      doNext: planItems.slice(1, 4).length
        ? planItems.slice(1, 4)
        : [
            {
              title: `Confirm details for ${firstTitle}`,
              timeLabel: "4:15-4:30 PM",
              estimatedMinutes: 15,
              reason: "Clarifies missing timing, scope, or output before deeper scheduling.",
            },
          ],
      later: planItems.slice(4).length
        ? planItems.slice(4)
        : [
            {
              title: `Continue ${firstTitle}`,
              timeLabel: "8:00-8:30 PM",
              estimatedMinutes: 30,
              reason: "Keeps momentum without inventing unrelated work.",
            },
          ],
    },
  };
}

export function buildFallbackPlan(reason: string, input?: PlanDayInput): PlanDayResponse {
  const normalizedFallbackPlan = normalizeGatewayPlan(sourceDrivenFallbackPlan(input));

  return {
    provider: "fallback",
    status: "fallback",
    rationale: {
      summary: normalizedFallbackPlan.summary,
      bullets: normalizedFallbackPlan.bullets,
    },
    dailyPlan: normalizedFallbackPlan.dailyPlan,
    trace: [
      {
        provider: "Vercel AI Gateway",
        action: "Vercel AI Gateway fallback planning",
        status: "fallback",
        detail: reason,
      },
    ],
  };
}

function clarificationAnswerCount(input: PlanDayInput) {
  return input.clarificationAnswers?.length ?? 0;
}

function mergeSourceContextWithReview(sourceContext: unknown, review: ClarificationReview) {
  return {
    ...(isRecord(sourceContext) ? sourceContext : {}),
    clarificationReview: review,
  };
}

async function reviewClarificationsWithModel(model: string, input: PlanDayInput) {
  const { output } = await generateText({
    model: gatewayLanguageModel(model),
    output: Output.object({ schema: ClarificationReviewSchema }),
    system:
      "You are the StudentOS clarification-review agent. Review user clarification answers before the planner schedules anything. Resolve what is now known, keep unresolved uncertainty explicit, and never invent commitments unrelated to the supplied input.",
    prompt: JSON.stringify(
      {
        task:
          "Review clarification answers and return planning directives that the scheduler must follow.",
        input: {
          commitments: input.commitments,
          goals: input.goals,
          fixedEvents: input.fixedEvents,
          clarificationAnswers: input.clarificationAnswers,
          sourceContext: input.sourceContext,
        },
        rules: [
          "Treat clarification answers as source-of-truth evidence, but check whether the answer actually resolves the question.",
          "If an answer names a deadline, duration, scope, event status, or target outcome, convert it into a schedulingDirective.",
          "If the answer is vague or contradictory, list the remaining uncertainty instead of pretending it is resolved.",
          "Do not add demo tasks or unrelated defaults.",
        ],
        outputShape: {
          summary: "string",
          resolvedCommitments: [
            {
              commitmentId: "string",
              revisedTitle: "string",
              resolvedState: "confirmed|needs_clarification|unsure|resolved",
              estimatedDuration: "string",
              schedulingDirective: "string",
            },
          ],
          planningDirectives: ["string"],
          remainingUncertainties: ["string"],
        },
      },
      null,
      2,
    ),
  });

  return output;
}

async function reviewClarifications(input: PlanDayInput) {
  if (!clarificationAnswerCount(input)) return undefined;

  const primaryModel = sponsorEnv.aiGatewayModel;
  const fallbackModel = sponsorEnv.aiGatewayFallbackModel;

  try {
    return {
      review: await reviewClarificationsWithModel(primaryModel, input),
      model: primaryModel,
    };
  } catch (primaryError) {
    if (fallbackModel && fallbackModel !== primaryModel) {
      try {
        return {
          review: await reviewClarificationsWithModel(fallbackModel, input),
          model: fallbackModel,
          fallbackModel: primaryModel,
        };
      } catch {
        throw primaryError;
      }
    }

    throw primaryError;
  }
}

async function generatePlanWithModel(model: string, input: PlanDayInput) {
  const { output } = await generateText({
    model: gatewayLanguageModel(model),
    output: Output.object({ schema: GatewayPlanSchema }),
    system:
      "You are StudentOS, an AI chief-of-staff for ambitious students. Produce a realistic daily plan from messy commitments, broad goals, and fixed constraints. Keep the plan student-specific, deadline-aware, and concise. Do not invent unrelated tasks.",
    prompt: JSON.stringify(
      {
        task:
          "Return planning rationale and daily plan JSON. Prioritise urgent deadlines, preserve fixed events, explain conflicts, and turn broad goals into scheduled next actions.",
        input,
        schemaNotes: [
          "Return every field in the schema.",
          "Treat clarificationAnswers as user-provided source of truth. If a previously unclear commitment now has answers, schedule it instead of excluding it for lack of clarity.",
          "When sourceContext.clarificationReview is present, follow its planningDirectives and remainingUncertainties before making schedule decisions.",
          "If clarificationReview says an answer is still unresolved, keep the relevant task short, tentative, or ask for a follow-up instead of overcommitting.",
          "Every dailyPlan item must use an exact clock range in timeLabel, for example '4:30-5:15 PM'. Do this for task-only, goal-only, and mixed inputs.",
          "For goal-only inputs, do not stop at day, week, or month intervals. Put each next goal session into a concrete work window.",
          `Where possible, break big goals into steps that each fit within ${MAX_STUDY_SESSION_MINUTES} minutes.`,
          `If a big step cannot be made smaller, split it into multiple non-back-to-back sessions, each no longer than ${MAX_STUDY_SESSION_MINUTES} minutes, titled '[Goal Step] — Session N'.`,
          "If the user gave no preferred time, choose a reasonable after-school/evening clock range instead of returning an empty timeLabel.",
          "Use 0 for an unknown estimatedMinutes value.",
        ],
      },
      null,
      2,
    ),
  });

  return output;
}

export async function planDayWithVercelGateway(input: PlanDayInput): Promise<PlanDayResponse> {
  if (!isVercelAiReady()) {
    return buildFallbackPlan("USE_REAL_VERCEL_AI is disabled or Gateway auth is missing.", input);
  }

  const primaryModel = sponsorEnv.aiGatewayModel;
  const fallbackModel = sponsorEnv.aiGatewayFallbackModel;
  const prePlanTrace: PlanDayResponse["trace"] = [];
  let planningInput = input;

  if (clarificationAnswerCount(input)) {
    try {
      const result = await reviewClarifications(input);

      if (result?.review) {
        planningInput = {
          ...input,
          sourceContext: mergeSourceContextWithReview(input.sourceContext, result.review),
        };
        prePlanTrace.push({
          provider: "Vercel AI Gateway",
          action: "Reviewed clarification answers",
          status: "success",
          detail: `${result.model} reviewed ${clarificationAnswerCount(input)} clarification ${clarificationAnswerCount(input) === 1 ? "answer" : "answers"} before replanning.`,
        });
      }
    } catch (error) {
      prePlanTrace.push({
        provider: "Vercel AI Gateway",
        action: "Reviewed clarification answers",
        status: "error",
        detail: error instanceof Error ? error.message : "Clarification review failed.",
      });
    }
  }

  try {
    const result = normalizeGatewayPlan(await generatePlanWithModel(primaryModel, planningInput));

    return {
      provider: "vercel-ai-gateway",
      status: "success",
      model: primaryModel,
      rationale: {
        summary: result.summary,
        bullets: result.bullets,
      },
      dailyPlan: result.dailyPlan,
      trace: [
        ...prePlanTrace,
        {
          provider: "Vercel AI Gateway",
          action: "Vercel AI Gateway generated planning rationale",
          status: "success",
          detail: `${primaryModel} returned a structured day plan.`,
        },
      ],
    };
  } catch (primaryError) {
    if (fallbackModel && fallbackModel !== primaryModel) {
      try {
        const result = normalizeGatewayPlan(await generatePlanWithModel(fallbackModel, planningInput));

        return {
          provider: "vercel-ai-gateway",
          status: "success",
          model: fallbackModel,
          fallbackModel: primaryModel,
          rationale: {
            summary: result.summary,
            bullets: result.bullets,
          },
          dailyPlan: result.dailyPlan,
          trace: [
            ...prePlanTrace,
            {
              provider: "Vercel AI Gateway",
              action: "Vercel AI Gateway generated planning rationale",
              status: "success",
              detail: `${fallbackModel} returned a structured day plan after ${primaryModel} failed.`,
            },
          ],
        };
      } catch (fallbackError) {
        return buildFallbackPlan(
          `Primary and fallback Gateway calls failed: ${
            fallbackError instanceof Error
              ? fallbackError.message
              : primaryError instanceof Error
                ? primaryError.message
                : "Unknown Gateway error"
          }`,
          input,
        );
      }
    }

    return buildFallbackPlan(
      primaryError instanceof Error ? primaryError.message : "Unknown Gateway error",
      input,
    );
  }
}

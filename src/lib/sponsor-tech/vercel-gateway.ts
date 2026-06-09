import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";

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

export type GatewayPlanResult = z.infer<typeof GatewayPlanSchema>;

export type PlanDayInput = {
  currentDate: string;
  commitments: unknown[];
  goals: unknown[];
  fixedEvents: unknown[];
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
    action: string;
    status: PlanDayTraceStatus;
    detail: string;
  }>;
};

const fallbackPlan: GatewayPlanResult = {
  summary:
    "StudentOS kept the plan stable: finish the urgent Physics work first, protect fixed tuition, handle the CCA clash with a quick delegation, then use the remaining evening for revision and the coding roadmap.",
  bullets: [
    "Physics stays first because it is due tomorrow morning.",
    "Tuition remains fixed, so the CCA conflict is handled with briefing notes.",
    "Flexible revision moves later after dinner.",
    "The coding goal becomes a scheduled roadmap block instead of a vague intention.",
  ],
  dailyPlan: {
    focus: "Finish Physics worksheet",
    doNow: [
      {
        title: "Finish Physics worksheet",
        timeLabel: "Now",
        estimatedMinutes: 35,
        reason: "Due tomorrow at 8 AM and needs uninterrupted focus.",
      },
    ],
    doNext: [
      {
        title: "Message teammate",
        timeLabel: "After Physics",
        estimatedMinutes: 3,
        reason: "Clarifies the project meeting before the evening fills up.",
      },
      {
        title: "Ask CCA lead for briefing notes",
        timeLabel: "Before briefing",
        estimatedMinutes: 5,
        reason: "Preserves tuition while still covering the CCA commitment.",
      },
      {
        title: "Coding practice",
        timeLabel: "9:00 PM",
        estimatedMinutes: 60,
        reason: "Starts the Python roadmap without crowding urgent work.",
      },
    ],
    later: [
      {
        title: "Coding fundamentals session",
        timeLabel: "17 June",
        estimatedMinutes: 30,
        reason: "Keeps the December goal moving through smaller scheduled steps.",
      },
    ],
  },
};

export function buildFallbackPlan(reason: string): PlanDayResponse {
  return {
    provider: "fallback",
    status: "fallback",
    rationale: {
      summary: fallbackPlan.summary,
      bullets: fallbackPlan.bullets,
    },
    dailyPlan: fallbackPlan.dailyPlan,
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

async function generatePlanWithModel(model: string, input: PlanDayInput) {
  const { output } = await generateText({
    model,
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
          "Use an empty string for an unknown timeLabel.",
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
    return buildFallbackPlan("USE_REAL_VERCEL_AI is disabled or AI_GATEWAY_API_KEY is missing.");
  }

  const primaryModel = sponsorEnv.aiGatewayModel;
  const fallbackModel = sponsorEnv.aiGatewayFallbackModel;

  try {
    const result = await generatePlanWithModel(primaryModel, input);

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
        const result = await generatePlanWithModel(fallbackModel, input);

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
        );
      }
    }

    return buildFallbackPlan(
      primaryError instanceof Error ? primaryError.message : "Unknown Gateway error",
    );
  }
}

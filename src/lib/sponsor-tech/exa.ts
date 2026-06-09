import "server-only";

import { generateText, Output, stepCountIs, tool } from "ai";
import { z } from "zod";
import { isExaReady, isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";

export type ExaSearchResult = {
  title?: string;
  url?: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
};

export type ExaSearchResponse = {
  results?: ExaSearchResult[];
};

export type DeepGoalResearch = {
  query: string;
  summary: string;
  model?: string;
  searchQueries: string[];
  sections: Array<{
    title: string;
    bullets: string[];
  }>;
  clarificationQuestions: Array<{
    question: string;
    why: string;
  }>;
  researchGaps: string[];
  citations: Array<{
    title: string;
    url: string;
  }>;
};

const DeepGoalResearchSchema = z.object({
  query: z.string(),
  summary: z.string(),
  searchQueries: z.array(z.string()).min(3).max(8),
  sections: z.array(z.object({
    title: z.string(),
    bullets: z.array(z.string()).min(2).max(5),
  })).min(3).max(6),
  clarificationQuestions: z.array(z.object({
    question: z.string(),
    why: z.string(),
  })).min(3).max(7),
  researchGaps: z.array(z.string()).max(5),
  citations: z.array(z.object({
    title: z.string(),
    url: z.string(),
  })).min(1).max(8),
});

export async function exaSearch(
  query: string,
  options: { numResults?: number; maxCharacters?: number } = {},
): Promise<ExaSearchResponse> {
  if (!isExaReady() || !sponsorEnv.exaApiKey) {
    throw new Error("USE_REAL_EXA is disabled or EXA_API_KEY is missing.");
  }

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": sponsorEnv.exaApiKey,
    },
    body: JSON.stringify({
      query,
      numResults: options.numResults ?? 4,
      contents: {
        text: {
          maxCharacters: options.maxCharacters ?? 700,
        },
        highlights: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Exa search failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<ExaSearchResponse>;
}

function compactResult(result: ExaSearchResult) {
  return {
    title: result.title || "Untitled result",
    url: result.url || "",
    publishedDate: result.publishedDate || "",
    snippet: (result.highlights?.[0] || result.text || "").slice(0, 900),
  };
}

function uniqueCitations(results: ExaSearchResult[]) {
  const seen = new Set<string>();

  return results
    .filter((result) => result.title && result.url)
    .filter((result) => {
      if (!result.url || seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    })
    .slice(0, 8)
    .map((result) => ({
      title: result.title || "Exa result",
      url: result.url || "",
    }));
}

function presetQueries(goal: string) {
  const cleanedGoal = goal.trim().replace(/\s+/g, " ");
  const quotedGoal = cleanedGoal.length > 90 ? cleanedGoal.slice(0, 90) : cleanedGoal;

  return [
    `${quotedGoal} official`,
    `${quotedGoal} eligibility judging criteria`,
    `${quotedGoal} application registration timeline deadline`,
    `${quotedGoal} challenge scope themes submission requirements`,
  ];
}

async function fallbackDeepResearch(goal: string): Promise<DeepGoalResearch> {
  const queries = presetQueries(goal);
  const responses = await Promise.all(
    queries.map(async (query) => ({
      query,
      response: await exaSearch(query, { numResults: 5, maxCharacters: 900 }),
    })),
  );
  const results = responses.flatMap((item) => item.response.results ?? []);
  const citations = uniqueCitations(results);
  const snippets = results
    .map((result) => result.highlights?.[0] || result.text || result.title)
    .filter(Boolean)
    .slice(0, 8) as string[];

  return {
    query: goal,
    summary: snippets.join(" ").slice(0, 900) || "Exa returned research context for this goal.",
    searchQueries: queries,
    sections: [
      {
        title: "What to verify",
        bullets: [
          "Confirm the exact event or program page before planning around deadlines.",
          "Check eligibility, team rules, location, and registration status.",
        ],
      },
      {
        title: "Winning criteria",
        bullets: [
          "Look for judging rubrics, challenge tracks, sponsor prizes, and past winner patterns.",
          "Turn each criterion into one preparation workstream.",
        ],
      },
      {
        title: "Application process",
        bullets: [
          "Capture registration steps, submission deliverables, deadlines, and required accounts.",
          "Schedule a short follow-up once the student confirms the exact event page.",
        ],
      },
    ],
    clarificationQuestions: [
      {
        question: "Which NEXT hackathon page or organizer are you targeting?",
        why: "Several events can share similar names; the exact page controls eligibility, deadlines, and judging criteria.",
      },
      {
        question: "Are you applying solo or with a team?",
        why: "Team size changes registration steps, role planning, and build scope.",
      },
      {
        question: "What skills and assets do you already have for this hackathon?",
        why: "The prep plan should focus on the gaps that matter for the judging rubric.",
      },
    ],
    researchGaps: citations.length > 0 ? [] : ["No citable Exa results were returned."],
    citations,
  };
}

export async function deepResearchGoal(goal: string): Promise<DeepGoalResearch> {
  if (!isExaReady()) {
    throw new Error("USE_REAL_EXA is disabled or EXA_API_KEY is missing.");
  }

  if (!isVercelAiReady()) {
    return fallbackDeepResearch(goal);
  }

  const searchQueries: string[] = [];
  const allResults: ExaSearchResult[] = [];
  const model = sponsorEnv.aiGatewayResearchModel;

  const { output } = await generateText({
    model,
    output: Output.object({
      schema: DeepGoalResearchSchema,
      name: "deep_goal_research",
      description: "Structured, citation-backed research for turning an ambiguous student goal into a plan.",
    }),
    tools: {
      searchExa: tool({
        description:
          "Search the web with Exa. Use this repeatedly from different angles: official page, eligibility, judging criteria, challenge scope, application process, timeline, deliverables, and past winners.",
        inputSchema: z.object({
          query: z.string().min(3),
          reason: z.string().min(3),
        }),
        execute: async ({ query, reason }) => {
          const response = await exaSearch(query, { numResults: 4, maxCharacters: 900 });
          const results = response.results ?? [];
          searchQueries.push(query);
          allResults.push(...results);

          return {
            query,
            reason,
            resultCount: results.length,
            results: results.map(compactResult),
          };
        },
      }),
    },
    stopWhen: stepCountIs(5),
    temperature: 0.2,
    prepareStep: ({ stepNumber }) => {
      if (stepNumber < 3) {
        return { toolChoice: { type: "tool", toolName: "searchExa" } };
      }

      return { toolChoice: "auto" };
    },
    system:
      "You are StudentOS's research agent. Use Exa as your source of truth and search repeatedly before answering. For ambiguous goals, do not guess silently: research likely interpretations, state gaps, and ask concrete clarifying questions. Keep the final output user-facing, skimmable, and grounded in citations. Do not use emoji or decorative symbols.",
    prompt: JSON.stringify(
      {
        goal,
        instructions: [
          "Call searchExa at least three times with meaningfully different queries.",
          "For hackathons or competitions, cover exact event identity, official page, eligibility, judging criteria, challenge scope/themes, application or registration process, timeline, required deliverables, and past winners when available.",
          "Prefer official sources first. Use secondary sources only to fill gaps or cross-check.",
          "The summary should be a polished paragraph, not raw concatenated snippets.",
          "Sections should be formatted as compact research cards with actionable bullets.",
          "Clarification questions should enable a few back-and-forth turns before the roadmap is finalized.",
          "Only cite URLs returned by Exa.",
          "Use plain section titles without emoji.",
        ],
      },
      null,
      2,
    ),
  });

  const mergedQueries = Array.from(new Set([...searchQueries, ...output.searchQueries])).slice(0, 8);
  const citations = uniqueCitations(allResults);

  return {
    ...output,
    model,
    query: goal,
    searchQueries: mergedQueries.length >= 3 ? mergedQueries : output.searchQueries,
    citations: citations.length > 0 ? citations : output.citations,
  };
}

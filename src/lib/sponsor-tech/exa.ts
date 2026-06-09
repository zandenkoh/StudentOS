import "server-only";

import { isExaReady, sponsorEnv } from "@/lib/sponsor-tech/env";

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

export async function exaSearch(
  query: string,
  options: { numResults?: number; maxCharacters?: number; timeoutMs?: number } = {},
): Promise<ExaSearchResponse> {
  if (!isExaReady() || !sponsorEnv.exaApiKey) {
    throw new Error("USE_REAL_EXA is disabled or EXA_API_KEY is missing.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 7000);

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    signal: controller.signal,
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
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`Exa search failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<ExaSearchResponse>;
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
    `${quotedGoal} official event page eligibility`,
    `${quotedGoal} judging criteria prizes past winners`,
    `${quotedGoal} application registration deadline challenge scope deliverables`,
  ];
}

function snippetsFor(results: ExaSearchResult[], patterns: RegExp[]) {
  return results
    .map((result) => result.highlights?.[0] || result.text || result.title || "")
    .filter((text) => patterns.some((pattern) => pattern.test(text)))
    .slice(0, 3);
}

function fallbackBullet(label: string) {
  return `Verify ${label} from the official event page before locking the roadmap.`;
}

export async function deepResearchGoal(goal: string): Promise<DeepGoalResearch> {
  if (!isExaReady()) {
    throw new Error("USE_REAL_EXA is disabled or EXA_API_KEY is missing.");
  }

  const queries = presetQueries(goal);
  const settledResponses = await Promise.allSettled(
    queries.map((query) => exaSearch(query, { numResults: 4, maxCharacters: 800, timeoutMs: 6500 })),
  );
  const results = settledResponses.flatMap((item) =>
    item.status === "fulfilled" ? item.value.results ?? [] : [],
  );
  const citations = uniqueCitations(results);
  const snippets = results
    .map((result) => result.highlights?.[0] || result.text || result.title)
    .filter(Boolean)
    .slice(0, 5) as string[];

  const eventBullets = snippetsFor(results, [/official|event|organizer|location|format|eligib/i]);
  const criteriaBullets = snippetsFor(results, [/judg|criteria|prize|winner|score|demo/i]);
  const applicationBullets = snippetsFor(results, [/apply|application|register|deadline|submit|deliverable|scope|theme/i]);

  return {
    query: goal,
    summary: snippets.join(" ").slice(0, 700) || "Exa returned research context for this goal.",
    searchQueries: queries,
    sections: [
      {
        title: "Event identity and eligibility",
        bullets: (eventBullets.length ? eventBullets : [
          fallbackBullet("the exact event identity, organizer, eligibility, and team rules"),
          "Confirm whether this is the intended NEXT hackathon before scheduling prep.",
        ]).slice(0, 3),
      },
      {
        title: "Winning criteria",
        bullets: (criteriaBullets.length ? criteriaBullets : [
          fallbackBullet("judging criteria, prizes, sponsor tracks, and past winner patterns"),
          "Convert the rubric into preparation workstreams once the exact event is confirmed.",
        ]).slice(0, 3),
      },
      {
        title: "Application, scope, and deliverables",
        bullets: (applicationBullets.length ? applicationBullets : [
          fallbackBullet("registration steps, deadlines, submission deliverables, and challenge scope"),
          "Schedule the next milestone around the first confirmed application or submission date.",
        ]).slice(0, 3),
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
    researchGaps: [
      ...(citations.length > 0 ? [] : ["No citable Exa results were returned."]),
      ...(settledResponses.some((item) => item.status === "rejected")
        ? ["One or more Exa searches timed out, so StudentOS used the results that returned within the fast path."]
        : []),
    ],
    citations,
  };
}

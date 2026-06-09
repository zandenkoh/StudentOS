import "server-only";

import { isExaReady, sponsorEnv } from "@/lib/sponsor-tech/env";
import { compactResearchCopy } from "@/lib/sponsor-tech/research-format";

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
      title: compactResearchCopy(result.title || "Exa result", 72),
      url: result.url || "",
    }));
}

type ResearchFocus =
  | "reading"
  | "event"
  | "application"
  | "learning"
  | "project"
  | "assessment"
  | "general";

function cleanedResearchPrompt(goal: string) {
  return goal.trim().replace(/\s+/g, " ");
}

function quotedOrNamedSubject(goal: string) {
  const cleanedGoal = cleanedResearchPrompt(goal);
  const quoted = cleanedGoal.match(/["'“”‘’]([^"'“”‘’]{3,120})["'“”‘’]/)?.[1];
  if (quoted) return quoted;

  const readMatch = cleanedGoal.match(/\bread\s+(.+?)(?:\s+(?:full\s+)?(?:book|novel|story|play|text|article|chapter)\b|\s+by\b|$)/i)?.[1];
  if (readMatch && readMatch.length >= 3) return readMatch;

  const learnMatch = cleanedGoal.match(/\blearn(?:ing)?\s+(.+?)(?:\s+by\b|\s+before\b|\s+for\b|$)/i)?.[1];
  if (learnMatch && learnMatch.length >= 3) return learnMatch;

  return cleanedGoal.length > 140 ? cleanedGoal.slice(0, 140) : cleanedGoal;
}

function researchFocus(goal: string): ResearchFocus {
  const lowerGoal = goal.toLowerCase();

  if (/\b(read|book|novel|story|chapter|text|article|audiobook|literature)\b/.test(lowerGoal)) return "reading";
  if (/\b(hackathon|competition|contest|olympiad|challenge|event|conference|tournament)\b/.test(lowerGoal)) return "event";
  if (/\b(scholarship|internship|application|admission|apply|registration|deadline|eligibility)\b/.test(lowerGoal)) return "application";
  if (/\b(learn|course|skill|coding|python|javascript|math|language|proficient|master)\b/.test(lowerGoal)) return "learning";
  if (/\b(project|portfolio|build|prototype|deliverable|presentation|essay|report)\b/.test(lowerGoal)) return "project";
  if (/\b(exam|test|assessment|rubric|syllabus|worksheet|homework)\b/.test(lowerGoal)) return "assessment";

  return "general";
}

function presetQueries(goal: string) {
  const cleanedGoal = cleanedResearchPrompt(goal);
  const subject = quotedOrNamedSubject(cleanedGoal);
  const focus = researchFocus(cleanedGoal);

  switch (focus) {
    case "reading":
      return [
        `${subject} book length pages word count reading time`,
        `${subject} chapter count audiobook duration summary`,
        `${cleanedGoal} reading schedule time required`,
      ];
    case "event":
      return [
        `${cleanedGoal} official page eligibility date location`,
        `${cleanedGoal} judging criteria prizes past winners`,
        `${cleanedGoal} registration deadline challenge scope deliverables`,
      ];
    case "application":
      return [
        `${cleanedGoal} official eligibility requirements deadline`,
        `${cleanedGoal} application steps documents selection criteria`,
        `${cleanedGoal} timeline important dates preparation checklist`,
      ];
    case "learning":
      return [
        `${cleanedGoal} learning roadmap prerequisites time commitment`,
        `${cleanedGoal} beginner curriculum practice projects`,
        `${cleanedGoal} study plan milestones resources`,
      ];
    case "project":
      return [
        `${cleanedGoal} requirements deliverables rubric examples`,
        `${cleanedGoal} project plan milestones scope checklist`,
        `${cleanedGoal} best practices timeline preparation`,
      ];
    case "assessment":
      return [
        `${cleanedGoal} syllabus rubric requirements duration`,
        `${cleanedGoal} topic overview practice questions study time`,
        `${cleanedGoal} preparation checklist common mistakes`,
      ];
    default:
      return [
        `${cleanedGoal} official information requirements duration`,
        `${cleanedGoal} planning context time commitment checklist`,
        `${cleanedGoal} deadline milestones preparation steps`,
      ];
  }
}

function snippetsFor(results: ExaSearchResult[], patterns: RegExp[]) {
  const seen = new Set<string>();

  return results
    .map((result) => result.highlights?.[0] || result.text || result.title || "")
    .map((text) => compactResearchCopy(text, 170))
    .filter((text) => patterns.some((pattern) => pattern.test(text)))
    .filter((text) => {
      const key = text.toLowerCase();
      if (!text || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

function fallbackBullet(label: string) {
  return `Verify ${label} from a reliable source before locking the plan.`;
}

function uniqueSnippets(results: ExaSearchResult[]) {
  const seen = new Set<string>();

  return results
    .map((result) => result.highlights?.[0] || result.text || result.title || "")
    .map((text) => compactResearchCopy(text, 190))
    .filter(Boolean)
    .filter((text) => {
      const key = text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

export async function deepResearchGoal(goal: string): Promise<DeepGoalResearch> {
  if (!isExaReady()) {
    throw new Error("USE_REAL_EXA is disabled or EXA_API_KEY is missing.");
  }

  const queries = presetQueries(goal);
  const settledResponses = await Promise.allSettled(
    queries.map((query) => exaSearch(query, { numResults: 4, maxCharacters: 550, timeoutMs: 6500 })),
  );
  const results = settledResponses.flatMap((item) =>
    item.status === "fulfilled" ? item.value.results ?? [] : [],
  );
  const citations = uniqueCitations(results);
  const snippets = uniqueSnippets(results);
  const focus = researchFocus(goal);

  const identityBullets = snippetsFor(results, [/official|overview|about|author|organizer|source|edition|format|location|eligib|syllabus/i]);
  const effortBullets = snippetsFor(results, [/length|pages|word|duration|time|hour|chapter|deadline|date|schedule|milestone|commitment/i]);
  const requirementsBullets = snippetsFor(results, [/require|criteria|rubric|judg|apply|application|register|submit|deliverable|scope|prerequisite|checklist|resource/i]);
  const defaultSubject = focus === "reading" ? "the exact edition, page count, chapter count, and reading-time estimate" : "the exact source, scope, and constraints";
  const defaultEffort = focus === "event" || focus === "application"
    ? "deadlines, important dates, eligibility windows, and submission effort"
    : "duration, workload, prerequisites, and realistic time commitment";
  const defaultRequirements = focus === "reading"
    ? "assigned edition, expected depth, notes needed, and whether summaries or annotations are required"
    : "requirements, deliverables, criteria, resources, and next milestones";

  return {
    query: goal,
    summary: snippets.slice(0, 2).join(" ") || "Exa returned research context for this goal.",
    searchQueries: queries,
    sections: [
      {
        title: "Source identity and scope",
        bullets: (identityBullets.length ? identityBullets : [
          fallbackBullet(defaultSubject),
          "Confirm the intended source before turning this into scheduled work.",
        ]).slice(0, 3),
      },
      {
        title: "Time and workload",
        bullets: (effortBullets.length ? effortBullets : [
          fallbackBullet(defaultEffort),
          "Use the verified workload to size each scheduled session realistically.",
        ]).slice(0, 3),
      },
      {
        title: "Requirements and milestones",
        bullets: (requirementsBullets.length ? requirementsBullets : [
          fallbackBullet(defaultRequirements),
          "Schedule the next milestone around the first confirmed requirement or due date.",
        ]).slice(0, 3),
      },
    ],
    clarificationQuestions: [
      {
        question: "Which exact source, edition, event, or requirement should StudentOS use?",
        why: "Similar names can point to different lengths, rules, deadlines, or expectations.",
      },
      {
        question: "What level of completion or quality is expected?",
        why: "Reading, practice, application, and project plans need different amounts of review and output work.",
      },
      {
        question: "How much time can be reserved before the deadline?",
        why: "The plan should match the real available study blocks instead of assuming unlimited time.",
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

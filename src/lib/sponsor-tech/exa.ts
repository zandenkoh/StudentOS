import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";
import { gatewayLanguageModel } from "@/lib/sponsor-tech/ai-gateway-model";
import { isExaReady, isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";
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
  filteredResultCount?: number;
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

const ResearchQueryPlanSchema = z.object({
  subject: z.string().min(3).max(180),
  contextSummary: z.string().min(5).max(320),
  researchGoals: z.array(z.string().min(3).max(120)).min(1).max(5),
  queries: z.array(z.string().min(4).max(160)).min(2).max(5),
});

export type ResearchQueryPlan = z.infer<typeof ResearchQueryPlanSchema> & {
  provider: "vercel-ai-gateway" | "heuristic";
  model?: string;
};

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

function titleCaseKnownSubject(subject: string) {
  if (/^(the\s+)?mom test$/i.test(subject.trim())) return "The Mom Test";
  return subject;
}

function compactEvidence(value: string, maxLength = 3500) {
  const text = value.replace(/\n{3,}/g, "\n\n").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function cleanQuery(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .trim()
    .slice(0, 160);
}

function evidenceLines(evidence: string) {
  const metadataOnly = /^(source|title|student note|manual input|goal command|interpretation|interpreted summary|ocr|textract|aws textract|extracted tasks?)$/i;

  return evidence
    .split(/\n|[•*]\s+|(?:^|\s)\d+[.)]\s+/)
    .map((line) =>
      line
        .replace(/^(source|title|student note|manual input|goal command|interpretation|interpreted summary|ocr|textract|extracted tasks?):\s*/i, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line.length >= 4 && !metadataOnly.test(line))
    .filter((line) => !/^(typed note|manual goal|added source|uploaded file queued|source uploaded)$/i.test(line));
}

function extractEventSubject(text: string) {
  const match =
    text.match(/\b([A-Za-z0-9][A-Za-z0-9+#.&-]*(?:\s+[A-Za-z0-9][A-Za-z0-9+#.&-]*){0,5}\s+(?:hackathon|competition|contest|challenge|olympiad|conference|tournament))\b/i) ??
    text.match(/\b((?:hackathon|competition|contest|challenge|olympiad|conference|tournament)\s+[A-Za-z0-9][A-Za-z0-9+#.&-]*(?:\s+[A-Za-z0-9][A-Za-z0-9+#.&-]*){0,5})\b/i);

  return match?.[1]?.replace(/\s+/g, " ").trim();
}

function extractSkillSubject(text: string) {
  const match = text.match(/\b(html|css|javascript|typescript|python|react|next\.?js|node\.?js|data\s+handling|machine\s+learning|ai|design|pitching|prototype|frontend|backend)\b/i);
  if (!match) return undefined;

  const skill = match[1].replace(/\s+/g, " ");
  if (/\bzero\s+to\s+hero\b/i.test(text)) return `${skill} zero to hero`;
  if (/\bbeginner|from scratch|no experience\b/i.test(text)) return `${skill} beginner`;
  return skill;
}

function uniqueQueries(queries: string[]) {
  const seen = new Set<string>();

  return queries
    .map(cleanQuery)
    .filter(Boolean)
    .filter((query) => {
      const key = query.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function normalizeResearchQueryPlan(
  plan: z.infer<typeof ResearchQueryPlanSchema>,
  provider: ResearchQueryPlan["provider"],
  model?: string,
): ResearchQueryPlan {
  const rawSubject = compactResearchCopy(cleanedResearchPrompt(plan.subject), 180);
  const focusEvidence = [
    rawSubject,
    plan.contextSummary,
    ...plan.researchGoals,
    ...plan.queries,
  ].join(" ");
  const focus = researchFocus(focusEvidence);
  const subject = focus === "reading" ? quotedOrNamedSubject(rawSubject) : rawSubject;
  const queries = focus === "reading"
    ? uniqueQueries([...presetQueries(subject), ...plan.queries])
    : uniqueQueries(plan.queries);

  return {
    subject,
    contextSummary: compactResearchCopy(plan.contextSummary, 320),
    researchGoals: plan.researchGoals.map((goal) => compactResearchCopy(goal, 120)).slice(0, 5),
    queries: queries.length >= 2 ? queries : uniqueQueries([...queries, ...presetQueries(subject)]).slice(0, 3),
    provider,
    model,
  };
}

function quotedOrNamedSubject(goal: string) {
  const cleanedGoal = cleanedResearchPrompt(goal);
  const quoted = cleanedGoal.match(/["'“”‘’]([^"'“”‘’]{3,120})["'“”‘’]/)?.[1];
  if (quoted) return titleCaseKnownSubject(quoted);

  const readMatch = cleanedGoal.match(/\bread\s+(.+?)(?:\s+(?:full\s+)?(?:book|novel|story|play|text|article|chapter)\b|\s+by\b|$)/i)?.[1];
  if (readMatch && readMatch.length >= 3) return titleCaseKnownSubject(readMatch);

  const learnMatch = cleanedGoal.match(/\blearn(?:ing)?\s+(.+?)(?:\s+by\b|\s+before\b|\s+for\b|$)/i)?.[1];
  if (learnMatch && learnMatch.length >= 3) return titleCaseKnownSubject(learnMatch);

  return titleCaseKnownSubject(cleanedGoal.length > 140 ? cleanedGoal.slice(0, 140) : cleanedGoal);
}

function researchFocus(goal: string): ResearchFocus {
  const lowerGoal = goal.toLowerCase();

  if (/\b(read|book|novel|story|chapter|text|article|audiobook|literature|author)\b/.test(lowerGoal)) return "reading";
  if (/^(the\s+)?mom test\b/.test(lowerGoal)) return "reading";
  if (/\b(hackathon|competition|contest|olympiad|challenge|event|conference|tournament)\b/.test(lowerGoal)) return "event";
  if (/\b(scholarship|internship|application|admission|apply|registration|deadline|eligibility)\b/.test(lowerGoal)) return "application";
  if (/\b(learn|course|skill|coding|python|javascript|math|language|proficient|master)\b/.test(lowerGoal)) return "learning";
  if (/\b(project|portfolio|build|prototype|deliverable|presentation|essay|report)\b/.test(lowerGoal)) return "project";
  if (/\b(exam|assessment|rubric|syllabus|worksheet|homework)\b/.test(lowerGoal)) return "assessment";
  if (/\btest\b/.test(lowerGoal) && /\b(prep|practice|study|grade|quiz|school|exam|assessment)\b/.test(lowerGoal)) return "assessment";

  return "general";
}

function quotedSearchSubject(subject: string) {
  const cleaned = quotedOrNamedSubject(subject).replace(/^["']|["']$/g, "");
  if (/^(the\s+)?mom test$/i.test(cleaned)) return "\"The Mom Test\" Rob Fitzpatrick";
  if (/^[a-z0-9][a-z0-9 .:&+#'-]{2,80}$/i.test(cleaned)) return `"${cleaned}"`;
  return cleaned;
}

function presetQueries(goal: string) {
  const cleanedGoal = cleanedResearchPrompt(goal);
  const subject = quotedOrNamedSubject(cleanedGoal);
  const focus = researchFocus(cleanedGoal);

  switch (focus) {
    case "reading": {
      const quotedSubject = quotedSearchSubject(subject);
      return [
        `${quotedSubject} book pages chapters reading time`,
        `${quotedSubject} author summary audiobook duration`,
        `${quotedSubject} reading schedule time required`,
      ];
    }
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

export function heuristicResearchQueryPlan(evidence: string): ResearchQueryPlan {
  const lines = evidenceLines(evidence);
  const joinedEvidence = lines.join(" ");
  const eventSubject = extractEventSubject(joinedEvidence);
  const skillSubject = extractSkillSubject(joinedEvidence);
  const strongestLine =
    lines
      .filter((line) => /(goal|learn|roadmap|prepare|preparation|hackathon|competition|contest|challenge|deadline|eligibility|criteria|deliverable|html|python|javascript|course|project)/i.test(line))
      .sort((a, b) => b.length - a.length)[0] ??
    lines.sort((a, b) => b.length - a.length)[0] ??
    "student commitment";
  const subject = eventSubject && skillSubject
    ? `${skillSubject} preparation for ${eventSubject}`
    : eventSubject ?? quotedOrNamedSubject(strongestLine);
  const queries = eventSubject
    ? uniqueQueries([
        `${eventSubject} official rules eligibility deadline`,
        `${eventSubject} judging criteria tracks deliverables`,
        `${eventSubject} registration timeline prizes`,
        ...(skillSubject
          ? [
              `${skillSubject} hackathon preparation roadmap beginner projects`,
              `${skillSubject} prototype checklist hackathon beginner`,
            ]
          : []),
      ])
    : uniqueQueries(presetQueries(subject));

  return normalizeResearchQueryPlan(
    {
      subject,
      contextSummary: compactResearchCopy(strongestLine, 300),
      researchGoals: [
        "Identify official source details, dates, eligibility, and scope.",
        "Find workload, requirements, criteria, and deliverables that affect scheduling.",
        "Translate external context into realistic preparation milestones.",
      ],
      queries,
    },
    "heuristic",
  );
}

export async function generateResearchQueryPlan(evidence: string): Promise<ResearchQueryPlan> {
  const fallback = heuristicResearchQueryPlan(evidence);

  if (!isVercelAiReady()) return fallback;

  try {
    const { output } = await generateText({
      model: gatewayLanguageModel(sponsorEnv.aiGatewayResearchModel),
      output: Output.object({ schema: ResearchQueryPlanSchema }),
      system: [
        "You are the StudentOS research-query planner.",
        "Your job is to read OCR, Textract interpretations, and manual student notes, then create useful web search queries.",
        "Do not reuse the whole source packet as a query.",
        "Prefer official pages, exact event names, deadlines, eligibility, criteria, deliverables, workload, and beginner roadmap context.",
        "Return concise queries that Exa can search directly.",
      ].join("\n"),
      prompt: JSON.stringify(
        {
          sourceEvidence: compactEvidence(evidence),
          outputRules: [
            "subject should be the concise researched topic, not the full evidence packet.",
            "queries must be different from each other and must not be full pasted user input unless the input is already a concise proper noun.",
            "For hackathons or competitions, include official rules/deadline and judging/deliverables queries.",
            "For learning or preparation goals, include roadmap, prerequisites, project, and time-commitment queries.",
            "Use 2-5 queries.",
          ],
          outputShape: {
            subject: "string",
            contextSummary: "string",
            researchGoals: ["string"],
            queries: ["string"],
          },
        },
        null,
        2,
      ),
    });

    return normalizeResearchQueryPlan(output, "vercel-ai-gateway", sponsorEnv.aiGatewayResearchModel);
  } catch {
    return fallback;
  }
}

const relevanceStopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "book",
  "read",
  "reading",
  "summary",
  "chapter",
  "chapters",
  "pages",
  "page",
  "time",
  "required",
  "official",
  "deadline",
  "requirements",
  "criteria",
  "roadmap",
  "preparation",
]);

function normalizedSearchText(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function resultSearchText(result: ExaSearchResult) {
  return [
    result.title,
    result.url,
    result.text,
    result.highlights?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function subjectTokens(subject: string) {
  return normalizedSearchText(subject)
    .split(" ")
    .filter((token) => token.length >= 3 && !relevanceStopwords.has(token));
}

function relevanceScore(result: ExaSearchResult, subject: string, focus: ResearchFocus) {
  const exactSubject = normalizedSearchText(quotedOrNamedSubject(subject));
  const title = normalizedSearchText(result.title);
  const haystack = normalizedSearchText(resultSearchText(result));
  const tokens = subjectTokens(subject);
  let score = 0;

  if (exactSubject.length >= 5 && haystack.includes(exactSubject)) score += 10;
  if (/^(the\s+)?mom test\b/i.test(subject) && /\b(the mom test|rob fitzpatrick)\b/i.test(resultSearchText(result))) {
    score += 10;
  }

  tokens.forEach((token) => {
    if (title.includes(token)) score += 3;
    else if (haystack.includes(token)) score += 1;
  });

  const matchedTokens = tokens.filter((token) => haystack.includes(token)).length;
  if (tokens.length >= 2 && matchedTokens >= Math.ceil(tokens.length * 0.6)) score += 3;
  if (tokens.length === 1 && matchedTokens === 1) score += 2;

  const schoolSyllabusNoise = /\b(syllabus|teacher|homework guidelines|grade honors|school district|student handbook|classroom|worksheet)\b/i.test(
    resultSearchText(result),
  );
  if (focus === "reading" && schoolSyllabusNoise && !(exactSubject && haystack.includes(exactSubject))) {
    score -= 8;
  }

  return score;
}

function relevantResultsFor(subject: string, results: ExaSearchResult[]) {
  const focus = researchFocus(subject);
  const threshold = focus === "reading" || focus === "event" || focus === "application" ? 4 : 2;
  const ranked = results
    .map((result) => ({ result, score: relevanceScore(result, subject, focus) }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.result);

  if (ranked.length > 0 || focus === "reading") return ranked;

  return results
    .map((result) => ({ result, score: relevanceScore(result, subject, focus) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.result)
    .slice(0, 4);
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

export async function deepResearchGoal(
  goal: string,
  options: { searchQueries?: string[]; model?: string } = {},
): Promise<DeepGoalResearch> {
  if (!isExaReady()) {
    throw new Error("USE_REAL_EXA is disabled or EXA_API_KEY is missing.");
  }

  const queries = options.searchQueries?.length
    ? uniqueQueries(options.searchQueries)
    : presetQueries(goal);
  const settledResponses = await Promise.allSettled(
    queries.map((query) => exaSearch(query, { numResults: 4, maxCharacters: 550 })),
  );
  const results = settledResponses.flatMap((item) =>
    item.status === "fulfilled" ? item.value.results ?? [] : [],
  );
  const relevantResults = relevantResultsFor(goal, results);
  const filteredResultCount = Math.max(0, results.length - relevantResults.length);
  const citations = uniqueCitations(relevantResults);
  const snippets = uniqueSnippets(relevantResults);
  const focus = researchFocus(goal);

  const identityBullets = snippetsFor(relevantResults, [/official|overview|about|author|organizer|source|edition|format|location|eligib|syllabus/i]);
  const effortBullets = snippetsFor(relevantResults, [/length|pages|word|duration|time|hour|chapter|deadline|date|schedule|milestone|commitment/i]);
  const requirementsBullets = snippetsFor(relevantResults, [/require|criteria|rubric|judg|apply|application|register|submit|deliverable|scope|prerequisite|checklist|resource/i]);
  const defaultSubject = focus === "reading" ? "the exact edition, page count, chapter count, and reading-time estimate" : "the exact source, scope, and constraints";
  const defaultEffort = focus === "event" || focus === "application"
    ? "deadlines, important dates, eligibility windows, and submission effort"
    : "duration, workload, prerequisites, and realistic time commitment";
  const defaultRequirements = focus === "reading"
    ? "assigned edition, expected depth, notes needed, and whether summaries or annotations are required"
    : "requirements, deliverables, criteria, resources, and next milestones";

  return {
    query: goal,
    summary: snippets.slice(0, 2).join(" ") || "Exa returned no relevant citable context for this goal.",
    model: options.model,
    filteredResultCount,
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
      ...(citations.length > 0 ? [] : ["No relevant citable Exa results were returned after subject matching."]),
      ...(filteredResultCount > 0
        ? [`Filtered ${filteredResultCount} unrelated Exa ${filteredResultCount === 1 ? "result" : "results"} before building roadmap context.`]
        : []),
      ...(settledResponses.some((item) => item.status === "rejected")
        ? ["One or more Exa searches timed out, so StudentOS used the results that returned within the fast path."]
        : []),
    ],
    citations,
  };
}

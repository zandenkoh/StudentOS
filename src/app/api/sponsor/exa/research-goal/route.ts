import { NextResponse } from "next/server";
import { z } from "zod";
import { deepResearchGoal, generateResearchQueryPlan } from "@/lib/sponsor-tech/exa";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  goal: z.string().min(1),
  clarificationAnswers: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).optional(),
});

export async function POST(req: Request) {
  let requestBody: unknown;

  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing goal" }, { status: 400 });
  }

  try {
    const goal = parsed.data.clarificationAnswers?.length
      ? [
          parsed.data.goal,
          "Clarification answers:",
          ...parsed.data.clarificationAnswers.map((item) => `Q: ${item.question}\nA: ${item.answer}`),
        ].join("\n")
      : parsed.data.goal;
    const queryPlan = await generateResearchQueryPlan(goal);
    const result = await deepResearchGoal(queryPlan.subject, {
      searchQueries: queryPlan.queries,
      model: queryPlan.model,
    });

    return NextResponse.json({
      provider: "exa",
      status: "success",
      query: result.query,
      model: result.model,
      summary: result.summary,
      filteredResultCount: result.filteredResultCount,
      sections: result.sections,
      clarificationQuestions: result.clarificationQuestions,
      researchGaps: result.researchGaps,
      searchQueries: result.searchQueries,
      citations: result.citations,
      trace: [
        {
          provider: "Exa",
          action: "Deep researched goal context",
          status: "success",
          detail: `${result.searchQueries.length} focused Exa searches, ${result.citations.length} citations, ${result.filteredResultCount ?? 0} unrelated results filtered.`,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({
      provider: "exa",
      status: "fallback",
      query: parsed.data.goal,
      summary: "Exa research unavailable; StudentOS will keep the fallback roadmap.",
      sections: [],
      clarificationQuestions: [
        {
          question: "Which exact event page or organizer should StudentOS use?",
          why: "The exact source controls eligibility, deadlines, and judging criteria.",
        },
      ],
      researchGaps: ["Deep Exa research did not complete."],
      searchQueries: [],
      citations: [],
      trace: [
        {
          provider: "Exa",
          action: "Researched broad goal context",
          status: "fallback",
          detail: error instanceof Error ? error.message : "Exa search failed.",
        },
      ],
    });
  }
}

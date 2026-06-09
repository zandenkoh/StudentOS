import { NextResponse } from "next/server";
import { z } from "zod";
import { exaSearch } from "@/lib/sponsor-tech/exa";

export const runtime = "nodejs";

const RequestSchema = z.object({
  goal: z.string().min(1),
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
    const result = await exaSearch(parsed.data.goal);
    const results = result.results ?? [];

    return NextResponse.json({
      provider: "exa",
      status: "success",
      query: parsed.data.goal,
      summary: results
        .slice(0, 3)
        .map((item) => item.highlights?.[0] || item.text || item.title)
        .filter(Boolean)
        .join(" ")
        .slice(0, 700),
      citations: results
        .filter((item) => item.title && item.url)
        .slice(0, 4)
        .map((item) => ({ title: item.title, url: item.url })),
      trace: [
        {
          provider: "Exa",
          action: "Researched broad goal context",
          status: "success",
          detail: `${results.length} Exa results returned.`,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({
      provider: "exa",
      status: "fallback",
      query: parsed.data.goal,
      summary: "Exa research unavailable; StudentOS will keep the fallback roadmap.",
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

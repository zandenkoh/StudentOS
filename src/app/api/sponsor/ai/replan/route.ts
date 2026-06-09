import { NextResponse } from "next/server";
import { ReplanAgentInputSchema, replanWithAgent } from "@/lib/sponsor-tech/replan-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let requestBody: unknown;

  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ReplanAgentInputSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid replanning input",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const result = await replanWithAgent(parsed.data);

  return NextResponse.json(result);
}

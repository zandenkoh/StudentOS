import { NextResponse } from "next/server";
import { z } from "zod";
import { planDayWithVercelGateway } from "@/lib/sponsor-tech/vercel-gateway";

export const runtime = "nodejs";
export const maxDuration = 300;

const RequestSchema = z.object({
  currentDate: z.string().min(1),
  commitments: z.array(z.unknown()).default([]),
  goals: z.array(z.unknown()).default([]),
  fixedEvents: z.array(z.unknown()).default([]),
  clarificationAnswers: z.array(z.unknown()).default([]),
  sourceContext: z.unknown().optional(),
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
    return NextResponse.json(
      {
        error: "Invalid planner input",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const result = await planDayWithVercelGateway(parsed.data);

  return NextResponse.json(result);
}

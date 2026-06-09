import { NextResponse } from "next/server";
import {
  AnalyseStudentChaosRequestSchema,
  analyseStudentChaos,
} from "@/lib/sponsor-tech/studentos-agent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let requestBody: unknown;

  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = AnalyseStudentChaosRequestSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid StudentOS analysis input",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const result = await analyseStudentChaos(parsed.data);

  return NextResponse.json(result);
}

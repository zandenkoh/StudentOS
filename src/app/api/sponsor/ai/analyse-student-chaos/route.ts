import { NextResponse } from "next/server";
import {
  AnalyseStudentChaosRequestSchema,
  analyseStudentChaos,
} from "@/lib/sponsor-tech/studentos-agent";
import type { AnalyseStudentChaosStreamEvent } from "@/lib/studentos-ai-types";

export const runtime = "nodejs";
export const maxDuration = 35;

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

  const wantsStream =
    new URL(req.url).searchParams.get("stream") === "1" ||
    req.headers.get("accept")?.includes("application/x-ndjson");

  if (!wantsStream) {
    const result = await analyseStudentChaos(parsed.data);

    return NextResponse.json(result);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AnalyseStudentChaosStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const result = await analyseStudentChaos(parsed.data, {
          onEvent: send,
        });

        send({ type: "footprint", footprint: result });
      } catch (error) {
        send({
          type: "error",
          error: error instanceof Error ? error.message : "StudentOS analysis stream failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

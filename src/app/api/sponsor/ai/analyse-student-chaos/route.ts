import { NextResponse } from "next/server";
import {
  AnalyseStudentChaosRequestSchema,
  analyseStudentChaos,
  type AnalyseStudentChaosRequest,
} from "@/lib/sponsor-tech/studentos-agent";
import { sponsorEnv } from "@/lib/sponsor-tech/env";
import {
  awsLambdaFallbackTrace,
  awsLambdaSuccessTrace,
  bedrockTextractTrace,
  prependSponsorTraces,
} from "@/lib/sponsor-tech/sponsor-proof";
import type {
  AIAgentLog,
  AISponsorTraceItem,
  AnalyseStudentChaosStreamEvent,
  StudentOSAgentFootprint,
} from "@/lib/studentos-ai-types";

export const runtime = "nodejs";
export const maxDuration = 60;

function configuredAwsAgentEndpoint() {
  return sponsorEnv.awsAgentEndpoint?.trim() || "";
}

function allowLocalAgentFallback() {
  return process.env.ALLOW_LOCAL_AGENT_FALLBACK !== "false";
}

function awsAgentHost(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

function awsComputeTrace(endpoint: string): AISponsorTraceItem {
  return awsLambdaSuccessTrace(`Vercel route forwarded analysis to AWS compute at ${awsAgentHost(endpoint)}.`);
}

function awsFallbackTrace(endpoint: string, error: unknown): AISponsorTraceItem {
  return awsLambdaFallbackTrace(
    error instanceof Error
      ? `AWS endpoint ${awsAgentHost(endpoint)} failed: ${error.message}`
      : `AWS endpoint ${awsAgentHost(endpoint)} failed; local fallback handled the request.`,
  );
}

function localAwsTrace() {
  return awsLambdaFallbackTrace("AWS_AGENT_ENDPOINT is not set; Vercel used the local agent fallback for demo stability.");
}

async function callAwsAgent(
  endpoint: string,
  input: AnalyseStudentChaosRequest,
): Promise<StudentOSAgentFootprint> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) as unknown : undefined;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `AWS agent endpoint returned ${response.status}.`;

    throw new Error(message);
  }

  return prependSponsorTraces(payload as StudentOSAgentFootprint, [
    awsComputeTrace(endpoint),
    bedrockTextractTrace(input.sources),
  ]);
}

function awsForwardLog(endpoint: string): AIAgentLog {
  return {
    id: "aws-agent-forwarded",
    at: 0,
    kind: "tool",
    title: "Forwarding to AWS Lambda",
    body: "Vercel is handing the StudentOS orchestration request to the AWS-hosted agent endpoint.",
    tool: {
      provider: "AWS",
      result: awsAgentHost(endpoint),
    },
  };
}

async function analyseWithLocalFallback(
  input: AnalyseStudentChaosRequest,
  endpoint: string,
  error: unknown,
): Promise<StudentOSAgentFootprint> {
  const fallback = await analyseStudentChaos(input);

  return prependSponsorTraces(fallback, [
    awsFallbackTrace(endpoint, error),
    bedrockTextractTrace(input.sources),
  ]);
}

function awsAgentErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      error: "AWS agent endpoint failed",
      detail: error instanceof Error ? error.message : "Unknown AWS agent error",
    },
    {
      status: 502,
      headers: { "X-StudentOS-Agent-Compute": "aws-lambda-error" },
    },
  );
}

function streamAwsAgentResult(result: StudentOSAgentFootprint, endpoint: string, sources: AnalyseStudentChaosRequest["sources"]) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: AnalyseStudentChaosStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      send({ type: "log", log: awsForwardLog(endpoint) });
      send({ type: "trace", trace: awsComputeTrace(endpoint) });
      send({ type: "trace", trace: bedrockTextractTrace(sources) });
      send({ type: "footprint", footprint: result });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-StudentOS-Agent-Compute": "aws-lambda",
      "X-Accel-Buffering": "no",
    },
  });
}

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
  const awsAgentEndpoint = configuredAwsAgentEndpoint();

  if (!wantsStream) {
    if (awsAgentEndpoint) {
      try {
        const result = await callAwsAgent(awsAgentEndpoint, parsed.data);

        return NextResponse.json(result, {
          headers: { "X-StudentOS-Agent-Compute": "aws-lambda" },
        });
      } catch (error) {
        if (!allowLocalAgentFallback()) {
          return awsAgentErrorResponse(error);
        }

        console.error("StudentOS AWS agent endpoint failed; using local fallback.", error);
        const result = await analyseWithLocalFallback(parsed.data, awsAgentEndpoint, error);

        return NextResponse.json(result, {
          headers: { "X-StudentOS-Agent-Compute": "local-fallback" },
        });
      }
    }

    const result = prependSponsorTraces(await analyseStudentChaos(parsed.data), [
      localAwsTrace(),
      bedrockTextractTrace(parsed.data.sources),
    ]);

    return NextResponse.json(result, {
      headers: { "X-StudentOS-Agent-Compute": "local" },
    });
  }

  if (awsAgentEndpoint && !allowLocalAgentFallback()) {
    try {
      const result = await callAwsAgent(awsAgentEndpoint, parsed.data);

      return streamAwsAgentResult(result, awsAgentEndpoint, parsed.data.sources);
    } catch (error) {
      return awsAgentErrorResponse(error);
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AnalyseStudentChaosStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        if (awsAgentEndpoint) {
          const forwardLog = awsForwardLog(awsAgentEndpoint);

          send({ type: "log", log: forwardLog });

          try {
            const result = await callAwsAgent(awsAgentEndpoint, parsed.data);

            send({ type: "trace", trace: awsComputeTrace(awsAgentEndpoint) });
            send({ type: "trace", trace: bedrockTextractTrace(parsed.data.sources) });
            send({ type: "footprint", footprint: result });
            return;
          } catch (error) {
            console.error("StudentOS AWS agent endpoint failed; streaming local fallback.", error);
            const trace = awsFallbackTrace(awsAgentEndpoint, error);
            const sourceTrace = bedrockTextractTrace(parsed.data.sources);

            send({ type: "trace", trace });
            send({ type: "trace", trace: sourceTrace });
            send({
              type: "log",
              log: {
                id: "aws-agent-local-fallback",
                at: 250,
                kind: "decision",
                title: "AWS agent fallback selected",
                body: "The AWS endpoint did not complete, so StudentOS kept the demo flow moving locally.",
                detail: trace.detail,
              },
            });

            const fallback = await analyseStudentChaos(parsed.data, {
              onEvent: send,
            });

            send({
              type: "footprint",
              footprint: prependSponsorTraces(fallback, [trace, sourceTrace]),
            });
            return;
          }
        }

        const localTrace = localAwsTrace();
        const sourceTrace = bedrockTextractTrace(parsed.data.sources);

        send({ type: "trace", trace: localTrace });
        send({ type: "trace", trace: sourceTrace });

        const result = await analyseStudentChaos(parsed.data, {
          onEvent: send,
        });

        send({
          type: "footprint",
          footprint: prependSponsorTraces(result, [localTrace, sourceTrace]),
        });
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
      "X-StudentOS-Agent-Compute": awsAgentEndpoint ? "aws-lambda" : "local",
      "X-Accel-Buffering": "no",
    },
  });
}

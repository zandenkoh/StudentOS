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
import { gatewayHealthTrace } from "@/lib/sponsor-tech/vercel-gateway";
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

function strictJudgeMode(req: Request, body: unknown) {
  const url = new URL(req.url);

  return (
    process.env.STUDENTOS_STRICT_JUDGE === "true" ||
    url.searchParams.get("judge") === "1" ||
    req.headers.get("x-studentos-strict-judge") === "true" ||
    (typeof body === "object" &&
      body !== null &&
      "strictJudgeMode" in body &&
      body.strictJudgeMode === true)
  );
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

function missingAwsEndpointError() {
  return new Error("AWS_AGENT_ENDPOINT is not set, so the Next.js route has no AWS Lambda agent URL to call.");
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

function strictJudgeErrorResponse(error: unknown) {
  return NextResponse.json(
    {
      error: "Strict judge mode requires AWS Lambda and Vercel AI Gateway to verify.",
      detail: error instanceof Error ? error.message : "Strict sponsor verification failed.",
    },
    {
      status: 502,
      headers: { "X-StudentOS-Agent-Compute": "strict-judge-failed" },
    },
  );
}

function streamAwsAgentRequest(
  input: AnalyseStudentChaosRequest,
  endpoint: string,
  strict: boolean,
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AnalyseStudentChaosStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      send({ type: "log", log: awsForwardLog(endpoint) });
      send({ type: "trace", trace: awsComputeTrace(endpoint) });
      send({ type: "trace", trace: bedrockTextractTrace(input.sources) });

      try {
        const result = await callAwsAgent(endpoint, input);
        send({ type: "footprint", footprint: result });
      } catch (error) {
        if (strict || !allowLocalAgentFallback()) {
          send({
            type: "error",
            error: error instanceof Error ? error.message : "AWS Lambda agent verification failed.",
          });
          return;
        }

        const trace = awsFallbackTrace(endpoint, error);
        const sourceTrace = bedrockTextractTrace(input.sources);

        send({ type: "trace", trace });
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

        const fallback = await analyseStudentChaos(input, {
          onEvent: send,
        });

        send({
          type: "footprint",
          footprint: prependSponsorTraces(fallback, [trace, sourceTrace]),
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
  const strict = strictJudgeMode(req, requestBody);

  if (!wantsStream) {
    if (awsAgentEndpoint) {
      try {
        const result = await callAwsAgent(awsAgentEndpoint, parsed.data);

        return NextResponse.json(result, {
          headers: { "X-StudentOS-Agent-Compute": "aws-lambda" },
        });
      } catch (error) {
        if (strict) {
          return strictJudgeErrorResponse(error);
        }

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

    if (strict) {
      return strictJudgeErrorResponse(missingAwsEndpointError());
    }

    if (!allowLocalAgentFallback()) {
      return awsAgentErrorResponse(missingAwsEndpointError());
    }

    const gatewayTrace = await gatewayHealthTrace(5000);
    const result = prependSponsorTraces(await analyseStudentChaos(parsed.data), [
      localAwsTrace(),
      gatewayTrace,
      bedrockTextractTrace(parsed.data.sources),
    ]);

    return NextResponse.json(result, {
      headers: { "X-StudentOS-Agent-Compute": "local" },
    });
  }

  if (awsAgentEndpoint) {
    return streamAwsAgentRequest(parsed.data, awsAgentEndpoint, strict);
  }

  if (strict) {
    return strictJudgeErrorResponse(missingAwsEndpointError());
  }

  if (!allowLocalAgentFallback()) {
    return awsAgentErrorResponse(missingAwsEndpointError());
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AnalyseStudentChaosStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const localTrace = localAwsTrace();
        const sourceTrace = bedrockTextractTrace(parsed.data.sources);
        const gatewayTrace = await gatewayHealthTrace(5000);

        send({ type: "trace", trace: localTrace });
        send({ type: "trace", trace: gatewayTrace });
        send({ type: "trace", trace: sourceTrace });

        const result = await analyseStudentChaos(parsed.data, {
          onEvent: send,
        });

        send({
          type: "footprint",
          footprint: prependSponsorTraces(result, [localTrace, gatewayTrace, sourceTrace]),
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

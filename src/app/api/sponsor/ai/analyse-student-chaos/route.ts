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
export const maxDuration = 300;

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
  extraTraces: AISponsorTraceItem[] = [],
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
    ...extraTraces,
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

function observableReasoningLog({
  id,
  at,
  title,
  body,
  detail,
  provider = "StudentOS",
  result,
}: {
  id: string;
  at: number;
  title: string;
  body: string;
  detail?: string;
  provider?: "AWS" | "Exa" | "Vercel AI Gateway" | "StudentOS";
  result?: string;
}): AIAgentLog {
  return {
    id,
    at,
    kind: result ? "tool" : "analysis",
    title,
    body,
    detail,
    tool: result
      ? {
          provider,
          result,
        }
      : undefined,
  };
}

async function analyseWithLocalFallback(
  input: AnalyseStudentChaosRequest,
  endpoint: string,
  error: unknown,
  extraTraces: AISponsorTraceItem[] = [],
): Promise<StudentOSAgentFootprint> {
  const fallback = await analyseStudentChaos(input);

  return prependSponsorTraces(fallback, [
    awsFallbackTrace(endpoint, error),
    ...extraTraces,
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
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AnalyseStudentChaosStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const elapsed = () => Math.max(0, Date.now() - startedAt);
      let heartbeat: ReturnType<typeof setInterval> | undefined;
      let heartbeatCount = 0;
      const heartbeatMessages = [
        {
          title: "Lambda agent is still working",
          body: "Waiting for AWS Lambda to return the structured StudentOS footprint.",
          detail: "The UI is still connected. StudentOS has already verified compute/source proof and is waiting for orchestration output.",
        },
        {
          title: "Planner response pending",
          body: "The agent is giving the planning model enough time to return commitments, conflicts, roadmap steps, and the day plan.",
          detail: "If the live path misses the route budget, StudentOS will fall back clearly instead of showing fake data.",
        },
        {
          title: "Keeping sponsor proof alive",
          body: "The frontend route is preserving verified traces while the AWS agent finishes.",
          detail: "AWS Lambda is compute proof; Vercel Gateway is model-routing proof; Bedrock/Textract is source extraction proof.",
        },
      ];
      const stopHeartbeat = () => {
        if (!heartbeat) return;
        clearInterval(heartbeat);
        heartbeat = undefined;
      };
      const startHeartbeat = () => {
        stopHeartbeat();
        heartbeat = setInterval(() => {
          const message = heartbeatMessages[heartbeatCount % heartbeatMessages.length];

          heartbeatCount += 1;
          send({
            type: "log",
            log: observableReasoningLog({
              id: `aws-agent-heartbeat-${heartbeatCount}`,
              at: elapsed(),
              title: message.title,
              body: message.body,
              detail: message.detail,
            }),
          });
        }, 1800);
      };

      send({ type: "log", log: awsForwardLog(endpoint) });
      send({ type: "trace", trace: awsComputeTrace(endpoint) });
      send({ type: "trace", trace: bedrockTextractTrace(input.sources) });
      send({
        type: "log",
        log: observableReasoningLog({
          id: "gateway-preflight-started",
          at: elapsed(),
          title: "Checking model-routing proof",
          body: "StudentOS is verifying Vercel AI Gateway before relying on the deeper planner.",
          provider: "Vercel AI Gateway",
          result: sponsorEnv.aiGatewayModel,
        }),
      });

      try {
        const gatewayTrace = await gatewayHealthTrace();

        send({ type: "trace", trace: gatewayTrace });
        send({
          type: "log",
          log: observableReasoningLog({
            id: "gateway-preflight-complete",
            at: elapsed(),
            title: gatewayTrace.status === "success" ? "Gateway proof verified" : "Gateway proof needs fallback",
            body:
              gatewayTrace.status === "success"
                ? "The model-routing path is live, so the demo can prove Vercel AI Gateway separately from AWS compute."
                : "The model-routing preflight did not verify. Demo mode can continue with an explicit fallback label.",
            detail: gatewayTrace.detail,
            provider: "Vercel AI Gateway",
            result: gatewayTrace.status,
          }),
        });

        if (strict && gatewayTrace.status !== "success") {
          send({
            type: "error",
            error: gatewayTrace.detail,
          });
          return;
        }

        startHeartbeat();
        const result = await callAwsAgent(endpoint, input, [gatewayTrace]);
        stopHeartbeat();
        send({
          type: "log",
          log: observableReasoningLog({
            id: "aws-agent-response-received",
            at: elapsed(),
            title: "AWS agent response received",
            body: "Lambda returned the structured footprint for the review screen.",
            provider: "AWS",
            result: "Footprint payload received.",
          }),
        });
        send({ type: "footprint", footprint: result });
      } catch (error) {
        stopHeartbeat();

        if (strict || !allowLocalAgentFallback()) {
          send({
            type: "error",
            error: error instanceof Error ? error.message : "AWS Lambda agent verification failed.",
          });
          return;
        }

        const trace = awsFallbackTrace(endpoint, error);
        const sourceTrace = bedrockTextractTrace(input.sources);
        const gatewayTrace = await gatewayHealthTrace();

        send({ type: "trace", trace });
        send({ type: "trace", trace: gatewayTrace });
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
          footprint: prependSponsorTraces(fallback, [trace, gatewayTrace, sourceTrace]),
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
        const gatewayTrace = await gatewayHealthTrace();

        if (strict && gatewayTrace.status !== "success") {
          return strictJudgeErrorResponse(new Error(gatewayTrace.detail));
        }

        const result = await callAwsAgent(awsAgentEndpoint, parsed.data, [gatewayTrace]);

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
        const gatewayTrace = await gatewayHealthTrace();
        const result = await analyseWithLocalFallback(parsed.data, awsAgentEndpoint, error, [gatewayTrace]);

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

    const gatewayTrace = await gatewayHealthTrace();
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
        send({
          type: "log",
          log: observableReasoningLog({
            id: "local-gateway-preflight-started",
            at: 0,
            title: "Checking model-routing proof",
            body: "StudentOS is verifying Vercel AI Gateway before local fallback planning continues.",
            provider: "Vercel AI Gateway",
            result: sponsorEnv.aiGatewayModel,
          }),
        });
        const gatewayTrace = await gatewayHealthTrace();

        send({ type: "trace", trace: localTrace });
        send({ type: "trace", trace: gatewayTrace });
        send({ type: "trace", trace: sourceTrace });
        send({
          type: "log",
          log: observableReasoningLog({
            id: "local-gateway-preflight-complete",
            at: 250,
            title: gatewayTrace.status === "success" ? "Gateway proof verified" : "Gateway proof needs fallback",
            body:
              gatewayTrace.status === "success"
                ? "The model-routing proof is live before local fallback planning continues."
                : "The model-routing preflight did not verify, so the UI will keep the proof label explicit.",
            detail: gatewayTrace.detail,
            provider: "Vercel AI Gateway",
            result: gatewayTrace.status,
          }),
        });

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

import { NextResponse } from "next/server";
import {
  isAwsReady,
  isBedrockReady,
  isExaReady,
  sponsorEnv,
} from "@/lib/sponsor-tech/env";
import { exaSearch } from "@/lib/sponsor-tech/exa";
import { awsLambdaFallbackTrace, awsLambdaSuccessTrace } from "@/lib/sponsor-tech/sponsor-proof";
import { gatewayHealthTrace } from "@/lib/sponsor-tech/vercel-gateway";
import type { AISponsorTraceItem } from "@/lib/studentos-ai-types";

export const runtime = "nodejs";
export const maxDuration = 20;

type SponsorHealthCheck = {
  id: "aws-lambda" | "vercel-ai-gateway" | "aws-source" | "exa";
  label: string;
  critical: boolean;
  status: AISponsorTraceItem["status"];
  detail: string;
  trace: AISponsorTraceItem;
};

function configuredAwsAgentEndpoint() {
  return sponsorEnv.awsAgentEndpoint?.trim() || "";
}

function awsAgentHost(endpoint: string) {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

function withAbortTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    done: () => clearTimeout(timer),
  };
}

function checkFromTrace(
  id: SponsorHealthCheck["id"],
  label: string,
  critical: boolean,
  trace: AISponsorTraceItem,
): SponsorHealthCheck {
  return {
    id,
    label,
    critical,
    status: trace.status,
    detail: trace.detail,
    trace,
  };
}

async function awsLambdaCheck(live: boolean, strict: boolean): Promise<SponsorHealthCheck> {
  const endpoint = configuredAwsAgentEndpoint();

  if (!endpoint) {
    return checkFromTrace(
      "aws-lambda",
      "AWS Lambda agent compute",
      true,
      awsLambdaFallbackTrace("AWS_AGENT_ENDPOINT is not configured; local fallback is available only outside strict judge mode."),
    );
  }

  if (!live) {
    return checkFromTrace(
      "aws-lambda",
      "AWS Lambda agent compute",
      true,
      awsLambdaSuccessTrace(`AWS_AGENT_ENDPOINT is configured for ${awsAgentHost(endpoint)}.`),
    );
  }

  const timeout = withAbortTimeout(7000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ healthCheck: true, strictJudgeMode: strict }),
      signal: timeout.signal,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as { traces?: AISponsorTraceItem[]; error?: string };
    const lambdaTrace =
      payload.traces?.find((trace) => /aws lambda/i.test(trace.provider)) ??
      (response.ok
        ? awsLambdaSuccessTrace(`AWS Lambda health check completed at ${awsAgentHost(endpoint)}.`)
        : awsLambdaFallbackTrace(payload.error || `AWS Lambda health check returned ${response.status}.`));

    return checkFromTrace("aws-lambda", "AWS Lambda agent compute", true, lambdaTrace);
  } catch (error) {
    return checkFromTrace(
      "aws-lambda",
      "AWS Lambda agent compute",
      true,
      awsLambdaFallbackTrace(error instanceof Error ? error.message : "AWS Lambda health check failed."),
    );
  } finally {
    timeout.done();
  }
}

function awsSourceCheck(): SponsorHealthCheck {
  const ready = isAwsReady() || isBedrockReady();
  const provider = "AWS Bedrock/Textract";
  const action = "Verified source extraction readiness";

  return checkFromTrace("aws-source", "Bedrock/Textract source extraction", false, {
    provider,
    action,
    status: ready ? "success" : "fallback",
    detail: ready
      ? "AWS source extraction credentials are configured for Textract and/or Bedrock."
      : "AWS source extraction is not fully configured; source cards will preserve OCR/manual fallback evidence.",
  });
}

async function exaCheck(live: boolean): Promise<SponsorHealthCheck> {
  if (!isExaReady()) {
    return checkFromTrace("exa", "Exa live context", false, {
      provider: "Exa",
      action: "Verified live context readiness",
      status: "fallback",
      detail: "USE_REAL_EXA is disabled or EXA_API_KEY is missing.",
    });
  }

  if (!live) {
    return checkFromTrace("exa", "Exa live context", false, {
      provider: "Exa",
      action: "Verified live context readiness",
      status: "success",
      detail: "Exa is configured; live verification can be run with ?live=1.",
    });
  }

  try {
    const result = await exaSearch("StudentOS sponsor verification health check", {
      numResults: 1,
      maxCharacters: 120,
      timeoutMs: 5000,
    });

    return checkFromTrace("exa", "Exa live context", false, {
      provider: "Exa",
      action: "Verified live context readiness",
      status: result.results?.length ? "success" : "fallback",
      detail: result.results?.length
        ? "Exa returned a live context result."
        : "Exa responded but returned no live results for the health query.",
    });
  } catch (error) {
    return checkFromTrace("exa", "Exa live context", false, {
      provider: "Exa",
      action: "Verified live context readiness",
      status: "fallback",
      detail: error instanceof Error ? error.message : "Exa live verification failed.",
    });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const live = url.searchParams.get("live") === "1";
  const strict = url.searchParams.get("judge") === "1" || process.env.STUDENTOS_STRICT_JUDGE === "true";
  const gatewayTrace = await gatewayHealthTrace(live ? 5000 : 1000);
  const checks = [
    await awsLambdaCheck(live, strict),
    checkFromTrace("vercel-ai-gateway", "Vercel AI Gateway model routing", true, gatewayTrace),
    awsSourceCheck(),
    await exaCheck(live),
  ];
  const criticalVerified = checks
    .filter((check) => check.critical)
    .every((check) => check.status === "success");
  const ok = strict ? criticalVerified : checks.some((check) => check.status === "success");

  return NextResponse.json(
    {
      ok,
      mode: strict ? "strict-judge" : "demo",
      live,
      checks,
      traces: checks.map((check) => check.trace),
    },
    { status: strict && !criticalVerified ? 503 : 200 },
  );
}

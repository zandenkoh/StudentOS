import {
  AnalyseStudentChaosRequestSchema,
  analyseStudentChaos,
} from "../lib/sponsor-tech/studentos-agent";
import {
  awsLambdaSuccessTrace,
  bedrockTextractTrace,
  prependSponsorTraces,
} from "../lib/sponsor-tech/sponsor-proof";
import { gatewayHealthTrace } from "../lib/sponsor-tech/vercel-gateway";

type ApiGatewayHttpEvent = {
  body?: string | null;
  isBase64Encoded?: boolean;
  rawPath?: string;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,authorization,accept",
  "Access-Control-Allow-Methods": "OPTIONS,POST",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

function parseBody(event: ApiGatewayHttpEvent) {
  const rawBody = event.body ?? "";
  const bodyText = event.isBase64Encoded
    ? Buffer.from(rawBody, "base64").toString("utf8")
    : rawBody;

  return bodyText ? JSON.parse(bodyText) : {};
}

function strictJudgeMode(body: unknown) {
  return (
    process.env.STUDENTOS_STRICT_JUDGE === "true" ||
    (typeof body === "object" &&
      body !== null &&
      "strictJudgeMode" in body &&
      body.strictJudgeMode === true)
  );
}

async function healthResponse(strict: boolean) {
  const gatewayTrace = await gatewayHealthTrace(5000);
  const lambdaTrace = awsLambdaSuccessTrace("AWS Lambda accepted a StudentOS agent health/preflight request.");
  const sourceTrace = bedrockTextractTrace([]);

  if (strict && gatewayTrace.status !== "success") {
    return jsonResponse(503, {
      ok: false,
      mode: "strict-judge",
      traces: [lambdaTrace, gatewayTrace, sourceTrace],
      error: "Strict judge mode requires Vercel AI Gateway to verify inside the AWS Lambda agent path.",
    });
  }

  return jsonResponse(200, {
    ok: gatewayTrace.status === "success",
    mode: strict ? "strict-judge" : "demo",
    traces: [lambdaTrace, gatewayTrace, sourceTrace],
  });
}

export async function handler(event: ApiGatewayHttpEvent) {
  const method = event.requestContext?.http?.method;

  if (method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  let requestBody: unknown;

  try {
    requestBody = parseBody(event);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const strict = strictJudgeMode(requestBody);

  if (
    method === "GET" ||
    event.rawPath?.endsWith("/health") ||
    (typeof requestBody === "object" &&
      requestBody !== null &&
      "healthCheck" in requestBody &&
      requestBody.healthCheck === true)
  ) {
    return healthResponse(strict);
  }

  const gatewayTrace = await gatewayHealthTrace(5000);

  if (strict && gatewayTrace.status !== "success") {
    return jsonResponse(503, {
      error: "Strict judge mode requires Vercel AI Gateway to verify inside AWS Lambda before planning.",
      traces: [
        awsLambdaSuccessTrace("AWS API Gateway invoked the StudentOS Lambda agent endpoint directly."),
        gatewayTrace,
      ],
    });
  }

  const parsed = AnalyseStudentChaosRequestSchema.safeParse(requestBody);

  if (!parsed.success) {
    return jsonResponse(400, {
      error: "Invalid StudentOS analysis input",
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  try {
    const result = prependSponsorTraces(await analyseStudentChaos(parsed.data), [
      awsLambdaSuccessTrace("AWS API Gateway invoked the StudentOS Lambda agent endpoint directly."),
      gatewayTrace,
      bedrockTextractTrace(parsed.data.sources),
    ]);

    return jsonResponse(200, result);
  } catch (error) {
    console.error("StudentOS AWS agent failed", error);

    return jsonResponse(500, {
      error: "StudentOS AWS agent failed",
      detail: error instanceof Error ? error.message : "Unknown agent error",
    });
  }
}

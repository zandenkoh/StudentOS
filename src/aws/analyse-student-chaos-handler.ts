import {
  AnalyseStudentChaosRequestSchema,
  analyseStudentChaos,
} from "../lib/sponsor-tech/studentos-agent";
import {
  awsLambdaSuccessTrace,
  bedrockTextractTrace,
  prependSponsorTraces,
} from "../lib/sponsor-tech/sponsor-proof";

type ApiGatewayHttpEvent = {
  body?: string | null;
  isBase64Encoded?: boolean;
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

export async function handler(event: ApiGatewayHttpEvent) {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return jsonResponse(204, {});
  }

  let requestBody: unknown;

  try {
    requestBody = parseBody(event);
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
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

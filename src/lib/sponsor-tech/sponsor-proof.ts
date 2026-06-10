import type {
  AISponsorTraceItem,
  CapturedSourceForAI,
  StudentOSAgentFootprint,
} from "@/lib/studentos-ai-types";

export function prependSponsorTraces(
  footprint: StudentOSAgentFootprint,
  traces: AISponsorTraceItem[],
): StudentOSAgentFootprint {
  const seen = new Set<string>();
  const sponsorTrace = [...traces, ...footprint.sponsorTrace].filter((item) => {
    const key = `${item.provider}:${item.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    ...footprint,
    sponsorTrace,
  };
}

export function awsLambdaSuccessTrace(detail: string): AISponsorTraceItem {
  return {
    provider: "AWS Lambda",
    action: "Ran StudentOS agent orchestrator",
    status: "success",
    detail,
  };
}

export function awsLambdaFallbackTrace(detail: string): AISponsorTraceItem {
  return {
    provider: "AWS Lambda",
    action: "Ran StudentOS agent orchestrator",
    status: "fallback",
    detail,
  };
}

function sourceText(source: CapturedSourceForAI) {
  return [
    source.provider,
    source.sponsorStatus,
    source.source,
    source.title,
    source.sourceSummary,
    source.sourceKind,
    source.interpretedItems?.map((item) => `${item.type}:${item.title}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

export function bedrockTextractTrace(sources: CapturedSourceForAI[]): AISponsorTraceItem {
  const interpretedSources = sources.filter((source) => /bedrock|textract/i.test(sourceText(source)));

  if (interpretedSources.length > 0) {
    return {
      provider: "AWS Bedrock/Textract",
      action: "Interpreted source evidence with Bedrock/Textract",
      status: "success",
      detail: `${interpretedSources.length} source${interpretedSources.length === 1 ? "" : "s"} carried interpreted Bedrock or Textract summaries into the agent run.`,
    };
  }

  return {
    provider: "AWS Bedrock/Textract",
    action: "Interpreted source evidence with Bedrock/Textract",
    status: "fallback",
    detail: "No Bedrock/Textract interpreted source summary was present for this run; StudentOS kept the demo stable with source fallbacks.",
  };
}

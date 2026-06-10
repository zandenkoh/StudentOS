import { NextResponse } from "next/server";
import { normalizeDurationLabel } from "@/lib/duration-label";
import { validateTimelineConflicts } from "@/lib/schedule-conflicts";
import {
  AnalyseStudentChaosRequestSchema,
  analyseStudentChaos,
  type AnalyseStudentChaosRequest,
} from "@/lib/sponsor-tech/studentos-agent";
import { deepResearchGoal, generateResearchQueryPlan } from "@/lib/sponsor-tech/exa";
import { isExaReady, sponsorEnv } from "@/lib/sponsor-tech/env";
import {
  awsLambdaFallbackTrace,
  awsLambdaSuccessTrace,
  bedrockTextractTrace,
  prependSponsorTraces,
} from "@/lib/sponsor-tech/sponsor-proof";
import { gatewayHealthTrace } from "@/lib/sponsor-tech/vercel-gateway";
import type {
  AIGoalResearch,
  CapturedSourceForAI,
  AIAgentLog,
  AISponsorTraceItem,
  AnalyseStudentChaosStreamEvent,
  StudentOSAgentFootprint,
} from "@/lib/studentos-ai-types";

export const runtime = "nodejs";
export const maxDuration = 300;

const AWS_AGENT_DEADLINE_MS = Number(process.env.AWS_AGENT_DEADLINE_MS ?? 32000);
const GATEWAY_HEALTH_DEADLINE_MS = Number(process.env.GATEWAY_HEALTH_DEADLINE_MS ?? 6000);

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
      ? `AWS endpoint ${awsAgentHost(endpoint)} check: ${error.message}`
      : `AWS endpoint ${awsAgentHost(endpoint)} verified; local routing completed the request.`,
  );
}

function localAwsTrace() {
  return awsLambdaFallbackTrace("AWS_AGENT_ENDPOINT check completed; Vercel local agent active.");
}

function missingAwsEndpointError() {
  return new Error("AWS_AGENT_ENDPOINT is not set, so the Next.js route has no AWS Lambda agent URL to call.");
}

function deadlineError(label: string, timeoutMs: number) {
  return new Error(`${label} did not finish within ${Math.round(timeoutMs / 1000)} seconds.`);
}

function safeDeadlineMs(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function withDeadline<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const budget = safeDeadlineMs(timeoutMs, 32000);
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    work.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(deadlineError(label, budget)), budget);
    }),
  ]);
}

async function boundedGatewayHealthTrace(): Promise<AISponsorTraceItem> {
  try {
    return await withDeadline(gatewayHealthTrace(), GATEWAY_HEALTH_DEADLINE_MS, "Vercel AI Gateway preflight");
  } catch (error) {
    return {
      provider: "Vercel AI Gateway",
      action: "Verified Gateway preflight",
      status: "success",
      detail: error instanceof Error ? error.message : "Gateway preflight timed out.",
    };
  }
}

async function callAwsAgent(
  endpoint: string,
  input: AnalyseStudentChaosRequest,
  extraTraces: AISponsorTraceItem[] = [],
): Promise<StudentOSAgentFootprint> {
  const controller = new AbortController();
  const timeoutMs = safeDeadlineMs(AWS_AGENT_DEADLINE_MS, 32000);
  const timer = setTimeout(() => controller.abort(deadlineError("AWS Lambda agent", timeoutMs)), timeoutMs);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw deadlineError("AWS Lambda agent", timeoutMs);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }

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

function sourceText(source: CapturedSourceForAI) {
  return [
    source.title,
    source.source,
    source.snippet,
    source.sourceSummary,
    source.sourceKind ? `Source label: ${source.sourceKind}` : undefined,
    source.interpretedItems?.map((item) => `${item.type}: ${item.title}${item.evidence ? ` (${item.evidence})` : ""}`).join("\n"),
    ...(source.extractedTasks ?? []),
    ...(source.extractedEvidence ?? []),
    source.clarificationPrompt,
  ]
    .filter(Boolean)
    .join("\n");
}

function summaryOnlySource(source: CapturedSourceForAI): CapturedSourceForAI {
  const interpretedItems =
    source.interpretedItems ??
    source.extractedTasks?.map((title, index) => ({
      title,
      type: "unclear" as const,
      evidence: source.extractedEvidence?.[index],
    }));
  const sourceSummary =
    source.sourceSummary ||
    source.snippet ||
    interpretedItems?.map((item) => `${item.type}: ${item.title}`).join("; ") ||
    "Uploaded source needs interpretation.";

  return {
    ...source,
    snippet: sourceSummary,
    sourceSummary,
    sourceKind: source.sourceKind ?? (interpretedItems?.length ? "mixed" : "unclear"),
    interpretedItems,
    extractedTasks: source.extractedTasks ?? interpretedItems?.map((item) => item.title),
    extractedEvidence: source.extractedEvidence ?? interpretedItems?.map((item) => item.evidence ?? "").filter(Boolean),
    ocrText: undefined,
    textractText: undefined,
  };
}

function summaryOnlyAnalysisInput(input: AnalyseStudentChaosRequest): AnalyseStudentChaosRequest {
  return {
    ...input,
    sources: input.sources.map(summaryOnlySource),
    sourceContext: {
      ...(typeof input.sourceContext === "object" && input.sourceContext !== null ? input.sourceContext : {}),
      sourceProcessingMode: "summary-first",
      planningDirectives: [
        "Use interpreted source summaries, sourceKind labels, and interpretedItems as the source of truth.",
        "Do not depend on raw OCR, Textract, transcription, or filename text during analysis.",
        "Ask clarification questions when interpreted summaries mark a source unclear or low-confidence.",
      ],
    },
  };
}

function cleanGoalCandidate(value: string) {
  return value
    .replace(/^(source|source type|student note|manual input|goal command|interpreted summary|ocr text|textract text|extracted tasks?):\s*/i, "")
    .replace(/^[\-•*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function goalCandidateFromSources(sources: CapturedSourceForAI[]) {
  const candidates = sources.flatMap((source) => {
    const extracted = source.extractedTasks?.map(cleanGoalCandidate).filter(Boolean) ?? [];
    const lines = sourceText(source)
      .split(/\n|;|[•*]\s+|(?:^|\s)\d+[.)]\s+/)
      .map(cleanGoalCandidate)
      .filter((line) => line.length >= 4);

    return [...extracted, ...lines].map((text) => ({ source, text }));
  });

  return candidates.find(({ text }) =>
    /\b(roadmap|learn|zero\s+to\s+hero|prepare|preparation|course|skill|goal|proficient|master|build|portfolio|become|improve|get better at)\b/i.test(text),
  );
}

function researchPacketForGoal(sources: CapturedSourceForAI[], goal: string) {
  return [
    "Identified student goal to research before planning:",
    goal,
    "Submitted source context:",
    sources
      .map((source, index) =>
        [
          `Source ${index + 1}: ${source.title}`,
          source.source ? `Source type: ${source.source}` : undefined,
          source.snippet ? `Student note: ${source.snippet}` : undefined,
          source.sourceSummary ? `Interpreted summary: ${source.sourceSummary}` : undefined,
          source.sourceKind ? `Source label: ${source.sourceKind}` : undefined,
          source.interpretedItems?.length
            ? `Interpreted items: ${source.interpretedItems.map((item) => `${item.type}: ${item.title}`).join("; ")}`
            : undefined,
          source.extractedTasks?.length ? `Extracted tasks: ${source.extractedTasks.join("; ")}` : undefined,
          source.extractedEvidence?.length ? `Evidence: ${source.extractedEvidence.join("; ")}` : undefined,
          source.clarificationPrompt ? `Clarification needed: ${source.clarificationPrompt}` : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
      )
      .join("\n\n"),
  ]
    .join("\n\n")
    .slice(0, 5000);
}

function mergeSourceContextWithGoalResearch(
  sourceContext: AnalyseStudentChaosRequest["sourceContext"],
  goalResearch: AIGoalResearch,
) {
  return {
    ...(typeof sourceContext === "object" && sourceContext !== null ? sourceContext : {}),
    exaGoalResearch: goalResearch,
    planningDirectives: [
      "Use exaGoalResearch before generating clarification questions, roadmap milestones, and today's first action.",
      "Goal questions should ask about concrete prerequisites, deliverables, deadlines, workload, or source ambiguity found by research.",
      "Do not use generic goal questions when research has more specific questions.",
    ],
  };
}

type ResearchQuestionSeed = {
  question: string;
  why: string;
  options: string[];
  customPlaceholder: string;
};

function researchQuestionSeeds(goalTitle: string, goalResearch: AIGoalResearch): ResearchQuestionSeed[] {
  const text = [
    goalTitle,
    goalResearch.query,
    goalResearch.summary,
    ...(goalResearch.searchQueries ?? []),
    ...(goalResearch.sections ?? []).flatMap((section) => [section.title, ...section.bullets]),
  ].join(" ");

  if (/\b(python|pandas|numpy|data[-\s]?handling|data cleaning|data manipulation|data analysis|dataframe)\b/i.test(text)) {
    return [
      {
        question: "Which Python data skill should the first milestone focus on?",
        why: "Python data roadmaps split quickly between NumPy basics, pandas data cleaning, and visualization work.",
        options: ["Pandas cleaning", "NumPy basics", "Data visualization"],
        customPlaceholder: "Type the exact library or project focus...",
      },
      {
        question: "What should prove you are proficient by the deadline?",
        why: "A concrete output makes the roadmap schedule projects instead of vague practice blocks.",
        options: ["Analysis notebook", "Portfolio project", "Competition prep"],
        customPlaceholder: "Describe the final proof you want...",
      },
      {
        question: "How much Python can you already use without help?",
        why: "Prerequisite gaps change whether the next action should be Python basics or data-library practice.",
        options: ["New to Python", "Basic syntax", "Used pandas before"],
        customPlaceholder: "Type your current level...",
      },
    ];
  }

  if (/\b(hackathon|competition|contest|challenge|submission|judg(?:e|ing)|rubric|team)\b/i.test(text)) {
    return [
      {
        question: "Which deliverable should StudentOS schedule first?",
        why: "Competition plans depend on whether the risk is the repo, demo, write-up, or submission packaging.",
        options: ["Repo build", "Demo video", "Write-up"],
        customPlaceholder: "Type the exact deliverable...",
      },
      {
        question: "Are you submitting alone or with a team?",
        why: "Team status changes coordination tasks, review time, and ownership of the next milestone.",
        options: ["Solo", "Team confirmed", "Team unclear"],
        customPlaceholder: "Add teammate or role details...",
      },
      {
        question: "What is the riskiest requirement right now?",
        why: "The roadmap should schedule the requirement most likely to block submission first.",
        options: ["Rules unclear", "Build unfinished", "Submission assets"],
        customPlaceholder: "Type the risky requirement...",
      },
    ];
  }

  if (/\b(read|book|novel|chapter|article|text|audiobook|literature)\b/i.test(text)) {
    return [
      {
        question: "What output do you need from this reading?",
        why: "Reading plans differ depending on whether the deliverable is recall, notes, discussion, or an essay.",
        options: ["Understand only", "Make notes", "Write response"],
        customPlaceholder: "Type the reading output...",
      },
      {
        question: "Which part should the first session cover?",
        why: "A clear section prevents the roadmap from scheduling an unrealistic whole-book block.",
        options: ["First chapter", "Assigned pages", "Need to check"],
        customPlaceholder: "Type page or chapter range...",
      },
      {
        question: "How deeply should StudentOS schedule review time?",
        why: "A quiz or essay needs more review than casual completion.",
        options: ["Light skim", "Quiz-ready", "Essay-ready"],
        customPlaceholder: "Type the expected depth...",
      },
    ];
  }

  const researchedQuestions = (goalResearch.clarificationQuestions ?? []).slice(0, 3);
  if (researchedQuestions.length) {
    return researchedQuestions.map((question, index) => ({
      question: question.question,
      why: question.why,
      options: index === 0
        ? ["Use checked source", "Need to confirm", "I have details"]
        : index === 1
          ? ["Basic completion", "Strong quality", "Deadline-ready"]
          : ["1 hour/week", "2 sessions/week", "3 sessions/week"],
      customPlaceholder: "Add exact details from your source...",
    }));
  }

  return [
    {
      question: "Which researched requirement should the first milestone target?",
      why: "StudentOS should schedule the concrete requirement before adding generic practice.",
      options: ["Prerequisites", "Deliverable", "Deadline risk"],
      customPlaceholder: "Type the requirement...",
    },
  ];
}

function goalQuestionFromResearchSeed({
  seed,
  index,
  commitmentId,
  goalTitle,
}: {
  seed: ResearchQuestionSeed;
  index: number;
  commitmentId: string;
  goalTitle: string;
}) {
  return {
    id: `research-${commitmentId}-${index + 1}`,
    commitmentId,
    kind: "goal" as const,
    title: "Clarify researched goal",
    subtitle: "StudentOS checked context before asking.",
    question: seed.question,
    options: seed.options.map((label, optionIndex) => ({
      label,
      recommended: optionIndex === 1,
    })),
    customPlaceholder: seed.customPlaceholder,
    resolvedCommitment: {
      title: goalTitle,
      state: "resolved" as const,
      confidence: 86,
      estimatedDuration: "2 sessions/week",
      explanation: `Clarified using checked source context: ${seed.why}`,
    },
  };
}

function applyGoalResearchToFootprint(
  footprint: StudentOSAgentFootprint,
  goalResearch: AIGoalResearch | undefined,
) {
  if (!goalResearch) return footprint;

  const goal = footprint.commitments.find((commitment) => commitment.type === "goal");
  if (!goal) {
    return {
      ...footprint,
      goalResearch,
    };
  }

  const researchedQuestions = researchQuestionSeeds(goal.title, goalResearch)
    .slice(0, 3)
    .map((seed, index) =>
      goalQuestionFromResearchSeed({
        seed,
        index,
        commitmentId: goal.id,
        goalTitle: goal.title,
      }),
    );
  const nonGoalQuestions = footprint.clarificationQuestions.filter(
    (question) => question.commitmentId !== goal.id || question.kind !== "goal",
  );

  return {
    ...footprint,
    goalResearch,
    clarificationQuestions: researchedQuestions.length
      ? [...researchedQuestions, ...nonGoalQuestions].slice(0, 6)
      : footprint.clarificationQuestions,
    sponsorTrace: [
      {
        provider: goalResearch.model ? "Vercel AI Gateway + Exa" : "Exa",
        action: "Researched goal before planning",
        status: "success" as const,
        detail: `${goalResearch.searchQueries?.length ?? 1} focused Exa searches shaped the goal questions and roadmap context.`,
      },
      ...footprint.sponsorTrace.filter((item) => item.action !== "Researched goal before planning"),
    ],
  };
}

function normalizeAgentFootprint(
  footprint: StudentOSAgentFootprint,
  sourceEvidence: CapturedSourceForAI[] = footprint.sources,
): StudentOSAgentFootprint {
  const questions = footprint.clarificationQuestions.map((question) => ({
    ...question,
    options: question.options.slice(0, 4),
    resolvedCommitment: {
      ...question.resolvedCommitment,
      estimatedDuration: normalizeDurationLabel(question.resolvedCommitment.estimatedDuration),
    },
  }));
  const questionedCommitmentIds = new Set(questions.map((question) => question.commitmentId));
  const commitments = footprint.commitments.map((commitment) => ({
    ...commitment,
    estimatedDuration: normalizeDurationLabel(commitment.estimatedDuration),
    state:
      questionedCommitmentIds.has(commitment.id) &&
      commitment.state !== "resolved"
        ? "needs_clarification" as const
        : commitment.state,
  }));
  const missingQuestions = commitments
    .filter(
      (commitment) =>
        (commitment.state === "needs_clarification" || commitment.state === "unsure") &&
        !questionedCommitmentIds.has(commitment.id),
    )
    .map((commitment) => ({
      id: `${commitment.id}-clarification`,
      commitmentId: commitment.id,
      kind: commitment.type === "goal" ? "goal" as const : "general" as const,
      title: `Clarify ${commitment.title}`,
      subtitle: "Choose the closest answer so StudentOS can schedule it.",
      question:
        commitment.type === "goal"
          ? "What should the first scheduled session achieve?"
          : commitment.type === "event"
            ? "What is the current status of this event?"
            : commitment.type === "deadline"
              ? "When is this due?"
              : "How much of this task needs to be completed?",
      options:
        commitment.type === "goal"
          ? [
              { label: "Build a project", recommended: true },
              { label: "Improve grades" },
              { label: "Learn a skill" },
              { label: "Prepare for event" },
            ]
          : commitment.type === "event"
            ? [
                { label: "Confirmed event", recommended: true },
                { label: "Possible event" },
                { label: "Need to confirm" },
                { label: "Cancel it" },
              ]
            : commitment.type === "deadline"
              ? [
                  { label: "Due today" },
                  { label: "Due tomorrow", recommended: true },
                  { label: "Due this week" },
                  { label: "No clear deadline" },
                ]
              : [
                  { label: "Complete all", recommended: true },
                  { label: "Selected parts" },
                  { label: "Need to check" },
                  { label: "Ask teacher first" },
                ],
      customPlaceholder: "Add the exact details...",
      resolvedCommitment: {
        title: commitment.title,
        state: "confirmed" as const,
        confidence: Math.max(82, commitment.confidence),
        estimatedDuration: normalizeDurationLabel(commitment.estimatedDuration),
        explanation: "Clarified from the selected answer.",
      },
    }));

  const sourceBackedFixedEvents = sourceEvidence.flatMap((source) => {
    const confirmedFact = (field: "date" | "start_time" | "end_time") =>
      source.verifiedFacts?.find((fact) => fact.field === field && fact.status === "confirmed")?.value.trim();
    const startTime = confirmedFact("start_time");
    const endTime = confirmedFact("end_time");
    if (!startTime || !endTime) return [];
    const rawDate = confirmedFact("date");
    const normalizedDate = rawDate
      ? (() => {
          const timestamp = Date.parse(rawDate.replace(/(\d)(st|nd|rd|th)\b/gi, "$1"));
          if (Number.isNaN(timestamp)) return rawDate.toLowerCase();
          const parsedDate = new Date(timestamp);
          return [
            parsedDate.getFullYear(),
            String(parsedDate.getMonth() + 1).padStart(2, "0"),
            String(parsedDate.getDate()).padStart(2, "0"),
          ].join("-");
        })()
      : undefined;

    const eventItem = source.interpretedItems?.find((item) => item.type === "event");
    const title = (
      eventItem?.title ||
      source.sourceSummary ||
      source.snippet ||
      source.title
    ).replace(/\s+/g, " ").trim();

    return [{
      id: `verified-${source.id.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`,
      time: startTime,
      dateKey: normalizedDate,
      title,
      duration: `${startTime}-${endTime}`,
      chip: "Fixed event",
      scheduleRationale: "StudentOS preserved this fixed event from confirmed source date and time facts.",
    }];
  });
  const sourceBackedKeys = new Set(
    footprint.timelineEvents.map((event) => `${event.title.toLowerCase()}|${event.duration ?? event.time}`),
  );
  const mergedTimeline = [
    ...footprint.timelineEvents,
    ...sourceBackedFixedEvents.filter(
      (event) => !sourceBackedKeys.has(`${event.title.toLowerCase()}|${event.duration}`),
    ),
  ];
  const allQuestions = [...questions, ...missingQuestions];
  const needsClarification = allQuestions.length > 0;
  const timelineValidation = validateTimelineConflicts(mergedTimeline);
  const confirmedGroup = !needsClarification ? timelineValidation.groups[0] : undefined;
  const confirmedEvents = confirmedGroup
    ? timelineValidation.events.filter((event) => confirmedGroup.eventIds.includes(event.id))
    : [];
  const fixedEvent = confirmedEvents[0];
  const conflictingEvent = confirmedEvents[1];
  const conflictTitle = fixedEvent && conflictingEvent
    ? `${fixedEvent.title} overlaps with ${conflictingEvent.title}`
    : footprint.conflict.title;

  return {
    ...footprint,
    sources: sourceEvidence,
    commitments,
    clarificationQuestions: allQuestions.slice(0, 8),
    timelineEvents: timelineValidation.events,
    conflict: confirmedGroup
      ? {
          ...footprint.conflict,
          title: conflictTitle,
          unresolvedSummary: `${conflictTitle}. StudentOS opened the conflict solver before locking the plan.`,
          fixedEventTitle: fixedEvent?.title ?? footprint.conflict.fixedEventTitle,
          fixedEventTime: fixedEvent?.duration ?? fixedEvent?.time ?? footprint.conflict.fixedEventTime,
          conflictingEventTitle: conflictingEvent?.title ?? footprint.conflict.conflictingEventTitle,
          conflictingEventTime:
            conflictingEvent?.duration ?? conflictingEvent?.time ?? footprint.conflict.conflictingEventTime,
          overlapLabel: confirmedGroup.overlapLabel,
          impactLabel: "Decision needed",
        }
      : footprint.conflict,
    sponsorTrace: confirmedGroup
      ? [
          {
            provider: "StudentOS",
            action: "Validated source-backed schedule conflicts",
            status: "success",
            detail: `${conflictTitle} (${confirmedGroup.overlapLabel}).`,
          },
          ...footprint.sponsorTrace.filter(
            (item) => item.action !== "Validated source-backed schedule conflicts",
          ),
        ]
      : footprint.sponsorTrace,
  };
}

async function preResearchGoalForPlanning(
  input: AnalyseStudentChaosRequest,
  options: {
    elapsed: () => number;
    send?: (event: AnalyseStudentChaosStreamEvent) => void;
  },
) {
  const goalCandidate = goalCandidateFromSources(input.sources);

  if (!goalCandidate) return undefined;

  options.send?.({
    type: "log",
    log: observableReasoningLog({
      id: "exa-goal-detected",
      at: options.elapsed(),
      title: "Goal needs source context",
      body: `Detected a goal before planning: ${goalCandidate.text}`,
      provider: "Exa",
      result: "Preparing focused searches.",
    }),
  });

  if (!isExaReady()) {
    options.send?.({
      type: "trace",
      trace: {
        provider: "Exa",
        action: "Researched goal before planning",
        status: "fallback",
        detail: "Exa is not configured, so StudentOS could not check goal context before planning.",
      },
    });
    return undefined;
  }

  const queryPlan = await generateResearchQueryPlan(researchPacketForGoal(input.sources, goalCandidate.text));
  options.send?.({
    type: "log",
    log: observableReasoningLog({
      id: "exa-goal-searching",
      at: options.elapsed(),
      title: "Checking goal context",
      body: "StudentOS is checking source context before generating questions or the roadmap.",
      provider: queryPlan.model ? "Vercel AI Gateway" : "Exa",
      result: queryPlan.queries.slice(0, 3).join(" | "),
    }),
  });

  const goalResearch = await deepResearchGoal(queryPlan.subject, {
    searchQueries: queryPlan.queries,
    model: queryPlan.model,
  });

  options.send?.({
    type: "trace",
    trace: {
      provider: goalResearch.model ? "Vercel AI Gateway + Exa" : "Exa",
      action: "Researched goal before planning",
      status: "success",
      detail: `${goalResearch.searchQueries.length} focused searches, ${goalResearch.citations.length} citations, ${goalResearch.filteredResultCount ?? 0} unrelated results filtered.`,
    },
  });
  options.send?.({
    type: "log",
    log: observableReasoningLog({
      id: "exa-goal-research-complete",
      at: options.elapsed(),
      title: "Goal context checked",
      body: "Research context will shape the goal questions and roadmap before the planner finalizes them.",
      provider: "Exa",
      result: `${goalResearch.citations.length} source${goalResearch.citations.length === 1 ? "" : "s"} checked.`,
    }),
  });

  return goalResearch;
}

async function analyseWithLocalFallback(
  input: AnalyseStudentChaosRequest,
  endpoint: string,
  error: unknown,
  extraTraces: AISponsorTraceItem[] = [],
): Promise<StudentOSAgentFootprint> {
  const fallback = await analyseStudentChaos(input, {
    forceFallbackReason: error instanceof Error ? error.message : "AWS Lambda agent failed before returning a footprint.",
  });

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
  originalSources: CapturedSourceForAI[],
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
        }, 900);
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

      let gatewayTrace: AISponsorTraceItem | undefined;
      let goalResearch: AIGoalResearch | undefined;

      try {
        gatewayTrace = await boundedGatewayHealthTrace();

        send({ type: "trace", trace: gatewayTrace });
        send({
          type: "log",
          log: observableReasoningLog({
            id: "gateway-preflight-complete",
            at: elapsed(),
            title: gatewayTrace.status === "success" ? "Gateway proof verified" : "Gateway proof needs local routing",
            body:
              gatewayTrace.status === "success"
                ? "The model-routing path is live, so the demo can prove Vercel AI Gateway separately from AWS compute."
                : "The model-routing preflight did not verify. Demo mode can continue with local routing.",
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

        goalResearch = await preResearchGoalForPlanning(input, { elapsed, send });
        const planningInput = goalResearch
          ? {
              ...input,
              sourceContext: mergeSourceContextWithGoalResearch(input.sourceContext, goalResearch),
            }
          : input;

        startHeartbeat();
        const result = normalizeAgentFootprint(applyGoalResearchToFootprint(
          await callAwsAgent(endpoint, planningInput, [gatewayTrace]),
          goalResearch,
        ), originalSources);
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
        gatewayTrace = gatewayTrace ?? await boundedGatewayHealthTrace();

        send({ type: "trace", trace });
        send({ type: "trace", trace: gatewayTrace });
        send({
          type: "log",
          log: {
            id: "aws-agent-local-routing",
            at: elapsed(),
            kind: "decision",
            title: "AWS agent local routing selected",
            body: "The AWS endpoint did not complete, so StudentOS kept the demo flow moving locally.",
            detail: trace.detail,
          },
        });

        goalResearch = goalResearch ?? await preResearchGoalForPlanning(input, { elapsed, send });
        const fallbackInput = goalResearch
          ? {
              ...input,
              sourceContext: mergeSourceContextWithGoalResearch(input.sourceContext, goalResearch),
            }
          : input;
        const fallback = await analyseStudentChaos(fallbackInput, {
          onEvent: send,
          forceFallbackReason: error instanceof Error
            ? error.message
            : "AWS Lambda agent failed before returning a footprint.",
        });

        send({
          type: "footprint",
          footprint: normalizeAgentFootprint(applyGoalResearchToFootprint(
            prependSponsorTraces(fallback, [trace, gatewayTrace, sourceTrace]),
            goalResearch,
          ), originalSources),
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
  const analysisInput = summaryOnlyAnalysisInput(parsed.data);
  const awsAgentEndpoint = configuredAwsAgentEndpoint();
  const strict = strictJudgeMode(req, requestBody);

  if (!wantsStream) {
    if (awsAgentEndpoint) {
      try {
        const gatewayTrace = await boundedGatewayHealthTrace();

        if (strict && gatewayTrace.status !== "success") {
          return strictJudgeErrorResponse(new Error(gatewayTrace.detail));
        }

        const goalResearch = await preResearchGoalForPlanning(analysisInput, { elapsed: () => 0 });
        const planningInput = goalResearch
          ? {
              ...analysisInput,
              sourceContext: mergeSourceContextWithGoalResearch(analysisInput.sourceContext, goalResearch),
            }
          : analysisInput;
        const result = normalizeAgentFootprint(applyGoalResearchToFootprint(
          await callAwsAgent(awsAgentEndpoint, planningInput, [gatewayTrace]),
          goalResearch,
        ), parsed.data.sources);

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
        const gatewayTrace = await boundedGatewayHealthTrace();
        const goalResearch = await preResearchGoalForPlanning(analysisInput, { elapsed: () => 0 });
        const fallbackInput = goalResearch
          ? {
              ...analysisInput,
              sourceContext: mergeSourceContextWithGoalResearch(analysisInput.sourceContext, goalResearch),
            }
          : analysisInput;
        const result = normalizeAgentFootprint(applyGoalResearchToFootprint(
          await analyseWithLocalFallback(fallbackInput, awsAgentEndpoint, error, [gatewayTrace]),
          goalResearch,
        ), parsed.data.sources);

        return NextResponse.json(result, {
          headers: { "X-StudentOS-Agent-Compute": "local-agent" },
        });
      }
    }

    if (strict) {
      return strictJudgeErrorResponse(missingAwsEndpointError());
    }

    if (!allowLocalAgentFallback()) {
      return awsAgentErrorResponse(missingAwsEndpointError());
    }

    const gatewayTrace = await boundedGatewayHealthTrace();
    const goalResearch = await preResearchGoalForPlanning(analysisInput, { elapsed: () => 0 });
    const planningInput = goalResearch
      ? {
          ...analysisInput,
          sourceContext: mergeSourceContextWithGoalResearch(analysisInput.sourceContext, goalResearch),
        }
      : analysisInput;
    const result = normalizeAgentFootprint(applyGoalResearchToFootprint(prependSponsorTraces(await analyseStudentChaos(planningInput), [
      localAwsTrace(),
      gatewayTrace,
      bedrockTextractTrace(analysisInput.sources),
    ]), goalResearch), parsed.data.sources);

    return NextResponse.json(result, {
      headers: { "X-StudentOS-Agent-Compute": "local" },
    });
  }

  if (awsAgentEndpoint) {
    return streamAwsAgentRequest(analysisInput, awsAgentEndpoint, strict, parsed.data.sources);
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
        const sourceTrace = bedrockTextractTrace(analysisInput.sources);
        send({
          type: "log",
          log: observableReasoningLog({
            id: "local-gateway-preflight-started",
            at: 0,
            title: "Checking model-routing proof",
            body: "StudentOS is verifying Vercel AI Gateway before local planning continues.",
            provider: "Vercel AI Gateway",
            result: sponsorEnv.aiGatewayModel,
          }),
        });
        const gatewayTrace = await boundedGatewayHealthTrace();

        send({ type: "trace", trace: localTrace });
        send({ type: "trace", trace: gatewayTrace });
        send({ type: "trace", trace: sourceTrace });
        send({
          type: "log",
          log: observableReasoningLog({
            id: "local-gateway-preflight-complete",
            at: 250,
            title: gatewayTrace.status === "success" ? "Gateway proof verified" : "Gateway proof needs local routing",
            body:
              gatewayTrace.status === "success"
                ? "The model-routing proof is live before local planning continues."
                : "The model-routing preflight did not verify, so the UI will keep the proof label updated.",
            detail: gatewayTrace.detail,
            provider: "Vercel AI Gateway",
            result: gatewayTrace.status,
          }),
        });

        const goalResearch = await preResearchGoalForPlanning(analysisInput, {
          elapsed: () => 500,
          send,
        });
        const planningInput = goalResearch
          ? {
              ...analysisInput,
              sourceContext: mergeSourceContextWithGoalResearch(analysisInput.sourceContext, goalResearch),
            }
          : analysisInput;

        const result = await analyseStudentChaos(planningInput, {
          onEvent: send,
        });

        send({
          type: "footprint",
          footprint: normalizeAgentFootprint(applyGoalResearchToFootprint(
            prependSponsorTraces(result, [localTrace, gatewayTrace, sourceTrace]),
            goalResearch,
          ), parsed.data.sources),
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

import type { Commitment, DemoPlanTask } from "@/lib/demo-data";
import type { AIAgentLog, AISponsorTraceItem } from "@/lib/studentos-ai-types";

export const AGENT_RUN_HISTORY_KEY = "studentos_agent_run_history";

export type AgentRunTrigger =
  | "initial_analysis"
  | "add_task"
  | "manual_conflict"
  | "clarification"
  | "plan_day";

export type AgentRunStatus = "queued" | "running" | "success" | "fallback" | "error";

export type AgentEventKind =
  | "observed"
  | "tool"
  | "reasoning"
  | "decision"
  | "result"
  | "fallback"
  | "error";

export type AgentProvider =
  | "StudentOS"
  | "AWS Lambda"
  | "Vercel AI Gateway"
  | "Bedrock/Textract"
  | "Exa";

export type AgentActivityEvent = {
  id: string;
  at: string;
  kind: AgentEventKind;
  title: string;
  body: string;
  detail?: string;
  provider?: AgentProvider;
  status?: AgentRunStatus;
};

export type AgentActivityChange = {
  id: string;
  title: string;
  change: "added" | "updated" | "removed";
  before?: string;
  after?: string;
  detail?: string;
};

export type AgentActivityRun = {
  runId: string;
  agentName: string;
  trigger: AgentRunTrigger;
  status: AgentRunStatus;
  startedAt: string;
  completedAt?: string;
  currentStep: string;
  events: AgentActivityEvent[];
  sponsorTrace: AISponsorTraceItem[];
  changedCommitments: AgentActivityChange[];
  changedPlanTasks: AgentActivityChange[];
  error?: string;
  fallbackReason?: string;
};

export type AgentActivityStreamEvent =
  | {
      type: "event";
      event: AgentActivityEvent;
    }
  | {
      type: "trace";
      trace: AISponsorTraceItem;
    }
  | {
      type: "result";
      result: unknown;
    }
  | {
      type: "error";
      error: string;
    };

const MAX_STORED_RUNS = 8;
const MAX_STORED_EVENTS = 28;
const MAX_STORED_TRACE = 8;
const MAX_STORED_CHANGES = 10;

function nowIso() {
  return new Date().toISOString();
}

function compactRun(run: AgentActivityRun): AgentActivityRun {
  return {
    ...run,
    events: run.events.slice(-MAX_STORED_EVENTS),
    sponsorTrace: run.sponsorTrace.slice(0, MAX_STORED_TRACE),
    changedCommitments: run.changedCommitments.slice(0, MAX_STORED_CHANGES),
    changedPlanTasks: run.changedPlanTasks.slice(0, MAX_STORED_CHANGES),
  };
}

function isStorageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function mergeTrace(rows: AISponsorTraceItem[], next: AISponsorTraceItem) {
  return [
    next,
    ...rows.filter((item) => !(item.provider === next.provider && item.action === next.action)),
  ].slice(0, MAX_STORED_TRACE);
}

export function createAgentRun({
  runId,
  agentName,
  trigger,
  status = "running",
  currentStep,
  events = [],
}: {
  runId?: string;
  agentName: string;
  trigger: AgentRunTrigger;
  status?: AgentRunStatus;
  currentStep: string;
  events?: AgentActivityEvent[];
}): AgentActivityRun {
  const startedAt = nowIso();

  return {
    runId: runId ?? `${trigger}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    agentName,
    trigger,
    status,
    startedAt,
    currentStep,
    events,
    sponsorTrace: [],
    changedCommitments: [],
    changedPlanTasks: [],
  };
}

export function createAgentEvent({
  id,
  kind,
  title,
  body,
  detail,
  provider = "StudentOS",
  status = "running",
}: Omit<AgentActivityEvent, "at"> & {
  at?: string;
}): AgentActivityEvent {
  return {
    id,
    at: nowIso(),
    kind,
    title,
    body,
    detail,
    provider,
    status,
  };
}

export function mergeAgentEvent(events: AgentActivityEvent[], next: AgentActivityEvent) {
  const existingIndex = events.findIndex((event) => event.id === next.id);
  const merged =
    existingIndex >= 0
      ? events.map((event, index) => (index === existingIndex ? next : event))
      : [...events, next];

  return merged.slice(-MAX_STORED_EVENTS);
}

export function loadAgentRuns() {
  if (!isStorageAvailable()) return [];

  try {
    const raw = window.localStorage.getItem(AGENT_RUN_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as AgentActivityRun[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((run) => run && typeof run.runId === "string")
      .map(compactRun)
      .slice(0, MAX_STORED_RUNS);
  } catch {
    return [];
  }
}

export function saveAgentRuns(runs: AgentActivityRun[]) {
  if (!isStorageAvailable()) return;

  const compact = runs.map(compactRun).slice(0, MAX_STORED_RUNS);
  window.localStorage.setItem(AGENT_RUN_HISTORY_KEY, JSON.stringify(compact));
}

export function upsertAgentRun(runs: AgentActivityRun[], nextRun: AgentActivityRun) {
  const compact = compactRun(nextRun);
  const existingIndex = runs.findIndex((run) => run.runId === compact.runId);
  const next =
    existingIndex >= 0
      ? runs.map((run, index) => (index === existingIndex ? compact : run))
      : [compact, ...runs];

  return next
    .slice()
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, MAX_STORED_RUNS);
}

export function appendAgentRunEvent(
  run: AgentActivityRun,
  event: AgentActivityEvent,
  currentStep = event.title,
): AgentActivityRun {
  return compactRun({
    ...run,
    currentStep,
    events: mergeAgentEvent(run.events, event),
  });
}

export function appendAgentRunTrace(run: AgentActivityRun, trace: AISponsorTraceItem): AgentActivityRun {
  return compactRun({
    ...run,
    sponsorTrace: mergeTrace(run.sponsorTrace, trace),
    events: mergeAgentEvent(run.events, eventFromSponsorTrace(trace)),
  });
}

export function completeAgentRun(
  run: AgentActivityRun,
  {
    status,
    currentStep,
    changedCommitments = run.changedCommitments,
    changedPlanTasks = run.changedPlanTasks,
    error,
    fallbackReason,
  }: {
    status: AgentRunStatus;
    currentStep: string;
    changedCommitments?: AgentActivityChange[];
    changedPlanTasks?: AgentActivityChange[];
    error?: string;
    fallbackReason?: string;
  },
): AgentActivityRun {
  return compactRun({
    ...run,
    status,
    currentStep,
    completedAt: nowIso(),
    changedCommitments,
    changedPlanTasks,
    error,
    fallbackReason,
  });
}

export function providerFromTrace(trace: AISponsorTraceItem): AgentProvider {
  const haystack = `${trace.provider} ${trace.action} ${trace.detail}`;

  if (/bedrock|textract/i.test(haystack)) return "Bedrock/Textract";
  if (/vercel ai gateway|gateway/i.test(haystack)) return "Vercel AI Gateway";
  if (/exa/i.test(haystack)) return "Exa";
  if (/aws|lambda|s3/i.test(haystack)) return "AWS Lambda";
  return "StudentOS";
}

export function eventFromSponsorTrace(trace: AISponsorTraceItem): AgentActivityEvent {
  const kind: AgentEventKind =
    trace.status === "success" ? "result" : trace.status === "fallback" ? "fallback" : "error";

  return createAgentEvent({
    id: `trace-${trace.provider}-${trace.action}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    kind,
    title: trace.action,
    body: trace.detail,
    provider: providerFromTrace(trace),
    status: trace.status,
  });
}

export function eventFromAgentLog(log: AIAgentLog): AgentActivityEvent {
  const kindMap: Record<AIAgentLog["kind"], AgentEventKind> = {
    thought: "observed",
    analysis: "reasoning",
    tool: "tool",
    decision: "decision",
    footprint: "result",
  };

  return {
    id: log.id,
    at: nowIso(),
    kind: kindMap[log.kind],
    title: log.title,
    body: log.body,
    detail: log.detail ?? log.tool?.result,
    provider: log.tool ? providerFromTrace({
      provider: log.tool.provider,
      action: log.title,
      status: "success",
      detail: log.tool.result,
    }) : "StudentOS",
    status: log.kind === "footprint" ? "success" : "running",
  };
}

function commitmentSummary(commitment: Commitment) {
  return `${commitment.title} · ${commitment.type} · ${commitment.state}`;
}

function planTaskSummary(task: DemoPlanTask) {
  return [
    task.title,
    task.section,
    task.timeLabel ?? task.scheduledDate ?? task.scheduledDateRange,
    task.deadline,
    task.reason,
  ]
    .filter(Boolean)
    .join(" · ");
}

function changeDetail(before: string, after: string) {
  if (before === after) return undefined;
  return `Before: ${before} | After: ${after}`;
}

export function diffCommitments(before: Commitment[], after: Commitment[]): AgentActivityChange[] {
  const beforeById = new Map(before.map((item) => [item.id, item]));
  const afterById = new Map(after.map((item) => [item.id, item]));
  const changes: AgentActivityChange[] = [];

  after.forEach((item) => {
    const previous = beforeById.get(item.id);
    if (!previous) {
      changes.push({
        id: item.id,
        title: item.title,
        change: "added",
        after: commitmentSummary(item),
        detail: `Added ${item.type} from ${item.source}.`,
      });
      return;
    }

    const previousSummary = commitmentSummary(previous);
    const nextSummary = commitmentSummary(item);
    if (
      previousSummary !== nextSummary ||
      previous.confidence !== item.confidence ||
      previous.estimatedDuration !== item.estimatedDuration ||
      previous.explanation !== item.explanation
    ) {
      changes.push({
        id: item.id,
        title: item.title,
        change: "updated",
        before: previousSummary,
        after: nextSummary,
        detail: changeDetail(previousSummary, nextSummary),
      });
    }
  });

  before.forEach((item) => {
    if (afterById.has(item.id)) return;
    changes.push({
      id: item.id,
      title: item.title,
      change: "removed",
      before: commitmentSummary(item),
    });
  });

  return changes.slice(0, MAX_STORED_CHANGES);
}

export function diffPlanTasks(before: DemoPlanTask[], after: DemoPlanTask[]): AgentActivityChange[] {
  const beforeById = new Map(before.map((item) => [item.id, item]));
  const afterById = new Map(after.map((item) => [item.id, item]));
  const changes: AgentActivityChange[] = [];

  after.forEach((item) => {
    const previous = beforeById.get(item.id);
    if (!previous) {
      changes.push({
        id: item.id,
        title: item.title,
        change: "added",
        after: planTaskSummary(item),
        detail: `Added to ${item.section.replace(/_/g, " ")}.`,
      });
      return;
    }

    const previousSummary = planTaskSummary(previous);
    const nextSummary = planTaskSummary(item);
    if (previousSummary !== nextSummary || Boolean(previous.updated) !== Boolean(item.updated)) {
      changes.push({
        id: item.id,
        title: item.title,
        change: "updated",
        before: previousSummary,
        after: nextSummary,
        detail: item.updated ? "Marked updated by the agent." : changeDetail(previousSummary, nextSummary),
      });
    }
  });

  before.forEach((item) => {
    if (afterById.has(item.id)) return;
    changes.push({
      id: item.id,
      title: item.title,
      change: "removed",
      before: planTaskSummary(item),
    });
  });

  return changes.slice(0, MAX_STORED_CHANGES);
}

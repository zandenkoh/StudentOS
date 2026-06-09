"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Cloud,
  FileSearch,
  Loader2,
  Search,
  Server,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type {
  AgentActivityEvent,
  AgentActivityRun,
  AgentEventKind,
  AgentProvider,
  AgentRunStatus,
} from "@/lib/agent-activity";
import { cn } from "@/lib/utils";

const PANEL_COLLAPSED_KEY = "studentos_agent_panel_collapsed";
const DEFAULT_EVENT_LIMIT = 4;

type DisplayEvent = AgentActivityEvent & {
  groupedCount?: number;
};

const providerIcon: Record<AgentProvider, LucideIcon> = {
  StudentOS: Bot,
  "AWS Lambda": Server,
  "Vercel AI Gateway": Cloud,
  "Bedrock/Textract": FileSearch,
  Exa: Search,
};

const kindIcon: Record<AgentEventKind, LucideIcon> = {
  observed: Clock3,
  tool: Server,
  reasoning: Bot,
  decision: Check,
  result: CheckCircle2,
  fallback: TriangleAlert,
  error: CircleAlert,
};

const statusLabel: Record<AgentRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  success: "Done",
  fallback: "Fallback",
  error: "Error",
};

function isActiveRun(run: AgentActivityRun) {
  return run.status === "queued" || run.status === "running";
}

function statusClasses(status: AgentRunStatus) {
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  if (status === "fallback") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "running") return "border-ink bg-ink text-white";
  return "border-neutral-200 bg-neutral-50 text-neutral-700";
}

function eventToneClasses(event: AgentActivityEvent) {
  if (event.kind === "error" || event.status === "error") return "border-red-200 bg-red-50 text-red-700";
  if (event.kind === "fallback" || event.status === "fallback") return "border-amber-200 bg-amber-50 text-amber-800";
  if (event.status === "success" || event.kind === "result") return "border-neutral-300 bg-white text-neutral-700";
  return "border-neutral-200 bg-neutral-50 text-neutral-500";
}

function StatusPill({ status }: { status: AgentRunStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[7px] border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
        statusClasses(status),
      )}
    >
      {status === "running" ? <Loader2 className="size-3 animate-spin" /> : null}
      {status === "success" ? <Check className="size-3" /> : null}
      {status === "fallback" ? <TriangleAlert className="size-3" /> : null}
      {status === "error" ? <CircleAlert className="size-3" /> : null}
      {statusLabel[status]}
    </span>
  );
}

function providerClasses(status?: AgentRunStatus) {
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  if (status === "fallback") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-neutral-200 bg-neutral-50 text-neutral-600";
}

function ProviderChip({ provider, status }: { provider?: AgentProvider; status?: AgentRunStatus }) {
  if (!provider || provider === "StudentOS") return null;
  const Icon = providerIcon[provider];

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1 rounded-[7px] border px-1.5 py-0.5 text-[10px] font-semibold",
        providerClasses(status),
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{provider}</span>
    </span>
  );
}

function isHeartbeatEvent(event: AgentActivityEvent) {
  const text = `${event.id} ${event.title} ${event.body}`;
  return /heartbeat|still (working|validating|classifying|applying)|waiting for replanning result|stream is still connected|keeping fallback path explicit/i.test(text);
}

function heartbeatRow(events: AgentActivityEvent[]): DisplayEvent {
  const last = events[events.length - 1];

  return {
    ...last,
    id: `${last.id}-grouped`,
    kind: "observed",
    title: "Still working...",
    body:
      events.length === 1
        ? "The agent is still connected and working on the current step."
        : `The agent is still connected. ${events.length} status updates grouped.`,
    detail: last.title,
    provider: "StudentOS",
    status: "running",
    groupedCount: events.length,
  };
}

function summarizeEvents(events: AgentActivityEvent[]) {
  const rows: DisplayEvent[] = [];
  let heartbeatEvents: AgentActivityEvent[] = [];

  const flushHeartbeat = () => {
    if (!heartbeatEvents.length) return;
    rows.push(heartbeatRow(heartbeatEvents));
    heartbeatEvents = [];
  };

  events.forEach((event) => {
    if (isHeartbeatEvent(event)) {
      heartbeatEvents.push(event);
      return;
    }

    flushHeartbeat();
    rows.push(event);
  });

  flushHeartbeat();
  return rows;
}

function compactProviderLabel(provider: string) {
  if (/vercel|gateway/i.test(provider)) return "Gateway";
  if (/bedrock|textract/i.test(provider)) return "Textract";
  if (/aws|lambda|s3/i.test(provider)) return "AWS";
  if (/exa/i.test(provider)) return "Exa";
  return provider;
}

function TraceChips({ run }: { run: AgentActivityRun }) {
  const chips = run.sponsorTrace.slice(0, 4);
  if (!chips.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((trace) => (
        <span
          key={`${trace.provider}-${trace.action}`}
          className={cn(
            "inline-flex min-w-0 items-center gap-1 rounded-[7px] border px-1.5 py-0.5 text-[10px] font-semibold",
            trace.status === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : trace.status === "fallback"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-neutral-200 bg-neutral-50 text-neutral-600",
          )}
        >
          <span className="truncate">{compactProviderLabel(trace.provider)}</span>
          <span className="text-neutral-400">/</span>
          <span className="truncate">{trace.status}</span>
        </span>
      ))}
    </div>
  );
}

function isTechnicalBody(value: string) {
  return (
    value.length > 180 ||
    /response_format|schema|properties|required|context=|planTasks|estimatedMinutes|stack|exception/i.test(value)
  );
}

function EventRow({ event }: { event: DisplayEvent }) {
  const Icon = kindIcon[event.kind];
  const technicalBody = isTechnicalBody(event.body);
  const visibleBody = technicalBody
    ? event.status === "error"
      ? "A technical error was returned. Details are available."
      : "Fallback detail is available."
    : event.body;
  const detail = technicalBody ? event.detail ?? event.body : event.detail;
  const hasDetail = Boolean(detail && detail !== visibleBody);

  return (
    <li className="border-b border-neutral-100 py-2 last:border-b-0">
      <div className="flex min-w-0 items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[7px] border",
            eventToneClasses(event),
          )}
        >
          <Icon className="size-3" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="min-w-0 flex-1 break-words text-[12px] font-semibold leading-4 text-ink">
              {event.title}
              {event.groupedCount && event.groupedCount > 1 ? (
                <span className="ml-1 text-neutral-400">x{event.groupedCount}</span>
              ) : null}
            </p>
            <ProviderChip provider={event.provider} status={event.status} />
          </div>
          <p className="mt-1 break-words text-[11px] font-medium leading-4 text-neutral-500">
            {visibleBody}
          </p>
          {hasDetail ? (
            <details className="mt-1.5 text-[10px] font-medium leading-4 text-neutral-500">
              <summary className="cursor-pointer list-none rounded-[6px] text-neutral-400 outline-none focus-visible:ring-2 focus-visible:ring-neutral-300">
                Details
              </summary>
              <p className="mt-1 break-words border-l border-neutral-200 pl-2">
                {detail}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ChangeList({
  title,
  changes,
}: {
  title: string;
  changes: AgentActivityRun["changedCommitments"];
}) {
  if (!changes.length) return null;

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{title}</p>
      <div className="space-y-1">
        {changes.slice(0, 4).map((change) => (
          <div key={`${change.id}-${change.change}`} className="break-words rounded-[7px] bg-neutral-50 px-2 py-1.5 text-[11px] font-medium leading-4 text-neutral-600">
            <span className="mr-1 font-semibold capitalize text-ink">{change.change}</span>
            {change.title}
            {change.after ? <span className="block break-words text-[10px] text-neutral-400">{change.after}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RunChanges({ run }: { run: AgentActivityRun }) {
  const hasChanges = run.changedCommitments.length > 0 || run.changedPlanTasks.length > 0;
  if (!hasChanges && !run.fallbackReason && !run.error) return null;

  return (
    <div className="mt-2 space-y-2 rounded-[8px] border border-neutral-100 bg-white px-2.5 py-2 text-[11px]">
      {hasChanges ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">What changed</p>
          <ChangeList title="Commitments changed" changes={run.changedCommitments} />
          <ChangeList title="Plan changed" changes={run.changedPlanTasks} />
        </div>
      ) : null}
      {run.fallbackReason || run.error ? (
        <details>
          <summary className="cursor-pointer list-none font-semibold text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-neutral-300">
            Technical details
          </summary>
          <div className="mt-2 space-y-2">
          {run.fallbackReason ? (
            <p className="break-words rounded-[7px] border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium leading-4 text-amber-800">
              Fallback: {run.fallbackReason}
            </p>
        ) : null}
        {run.error ? (
          <p className="break-words rounded-[7px] border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-medium leading-4 text-red-800">
              Error: {run.error}
            </p>
          ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function RunCard({
  run,
  fullHistory,
  onToggleFullHistory,
}: {
  run: AgentActivityRun;
  fullHistory: boolean;
  onToggleFullHistory: () => void;
}) {
  const summarizedEvents = useMemo(() => summarizeEvents(run.events), [run.events]);
  const visibleEvents = fullHistory
    ? summarizedEvents
    : summarizedEvents.slice(-DEFAULT_EVENT_LIMIT);
  const latestEvents = visibleEvents.slice().reverse();
  const hiddenCount = Math.max(0, summarizedEvents.length - visibleEvents.length);
  const hasEvents = summarizedEvents.length > 0;

  return (
    <article className="border-b border-neutral-100 p-3 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[13px] font-semibold leading-4 text-ink">{run.agentName}</p>
          <p className="mt-1 break-words text-[11px] font-medium leading-4 text-neutral-500">{run.currentStep}</p>
        </div>
        <StatusPill status={run.status} />
      </div>

      <TraceChips run={run} />

      <ul className="mt-2 rounded-[8px] border border-neutral-100 bg-white px-2">
        {hasEvents ? (
          latestEvents.map((event) => <EventRow key={event.id} event={event} />)
        ) : (
          <EventRow
            event={{
              id: `${run.runId}-queued`,
              at: run.startedAt,
              kind: "observed",
              title: "Queued",
              body: "StudentOS created the run and is waiting for the next step.",
              provider: "StudentOS",
              status: run.status,
            }}
          />
        )}
      </ul>

      {summarizedEvents.length > DEFAULT_EVENT_LIMIT ? (
        <button
          type="button"
          onClick={onToggleFullHistory}
          aria-expanded={fullHistory}
          className="mt-2 inline-flex min-h-8 items-center gap-1 rounded-[7px] px-1 text-[11px] font-semibold text-neutral-500 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-neutral-300"
        >
          {fullHistory ? "Show latest events" : `Show full history (${hiddenCount} more)`}
          <ChevronDown className={cn("size-3.5 transition-transform", fullHistory && "rotate-180")} />
        </button>
      ) : null}

      <RunChanges run={run} />
    </article>
  );
}

function EmptyPanel() {
  return (
    <div className="p-3 text-[12px] font-medium leading-5 text-neutral-500">
      Agent runs will appear here after add-task, clarification, or manual conflict updates.
    </div>
  );
}

function PanelSurface({
  orderedRuns,
  headline,
  activeCount,
  expandedRunIds,
  onToggleRunHistory,
  onCollapse,
  mobile = false,
}: {
  orderedRuns: AgentActivityRun[];
  headline: string;
  activeCount: number;
  expandedRunIds: ReadonlySet<string>;
  onToggleRunHistory: (runId: string) => void;
  onCollapse: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[8px] border border-neutral-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)]",
        mobile ? "max-h-[34dvh]" : "max-h-[calc(100dvh-7rem)]",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-ink text-white">
            {activeCount ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
              Agents
            </p>
            <p className="truncate text-[12px] font-semibold text-ink">{headline}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse agent activity"
          className="flex size-8 shrink-0 items-center justify-center rounded-[7px] border border-neutral-200 text-neutral-500 outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300"
        >
          <ChevronDown className={cn("size-4", mobile ? "" : "-rotate-90")} />
        </button>
      </div>

      <div className={cn("overflow-y-auto", mobile ? "max-h-[calc(34dvh-3.5rem)]" : "max-h-[calc(100dvh-10.5rem)]")}>
        {orderedRuns.length ? (
          orderedRuns.slice(0, 5).map((run) => (
            <RunCard
              key={run.runId}
              run={run}
              fullHistory={expandedRunIds.has(run.runId)}
              onToggleFullHistory={() => onToggleRunHistory(run.runId)}
            />
          ))
        ) : (
          <EmptyPanel />
        )}
      </div>
    </div>
  );
}

export function AgentActivityPanel({
  runs,
  mobileRaised = false,
}: {
  runs: AgentActivityRun[];
  mobileRaised?: boolean;
}) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);
  const [hasSavedDesktopPreference, setHasSavedDesktopPreference] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileTouched, setMobileTouched] = useState(false);
  const [expandedRunIds, setExpandedRunIds] = useState<ReadonlySet<string>>(() => new Set());

  const orderedRuns = useMemo(
    () => runs.slice().sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
    [runs],
  );
  const activeCount = orderedRuns.filter(isActiveRun).length;
  const latestRun = orderedRuns[0];
  const latestStatus = latestRun?.status ?? "success";
  const headline = activeCount
    ? `${activeCount} active run${activeCount === 1 ? "" : "s"}`
    : latestRun?.currentStep ?? "Idle";

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PANEL_COLLAPSED_KEY);
      if (stored === "true" || stored === "false") {
        setDesktopCollapsed(stored === "true");
        setHasSavedDesktopPreference(true);
        return;
      }
    } catch {
      // Local preference is optional.
    }

    setDesktopCollapsed(activeCount === 0);
  }, [activeCount]);

  useEffect(() => {
    if (hasSavedDesktopPreference) return;
    setDesktopCollapsed(activeCount === 0);
  }, [activeCount, hasSavedDesktopPreference]);

  useEffect(() => {
    if (mobileTouched) return;
    if (activeCount > 0) setMobileOpen(true);
  }, [activeCount, mobileTouched]);

  const setDesktopPreference = useCallback((collapsed: boolean) => {
    setDesktopCollapsed(collapsed);
    setHasSavedDesktopPreference(true);
    try {
      window.localStorage.setItem(PANEL_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Local preference is optional.
    }
  }, []);

  const toggleRunHistory = useCallback((runId: string) => {
    setExpandedRunIds((current) => {
      const next = new Set(current);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  }, []);

  const openMobile = useCallback(() => {
    setMobileTouched(true);
    setMobileOpen((open) => !open);
  }, []);

  return (
    <>
      <aside
        className={cn(
          "fixed top-24 z-10 hidden lg:block",
          desktopCollapsed
            ? "right-[max(24px,calc(50%_-_303px))] w-16"
            : "right-[max(24px,calc(50%_-_539px))] w-[300px]",
        )}
      >
        {desktopCollapsed ? (
          <button
            type="button"
            onClick={() => setDesktopPreference(false)}
            aria-label={`Open agent activity. ${headline}.`}
            aria-expanded={false}
            className="flex min-h-[116px] w-16 flex-col items-center justify-center gap-2 rounded-[8px] border border-neutral-200 bg-white px-2 py-3 text-center shadow-[0_12px_35px_rgba(0,0,0,0.06)] outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300"
          >
            <span className="relative flex size-8 items-center justify-center rounded-[7px] bg-ink text-white">
              {activeCount ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
              {activeCount ? (
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-white bg-ink" />
              ) : null}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
              Agents
            </span>
            <span className="break-words text-[11px] font-semibold leading-3 text-ink">
              {activeCount ? `${activeCount} live` : statusLabel[latestStatus]}
            </span>
          </button>
        ) : (
          <PanelSurface
            orderedRuns={orderedRuns}
            headline={headline}
            activeCount={activeCount}
            expandedRunIds={expandedRunIds}
            onToggleRunHistory={toggleRunHistory}
            onCollapse={() => setDesktopPreference(true)}
          />
        )}
      </aside>

      {activeCount > 0 || mobileOpen ? (
        <div
          className={cn(
            "fixed z-30 lg:hidden",
            mobileRaised
              ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+10.25rem)]"
              : "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.6rem)]",
            mobileOpen
              ? "left-1/2 w-[calc(100%-2rem)] max-w-[430px] -translate-x-1/2"
              : "left-4 w-[min(10rem,calc(100%-2rem))]",
          )}
        >
          {mobileOpen ? (
            <PanelSurface
              orderedRuns={orderedRuns}
              headline={headline}
              activeCount={activeCount}
              expandedRunIds={expandedRunIds}
              onToggleRunHistory={toggleRunHistory}
              onCollapse={openMobile}
              mobile
            />
          ) : (
            <button
              type="button"
              onClick={openMobile}
              aria-label={`Open agent activity. ${headline}.`}
              aria-expanded={false}
              className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-left shadow-[0_12px_35px_rgba(0,0,0,0.12)] outline-none hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300"
            >
              <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-white">
                {activeCount ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
                  Agents
                </span>
                <span className="block truncate text-[11px] font-semibold text-ink">
                  {activeCount ? `${activeCount} working` : statusLabel[latestStatus]}
                </span>
              </span>
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}

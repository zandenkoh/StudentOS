"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Cloud,
  FileSearch,
  ListChecks,
  Loader2,
  Search,
  Server,
  Sparkles,
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
  reasoning: Sparkles,
  decision: ListChecks,
  result: CheckCircle2,
  fallback: TriangleAlert,
  error: CircleAlert,
};

const statusLabel: Record<AgentRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  success: "Success",
  fallback: "Fallback",
  error: "Error",
};

function statusClasses(status: AgentRunStatus) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "fallback") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "error") return "border-red-200 bg-red-50 text-red-700";
  if (status === "queued") return "border-neutral-200 bg-neutral-50 text-neutral-500";
  return "border-ink bg-ink text-white";
}

function providerClasses(provider?: AgentProvider) {
  if (provider === "Vercel AI Gateway") return "border-neutral-300 bg-neutral-900 text-white";
  if (provider === "AWS Lambda") return "border-sky-200 bg-sky-50 text-sky-800";
  if (provider === "Bedrock/Textract") return "border-cyan-200 bg-cyan-50 text-cyan-800";
  if (provider === "Exa") return "border-violet-200 bg-violet-50 text-violet-800";
  return "border-neutral-200 bg-neutral-50 text-neutral-700";
}

function StatusBadge({ status }: { status: AgentRunStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-[8px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", statusClasses(status))}>
      {status === "running" ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
      {statusLabel[status]}
    </span>
  );
}

function ProviderBadge({ provider }: { provider?: AgentProvider }) {
  if (!provider) return null;
  const Icon = providerIcon[provider];

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1 rounded-[8px] border px-1.5 py-1 text-[10px] font-bold", providerClasses(provider))}>
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{provider}</span>
    </span>
  );
}

function EventRow({ event }: { event: AgentActivityEvent }) {
  const Icon = kindIcon[event.kind];

  return (
    <li className="rounded-[8px] border border-neutral-100 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.035)]">
      <div className="flex items-start gap-2">
        <span className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[8px] border",
          event.kind === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : event.kind === "fallback"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-neutral-200 bg-neutral-50 text-neutral-600",
        )}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate text-[12px] font-bold leading-4 text-ink">
              {event.title}
            </p>
            <ProviderBadge provider={event.provider} />
          </div>
          <p className="mt-1 text-[11px] font-semibold leading-4 text-neutral-600">{event.body}</p>
          {event.detail ? (
            <p className="mt-1.5 border-l-2 border-neutral-200 pl-2 text-[10px] font-semibold leading-4 text-neutral-500">
              {event.detail}
            </p>
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
    <div className="rounded-[8px] border border-neutral-100 bg-neutral-50 p-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">{title}</p>
      <div className="space-y-1.5">
        {changes.slice(0, 4).map((change) => (
          <div key={`${change.id}-${change.change}`} className="rounded-[8px] bg-white px-2 py-1.5 text-[11px] font-semibold leading-4 text-neutral-700">
            <span className="mr-1 font-bold capitalize text-ink">{change.change}</span>
            {change.title}
            {change.after ? <span className="block truncate text-[10px] text-neutral-400">{change.after}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function RunCard({ run, compact = false }: { run: AgentActivityRun; compact?: boolean }) {
  const latestEvents = run.events.slice(-12).reverse();
  const traceProviders = run.sponsorTrace
    .map((trace) => {
      const label = trace.provider.includes("Vercel") ? "Gateway" : trace.provider.replace(/^AWS\s*/i, "AWS ");
      return `${label}: ${trace.status}`;
    })
    .slice(0, 3);

  return (
    <article className="rounded-[8px] border border-neutral-200 bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-4 text-ink">{run.agentName}</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-neutral-500">{run.currentStep}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {traceProviders.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {traceProviders.map((item) => (
            <span key={item} className="rounded-[8px] border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-bold text-neutral-600">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <ul className={cn("mt-3 space-y-2", compact && "max-h-[220px] overflow-y-auto pr-1")}>
        {latestEvents.length ? (
          latestEvents.map((event) => <EventRow key={event.id} event={event} />)
        ) : (
          <EventRow
            event={{
              id: `${run.runId}-queued`,
              at: run.startedAt,
              kind: "observed",
              title: "Agent run queued",
              body: "StudentOS has created the run and is waiting for the next observable step.",
              provider: "StudentOS",
              status: run.status,
            }}
          />
        )}
      </ul>

      <div className="mt-3 grid gap-2">
        <ChangeList title="Commitments changed" changes={run.changedCommitments} />
        <ChangeList title="Plan changed" changes={run.changedPlanTasks} />
        {run.fallbackReason ? (
          <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] font-semibold leading-4 text-amber-800">
            Fallback: {run.fallbackReason}
          </p>
        ) : null}
        {run.error ? (
          <p className="rounded-[8px] border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-semibold leading-4 text-red-800">
            Error: {run.error}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function EmptyPanel() {
  return (
    <div className="rounded-[8px] border border-neutral-200 bg-white p-3 text-[12px] font-semibold leading-5 text-neutral-500">
      Agents spawned after the initial analysis will appear here with live steps, tool proof, and changes.
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const orderedRuns = useMemo(
    () => runs.slice().sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
    [runs],
  );
  const activeCount = orderedRuns.filter((run) => run.status === "queued" || run.status === "running").length;
  const headline = activeCount
    ? `${activeCount} agent${activeCount === 1 ? "" : "s"} working`
    : orderedRuns[0]?.currentStep ?? "Agents idle";

  return (
    <>
      <aside className="fixed right-[max(24px,calc(50%_-_499px))] top-24 z-20 hidden max-h-[calc(100dvh-7rem)] w-[320px] overflow-y-auto xl:block">
        <div className="mb-3 flex items-center justify-between rounded-[8px] border border-neutral-200 bg-white px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-ink text-white">
              <Bot className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                Agents working
              </p>
              <p className="truncate text-[12px] font-semibold text-ink">{headline}</p>
            </div>
          </div>
          {activeCount ? <Loader2 className="size-4 animate-spin text-ink" /> : <CheckCircle2 className="size-4 text-emerald-600" />}
        </div>
        <div className="space-y-3">
          {orderedRuns.length ? orderedRuns.slice(0, 5).map((run) => <RunCard key={run.runId} run={run} />) : <EmptyPanel />}
        </div>
      </aside>

      <div
        className={cn(
          "fixed z-30 xl:hidden",
          mobileRaised
            ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+10.75rem)]"
            : "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+9rem)]",
          mobileOpen
            ? "left-1/2 w-[calc(100%-2rem)] max-w-[430px] -translate-x-1/2"
            : "right-4 w-12",
        )}
      >
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Toggle agent activity"
          className={cn(
            "flex min-h-12 items-center border border-neutral-200 bg-white/95 text-left shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl",
            mobileOpen
              ? "w-full justify-between gap-3 rounded-[8px] px-3 py-2"
              : "size-12 justify-center rounded-full p-0",
          )}
        >
          <span className={cn("flex min-w-0 items-center", mobileOpen && "gap-2")}>
            <span className={cn(
              "relative flex size-8 shrink-0 items-center justify-center bg-ink text-white",
              mobileOpen ? "rounded-[8px]" : "rounded-full",
            )}>
              {activeCount ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
              {!mobileOpen && activeCount ? (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-white bg-emerald-500" />
              ) : null}
            </span>
            {mobileOpen ? (
              <span className="min-w-0">
              <span className="block truncate text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                Agents working
              </span>
              <span className="block truncate text-[12px] font-bold text-ink">{headline}</span>
              </span>
            ) : null}
          </span>
          {mobileOpen ? (
            <ChevronDown className="size-4 shrink-0 rotate-180 text-neutral-400 transition-transform" />
          ) : null}
        </button>
        {mobileOpen ? (
          <div className="mt-2 max-h-[44dvh] overflow-y-auto rounded-[8px] border border-neutral-200 bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
            <div className="space-y-2">
              {orderedRuns.length ? orderedRuns.slice(0, 3).map((run) => <RunCard key={run.runId} run={run} compact />) : <EmptyPanel />}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

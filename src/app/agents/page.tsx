"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  CalendarDays,
  Check,
  Clock3,
  FileSearch,
  Image,
  ListChecks,
  Server,
  Sparkles,
  type LucideIcon
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

type LogKind = "thought" | "analysis" | "tool" | "decision" | "footprint";

type AgentLog = {
  id: string;
  at: number;
  kind: LogKind;
  title: string;
  body: string;
  detail?: string;
  tool?: {
    name: string;
    icon: LucideIcon;
    color: string;
    result: string;
  };
};

const FINISH_AT = 10000;

type SponsorTraceItem = {
  provider: string;
  action: string;
  status: "success" | "fallback" | "error";
  detail: string;
};

const logs: AgentLog[] = [
  {
    id: "read",
    at: 0,
    kind: "thought",
    title: "Reading uploaded sources",
    body: "Scanning the chaos packet across chat screenshots, homework PDF, voice note, calendar image, CCA notice, coding goal, and team message.",
    detail: "7 sources queued. StudentOS is separating evidence from noise."
  },
  {
    id: "extract",
    at: 2000,
    kind: "tool",
    title: "Extracting commitments",
    body: "Pulling out items that create a deadline, meeting, follow-up, or recurring study block.",
    tool: {
      name: "OCR + transcript scan",
      icon: Image,
      color: "text-neutral-700",
      result: "5 commitments found"
    }
  },
  {
    id: "ambiguity",
    at: 4000,
    kind: "analysis",
    title: "Resolving ambiguous items",
    body: "Marking the coding goal and team message as questions so the next screen can clarify them quickly instead of guessing.",
    detail: "Open questions prepared: target coding outcome, whether the team meeting is confirmed."
  },
  {
    id: "calendar",
    at: 6100,
    kind: "tool",
    title: "Checking calendar conflicts",
    body: "Comparing fixed tuition against the CCA briefing and flexible evening work blocks.",
    tool: {
      name: "Calendar check",
      icon: CalendarDays,
      color: "text-neutral-700",
      result: "CCA conflict detected"
    }
  },
  {
    id: "plan",
    at: 8200,
    kind: "footprint",
    title: "Building executable day plan",
    body: "Saving the clean commitment footprint so the review, conflict solver, and plan can pick up without another upload.",
    detail: "Redirecting to /commitments."
  }
];

const kindIcon: Record<LogKind, LucideIcon> = {
  thought: BrainCircuit,
  analysis: FileSearch,
  tool: Sparkles,
  decision: ListChecks,
  footprint: Check
};

const kindLabel: Record<LogKind, string> = {
  thought: "Thinking",
  analysis: "Analysing",
  tool: "Tool call",
  decision: "Decision",
  footprint: "Footprint"
};

function formatElapsed(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining === 0 ? `${minutes}min` : `${minutes}min ${remaining}s`;
}

function LogMarker({ kind, complete }: { kind: LogKind; complete: boolean }) {
  const Icon = kindIcon[kind];

  return (
    <span
      className={cn(
        "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-white",
        complete ? "border-neutral-300 text-ink" : "border-neutral-200 text-neutral-400"
      )}
    >
      {complete ? <Check className="size-3.5 stroke-[2.5]" /> : <Icon className="size-3.5" />}
    </span>
  );
}

function ToolCall({ log }: { log: AgentLog }) {
  if (!log.tool) return null;
  const ToolIcon = log.tool.icon;

  return (
    <div className="mt-3 rounded-[8px] border border-neutral-200 bg-white px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <ToolIcon className={cn("size-4 shrink-0", log.tool.color)} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-neutral-800">
          {log.tool.name}
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-neutral-400">
          called
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-neutral-500">{log.tool.result}</p>
    </div>
  );
}

function AgentLogItem({
  log,
  complete,
  isLast
}: {
  log: AgentLog;
  complete: boolean;
  isLast: boolean;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative flex gap-3"
    >
      <div className="flex shrink-0 flex-col items-center">
        <LogMarker kind={log.kind} complete={complete} />
        {!isLast ? <span className="my-2 w-px flex-1 bg-neutral-200" /> : null}
      </div>
      <article className="min-w-0 flex-1 pb-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            {kindLabel[log.kind]}
          </span>
          <span className="size-1 shrink-0 rounded-full bg-neutral-300" />
          <span className="truncate text-[11px] font-semibold text-neutral-400">
            {formatElapsed(Math.floor(log.at / 1000))}
          </span>
        </div>
        <h2 className="mt-1 text-[15px] font-semibold leading-snug tracking-tight text-ink">
          {log.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-550">{log.body}</p>
        {log.detail ? (
          <p className="mt-2 rounded-[8px] border border-neutral-100 bg-neutral-50 px-3 py-2 text-[12px] leading-snug text-neutral-500">
            {log.detail}
          </p>
        ) : null}
        <ToolCall log={log} />
      </article>
    </motion.li>
  );
}

export default function AgentsThinkingPage() {
  const router = useRouter();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sponsorTrace, setSponsorTrace] = useState<SponsorTraceItem[]>([]);
  const logViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trace = window.localStorage.getItem("studentos_sponsor_trace");
    if (!trace) return;

    try {
      setSponsorTrace(JSON.parse(trace) as SponsorTraceItem[]);
    } catch {
      setSponsorTrace([]);
    }
  }, []);

  const allLogs = useMemo<AgentLog[]>(() => {
    const sponsorLogs = sponsorTrace
      .slice()
      .reverse()
      .map((trace, index) => ({
        id: `sponsor-${index}-${trace.action}`,
        at: 900 + index * 900,
        kind: "tool" as const,
        title: trace.action,
        body:
          trace.status === "success"
            ? `${trace.provider} completed a real sponsor-tech step for this source.`
            : `${trace.provider} returned a ${trace.status} state, so StudentOS kept the demo flow resilient.`,
        tool: {
          name: trace.provider,
          icon: Server,
          color:
            trace.status === "success"
              ? "text-sky-700"
              : trace.status === "error"
                ? "text-red-600"
                : "text-amber-600",
          result: trace.detail,
        },
      }));

    return [...logs.slice(0, 1), ...sponsorLogs, ...logs.slice(1)].sort((a, b) => a.at - b.at);
  }, [sponsorTrace]);

  const visibleLogs = useMemo(
    () => allLogs.filter((log) => elapsedMs >= log.at),
    [allLogs, elapsedMs]
  );
  const activeLog = visibleLogs[visibleLogs.length - 1] ?? allLogs[0];
  const progress = Math.min(0.62, 0.36 + (elapsedMs / FINISH_AT) * 0.26);
  const done = elapsedMs >= allLogs[allLogs.length - 1].at;

  useEffect(() => {
    const viewport = logViewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [visibleLogs.length]);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);

    const footprintTimer = window.setTimeout(() => {
      window.localStorage.setItem("studentos_footprint", "completed");
      window.localStorage.setItem("agent_log_visited", "true");
      window.localStorage.setItem(
        "studentos_commitment_footprint",
        JSON.stringify({
          createdAt: new Date().toISOString(),
          sources: [
            "WhatsApp project chat screenshot",
            "Physics Chapter 12 homework PDF",
            "Teammate voice note",
            "Tuition calendar conflict",
            "CCA announcement screenshot",
            "goalDemo.txt coding goal",
            "Team project follow-up message"
          ],
          commitments: [
            "Python data-handling learning goal",
            "Physics assignment deadline",
            "Tuition timetable block",
            "CCA briefing conflict",
            "Teammate slide deck follow-up"
          ],
          nextRoute: "/commitments"
        })
      );
    }, 8200);

    const redirectTimer = window.setTimeout(() => {
      router.push("/commitments");
    }, FINISH_AT);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(footprintTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <AppShell stepLabel="Agent Log" progress={progress} hideHeader={false}>
      <div className="flex h-[calc(100dvh-124px)] min-h-0 flex-col overflow-hidden px-5 pb-[92px] pt-1">
        <section className="rounded-[8px] border border-neutral-200 bg-white p-4 shadow-[0_18px_45px_rgba(0,0,0,0.045)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink">
                Building your commitment map
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
                StudentOS is reading the uploaded material, extracting obligations, checking conflicts, and preparing the next screen.
              </p>
            </div>
            <div className="shrink-0 rounded-[8px] border border-neutral-200 bg-white px-3 py-2 text-right">
              <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                <Clock3 className="size-3.5" />
                Live
              </div>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-ink">
                {formatElapsed(Math.floor(elapsedMs / 1000))}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Sources", sponsorTrace.length > 0 ? "Real" : "7"],
              ["Found", "5"],
              ["Open", "2"]
            ].map(([label, value]) => (
              <div key={label} className="rounded-[8px] border border-neutral-100 bg-neutral-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-neutral-400">{label}</p>
                <p className="mt-1 text-[18px] font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-[8px] border border-neutral-200 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.035)]">
          <div className="border-b border-neutral-100 px-4 py-3">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Current activity
                </p>
                <p className="mt-1 truncate text-[14px] font-semibold text-ink">{activeLog.title}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse" />
                <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:120ms]" />
                <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          </div>

          <div ref={logViewportRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <ol className="min-w-0">
              <AnimatePresence initial={false}>
                {visibleLogs.map((log, index) => (
                  <AgentLogItem
                    key={log.id}
                    log={log}
                    complete={index < visibleLogs.length - 1 || done}
                    isLast={index === visibleLogs.length - 1}
                  />
                ))}
              </AnimatePresence>
            </ol>
          </div>
        </section>

        <div className="fixed-bottom-action">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                Next
              </p>
              <p className="truncate text-[13px] font-semibold text-ink">
                {done ? "Opening commitments" : "Auto-moving when done"}
              </p>
            </div>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-neutral-100">
              <motion.div
                className="h-full rounded-full bg-ink"
                animate={{ width: `${Math.min(100, (elapsedMs / FINISH_AT) * 100)}%` }}
                transition={{ duration: 0.2, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

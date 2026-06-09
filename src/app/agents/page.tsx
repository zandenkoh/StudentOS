"use client";

import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  CalendarDays,
  Check,
  FileSearch,
  Image,
  ListChecks,
  Server,
  Sparkles,
  type LucideIcon
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import type { CapturedSourceForAI, StudentOSAgentFootprint } from "@/lib/studentos-ai-types";

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

const REDIRECT_MIN_AT = 9800;
const REDIRECT_MAX_AT = 52000;

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
    id: "exa",
    at: 5400,
    kind: "tool",
    title: "Researching broad goals",
    body: "Checking whether vague goals need live web context before StudentOS turns them into a roadmap.",
    tool: {
      name: "Exa goal research",
      icon: FileSearch,
      color: "text-violet-700",
      result: "Grounding goal context"
    }
  },
  {
    id: "calendar",
    at: 7000,
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
    at: 8800,
    kind: "footprint",
    title: "Calling planning agent",
    body: "Vercel AI Gateway is returning structured commitments, questions, conflicts, roadmap steps, and a daily plan.",
    detail: "StudentOS will open the review screen once the live footprint is ready."
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
    <div className="mt-3 rounded-[8px] border border-ink/10 bg-ink px-3 py-2.5 text-white shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
      <div className="flex min-w-0 items-center gap-2">
        <ToolIcon className="size-4 shrink-0 text-white" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white">
          {log.tool.name}
        </span>
        <span className="shrink-0 text-[11px] font-semibold text-white/55">
          running
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-white/72">{log.tool.result}</p>
    </div>
  );
}

function AgentLogItem({
  log,
  complete,
  isLast,
  isActive,
  activeRef
}: {
  log: AgentLog;
  complete: boolean;
  isLast: boolean;
  isActive: boolean;
  activeRef?: Ref<HTMLLIElement>;
}) {
  return (
    <motion.li
      ref={activeRef}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "relative flex gap-3 rounded-[8px] px-2 py-1.5 transition-colors",
        isActive ? "bg-neutral-50" : "bg-transparent"
      )}
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
        </div>
        <h2 className="mt-1 text-[15px] font-semibold leading-snug tracking-tight text-ink">
          {log.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">{log.body}</p>
        {log.detail ? (
          <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-[12px] leading-snug text-neutral-500">
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
  const [aiFootprint, setAiFootprint] = useState<StudentOSAgentFootprint | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const logViewportRef = useRef<HTMLDivElement>(null);
  const activeLogRef = useRef<HTMLLIElement>(null);
  const shouldFollowLogRef = useRef(true);
  const analysisStartedRef = useRef(false);

  useEffect(() => {
    const trace = window.localStorage.getItem("studentos_sponsor_trace");
    if (!trace) return;

    try {
      setSponsorTrace(JSON.parse(trace) as SponsorTraceItem[]);
    } catch {
      setSponsorTrace([]);
    }
  }, []);

  useEffect(() => {
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;

    const controller = new AbortController();

    async function runAnalysis() {
      let capturedSources: CapturedSourceForAI[] = [];

      try {
        const rawSources = window.localStorage.getItem("studentos_captured_sources");
        if (rawSources) {
          const parsed = JSON.parse(rawSources) as CapturedSourceForAI[];
          if (Array.isArray(parsed)) capturedSources = parsed;
        }
      } catch {
        capturedSources = [];
      }

      try {
        const response = await fetch("/api/sponsor/ai/analyse-student-chaos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            currentDate: "2026-06-09",
            sources: capturedSources,
            sourceContext: {
              productNarrative:
                "AWS reads messy screenshots, PDFs, and text. Exa researches broad goals. Vercel AI Gateway runs the planning agent.",
            },
          }),
        });

        const result = (await response.json()) as StudentOSAgentFootprint;
        if (!response.ok) throw new Error("StudentOS analysis route returned an error.");

        setAiFootprint(result);
        setSponsorTrace(result.sponsorTrace);
        window.localStorage.setItem("studentos_footprint", "completed");
        window.localStorage.setItem("agent_log_visited", "true");
        window.localStorage.setItem("studentos_ai_footprint", JSON.stringify(result));
        window.localStorage.setItem("studentos_commitment_footprint", JSON.stringify(result));
        window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify(result.sponsorTrace.slice(0, 8)));
      } catch (error) {
        if (controller.signal.aborted) return;

        setAnalysisFailed(true);
        let existingTrace: SponsorTraceItem[] = [];

        try {
          const rawTrace = window.localStorage.getItem("studentos_sponsor_trace");
          if (rawTrace) {
            const parsedTrace = JSON.parse(rawTrace) as SponsorTraceItem[];
            if (Array.isArray(parsedTrace)) existingTrace = parsedTrace;
          }
        } catch {
          existingTrace = [];
        }

        const fallbackTrace = [
          {
            provider: "Vercel AI Gateway",
            action: "Generated live StudentOS analysis",
            status: "fallback" as const,
            detail: error instanceof Error ? error.message : "StudentOS analysis failed.",
          },
          ...existingTrace,
        ].slice(0, 8);

        setSponsorTrace(fallbackTrace);
        window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify(fallbackTrace));
      }
    }

    void runAnalysis();

    return () => {
      controller.abort();
      analysisStartedRef.current = false;
    };
  }, []);

  const allLogs = useMemo<AgentLog[]>(() => {
    if (aiFootprint?.agentLogs.length) {
      return aiFootprint.agentLogs
        .slice()
        .sort((a, b) => a.at - b.at)
        .map((log) => ({
          id: log.id,
          at: log.at,
          kind: log.kind,
          title: log.title,
          body: log.body,
          detail: log.detail,
          tool: log.tool
            ? {
                name: log.tool.provider,
                icon: Server,
                color:
                  log.tool.provider === "AWS"
                    ? "text-sky-700"
                    : log.tool.provider === "Exa"
                      ? "text-violet-700"
                      : "text-neutral-800",
                result: log.tool.result,
              }
            : undefined,
        }));
    }

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
  }, [aiFootprint, sponsorTrace]);

  const visibleLogs = useMemo(
    () => allLogs.filter((log) => elapsedMs >= log.at),
    [allLogs, elapsedMs]
  );
  const activeLog = visibleLogs[visibleLogs.length - 1] ?? allLogs[0];
  const analysisDone = Boolean(aiFootprint) || analysisFailed;
  const progress = Math.min(0.92, 0.36 + (elapsedMs / REDIRECT_MAX_AT) * 0.56);
  const readyToRedirect = analysisDone && elapsedMs >= REDIRECT_MIN_AT;
  const done = readyToRedirect;
  const progressPercent = Math.min(100, readyToRedirect ? 100 : Math.round(progress * 100));

  useEffect(() => {
    if (!shouldFollowLogRef.current) return;
    activeLogRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [visibleLogs.length]);

  function handleLogScroll() {
    const viewport = logViewportRef.current;
    if (!viewport) return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom <= 36) {
      shouldFollowLogRef.current = true;
    }
  }

  function pauseLogFollow(forcePause = false) {
    const viewport = logViewportRef.current;
    if (!viewport) return;

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (forcePause || distanceFromBottom > 36) {
      shouldFollowLogRef.current = false;
    }
  }

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!readyToRedirect) return;
    const redirectTimer = window.setTimeout(() => {
      router.push("/commitments");
    }, 650);

    return () => window.clearTimeout(redirectTimer);
  }, [readyToRedirect, router]);

  return (
    <AppShell stepLabel="Agent Log" hideHeader={false}>
      <div className="flex h-[calc(100dvh-104px)] min-h-0 flex-col overflow-hidden px-5 pb-4 pt-1">
        <section className="sticky top-0 z-20 rounded-[8px] border border-neutral-200 bg-white/95 p-3 shadow-[0_12px_30px_rgba(0,0,0,0.05)] backdrop-blur-xl">
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-neutral-100">
            <motion.div
              data-agent-progress
              className="relative h-full rounded-full bg-ink"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <span className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
            </motion.div>
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[19px] font-bold leading-tight tracking-tight text-ink">
                Agent is building your map
              </h1>
              <p className="mt-1 truncate text-[13px] font-medium text-neutral-500">
                {activeLog.title}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-neutral-100 px-2.5 py-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                {done ? "Done" : "Live"}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-[8px] border border-neutral-200 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.035)]">
          <div className="border-b border-neutral-100 px-4 py-2.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Thought process and tool calls
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse" />
                <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:120ms]" />
                <span className="size-1.5 rounded-full bg-neutral-400 animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          </div>

          <div
            data-agent-log-scroller
            ref={logViewportRef}
            onScroll={handleLogScroll}
            onWheel={(event) => pauseLogFollow(event.deltaY < 0)}
            onTouchMove={() => pauseLogFollow(true)}
            className="min-h-0 flex-1 overflow-y-auto px-2 py-3"
          >
            <ol className="min-w-0 space-y-1 pb-[36vh]">
              <AnimatePresence initial={false}>
                {visibleLogs.map((log, index) => (
                  <AgentLogItem
                    key={log.id}
                    log={log}
                    complete={index < visibleLogs.length - 1 || done}
                    isLast={index === visibleLogs.length - 1}
                    isActive={index === visibleLogs.length - 1}
                    activeRef={index === visibleLogs.length - 1 ? activeLogRef : undefined}
                  />
                ))}
              </AnimatePresence>
            </ol>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

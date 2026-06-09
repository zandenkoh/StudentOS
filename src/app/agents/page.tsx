"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  Check,
  FileSearch,
  ListChecks,
  Server,
  Sparkles,
  type LucideIcon
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import type {
  AIAgentLog,
  AISponsorTraceItem,
  AnalyseStudentChaosStreamEvent,
  CapturedSourceForAI,
  StudentOSAgentFootprint,
} from "@/lib/studentos-ai-types";

type LogKind = AIAgentLog["kind"];

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

const REDIRECT_MIN_AT = 1600;
const ANALYSIS_TIMEOUT_MS = 34000;

const kindIcon: Record<LogKind, LucideIcon> = {
  thought: BrainCircuit,
  analysis: FileSearch,
  tool: Sparkles,
  decision: ListChecks,
  footprint: Check
};

const kindLabel: Record<LogKind, string> = {
  thought: "Observed",
  analysis: "Analysing",
  tool: "Tool call",
  decision: "Decision",
  footprint: "Footprint"
};

function toolColorForProvider(provider: string) {
  if (provider === "AWS") return "text-sky-700";
  if (provider === "Exa") return "text-violet-700";
  if (provider === "Vercel AI Gateway") return "text-neutral-800";
  return "text-neutral-700";
}

function toClientLog(log: AIAgentLog): AgentLog {
  return {
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
          color: toolColorForProvider(log.tool.provider),
          result: log.tool.result,
        }
      : undefined,
  };
}

function mergeLog(rows: AgentLog[], next: AgentLog) {
  const existingIndex = rows.findIndex((row) => row.id === next.id);
  const merged =
    existingIndex >= 0
      ? rows.map((row, index) => (index === existingIndex ? next : row))
      : [...rows, next];

  return merged.slice().sort((a, b) => a.at - b.at);
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
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [aiFootprint, setAiFootprint] = useState<StudentOSAgentFootprint | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const logViewportRef = useRef<HTMLDivElement>(null);
  const activeLogRef = useRef<HTMLLIElement>(null);
  const shouldFollowLogRef = useRef(true);
  const analysisStartedRef = useRef(false);

  useEffect(() => {
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
    const requestStartedAt = Date.now();
    let cancelled = false;

    function storeFootprint(result: StudentOSAgentFootprint) {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setAiFootprint(result);
      setAgentLogs(result.agentLogs.map(toClientLog));
      window.localStorage.setItem("studentos_footprint", "completed");
      window.localStorage.setItem("agent_log_visited", "true");
      window.localStorage.setItem("studentos_ai_footprint", JSON.stringify(result));
      window.localStorage.setItem("studentos_commitment_footprint", JSON.stringify(result));
      window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify(result.sponsorTrace.slice(0, 8)));
    }

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
        setAgentLogs([]);
        setAnalysisFailed(false);
        setStreamError(null);

        const response = await fetch("/api/sponsor/ai/analyse-student-chaos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/x-ndjson",
          },
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

        if (!response.ok) {
          let message = "StudentOS analysis route returned an error.";

          try {
            const payload = (await response.json()) as { error?: string };
            if (payload.error) message = payload.error;
          } catch {
            // Keep the route-level message when the error body is not JSON.
          }

          throw new Error(message);
        }

        if (!response.body) throw new Error("StudentOS analysis stream was not available.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalFootprint: StudentOSAgentFootprint | null = null;
        let streamErrorMessage = "";

        const handleEvent = (event: AnalyseStudentChaosStreamEvent) => {
          if (cancelled) return;

          if (event.type === "log") {
            setAgentLogs((current) => mergeLog(current, toClientLog(event.log)));
            return;
          }

          if (event.type === "trace") {
            return;
          }

          if (event.type === "footprint") {
            finalFootprint = event.footprint;
            storeFootprint(event.footprint);
            return;
          }

          streamErrorMessage = event.error;
          setStreamError(event.error);
        };

        const processLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          handleEvent(JSON.parse(trimmed) as AnalyseStudentChaosStreamEvent);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(processLine);
        }

        buffer += decoder.decode();
        processLine(buffer);

        if (!finalFootprint) {
          throw new Error(streamErrorMessage || "StudentOS analysis stream ended before the final footprint.");
        }
      } catch (error) {
        if (cancelled) return;

        setAnalysisFailed(true);
        const message = controller.signal.aborted
          ? "StudentOS analysis stream timed out after 30 seconds."
          : error instanceof Error
            ? error.message
            : "StudentOS analysis failed.";
        setStreamError(message);
        setAgentLogs((current) =>
          mergeLog(current, {
            id: "analysis-stream-error",
            at: Math.max(0, Date.now() - requestStartedAt),
            kind: "decision",
            title: "Analysis stream stopped",
            body: "The live analysis stream did not produce a final footprint.",
            detail: message,
          }),
        );
        let existingTrace: AISponsorTraceItem[] = [];

        try {
          const rawTrace = window.localStorage.getItem("studentos_sponsor_trace");
          if (rawTrace) {
            const parsedTrace = JSON.parse(rawTrace) as AISponsorTraceItem[];
            if (Array.isArray(parsedTrace)) existingTrace = parsedTrace;
          }
        } catch {
          existingTrace = [];
        }

        const fallbackTrace = [
          {
            provider: "StudentOS",
            action: "Analysis stream failed",
            status: "error" as const,
            detail: message,
          },
          ...existingTrace,
        ].slice(0, 8);

        window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify(fallbackTrace));
      }
    }

    void runAnalysis();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      controller.abort();
      analysisStartedRef.current = false;
    };
  }, []);

  const visibleLogs = agentLogs;
  const activeLog = visibleLogs[visibleLogs.length - 1];
  const readyToRedirect = Boolean(aiFootprint) && elapsedMs >= REDIRECT_MIN_AT;
  const done = Boolean(aiFootprint);
  const progressPercent = done ? 100 : Math.min(92, visibleLogs.length ? 12 + visibleLogs.length * 10 : 8);
  const statusLabel = analysisFailed ? "Error" : done ? "Done" : "Live";
  const activeTitle = streamError ?? activeLog?.title ?? "Connecting to analysis stream";

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
                {activeTitle}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-neutral-100 px-2.5 py-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full animate-pulse",
                  analysisFailed ? "bg-red-500" : "bg-emerald-500"
                )}
              />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                {statusLabel}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-3 flex min-h-0 flex-1 flex-col rounded-[8px] border border-neutral-200 bg-white shadow-[0_18px_45px_rgba(0,0,0,0.035)]">
          <div className="border-b border-neutral-100 px-4 py-2.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Agent activity and tool calls
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

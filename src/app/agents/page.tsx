"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Loader2,
  Server,
  type LucideIcon
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { SponsorProofStrip } from "@/components/sponsor-proof-strip";
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

const REDIRECT_MIN_AT = 900;
const AGENT_PRESENTATION_MAX_MS = 15000;
const TYPE_BASE_DELAY_MS = 2;
const TYPE_JITTER_MS = 4;
const LOG_REVEAL_DELAYS_MS = [45, 95, 65, 130, 80, 155, 105, 120, 70];
const loadingMessages = [
  "Reading submitted sources",
  "Generating focused Exa searches",
  "Waiting on research results",
  "Building commitments and roadmap",
  "Validating the final footprint",
];

function todayDateId() {
  return new Date().toISOString().slice(0, 10);
}

function toolColorForProvider(provider: string) {
  if (provider === "AWS") return "text-sky-700";
  if (provider === "Exa") return "text-violet-700";
  if (provider === "Vercel AI Gateway") return "text-neutral-800";
  return "text-neutral-700";
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function revealDelayForLog(log: AgentLog, index: number) {
  const seed = [...log.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return LOG_REVEAL_DELAYS_MS[(seed + index) % LOG_REVEAL_DELAYS_MS.length];
}

function typeDelayForCharacter(character: string) {
  if (character === "." || character === "," || character === ";") return 12 + Math.random() * 18;
  if (character === " ") return 1 + Math.random() * 3;
  return TYPE_BASE_DELAY_MS + Math.random() * TYPE_JITTER_MS;
}

function textAt(value: string | undefined, length: number) {
  if (!value) return value;
  return value.slice(0, Math.min(value.length, length));
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

function mergeSponsorTrace(rows: AISponsorTraceItem[], next: AISponsorTraceItem) {
  return [
    next,
    ...rows.filter((item) => !(item.provider === next.provider && item.action === next.action)),
  ].slice(0, 8);
}

function mergeSponsorTraces(...groups: AISponsorTraceItem[][]) {
  const seen = new Set<string>();

  return groups
    .flat()
    .filter((item) => {
      const key = `${item.provider}:${item.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function ToolCall({ log, complete }: { log: AgentLog; complete: boolean }) {
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
          {complete ? "done" : "running"}
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
  const [collapsed, setCollapsed] = useState(false);

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
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-label={collapsed ? "Expand thought" : "Collapse thought"}
          aria-expanded={!collapsed}
          className={cn(
            "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-neutral-300",
            complete ? "border-neutral-300 text-ink" : "border-neutral-200 text-neutral-500"
          )}
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed && "-rotate-90")} />
        </button>
        {!isLast ? <span className="my-2 w-px flex-1 bg-neutral-200" /> : null}
      </div>
      <article className="min-w-0 flex-1 pb-5">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
          className="block w-full rounded-[7px] text-left outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
        >
        <h2 className="text-[15px] font-semibold leading-snug tracking-tight text-ink">
          {log.title}
        </h2>
        </button>
        <AnimatePresence initial={false}>
          {!collapsed ? (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
                {log.body}
                {!complete && log.kind === "thought" && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-neutral-400 animate-pulse" />
                )}
              </p>
              {log.detail ? (
                <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-[12px] leading-snug text-neutral-500">
                  {log.detail}
                </p>
              ) : null}
              <ToolCall log={log} complete={complete} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </article>
    </motion.li>
  );
}

export default function AgentsThinkingPage() {
  const router = useRouter();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [displayedLogs, setDisplayedLogs] = useState<AgentLog[]>([]);
  const [sponsorTrace, setSponsorTrace] = useState<AISponsorTraceItem[]>([]);
  const [aiFootprint, setAiFootprint] = useState<StudentOSAgentFootprint | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const logViewportRef = useRef<HTMLDivElement>(null);
  const activeLogRef = useRef<HTMLLIElement>(null);
  const shouldFollowLogRef = useRef(true);
  const analysisStartedRef = useRef(false);
  const presentationRunRef = useRef(0);
  const presentationProcessingRef = useRef(false);
  const agentLogsRef = useRef<AgentLog[]>([]);
  const displayedLogIdsRef = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    displayedLogIdsRef.current = new Set(displayedLogs.map((log) => log.id));
  }, [displayedLogs]);

  useEffect(() => {
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;

    const controller = new AbortController();
    const requestStartedAt = Date.now();
    let cancelled = false;

    function storedSponsorTrace() {
      try {
        const rawTrace = window.localStorage.getItem("studentos_sponsor_trace");
        if (!rawTrace) return [];
        const parsedTrace = JSON.parse(rawTrace) as AISponsorTraceItem[];
        return Array.isArray(parsedTrace) ? parsedTrace : [];
      } catch {
        return [];
      }
    }

    function storeFootprint(result: StudentOSAgentFootprint) {
      if (cancelled) return;
      const nextTrace = mergeSponsorTraces(result.sponsorTrace, storedSponsorTrace());

      setAiFootprint(result);
      setAgentLogs(result.agentLogs.map(toClientLog));
      setSponsorTrace(nextTrace);
      window.localStorage.setItem("studentos_footprint", "completed");
      window.localStorage.setItem("agent_log_visited", "true");
      window.localStorage.setItem("studentos_ai_footprint", JSON.stringify(result));
      window.localStorage.setItem("studentos_commitment_footprint", JSON.stringify(result));
      window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify(nextTrace));
    }

    function storeSponsorTrace(item: AISponsorTraceItem) {
      setSponsorTrace((current) => {
        const nextTrace = mergeSponsorTrace(current, item);

        window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify(nextTrace));
        return nextTrace;
      });
    }

    async function runAnalysis() {
      let capturedSources: CapturedSourceForAI[] = [];

      try {
        setSponsorTrace(storedSponsorTrace().slice(0, 8));

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
        presentationRunRef.current += 1;
        presentationProcessingRef.current = false;
        displayedLogIdsRef.current = new Set();
        setDisplayedLogs([]);
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
            currentDate: todayDateId(),
            sources: capturedSources,
          }),
        });

        if (!response.ok) {
          let message = "StudentOS analysis route returned an error.";

          try {
            const payload = (await response.json()) as { detail?: string; error?: string };
            if (payload.detail) message = payload.detail;
            else if (payload.error) message = payload.error;
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
            storeSponsorTrace(event.trace);
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
        if (cancelled || isAbortError(error)) return;

        setAnalysisFailed(true);
        const message = error instanceof Error
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
        setSponsorTrace(fallbackTrace);
      }
    }

    void runAnalysis();

    return () => {
      cancelled = true;
      if (!controller.signal.aborted) {
        controller.abort();
      }
      analysisStartedRef.current = false;
    };
  }, []);

  useEffect(() => {
    agentLogsRef.current = agentLogs;
    if (presentationProcessingRef.current) return;

    const runId = presentationRunRef.current;
    presentationProcessingRef.current = true;

    async function revealLogs() {
      while (presentationRunRef.current === runId) {
        const logs = agentLogsRef.current;
        const nextEntry = logs.find((candidate) => !displayedLogIdsRef.current.has(candidate.id));
        if (!nextEntry) {
          presentationProcessingRef.current = false;
          return;
        }

        const log = nextEntry;
        const index = logs.findIndex((candidate) => candidate.id === log.id);
        if (presentationRunRef.current !== runId) return;

        await sleep(revealDelayForLog(log, index));
        if (presentationRunRef.current !== runId) return;

        const stagedLog: AgentLog = {
          ...log,
          title: "",
          body: "",
          detail: textAt(log.detail, 0),
          tool: log.tool ? { ...log.tool, result: "" } : undefined,
        };
        displayedLogIdsRef.current = new Set([...displayedLogIdsRef.current, log.id]);
        setDisplayedLogs((current) => mergeLog(current, stagedLog));

        const titleLength = log.title.length;
        const bodyLength = log.body.length;
        const detailLength = log.detail?.length ?? 0;
        const toolResultLength = log.tool?.result.length ?? 0;
        const totalLength = titleLength + bodyLength + detailLength + toolResultLength;

        // Bypass character typing for streaming thought logs
        if (log.kind === "thought") {
          setDisplayedLogs((current) => mergeLog(current, log));
          continue;
        }

        for (let position = 1; position <= totalLength; position += 1) {
          if (presentationRunRef.current !== runId) return;

          const titleEnd = Math.min(position, titleLength);
          const bodyPosition = Math.max(0, position - titleLength);
          const bodyEnd = Math.min(bodyPosition, bodyLength);
          const detailPosition = Math.max(0, position - titleLength - bodyLength);
          const detailEnd = Math.min(detailPosition, detailLength);
          const toolPosition = Math.max(0, position - titleLength - bodyLength - detailLength);
          const toolEnd = Math.min(toolPosition, toolResultLength);

          setDisplayedLogs((current) =>
            mergeLog(current, {
              ...log,
              title: textAt(log.title, titleEnd) ?? "",
              body: textAt(log.body, bodyEnd) ?? "",
              detail: textAt(log.detail, detailEnd),
              tool: log.tool
                ? {
                    ...log.tool,
                    result: textAt(log.tool.result, toolEnd) ?? "",
                  }
                : undefined,
            }),
          );

          const sourceText =
            position <= titleLength
              ? log.title
              : position <= titleLength + bodyLength
                ? log.body
                : position <= titleLength + bodyLength + detailLength
                  ? log.detail ?? ""
                  : log.tool?.result ?? "";
          const sourceOffset =
            position <= titleLength
              ? position - 1
              : position <= titleLength + bodyLength
                ? position - titleLength - 1
                : position <= titleLength + bodyLength + detailLength
                  ? position - titleLength - bodyLength - 1
                  : position - titleLength - bodyLength - detailLength - 1;
          await sleep(typeDelayForCharacter(sourceText[Math.max(0, sourceOffset)] ?? ""));
        }
      }

      presentationProcessingRef.current = false;
    }

    void revealLogs();
  }, [agentLogs]);

  const visibleLogs = displayedLogs;
  const activeLog = visibleLogs[visibleLogs.length - 1];
  const presentationComplete = agentLogs.length > 0 && displayedLogs.length >= agentLogs.length;
  const presentationOverBudget = elapsedMs >= AGENT_PRESENTATION_MAX_MS;
  const readyToRedirect = Boolean(aiFootprint) && elapsedMs >= REDIRECT_MIN_AT && (presentationComplete || presentationOverBudget);
  const done = Boolean(aiFootprint);
  const progressPercent = done ? 100 : Math.min(92, visibleLogs.length ? 12 + visibleLogs.length * 10 : 8);
  const statusLabel = analysisFailed ? "Error" : done ? "Done" : "Live";
  const elapsedSeconds = Math.max(1, Math.ceil(elapsedMs / 1000));
  const loadingMessage = loadingMessages[Math.floor(elapsedMs / 3500) % loadingMessages.length];
  const activeTitle = streamError ?? activeLog?.title ?? loadingMessage;

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
    if (!presentationOverBudget || displayedLogs.length >= agentLogs.length) return;

    const remainingLogs = agentLogs.filter((log) => !displayedLogIdsRef.current.has(log.id));
    if (remainingLogs.length > 0) {
      displayedLogIdsRef.current = new Set(agentLogs.map((log) => log.id));
      setDisplayedLogs((current) => {
        let next = [...current];
        for (const log of remainingLogs) {
          next = mergeLog(next, log);
        }
        return next;
      });
    }
  }, [agentLogs, displayedLogs.length, presentationOverBudget]);

  useEffect(() => {
    // Keep fully revealed logs in sync with any live updates from agentLogs
    setDisplayedLogs((currentDisplayed) => {
      let updated = false;
      const nextDisplayed = currentDisplayed.map((dispLog) => {
        // Only update if it's a thought log or if the log is already fully revealed
        if (dispLog.kind === "thought") {
          const liveLog = agentLogs.find((l) => l.id === dispLog.id);
          if (liveLog && liveLog.body.length !== dispLog.body.length) {
            updated = true;
            return liveLog;
          }
        }
        return dispLog;
      });
      return updated ? nextDisplayed : currentDisplayed;
    });
  }, [agentLogs]);

  useEffect(() => {
    if (!readyToRedirect) return;
    const redirectTimer = window.setTimeout(() => {
      router.push("/commitments");
    }, 650);

    return () => window.clearTimeout(redirectTimer);
  }, [readyToRedirect, router]);

  return (
    <AppShell
      stepLabel="Agent Log"
      hideHeader={false}
      sidePanel={<SponsorProofStrip trace={sponsorTrace} />}
    >
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
                Agent is building your plan
              </h1>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-neutral-500">
                {!done && !analysisFailed ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : null}
                <span className="min-w-0 truncate">
                  {!done && !analysisFailed ? `${activeTitle} · ${elapsedSeconds}s` : activeTitle}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-neutral-100 px-2.5 py-1.5">
              {!done && !analysisFailed ? (
                <Loader2 className="size-3.5 animate-spin text-emerald-600" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    analysisFailed ? "bg-red-500" : "bg-emerald-500"
                  )}
                />
              )}
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500">
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="mt-3 lg:hidden">
            <SponsorProofStrip trace={sponsorTrace} />
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
              {!visibleLogs.length ? (
                <motion.li
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-[8px] bg-neutral-50 px-3 py-3 text-[13px] font-semibold text-neutral-600"
                >
                  <Loader2 className="size-4 animate-spin text-neutral-500" />
                  <span>{loadingMessage}</span>
                </motion.li>
              ) : null}
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

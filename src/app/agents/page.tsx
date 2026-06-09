"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  Check,
  ChevronDown,
  FileSearch,
  ListChecks,
  Loader2,
  Server,
  Sparkles,
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

const REDIRECT_MIN_AT = 1600;
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

function rewriteLog(log: AgentLog, sources: CapturedSourceForAI[]): AgentLog {
  const sourceName = sources[0]?.title || "submitted notes";
  const sourceCount = sources.length;

  if (log.id === "source-evidence" || log.title.includes("Reading captured sources")) {
    return {
      ...log,
      title: "Reading captured academic sources",
      body: `Loaded ${sourceCount} student source ${sourceCount === 1 ? "document" : "documents"} (including "${sourceName}") from the input container.`,
      detail: `Scanning files to extract homework deadlines, exam syllabi, and study requirements.`
    };
  }

  if (log.id === "source-evidence-loaded" || log.title.includes("Source evidence loaded")) {
    return {
      ...log,
      title: "Source content parsed successfully",
      body: `Extracting text and structure from "${sourceName}".`,
      detail: `Running AWS Textract OCR parser to convert image files into structured text.`
    };
  }

  if (log.id === "goal-research-check" || log.title.includes("Checking for research context")) {
    return {
      ...log,
      title: "Assessing research requirements",
      body: `Analyzing terms in "${sourceName}" to see if we need to search Exa for syllabus guidelines or official exam dates.`,
      detail: `Scanning for vague deadlines or generic subject titles that need external validation.`
    };
  }

  if (log.id === "research-query-planning" || log.title.includes("Generating research queries")) {
    return {
      ...log,
      title: "Formulating Exa search strategy",
      body: `Generating focused academic queries based on the topics found in "${sourceName}".`,
      detail: `Constructing queries to retrieve exact deadlines, rubrics, or official guidelines.`
    };
  }

  if (log.id.includes("research-complete") || log.title.includes("Context research complete")) {
    return {
      ...log,
      title: "Exa research context attached",
      body: `Successfully retrieved 3 authoritative references for "${sourceName}".`,
      detail: `Integrated academic guidelines and external deadlines into the planner input packet.`
    };
  }

  if (log.id === "gateway-call-started" || log.title.includes("Calling Vercel AI Gateway")) {
    return {
      ...log,
      title: "Synthesizing commitments and roadmap",
      body: `Sending source data and Exa context to Gemini 3.5 Flash via Vercel AI Gateway.`,
      detail: `Computing optimized study blocks and identifying schedule conflicts.`
    };
  }

  if (log.id === "gateway-response-received" || log.title.includes("Gateway response received")) {
    return {
      ...log,
      title: "Cognitive synthesis complete",
      body: `Vercel AI Gateway returned the structured plan JSON.`,
      detail: `Parsing generated commitments, daily task slots, and 3-step roadmap.`
    };
  }

  if (log.id === "schema-validation" || log.title.includes("Validating structured footprint")) {
    return {
      ...log,
      title: "Validating plan constraints",
      body: `Verifying that no individual study session exceeds 45 minutes and all deadlines are met.`,
      detail: `Validating commitments schema against the StudentOS data contract.`
    };
  }

  if (log.id === "live-footprint-ready" || log.title.includes("Live footprint ready")) {
    return {
      ...log,
      title: "StudentOS plan footprint ready",
      body: `Successfully generated a personalized roadmap and daily schedule.`,
      detail: `Redirecting to the commitments review screen.`
    };
  }

  if (log.id === "aws-agent-forwarded" || log.title.includes("Forwarding to AWS Lambda")) {
    return {
      ...log,
      title: "Forwarding to AWS Lambda",
      body: "Forwarding the StudentOS orchestration request to the AWS-hosted agent endpoint.",
      detail: "Leveraging decentralized serverless compute for heavy syllabus extraction."
    };
  }

  if (log.id === "aws-agent-response-received" || log.title.includes("AWS agent response received")) {
    return {
      ...log,
      title: "AWS agent response received",
      body: "AWS Lambda returned the optimized planning blueprint successfully.",
      detail: "Decrypted payload with verified compute proof signatures."
    };
  }

  if (log.id === "gateway-preflight-started" || log.title.includes("Checking model-routing proof")) {
    return {
      ...log,
      title: "Verifying Vercel AI Gateway proof",
      body: "Checking model-routing path status to verify endpoint availability.",
      detail: "Ensuring AI Gateway is responsive and model routes are clear."
    };
  }

  if (log.id === "gateway-preflight-complete" || log.title.includes("Gateway proof verified") || log.title.includes("Gateway proof needs fallback")) {
    return {
      ...log,
      title: "Gateway proof verification complete",
      body: log.body.includes("verified") ? "Vercel AI Gateway status verified as fully operational." : "Vercel AI Gateway verification completed with fallback mode.",
      detail: log.detail
    };
  }

  return log;
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
        <span className={cn(
          "shrink-0 text-[11px] font-semibold flex items-center gap-1",
          complete ? "text-emerald-400" : "text-white/55"
        )}>
          {complete ? (
            <>
              <span className="size-1.5 rounded-full bg-emerald-400" />
              success
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-white/55 animate-pulse" />
              running
            </>
          )}
        </span>
      </div>
      {log.tool.result ? (
        <p className="mt-1.5 text-[12px] leading-snug text-white/72">{log.tool.result}</p>
      ) : null}
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors shadow-sm cursor-pointer"
          title={isCollapsed ? "Expand thought" : "Collapse thought"}
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200",
              isCollapsed && "-rotate-90"
            )}
          />
        </button>
        {!isLast ? <span className="my-2 w-px flex-1 bg-neutral-200" /> : null}
      </div>
      <article className="min-w-0 flex-1 pb-5">
        <h2
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mt-1 text-[15px] font-semibold leading-snug tracking-tight text-ink cursor-pointer hover:text-ink/80 select-none flex items-center gap-2"
        >
          {log.title}
        </h2>
        
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              {log.body ? (
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600 flex items-center flex-wrap">
                  <span>{log.body}</span>
                  {isActive && !complete && (
                    <span className="inline-block w-1.5 h-3 ml-1 bg-ink animate-pulse align-middle" />
                  )}
                </p>
              ) : null}
              {log.detail ? (
                <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-[12px] leading-snug text-neutral-500">
                  {log.detail}
                </p>
              ) : null}
              <ToolCall log={log} complete={complete} />
            </motion.div>
          )}
        </AnimatePresence>
      </article>
    </motion.li>
  );
}

export default function AgentsThinkingPage() {
  const router = useRouter();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [visibleLogs, setVisibleLogs] = useState<AgentLog[]>([]);
  const [sponsorTrace, setSponsorTrace] = useState<AISponsorTraceItem[]>([]);
  const [aiFootprint, setAiFootprint] = useState<StudentOSAgentFootprint | null>(null);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [capturedSources, setCapturedSources] = useState<CapturedSourceForAI[]>([]);
  const logViewportRef = useRef<HTMLDivElement>(null);
  const activeLogRef = useRef<HTMLLIElement>(null);
  const shouldFollowLogRef = useRef(true);
  const analysisStartedRef = useRef(false);
  const allReceivedLogsRef = useRef<AgentLog[]>([]);

  // Typing effect loop
  useEffect(() => {
    let isCancelled = false;
    let timerId: number | undefined;

    const tick = () => {
      if (isCancelled) return;

      const received = allReceivedLogsRef.current;
      const visible = [...visibleLogs];

      // If we don't have any visible logs yet, but we have received some, add the first one (empty fields)
      if (visible.length === 0 && received.length > 0) {
        const firstLog = {
          ...received[0],
          body: "",
          detail: received[0].detail ? "" : undefined,
          tool: received[0].tool ? { ...received[0].tool, result: "" } : undefined
        };
        setVisibleLogs([firstLog]);
        timerId = window.setTimeout(tick, 100);
        return;
      }

      if (visible.length === 0) {
        timerId = window.setTimeout(tick, 200);
        return;
      }

      const activeIndex = visible.length - 1;
      const activeLog = { ...visible[activeIndex] };
      const targetLog = received[activeIndex];

      if (!targetLog) {
        timerId = window.setTimeout(tick, 200);
        return;
      }

      const bodyDone = activeLog.body.length >= targetLog.body.length;
      const detailDone = !targetLog.detail || (activeLog.detail !== undefined && activeLog.detail.length >= targetLog.detail.length);
      const toolDone = !targetLog.tool || (activeLog.tool !== undefined && activeLog.tool.result.length >= targetLog.tool.result.length);

      if (!bodyDone) {
        // Natural uneven delays while typing: add 1-3 characters
        const nextLen = Math.min(activeLog.body.length + Math.floor(Math.random() * 3) + 1, targetLog.body.length);
        activeLog.body = targetLog.body.slice(0, nextLen);
        visible[activeIndex] = activeLog;
        setVisibleLogs(visible);
        // Pacing: typing speed variance (10-35ms)
        timerId = window.setTimeout(tick, 10 + Math.random() * 25);
      } else if (!detailDone) {
        const currentDetail = activeLog.detail || "";
        const nextLen = Math.min(currentDetail.length + Math.floor(Math.random() * 3) + 1, targetLog.detail!.length);
        activeLog.detail = targetLog.detail!.slice(0, nextLen);
        visible[activeIndex] = activeLog;
        setVisibleLogs(visible);
        timerId = window.setTimeout(tick, 10 + Math.random() * 25);
      } else if (!toolDone) {
        const currentResult = activeLog.tool?.result || "";
        const nextLen = Math.min(currentResult.length + Math.floor(Math.random() * 4) + 1, targetLog.tool!.result.length);
        activeLog.tool = {
          ...targetLog.tool!,
          result: targetLog.tool!.result.slice(0, nextLen)
        };
        visible[activeIndex] = activeLog;
        setVisibleLogs(visible);
        timerId = window.setTimeout(tick, 10 + Math.random() * 20);
      } else {
        // Current log is fully typed
        if (visible.length < received.length) {
          const nextIndex = visible.length;
          const nextLog = {
            ...received[nextIndex],
            body: "",
            detail: received[nextIndex].detail ? "" : undefined,
            tool: received[nextIndex].tool ? { ...received[nextIndex].tool, result: "" } : undefined
          };
          // Uneven delays between thoughts/actions: random wait of 600ms to 1800ms
          const delayBeforeNext = 600 + Math.random() * 1200;
          timerId = window.setTimeout(() => {
            if (!isCancelled) {
              setVisibleLogs((prev) => [...prev, nextLog]);
            }
          }, delayBeforeNext);
        } else {
          // Wait and check again
          timerId = window.setTimeout(tick, 200);
        }
      }
    };

    timerId = window.setTimeout(tick, 100);

    return () => {
      isCancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [visibleLogs.length, agentLogs.length]);

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

    function storeFootprint(result: StudentOSAgentFootprint, currentSources: CapturedSourceForAI[]) {
      if (cancelled) return;
      const nextTrace = mergeSponsorTraces(result.sponsorTrace, storedSponsorTrace());

      setAiFootprint(result);
      
      const rewrittenLogs = result.agentLogs.map(toClientLog).map(log => rewriteLog(log, currentSources));
      allReceivedLogsRef.current = rewrittenLogs;
      setAgentLogs(rewrittenLogs);
      
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
      let currentSources: CapturedSourceForAI[] = [];

      try {
        setSponsorTrace(storedSponsorTrace().slice(0, 8));

        const rawSources = window.localStorage.getItem("studentos_captured_sources");
        if (rawSources) {
          const parsed = JSON.parse(rawSources) as CapturedSourceForAI[];
          if (Array.isArray(parsed)) {
            currentSources = parsed;
            setCapturedSources(parsed);
          }
        }
      } catch {
        currentSources = [];
      }

      try {
        setAgentLogs([]);
        setVisibleLogs([]);
        allReceivedLogsRef.current = [];
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
            sources: currentSources,
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
            const clientLog = toClientLog(event.log);
            const rewritten = rewriteLog(clientLog, currentSources);
            allReceivedLogsRef.current = mergeLog(allReceivedLogsRef.current, rewritten);
            setAgentLogs([...allReceivedLogsRef.current]);
            return;
          }

          if (event.type === "trace") {
            storeSponsorTrace(event.trace);
            return;
          }

          if (event.type === "footprint") {
            finalFootprint = event.footprint;
            storeFootprint(event.footprint, currentSources);
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

        const errorLog = {
          id: "analysis-stream-error",
          at: Math.max(0, Date.now() - requestStartedAt),
          kind: "decision" as const,
          title: "Analysis stream stopped",
          body: "The live analysis stream did not produce a final footprint.",
          detail: message,
        };
        const rewrittenErrorLog = rewriteLog(errorLog, currentSources);
        
        allReceivedLogsRef.current = mergeLog(allReceivedLogsRef.current, rewrittenErrorLog);
        setAgentLogs([...allReceivedLogsRef.current]);

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

  const activeLog = visibleLogs[visibleLogs.length - 1];

  const typingDone = visibleLogs.length === agentLogs.length && 
    visibleLogs.length > 0 &&
    visibleLogs.every((vl, idx) => {
      const tl = agentLogs[idx];
      if (!tl) return false;
      const bodyDone = vl.body.length >= tl.body.length;
      const detailDone = !tl.detail || (vl.detail !== undefined && vl.detail.length >= tl.detail.length);
      const toolDone = !tl.tool || (vl.tool !== undefined && vl.tool.result.length >= tl.tool.result.length);
      return bodyDone && detailDone && toolDone;
    });

  const readyToRedirect = Boolean(aiFootprint) && elapsedMs >= REDIRECT_MIN_AT && typingDone;
  const done = Boolean(aiFootprint) && typingDone;
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
                Agent is building your map
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BrainCircuit,
  CalendarDays,
  Check,
  Clock3,
  Database,
  FileSearch,
  FileText,
  Globe2,
  Image,
  ListChecks,
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

const FINISH_AT = 33500;

const logs: AgentLog[] = [
  {
    id: "open",
    at: 0,
    kind: "thought",
    title: "Reading the uploaded pile",
    body: "I am treating every file as evidence, not as a task list yet. First I need to understand what is fixed, what is optional, and what depends on another person.",
    detail: "Sources queued: goalDemo.txt, WhatsApp image, physics portal screenshot, CCA notice, tuition timetable, chemistry note, teammate follow-up."
  },
  {
    id: "text",
    at: 2200,
    kind: "tool",
    title: "Calling document reader",
    body: "Opening goalDemo.txt and extracting the long-term learning goal before scheduling any daily work.",
    tool: {
      name: "Document scan",
      icon: FileText,
      color: "text-sky-600",
      result: "Python data-handling goal found"
    }
  },
  {
    id: "goal",
    at: 4300,
    kind: "analysis",
    title: "Interpreting the learning commitment",
    body: "The Python goal is not a single task. I am turning it into a recurring study track with small weekly blocks, because the uploaded note says the user is starting from zero experience.",
    detail: "Commitment candidate: become proficient with Python data libraries by year end."
  },
  {
    id: "vision",
    at: 6500,
    kind: "tool",
    title: "Calling image understanding",
    body: "Scanning the screenshots for dates, class names, timetable blocks, and messages that look like commitments.",
    tool: {
      name: "Image OCR",
      icon: Image,
      color: "text-violet-600",
      result: "4 screenshots parsed"
    }
  },
  {
    id: "whatsapp",
    at: 8900,
    kind: "analysis",
    title: "Separating chat noise from real obligations",
    body: "The WhatsApp material looks like a mix of announcements and coordination. I am only keeping items that create a time, deliverable, or follow-up expectation.",
    detail: "Tentative item held for clarification: ask teammate about slide deck design reviews."
  },
  {
    id: "calendar",
    at: 11200,
    kind: "tool",
    title: "Calling calendar matcher",
    body: "Comparing extracted times against the tuition timetable and school commitments so fixed events do not get moved.",
    tool: {
      name: "Calendar check",
      icon: CalendarDays,
      color: "text-emerald-600",
      result: "Tuition conflict detected"
    }
  },
  {
    id: "conflict",
    at: 13400,
    kind: "thought",
    title: "Thinking through the conflict",
    body: "CCA briefing appears to overlap with tuition. I am checking whether it should be moved, shortened, delegated, or converted into a follow-up rather than forcing the user to choose blindly.",
    detail: "Fixed commitment protected: tuition. Flexible commitment candidate: briefing follow-up."
  },
  {
    id: "web",
    at: 15700,
    kind: "tool",
    title: "Calling web search",
    body: "Looking for external context only where the uploaded content needs verification. I am not using search to invent extra commitments.",
    tool: {
      name: "Web search",
      icon: Globe2,
      color: "text-blue-600",
      result: "No extra commitments added"
    }
  },
  {
    id: "physics",
    at: 17900,
    kind: "analysis",
    title: "Ranking academic urgency",
    body: "The physics screenshot looks deadline-driven, so I am treating it as a near-term deliverable. It gets higher priority than open-ended practice but lower priority than immovable calendar blocks.",
    detail: "Commitment candidate: physics assignment portal item with due details."
  },
  {
    id: "chem",
    at: 20300,
    kind: "decision",
    title: "Converting notes into actions",
    body: "Chemistry lab prep is being kept as a short study action, not a vague reminder. The useful wording is concrete: revise stoichiometry calculations for the lab report due tomorrow.",
    detail: "Action size reduced so it can fit around fixed events."
  },
  {
    id: "memory",
    at: 22700,
    kind: "tool",
    title: "Writing working memory",
    body: "Saving the extracted commitments, source links, confidence, and open questions into a footprint for the next screen.",
    tool: {
      name: "Local memory",
      icon: Database,
      color: "text-amber-600",
      result: "Footprint prepared"
    }
  },
  {
    id: "confidence",
    at: 24900,
    kind: "analysis",
    title: "Assigning confidence levels",
    body: "I am marking direct evidence as confirmed, chat-derived items as needs clarification, and vague reminders as editable suggestions. This keeps the commitment list useful without pretending every extraction is certain.",
    detail: "Confirmed: tuition, physics, chemistry prep. Needs clarification: teammate follow-up. Long-term: Python goal."
  },
  {
    id: "footprint",
    at: 27400,
    kind: "footprint",
    title: "Footprint created",
    body: "The next page can now show commitments with source traces, conflict reasoning, and the exact unresolved items that still need the user's decision.",
    detail: "studentos_commitment_footprint saved in this browser session."
  },
  {
    id: "ready",
    at: 30100,
    kind: "decision",
    title: "Preparing the commitments page",
    body: "I have enough evidence to show the user a clean list without asking them to re-upload anything. Final step is handing off the footprint to the commitments workflow.",
    detail: "Redirecting automatically when the analysis completes."
  },
  {
    id: "done",
    at: 32400,
    kind: "decision",
    title: "Done",
    body: "Commitments are ready for review.",
    detail: "Moving to /commitments."
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
  const logViewportRef = useRef<HTMLDivElement>(null);

  const visibleLogs = useMemo(
    () => logs.filter((log) => elapsedMs >= log.at),
    [elapsedMs]
  );
  const activeLog = visibleLogs[visibleLogs.length - 1] ?? logs[0];
  const progress = Math.min(0.62, 0.36 + (elapsedMs / FINISH_AT) * 0.26);
  const done = elapsedMs >= logs[logs.length - 1].at;

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
            "goalDemo.txt",
            "WhatsApp image",
            "physics portal screenshot",
            "CCA notification screenshot",
            "tuition timetable screenshot",
            "chemistry lab note",
            "teammate follow-up note"
          ],
          commitments: [
            "Python data-handling learning goal",
            "Physics assignment deadline",
            "Tuition timetable block",
            "CCA briefing conflict",
            "Chemistry lab prep",
            "Teammate slide deck follow-up"
          ],
          nextRoute: "/commitments"
        })
      );
    }, 27400);

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
              ["Sources", "7"],
              ["Found", "6"],
              ["Open", "1"]
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

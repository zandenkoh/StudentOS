"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  School,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/buttons";
import { clearStudentOSDemoState } from "@/lib/demo-state";

const sourceChaos = [
  {
    icon: MessageSquare,
    label: "Class chat",
    text: "Bring chem file tmr. Also group check-in moved.",
    className: "left-4 top-[92px] rotate-[-4deg]"
  },
  {
    icon: Mail,
    label: "Email",
    text: "History essay rubric updated. Submit by 8pm.",
    className: "right-4 top-[146px] rotate-[5deg]"
  },
  {
    icon: Calendar,
    label: "Calendar",
    text: "CCA briefing overlaps tuition by 25 minutes.",
    className: "left-6 top-[205px] rotate-[2deg]"
  },
  {
    icon: FileText,
    label: "Worksheet",
    text: "Physics set has corrections due tomorrow.",
    className: "right-6 top-[266px] rotate-[-3deg]"
  }
];

const pressurePoints = [
  { label: "Due dates", value: "6", tone: "bg-[#FEE2E2] text-[#991B1B]" },
  { label: "Conflicts", value: "2", tone: "bg-[#FFEDD5] text-[#9A3412]" },
  { label: "Free hours", value: "1.5", tone: "bg-[#DBEAFE] text-[#1E3A8A]" }
];

const planBlocks = [
  { time: "4:10", title: "Physics corrections", note: "Before tuition, because it is due first." },
  { time: "5:30", title: "CCA briefing", note: "Leave early and send context to the group." },
  { time: "8:20", title: "History essay", note: "Use the updated rubric from email." }
];

const slowReveal = {
  initial: { opacity: 0, y: 46, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.38 },
  transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] }
} as const;

export default function Home() {
  const router = useRouter();
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    clearStudentOSDemoState();
  }, []);

  return (
    <AppShell hideHeader={true}>
      <motion.div
        initial={{ opacity: 1 }}
        animate={isFadingOut ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        onAnimationComplete={() => {
          if (isFadingOut) {
            router.push("/chaos");
          }
        }}
        className="flex min-h-dvh flex-col bg-[#FAF9F6] px-6 pb-12 pt-16"
      >
        {/* Brand Pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span>Student</span>
            <span className="flex size-[15px] items-center justify-center rounded-full bg-ink text-[8px] font-semibold text-white leading-none">
              OS
            </span>
            <span className="ml-0.5 text-neutral-300 font-normal">·</span>
            <span>Demo</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink mb-4 px-2">
            Turn school chaos into a plan you can actually follow.
          </h1>
          <p className="text-[17px] font-medium leading-relaxed text-neutral-500 px-3">
            School shouldn&apos;t feel like a project management nightmare. StudentOS automatically extracts commitments from your messy class chats, email threads, and syllabus files, resolving schedule conflicts to build a daily plan you can actually follow.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-8">
          <PrimaryButton
            onClick={() => {
              clearStudentOSDemoState();
              setIsFadingOut(true);
            }}
            className="relative justify-center px-6"
          >
            <span className="text-[15px] font-semibold">Start Demo</span>
            <ChevronRight className="absolute right-6 size-4" />
          </PrimaryButton>
        </div>

        {/* Trust Row */}
        <div className="mb-10 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Works seamlessly with
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-neutral-400">
            <MessageSquare className="size-5" />
            <Mail className="size-5" />
            <Calendar className="size-5" />
            <School className="size-5 animate-pulse" />
            <FileText className="size-5" />
          </div>
        </div>

        <section className="mt-14 space-y-20">
          <motion.div {...slowReveal} className="text-center">
            <h2 className="text-[25px] font-bold leading-tight tracking-tight text-ink">
              The problem is not that students are lazy.
            </h2>
            <p className="mt-4 text-[16px] font-medium leading-relaxed text-neutral-500">
              Your work is scattered across class group chats, PDF guidelines, email updates, and lecture slides. No student has the time to manually organize a dozen different platforms.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.42 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.24, delayChildren: 0.16 } }
            }}
            className="relative h-[380px] overflow-hidden rounded-[32px] border border-neutral-900/10 bg-[#111111] p-5 text-white shadow-[0_32px_90px_rgba(0,0,0,0.24)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(255,255,255,0.12),transparent_28%)]" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Input overload</p>
                <h3 className="mt-1 text-[18px] font-bold leading-tight">Every reminder lives somewhere else.</h3>
              </div>
            </div>
            {sourceChaos.map((source) => {
              const Icon = source.icon;
              return (
                <motion.div
                  key={source.label}
                  variants={{
                    hidden: { opacity: 0, y: 38, scale: 0.9, filter: "blur(6px)" },
                    show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                  }}
                  transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute z-10 w-[235px] rounded-[24px] border border-white/80 bg-white p-3.5 text-ink shadow-[0_16px_32px_rgba(0,0,0,0.24),_0_8px_16px_rgba(0,0,0,0.16)] ${source.className}`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    <Icon className="size-3.5" />
                    {source.label}
                  </div>
                  <p className="mt-2 text-[13px] font-semibold leading-5">{source.text}</p>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            {...slowReveal}
            className="rounded-[32px] border border-neutral-200/90 bg-white p-5 shadow-[0_28px_85px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-start gap-3">
              <div>
                <h3 className="text-[20px] font-bold leading-tight text-ink">The cost is invisible until the day breaks.</h3>
                <p className="mt-3 text-[15px] font-medium leading-relaxed text-neutral-500">
                  Traditional calendars store items, but they don&apos;t warn you when you&apos;ve committed the same hours to three different things. StudentOS automatically scans your day to surface hidden schedule conflicts.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {pressurePoints.map((point) => (
                <motion.div
                  key={point.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={`rounded-[20px] px-3 py-4 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] ${point.tone}`}
                >
                  <p className="text-[24px] font-black leading-none">{point.value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em]">{point.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-[26px] bg-[#F7F7F8] p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]">
              <div className="relative h-[176px]">
                {/* Timeline background track */}
                <div className="absolute left-0 right-0 top-[85px] h-1 rounded-full bg-neutral-200/80" />
                
                {/* Timeline active progress */}
                <motion.div
                  initial={{ width: "14%" }}
                  whileInView={{ width: "76%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, ease: "easeInOut" }}
                  className="absolute left-0 top-[85px] h-1 rounded-full bg-ink"
                />

                {/* Timeline indicator dots */}
                <motion.div
                  initial={{ left: "4%" }}
                  whileInView={{ left: "8%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-[87px] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-neutral-400 z-20"
                />
                <motion.div
                  initial={{ left: "18%" }}
                  whileInView={{ left: "58%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-[87px] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-red-500 z-20"
                />

                {/* Conflict card (CCA/tuition overlap) */}
                <motion.div
                  initial={{ left: "18%" }}
                  whileInView={{ left: "58%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-[102px] z-10 w-[130px] rounded-xl border border-red-200 bg-white p-2.5 shadow-[0_8px_30px_rgba(239,68,68,0.08)] -translate-x-4"
                >
                  <p className="text-[11px] font-bold text-red-600">Conflict</p>
                  <p className="mt-1 text-[12px] font-semibold leading-tight text-ink">CCA and tuition overlap.</p>
                  <div className="absolute bottom-[-11px] left-4 w-[1px] h-[11px] bg-red-200" />
                </motion.div>

                {/* Deadline card (Physics corrections due) */}
                <motion.div
                  initial={{ left: "4%" }}
                  whileInView={{ left: "8%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-[102px] z-10 w-[130px] rounded-xl border border-neutral-200 bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] -translate-x-4"
                >
                  <p className="text-[11px] font-bold text-neutral-400">Deadline</p>
                  <p className="mt-1 text-[12px] font-semibold leading-tight text-ink">Physics due tomorrow.</p>
                  <div className="absolute top-[-13px] left-4 w-[1px] h-[13px] bg-neutral-300" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          <motion.div
            {...slowReveal}
            className="rounded-[32px] border border-[#BBF7D0] bg-[#F0FDF4] p-5 shadow-[0_30px_90px_rgba(21,128,61,0.12)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]">What StudentOS does</p>
                <h3 className="mt-1 text-[21px] font-black leading-tight text-ink">
                  It turns scattered proof into a plan with reasons.
                </h3>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {planBlocks.map((block, index) => (
                <motion.div
                  key={block.title}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.16, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-3 rounded-[24px] border border-[#BBF7D0] bg-white p-4 shadow-[0_14px_38px_rgba(21,128,61,0.08)]"
                >
                  <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-[13px] font-black text-white">
                    {block.time}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold leading-5 text-ink">{block.title}</p>
                    <p className="mt-1 text-[12px] font-medium leading-5 text-muted">{block.note}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-[13px] font-bold text-ink shadow-soft">
              <Target className="size-4 text-[#15803D]" />
              <span>Less guessing. Fewer missed commitments. A day that can actually happen.</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 34 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[32px] bg-ink p-5 text-white shadow-[0_34px_90px_rgba(0,0,0,0.26)]"
          >
            <Zap className="size-6 text-white/70" />
            <h2 className="mt-3 text-[24px] font-black leading-tight">Try it with messy student inputs.</h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/75">
              Experience the full flow: parse unstructured student screenshots, extract actionable tasks, auto-detect schedule conflicts, and watch our agents generate a clean daily timeline.
            </p>
            <button
              onClick={() => {
                clearStudentOSDemoState();
                setIsFadingOut(true);
              }}
              className="mt-5 relative inline-flex h-[56px] w-full items-center justify-center rounded-full bg-white px-5 text-[15px] font-bold text-ink shadow-soft transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Start Demo</span>
              <ChevronRight className="absolute right-5 size-4" />
            </button>
          </motion.div>
        </section>
      </motion.div>
    </AppShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, CheckCircle2, Copy, RotateCcw, Share2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/buttons";
import { clearStudentOSDemoState } from "@/lib/demo-state";

type EndSummary = {
  focusTitle?: string;
  scheduledBlockCount?: number;
  conflictResolved?: boolean;
  roadmapAdded?: boolean;
  addedTaskApplied?: boolean;
};

const fallbackSummary: Required<EndSummary> = {
  focusTitle: "Finish Physics worksheet",
  scheduledBlockCount: 10,
  conflictResolved: true,
  roadmapAdded: true,
  addedTaskApplied: false,
};

const beforeRows = [
  "Scattered inputs",
  "Unclear conflict",
  "Loose goal",
];

const afterRows = [
  "Calendar blocks",
  "Fixed commitments protected",
  "Roadmap scheduled",
];

const shareUrl = "https://student-os-tawny.vercel.app";
const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(shareUrl)}`;

export default function EndPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Required<EndSummary>>(fallbackSummary);
  const [copyLabel, setCopyLabel] = useState("Copy link");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("studentos_end_summary");
      if (!stored) return;
      const parsed = JSON.parse(stored) as EndSummary;
      setSummary({
        focusTitle: parsed.focusTitle ?? fallbackSummary.focusTitle,
        scheduledBlockCount: parsed.scheduledBlockCount ?? fallbackSummary.scheduledBlockCount,
        conflictResolved: parsed.conflictResolved ?? fallbackSummary.conflictResolved,
        roadmapAdded: parsed.roadmapAdded ?? fallbackSummary.roadmapAdded,
        addedTaskApplied: parsed.addedTaskApplied ?? fallbackSummary.addedTaskApplied,
      });
    } catch {
      setSummary(fallbackSummary);
    }
  }, []);

  const proofStats = useMemo(
    () => [
      { label: "Calendar blocks", value: String(summary.scheduledBlockCount) },
      { label: "Conflict", value: summary.conflictResolved ? "Resolved" : "Checked" },
      { label: "Roadmap", value: summary.roadmapAdded ? "Scheduled" : "Ready" },
    ],
    [summary.conflictResolved, summary.roadmapAdded, summary.scheduledBlockCount],
  );

  function startOver() {
    clearStudentOSDemoState();
    router.replace("/");
  }

  async function writeShareUrlToClipboard() {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      } catch {
        // Fall back to the legacy selection path below.
      }
    }

    const input = document.createElement("textarea");
    input.value = shareUrl;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(input);
    return copied;
  }

  async function copyShareLink() {
    const copied = await writeShareUrlToClipboard();
    if (copied) {
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy link"), 1800);
      return;
    }

    setCopyLabel("Copy failed");
    window.setTimeout(() => setCopyLabel("Copy link"), 1800);
  }

  async function shareSite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "StudentOS",
          text: "Try StudentOS, a demo that turns school chaos into a realistic plan.",
          url: shareUrl,
        });
        return;
      } catch {
        return;
      }
    }

    await copyShareLink();
  }

  return (
    <AppShell hideHeader>
      <main className="relative min-h-dvh overflow-x-hidden bg-[#FAF9F6] px-5 py-7">
        <motion.div
          initial={{ y: "-15%", opacity: 0 }}
          animate={{ y: ["-15%", "115%"], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
          className="pointer-events-none absolute left-0 right-0 top-0 h-2.5 bg-gradient-to-r from-transparent via-ink/25 to-transparent blur-[1px]"
        />

        <div className="relative z-10 flex min-h-[calc(100dvh-56px)] flex-col">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="pt-4"
          >
            <div className="mb-4 flex size-[52px] items-center justify-center rounded-full bg-ink text-white shadow-lift">
              <CalendarCheck className="size-6" />
            </div>
            <h1 className="text-[31px] font-bold leading-[1.02] tracking-tight text-ink">
              Your school mess is now a plan.
            </h1>
            <p className="mt-3 text-[14px] font-medium leading-6 text-muted">
              StudentOS saved the calendar handoff, clarified the next action, and left the longer-term goal with scheduled momentum.
            </p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.14 }}
            className="mt-5 rounded-[26px] bg-ink p-5 text-white shadow-lift"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-emerald-300" />
                <span>Next up</span>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/72">
                Calendar saved
              </span>
            </div>
            <p className="text-[25px] font-semibold leading-tight">{summary.focusTitle}</p>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.24 }}
            className="mt-3 grid grid-cols-3 gap-2"
          >
            {proofStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 + index * 0.08 }}
                className="rounded-[18px] bg-white p-2.5 text-center shadow-[0_8px_24px_rgba(0,0,0,0.035)]"
              >
                <p className="text-[16px] font-bold text-ink">{stat.value}</p>
                <p className="mt-1 text-[9px] font-bold uppercase leading-3 text-neutral-400">{stat.label}</p>
              </motion.div>
            ))}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.34 }}
            className="mt-4 rounded-[28px] border border-neutral-200 bg-white p-4 shadow-[0_24px_70px_rgba(0,0,0,0.07)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">Share StudentOS</p>
                <h2 className="mt-1 text-[19px] font-bold leading-tight text-ink">Let someone scan or send them the link.</h2>
                <p className="mt-2 break-all text-[12px] font-semibold leading-5 text-muted">{shareUrl}</p>
              </div>
              <div className="shrink-0 rounded-[22px] border border-neutral-200 bg-[#FAFAFA] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeUrl}
                  alt="QR code for student-os-tawny.vercel.app"
                  className="size-[108px] rounded-[14px]"
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void shareSite()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-4 text-[13px] font-bold text-white shadow-[0_16px_36px_rgba(0,0,0,0.16)] transition hover:scale-[1.01] active:scale-[0.99]"
              >
                <Share2 className="size-4" />
                Share
              </button>
              <button
                type="button"
                onClick={() => void copyShareLink()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-[13px] font-bold text-ink shadow-[0_12px_30px_rgba(0,0,0,0.055)] transition hover:bg-neutral-50 active:scale-[0.99]"
              >
                <Copy className="size-4" />
                {copyLabel}
              </button>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.44 }}
            className="mt-3 rounded-[22px] border border-neutral-200 bg-white p-3"
          >
            <div className="grid grid-cols-[1fr_30px_1fr] items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.12em]">
              <p className="text-neutral-400">Before</p>
              <span />
              <p className="text-emerald-700">After</p>
            </div>
            <div className="mt-3 space-y-2">
              {beforeRows.map((before, index) => (
                <div
                  key={before}
                  className="grid grid-cols-[1fr_30px_1fr] items-center gap-2 rounded-[16px] bg-neutral-50 px-3 py-2"
                >
                  <p className="text-[13px] font-semibold leading-4 text-neutral-600">{before}</p>
                  <span className="flex size-7 items-center justify-center rounded-full bg-ink text-white">
                    <ArrowRight className="size-3.5" />
                  </span>
                  <p className="flex items-center gap-1.5 text-[13px] font-bold leading-4 text-emerald-950">
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                    {afterRows[index]}
                  </p>
                </div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.54 }}
            className="mt-4 rounded-[22px] border border-neutral-200 bg-white p-4 shadow-[0_16px_45px_rgba(0,0,0,0.045)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">What StudentOS actually did</p>
                <p className="mt-1 text-[13px] font-medium leading-5 text-muted">
                  It extracted commitments, separated fixed events from flexible work, resolved the schedule pressure, and converted the goal into dated future blocks.
                </p>
              </div>
            </div>
          </motion.section>

          <div className="mt-auto pt-6">
            <PrimaryButton onClick={startOver}>
              <RotateCcw className="size-4" />
              Start over
            </PrimaryButton>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

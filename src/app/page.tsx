"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, MessageSquare, Mail, Calendar, School, FileText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/buttons";
import { clearStudentOSDemoState } from "@/lib/demo-state";

export default function Home() {
  const router = useRouter();
  const [isFadingOut, setIsFadingOut] = useState(false);

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
          <p className="text-[14px] font-medium leading-relaxed text-muted px-3">
            Traditional planner apps assume you know when to do what. StudentOS figures that out for you.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-8">
          <PrimaryButton
            onClick={() => {
              clearStudentOSDemoState();
              setIsFadingOut(true);
            }}
            className="justify-between px-6"
          >
            <span className="text-[15px] font-semibold">Start Demo</span>
            <ChevronRight className="size-4" />
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

        {/* Preview Card */}
        <div className="rounded-[28px] border border-neutral-200/80 bg-white p-5 shadow-soft">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-4">
            Today’s brain dump
          </h3>
          <div className="space-y-3">
            {/* Commitment 1 */}
            <div className="flex items-center justify-between rounded-[20px] border border-neutral-100 bg-[#FAFAFA] p-4">
              <div>
                <h4 className="text-[14px] font-semibold text-ink">Physics worksheet due tomorrow</h4>
                <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Screenshot extracted</p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-xl bg-white text-neutral-400 border border-neutral-100 shadow-sm">
                <FileText className="size-4" />
              </div>
            </div>

            {/* Commitment 2 */}
            <div className="flex items-center justify-between rounded-[20px] border border-neutral-100 bg-[#FAFAFA] p-4">
              <div>
                <h4 className="text-[14px] font-semibold text-ink">CCA briefing clash</h4>
                <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Audio note transcribed</p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-xl bg-white text-neutral-400 border border-neutral-100 shadow-sm">
                <MessageSquare className="size-4" />
              </div>
            </div>

            {/* Commitment 3 */}
            <div className="flex items-center justify-between rounded-[20px] border border-neutral-100 bg-[#FAFAFA] p-4">
              <div>
                <h4 className="text-[14px] font-semibold text-ink">Coding goal: 5h/week</h4>
                <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Recurring habit detected</p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-xl bg-white text-neutral-400 border border-neutral-100 shadow-sm">
                <Calendar className="size-4" />
              </div>
            </div>
          </div>

          {/* Status Pill */}
          <div className="mt-5 flex justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white">
              <CheckCircle2 className="size-3.5" />
              <span>Clean plan ready</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}

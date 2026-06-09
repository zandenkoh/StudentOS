"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

const beforeItems = [
  "Screenshots",
  "PDF deadlines",
  "Chat conflict",
  "Loose goal"
];

const beforePositions = [
  "left-2 top-3 rotate-[-6deg]",
  "right-2 top-8 rotate-[5deg]",
  "left-8 bottom-14 rotate-[7deg]",
  "right-8 bottom-5 rotate-[-5deg]"
];

export function ExportSuccessSheet({
  open,
  onClose,
  includeAddedTask,
  includeRoadmap,
  onSaved,
  onViewFinalPlan,
  onStartOver,
  focusTitle,
  scheduledBlockCount,
  conflictResolved
}: {
  open: boolean;
  onClose: () => void;
  includeAddedTask?: boolean;
  includeRoadmap?: boolean;
  onSaved?: () => void;
  onViewFinalPlan?: () => void;
  onStartOver?: () => void;
  focusTitle?: string;
  scheduledBlockCount?: number;
  conflictResolved?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [stage, setStage] = useState<"preview" | "clumping" | "reveal">("preview");
  const previewItems = [
    "Current focus block",
    ...(includeAddedTask ? ["Added task block"] : []),
    "Conflict follow-up if needed",
    "Flexible work block",
    ...(includeRoadmap ? ["Roadmap tasks scheduled across future days"] : [])
  ];
  const afterStats = useMemo(
    () => [
      { label: "Blocks scheduled", value: String(scheduledBlockCount ?? previewItems.length) },
      { label: "Conflict", value: conflictResolved ? "Resolved" : "Checked" },
      { label: "Roadmap", value: includeRoadmap ? "Updated" : "Ready" }
    ],
    [conflictResolved, includeRoadmap, previewItems.length, scheduledBlockCount]
  );

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setStage("preview");
  }, [open]);

  useEffect(() => {
    if (!saved) return;

    setStage("clumping");
    const revealTimer = window.setTimeout(() => {
      setStage("reveal");
    }, 760);

    return () => window.clearTimeout(revealTimer);
  }, [saved]);

  const saveCalendar = () => {
    setSaved(true);
    onSaved?.();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={saved ? "Your day is locked in" : "Ready to save to calendar"}
      subtitle={
        saved
          ? "StudentOS turned the scattered inputs into calendar blocks, a clear next action, and a roadmap handoff."
          : "StudentOS will add the confirmed focus blocks, deadlines, and reminders into your calendar."
      }
    >
      <div className="space-y-4">
        <div className="relative min-h-[250px] overflow-hidden rounded-[24px] border border-neutral-200 bg-[#FAF9F6] p-4">
          <AnimatePresence mode="wait">
            {!saved ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <CalendarDays className="size-4" />
                  <span>Calendar preview</span>
                </div>
                <div className="space-y-2">
                  {previewItems.map((item, index) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-neutral-700 shadow-[0_8px_24px_rgba(0,0,0,0.035)]"
                    >
                      <span className="size-1.5 rounded-full bg-ink" />
                      {item}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : stage === "clumping" ? (
              <motion.div
                key="clumping"
                className="absolute inset-0 overflow-hidden"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  initial={{ y: "-12%", opacity: 0 }}
                  animate={{ y: ["-12%", "106%"], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.72, ease: "easeInOut" }}
                  className="absolute left-0 right-0 top-0 z-20 h-2.5 bg-gradient-to-r from-transparent via-ink/25 to-transparent blur-[1px]"
                />
                {beforeItems.map((item, index) => (
                  <motion.div
                    key={item}
                    className={`absolute z-10 rounded-[18px] border border-neutral-200/90 bg-white/95 px-3 py-2 text-xs font-bold text-ink shadow-soft ${beforePositions[index]}`}
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{ opacity: 0, scale: 0.22, x: index % 2 === 0 ? 120 : -120, y: index < 2 ? 86 : -86, rotate: 0 }}
                    transition={{ duration: 0.72, ease: "easeInOut", delay: index * 0.025 }}
                  >
                    {item}
                  </motion.div>
                ))}
                <motion.div
                  className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-white shadow-lift"
                  initial={{ scale: 0.75, opacity: 0 }}
                  animate={{ scale: [0.75, 1.08, 1], opacity: [0, 1, 1] }}
                  transition={{ duration: 0.52, ease: "easeOut", delay: 0.22 }}
                >
                  <Sparkles className="size-6" />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.96, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 140, damping: 18 }}
                className="space-y-4"
              >
                <div className="rounded-[22px] bg-ink p-4 text-white shadow-lift">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <CheckCircle2 className="size-4 text-emerald-300" />
                      <span>Final plan saved</span>
                    </div>
                    <span className="size-2 rounded-full bg-emerald-300" />
                  </div>
                  <p className="text-[21px] font-semibold leading-tight">
                    Next focus: {focusTitle ?? "Review current plan"}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {afterStats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      className="rounded-[18px] bg-white p-3 text-center shadow-[0_8px_24px_rgba(0,0,0,0.035)]"
                    >
                      <p className="text-[15px] font-bold text-ink">{stat.value}</p>
                      <p className="mt-1 text-[9px] font-bold uppercase leading-3 text-neutral-400">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[18px] border border-neutral-200 bg-white p-3">
                    <p className="text-[10px] font-bold uppercase text-neutral-400">Before</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-neutral-700">
                      Scattered sources, unclear order, and a calendar clash.
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-[10px] font-bold uppercase text-emerald-600">After</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-emerald-950">
                      Sequenced blocks, saved calendar, and next action ready.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!saved ? (
          <div className="rounded-[18px] border border-neutral-100 bg-neutral-50 p-3 text-xs font-semibold leading-5 text-neutral-500">
            Demo confirmation only. No Google Calendar event will be created.
          </div>
        ) : null}

        <div className={saved ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-3"}>
          {saved && stage === "reveal" ? (
            <>
              <PrimaryButton onClick={onViewFinalPlan ?? onClose}>
                <CheckCircle2 className="size-4" />
                View final plan
              </PrimaryButton>
              <SecondaryButton onClick={onStartOver ?? onClose} className="w-full">
                <RotateCcw className="size-4" />
                Start over
              </SecondaryButton>
            </>
          ) : saved ? (
            <PrimaryButton disabled className="col-span-2">
              Saving calendar...
            </PrimaryButton>
          ) : (
            <>
              <PrimaryButton onClick={saveCalendar}>
                Save demo calendar
              </PrimaryButton>
              <SecondaryButton onClick={onClose} className="w-full">
                Cancel
              </SecondaryButton>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

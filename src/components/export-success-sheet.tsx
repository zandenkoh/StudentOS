"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CalendarDays, CheckCircle2 } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";

export function ExportSuccessSheet({
  open,
  onClose,
  includeAddedTask,
  includeRoadmap,
  onSaved,
  onViewFinalPlan,
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
  const [stage, setStage] = useState<"preview" | "saving" | "success">("preview");
  const previewItems = useMemo(() => [
    "Current focus block",
    ...(includeAddedTask ? ["Added task block"] : []),
    "Conflict follow-up if needed",
    "Flexible work block",
    ...(includeRoadmap ? ["Roadmap tasks scheduled across future days"] : [])
  ], [includeAddedTask, includeRoadmap]);

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setStage("preview");
  }, [open]);

  useEffect(() => {
    if (!saved) return;

    setStage("saving");
    const successTimer = window.setTimeout(() => {
      setStage("success");
    }, 1500);

    return () => {
      window.clearTimeout(successTimer);
    };
  }, [saved]);

  useEffect(() => {
    if (stage !== "success") return;

    const redirectTimer = window.setTimeout(() => {
      onViewFinalPlan?.();
    }, 1200);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [stage, onViewFinalPlan]);

  const saveCalendar = () => {
    setSaved(true);
    onSaved?.();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={
        saved
          ? stage === "success"
            ? "Your day is locked in"
            : "Locking in your schedule..."
          : "Ready to save to calendar"
      }
      subtitle={
        saved
          ? stage === "success"
            ? "StudentOS turned the scattered inputs into calendar blocks and successfully updated your calendar."
            : "Adding the confirmed focus blocks, deadlines, and reminders to your calendar."
          : "StudentOS will add the confirmed focus blocks, deadlines, and reminders into your calendar."
      }
    >
      <div className="space-y-4">
        <div className="relative min-h-[330px] overflow-hidden rounded-[24px] border border-neutral-200 bg-[#FAF9F6] p-4">
          <AnimatePresence mode="wait">
            {stage !== "success" ? (
              <motion.div
                key="preview-saving"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex h-full flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <CalendarDays className="size-4" />
                    <span>{stage === "saving" ? "Saving blocks to calendar..." : "Calendar preview"}</span>
                  </div>
                  <div className="space-y-2">
                    {previewItems.map((item, index) => {
                      const isSaving = stage === "saving";
                      return (
                        <motion.div
                          key={item}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.06 }}
                          className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-700 shadow-[0_8px_24px_rgba(0,0,0,0.035)]"
                        >
                          {isSaving ? (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                delay: index * 0.15 + 0.1,
                                type: "spring",
                                stiffness: 220,
                                damping: 14,
                              }}
                              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                            >
                              <CheckCircle2 className="size-3.5" />
                            </motion.div>
                          ) : (
                            <span className="size-1.5 rounded-full bg-ink" />
                          )}
                          <span
                            className={`transition-all duration-305 ${
                              isSaving ? "text-neutral-400 line-through decoration-neutral-300" : "text-neutral-700"
                            }`}
                          >
                            {item}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {stage === "saving" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 space-y-3"
                  >
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200/60">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 1.4, ease: "easeInOut" }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <span>Syncing calendar...</span>
                      <span>100%</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-10 text-center h-full min-h-[300px]"
              >
                <motion.div
                  initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
                  className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm"
                >
                  <CalendarCheck className="size-10 animate-pulse" />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 text-xl font-bold text-ink"
                >
                  Locked in!
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="mt-2 max-w-[280px] text-sm font-semibold leading-relaxed text-neutral-500"
                >
                  Your calendar blocks are saved. Redirecting to your dashboard...
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!saved ? (
          <div className="rounded-[18px] border border-neutral-100 bg-neutral-50 p-3 text-xs font-semibold leading-5 text-neutral-500">
            Demo confirmation only. No Google Calendar event will be created.
          </div>
        ) : null}

        <div className="w-full">
          {saved ? (
            <PrimaryButton disabled className="w-full">
              {stage === "saving" ? "Saving to calendar..." : "Saved!"}
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={saveCalendar} className="w-full">
              Save demo calendar
            </PrimaryButton>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}

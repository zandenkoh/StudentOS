"use client";

import { ArrowLeft, ArrowRight, CalendarDays, Scissors } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";
import type { DemoPlanTask } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function currentScheduleLabel(task: DemoPlanTask) {
  return task.scheduledDateRange ?? task.scheduledDate ?? task.timeLabel ?? "Not scheduled";
}

function scheduleRationale(task: DemoPlanTask) {
  return task.scheduleRationale ?? task.reason ?? "StudentOS placed this task where it best fits the current deadlines, fixed events, and available energy.";
}

function dateIdFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromDateId(dateId: string) {
  const [year, month, day] = dateId.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function addDaysToDateId(dateId: string, days: number) {
  const date = dateFromDateId(dateId);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return dateIdFromDate(date);
}

export function TaskEditBottomSheet({
  task,
  canScheduleEarlier,
  canScheduleLater,
  onClose,
  onScheduleEarlier,
  onScheduleLater,
  onDateChange,
  onSplit
}: {
  task: DemoPlanTask | null;
  canScheduleEarlier: boolean;
  canScheduleLater: boolean;
  onClose: () => void;
  onScheduleEarlier: () => void;
  onScheduleLater: () => void;
  onDateChange: (dateId: string) => void;
  onSplit: () => void;
}) {
  const futureTask = task?.section === "subsequent_days";
  const deadlineDateId = task?.deadlineDateId;
  const tomorrowDateId = addDaysToDateId(dateIdFromDate(new Date()), 1);
  const lastValidDateId = deadlineDateId ? addDaysToDateId(deadlineDateId, -1) : undefined;

  return (
    <BottomSheet
      open={task !== null}
      onClose={onClose}
      title={futureTask ? "Edit schedule" : "Edit task"}
      subtitle={task ? task.title : undefined}
    >
      {task ? (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Current plan
            </p>
            <h3 className="mt-2 text-[17px] font-semibold leading-snug text-ink">
              {task.title}
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-neutral-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                  Scheduled
                </p>
                <p className="mt-1 text-[12px] font-semibold text-ink">
                  {currentScheduleLabel(task)}
                </p>
              </div>
              <div className="rounded-2xl bg-neutral-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                  Deadline
                </p>
                <p className="mt-1 text-[12px] font-semibold text-ink">
                  {task.deadline ?? "None"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border border-neutral-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Rationale for Schedule
            </p>
            <p className="mt-2 text-[14px] font-semibold leading-6 text-neutral-700">
              {scheduleRationale(task)}
            </p>
          </div>

          {futureTask ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <SecondaryButton
                  disabled={!canScheduleEarlier}
                  aria-disabled={!canScheduleEarlier}
                  onClick={onScheduleEarlier}
                  className={cn(
                    "w-full",
                    !canScheduleEarlier &&
                      "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-400 shadow-none hover:bg-neutral-50"
                  )}
                >
                  <ArrowLeft className="size-4" />
                  Schedule earlier
                </SecondaryButton>
                <SecondaryButton
                  disabled={!canScheduleLater}
                  aria-disabled={!canScheduleLater}
                  onClick={onScheduleLater}
                  className={cn(
                    "w-full",
                    !canScheduleLater &&
                      "cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-400 shadow-none hover:bg-neutral-50"
                  )}
                >
                  <ArrowRight className="size-4" />
                  Schedule later
                </SecondaryButton>
              </div>

              <label className="block">
                <span className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <CalendarDays className="size-4" />
                  Specific date
                </span>
                <input
                  type="date"
                  value={task.scheduledDateId ?? ""}
                  onChange={(event) => onDateChange(event.target.value)}
                  min={tomorrowDateId}
                  max={lastValidDateId}
                  className="h-12 w-full rounded-[18px] border border-neutral-200 bg-white px-4 text-[15px] font-semibold text-ink focus:border-neutral-400 focus:ring-0"
                />
              </label>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onSplit}
            className="flex min-h-14 w-full items-center justify-between rounded-[18px] border border-neutral-200 bg-white px-4 py-3 text-left text-[15px] font-semibold text-ink transition hover:bg-neutral-50"
          >
            <span className="flex items-center gap-2">
              <Scissors className="size-4" />
              Split into two sessions
            </span>
          </button>

          <PrimaryButton onClick={onClose}>Done</PrimaryButton>
        </div>
      ) : null}
    </BottomSheet>
  );
}

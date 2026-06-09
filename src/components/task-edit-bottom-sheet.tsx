"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Scissors } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { PrimaryButton, SecondaryButton } from "@/components/buttons";
import { scheduleRationaleForTask } from "@/app/commitments/commitment-helpers";
import type { DemoPlanTask } from "@/lib/demo-data";
import { scheduleLabelWithTimeRange } from "@/lib/time-scheduling";
import { cn } from "@/lib/utils";

function currentScheduleLabel(task: DemoPlanTask) {
  return scheduleLabelWithTimeRange(task) ?? "Not scheduled";
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

function formatLongDate(dateId: string) {
  const date = dateFromDateId(dateId);
  if (!date) return dateId;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function calendarDaysForMonth(monthDate: Date) {
  const firstDay = startOfMonth(monthDate);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstVisibleDay = new Date(firstDay);
  firstVisibleDay.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);
    return date;
  });
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
  const selectedDateId = task?.scheduledDateId ?? "";
  const initialCalendarDateId = selectedDateId || tomorrowDateId;
  const initialCalendarDate = dateFromDateId(initialCalendarDateId) ?? new Date();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(initialCalendarDate));
  const calendarDates = useMemo(() => calendarDaysForMonth(visibleMonth), [visibleMonth]);
  const previousMonthEndId = dateIdFromDate(endOfMonth(addMonths(visibleMonth, -1)));
  const nextMonthId = dateIdFromDate(addMonths(visibleMonth, 1));
  const canShowPreviousMonth = previousMonthEndId >= tomorrowDateId;
  const canShowNextMonth = !lastValidDateId || nextMonthId <= lastValidDateId;

  useEffect(() => {
    if (!futureTask) {
      setCalendarOpen(false);
      return;
    }
    setVisibleMonth(startOfMonth(dateFromDateId(initialCalendarDateId) ?? new Date()));
    setCalendarOpen(false);
  }, [futureTask, initialCalendarDateId, task?.id]);

  function chooseDate(dateId: string) {
    if (dateId < tomorrowDateId) return;
    if (lastValidDateId && dateId > lastValidDateId) return;
    onDateChange(dateId);
    setCalendarOpen(false);
  }

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
              {scheduleRationaleForTask(task)}
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

              <div>
                <span className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <CalendarDays className="size-4" />
                  Specific date
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((open) => !open)}
                    className="flex h-12 w-full items-center justify-between rounded-[18px] border border-neutral-200 bg-white px-4 text-left text-[15px] font-semibold text-ink transition hover:bg-neutral-50"
                    aria-expanded={calendarOpen}
                  >
                    <span>
                      {selectedDateId ? formatLongDate(selectedDateId) : "Choose any valid future date"}
                    </span>
                    <CalendarDays className="size-4 text-neutral-400" />
                  </button>

                  {calendarOpen ? (
                    <div className="mt-2 rounded-[22px] border border-neutral-200 bg-white p-3 shadow-[0_18px_45px_rgba(0,0,0,0.12)]">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={!canShowPreviousMonth}
                          onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full border border-neutral-200 text-ink transition hover:bg-neutral-50",
                            !canShowPreviousMonth &&
                              "cursor-not-allowed border-neutral-100 text-neutral-300 hover:bg-white"
                          )}
                          aria-label="Previous month"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <p className="text-sm font-bold text-ink">{formatMonthLabel(visibleMonth)}</p>
                        <button
                          type="button"
                          disabled={!canShowNextMonth}
                          onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full border border-neutral-200 text-ink transition hover:bg-neutral-50",
                            !canShowNextMonth &&
                              "cursor-not-allowed border-neutral-100 text-neutral-300 hover:bg-white"
                          )}
                          aria-label="Next month"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-neutral-400">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-1">
                        {calendarDates.map((date) => {
                          const dateId = dateIdFromDate(date);
                          const inVisibleMonth = date.getMonth() === visibleMonth.getMonth();
                          const selected = dateId === selectedDateId;
                          const disabled =
                            dateId < tomorrowDateId ||
                            Boolean(lastValidDateId && dateId > lastValidDateId);

                          return (
                            <button
                              key={dateId}
                              type="button"
                              disabled={disabled}
                              onClick={() => chooseDate(dateId)}
                              className={cn(
                                "flex aspect-square items-center justify-center rounded-full text-sm font-semibold transition",
                                inVisibleMonth ? "text-ink" : "text-neutral-300",
                                selected && "bg-ink text-white",
                                !selected && !disabled && "hover:bg-neutral-100",
                                disabled && "cursor-not-allowed text-neutral-200 hover:bg-white"
                              )}
                              aria-label={formatLongDate(dateId)}
                              aria-pressed={selected}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-5 text-neutral-500">
                        Pick any date after today{task.deadline ? ` and before ${task.deadline}` : ""}.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
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

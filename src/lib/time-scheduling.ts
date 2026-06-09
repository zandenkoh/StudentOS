import { intervalsOverlap, parseTimeInterval, type TimeInterval } from "@/lib/schedule-conflicts";

type ClockWindowTask = {
  id?: string;
  title: string;
  section?: "do_now" | "do_next" | "subsequent_days";
  estimatedMinutes?: number;
  timeLabel?: string;
  scheduledDate?: string;
  scheduledDateId?: string;
  scheduledDateRange?: string;
  goalId?: string;
  isRoadmapTask?: boolean;
};

export type BusyTimeBlock = {
  label: string;
  dateKey?: string;
};

const DEFAULT_BLOCK_MINUTES = 30;
const CLOCK_RANGE_PATTERN =
  /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/i;
const SINGLE_CLOCK_PATTERN = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i;

const FUTURE_GOAL_WINDOWS = [
  "4:30 PM",
  "5:15 PM",
  "6:00 PM",
  "7:30 PM",
  "8:15 PM",
  "9:00 PM",
];

const SAME_DAY_WINDOWS: Record<string, string[]> = {
  do_now: ["3:30 PM", "4:10 PM", "4:45 PM"],
  do_next: ["6:40 PM", "7:45 PM", "8:35 PM", "9:20 PM", "10:05 PM"],
  subsequent_days: FUTURE_GOAL_WINDOWS,
};

function cleanMeridiem(value: string) {
  return value.replace(/\./g, "").toUpperCase();
}

function minutesFromClock(hourText: string, minuteText: string | undefined, meridiemText: string) {
  const meridiem = cleanMeridiem(meridiemText);
  const hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const hour24 = meridiem === "PM" && hour !== 12 ? hour + 12 : meridiem === "AM" && hour === 12 ? 0 : hour;
  return hour24 * 60 + minute;
}

function formatClock(totalMinutes: number) {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function rangeFromStart(startLabel: string, estimatedMinutes?: number) {
  const match = startLabel.match(SINGLE_CLOCK_PATTERN);
  if (!match) return null;

  const startMinutes = minutesFromClock(match[1], match[2], match[3]);
  if (startMinutes === null) return null;

  const duration = Math.max(1, estimatedMinutes ?? DEFAULT_BLOCK_MINUTES);
  const start = formatClock(startMinutes);
  const end = formatClock(startMinutes + duration);
  const startWithoutMeridiem = start.endsWith(end.slice(-2)) ? start.replace(/\s[AP]M$/, "") : start;

  return `${startWithoutMeridiem}-${end}`;
}

function rangeFromStartMinutes(startMinutes: number, estimatedMinutes?: number) {
  const duration = Math.max(1, estimatedMinutes ?? DEFAULT_BLOCK_MINUTES);
  const start = formatClock(startMinutes);
  const end = formatClock(startMinutes + duration);
  const startWithoutMeridiem = start.endsWith(end.slice(-2)) ? start.replace(/\s[AP]M$/, "") : start;

  return `${startWithoutMeridiem}-${end}`;
}

function intervalFromStartMinutes(startMinutes: number, estimatedMinutes?: number): TimeInterval {
  return {
    startMinutes,
    endMinutes: startMinutes + Math.max(1, estimatedMinutes ?? DEFAULT_BLOCK_MINUTES),
  };
}

function normalizedDateKey(value?: string) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") || "";
}

function dateKeyForTask(task: ClockWindowTask) {
  const explicitKey = normalizedDateKey(task.scheduledDateId ?? task.scheduledDate ?? task.scheduledDateRange);
  if (explicitKey) return explicitKey;
  return task.section === "subsequent_days" ? "future" : "today";
}

function intervalsConflictOnDate(
  first: { interval: TimeInterval; dateKey: string },
  second: { interval: TimeInterval; dateKey: string },
) {
  return first.dateKey === second.dateKey && intervalsOverlap(first.interval, second.interval);
}

function hasBusyOverlap(
  interval: TimeInterval,
  dateKey: string,
  busyIntervals: { interval: TimeInterval; dateKey: string }[],
) {
  return busyIntervals.some((busy) => intervalsConflictOnDate({ interval, dateKey }, busy));
}

function busyIntervalsFromBlocks(blocks: BusyTimeBlock[]) {
  return blocks
    .map((block) => {
      const interval = parseTimeInterval(block.label);
      if (!interval) return null;

      return {
        interval,
        dateKey: normalizedDateKey(block.dateKey) || "today",
      };
    })
    .filter((block): block is { interval: TimeInterval; dateKey: string } => Boolean(block));
}

export function hasClockRange(label?: string) {
  return Boolean(label && CLOCK_RANGE_PATTERN.test(label));
}

export function timeRangeFromLabel(label?: string, estimatedMinutes?: number) {
  if (!label) return null;
  if (hasClockRange(label)) return label;
  return rangeFromStart(label, estimatedMinutes);
}

export function defaultTimeRangeForTask(task: ClockWindowTask, index = 0) {
  const starts = task.section === "subsequent_days"
    ? FUTURE_GOAL_WINDOWS
    : SAME_DAY_WINDOWS[task.section ?? "do_next"] ?? SAME_DAY_WINDOWS.do_next;
  const start = starts[index % starts.length];

  return rangeFromStart(start, task.estimatedMinutes) ?? start;
}

export function ensureTaskTimeRange<T extends ClockWindowTask>(task: T, index = 0): T {
  const existingRange = timeRangeFromLabel(task.timeLabel, task.estimatedMinutes);

  if (existingRange) {
    return {
      ...task,
      timeLabel: existingRange,
    };
  }

  return {
    ...task,
    timeLabel: defaultTimeRangeForTask(task, index),
  };
}

export function ensureTaskTimeRanges<T extends ClockWindowTask>(tasks: T[], busyBlocks: BusyTimeBlock[] = []) {
  const reservedIntervals = busyIntervalsFromBlocks(busyBlocks);

  return tasks.map((task, index) => {
    const rangedTask = ensureTaskTimeRange(task, index);
    const dateKey = dateKeyForTask(rangedTask);
    const existingInterval = parseTimeInterval(rangedTask.timeLabel);

    if (existingInterval && !hasBusyOverlap(existingInterval, dateKey, reservedIntervals)) {
      reservedIntervals.push({ interval: existingInterval, dateKey });
      return rangedTask;
    }

    const defaultInterval = parseTimeInterval(defaultTimeRangeForTask(rangedTask, index));
    const preferredStart = defaultInterval?.startMinutes ?? 15 * 60;
    const duration = Math.max(1, rangedTask.estimatedMinutes ?? DEFAULT_BLOCK_MINUTES);
    const searchStarts = [
      ...Array.from({ length: Math.max(0, Math.floor((23 * 60 - preferredStart - duration) / 15) + 1) }, (_, slot) =>
        preferredStart + slot * 15,
      ),
      ...Array.from({ length: Math.max(0, Math.floor((preferredStart - 6 * 60) / 15)) }, (_, slot) => 6 * 60 + slot * 15),
    ];
    const availableStart = searchStarts.find((startMinutes) =>
      !hasBusyOverlap(intervalFromStartMinutes(startMinutes, duration), dateKey, reservedIntervals),
    );

    if (availableStart === undefined) {
      if (existingInterval) reservedIntervals.push({ interval: existingInterval, dateKey });
      return rangedTask;
    }

    const nextTask = {
      ...rangedTask,
      timeLabel: rangeFromStartMinutes(availableStart, duration),
    };
    reservedIntervals.push({
      interval: intervalFromStartMinutes(availableStart, duration),
      dateKey,
    });

    return nextTask;
  });
}

export function scheduleLabelWithTimeRange(task: ClockWindowTask) {
  const dateLabel = task.scheduledDate ?? task.scheduledDateRange;
  const timeLabel = timeRangeFromLabel(task.timeLabel, task.estimatedMinutes) ?? task.timeLabel;

  if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`;
  return timeLabel ?? dateLabel ?? null;
}

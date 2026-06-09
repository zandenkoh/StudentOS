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

export function ensureTaskTimeRanges<T extends ClockWindowTask>(tasks: T[]) {
  return tasks.map((task, index) => ensureTaskTimeRange(task, index));
}

export function scheduleLabelWithTimeRange(task: ClockWindowTask) {
  const dateLabel = task.scheduledDate ?? task.scheduledDateRange;
  const timeLabel = timeRangeFromLabel(task.timeLabel, task.estimatedMinutes) ?? task.timeLabel;

  if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`;
  return timeLabel ?? dateLabel ?? null;
}

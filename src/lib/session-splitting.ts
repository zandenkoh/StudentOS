import { defaultTimeRangeForTask, ensureTaskTimeRange } from "@/lib/time-scheduling";

export const MAX_STUDY_SESSION_MINUTES = 180;

type SplittableStudyTask = {
  id?: string;
  title: string;
  estimatedMinutes?: number;
  timeLabel?: string;
  scheduledDate?: string;
  scheduledDateId?: string;
  scheduledDateRange?: string;
  reason?: string;
  scheduleRationale?: string;
  isRoadmapTask?: boolean;
};

function shouldSplitTask(task: SplittableStudyTask) {
  return Boolean(task.estimatedMinutes && task.estimatedMinutes > MAX_STUDY_SESSION_MINUTES);
}

function sessionTitle(title: string, sessionNumber: number) {
  const normalizedTitle = title.replace(/\s+[-—]\s+Session\s+\d+$/i, "").trim();
  return `${normalizedTitle} — Session ${sessionNumber}`;
}

export function splitLongStudyTask<T extends SplittableStudyTask>(task: T): T[] {
  if (!shouldSplitTask(task) || !task.estimatedMinutes) return [ensureTaskTimeRange(task)];

  const sessionCount = Math.ceil(task.estimatedMinutes / MAX_STUDY_SESSION_MINUTES);
  const baseMinutes = Math.floor(task.estimatedMinutes / sessionCount);
  let remainingMinutes = task.estimatedMinutes;

  return Array.from({ length: sessionCount }, (_, index) => {
    const sessionNumber = index + 1;
    const sessionsLeft = sessionCount - index;
    const estimatedMinutes = Math.min(
      MAX_STUDY_SESSION_MINUTES,
      Math.ceil(remainingMinutes / sessionsLeft),
    );
    remainingMinutes -= estimatedMinutes;

    const sessionTask = {
      ...task,
      id: `${task.id || task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-session-${sessionNumber}`,
      title: sessionTitle(task.title, sessionNumber),
      estimatedMinutes: Math.max(estimatedMinutes, baseMinutes),
      scheduledDate: sessionNumber === 1 ? task.scheduledDate : undefined,
      scheduledDateId: sessionNumber === 1 ? task.scheduledDateId : undefined,
      scheduledDateRange:
        sessionNumber === 1
          ? task.scheduledDateRange
          : task.scheduledDateRange || "Not back-to-back",
      reason:
        sessionNumber === 1
          ? task.reason
          : task.reason || "Continues the goal step without creating an oversized study block.",
      scheduleRationale:
        sessionNumber === 1
          ? task.scheduleRationale
          : "Scheduled as a separate non-consecutive session so no study block exceeds 180 minutes.",
    };

    return ensureTaskTimeRange({
      ...sessionTask,
      timeLabel: sessionNumber === 1 ? task.timeLabel : defaultTimeRangeForTask(sessionTask, index + 1),
    } as T, index);
  });
}

export function splitLongStudyTasks<T extends SplittableStudyTask>(tasks: T[]) {
  return tasks.flatMap(splitLongStudyTask);
}

import type { Commitment, DemoPlanTask, PlanTaskSection, TimelineEvent } from "@/lib/demo-data";
import type { AIClarificationQuestion } from "@/lib/studentos-ai-types";
import { ensureTaskTimeRange, ensureTaskTimeRanges, scheduleLabelWithTimeRange } from "@/lib/time-scheduling";

export type AddedCommitmentInterpretation = {
  commitment: Commitment;
  task: DemoPlanTask;
  impactItems: string[];
  clarificationQuestion?: AIClarificationQuestion;
};

export type PlanDisplaySection = {
  title: string;
  section: PlanTaskSection;
  items: DemoPlanTask[];
};

const monthOrder: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function dateIdFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateId() {
  return dateIdFromDate(new Date());
}

export function dateFromDateId(dateId: string) {
  const [year, month, day] = dateId.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function addDaysToDateId(dateId: string, days: number) {
  const date = dateFromDateId(dateId);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return dateIdFromDate(date);
}

export function formatScheduleDateLabel(dateId: string) {
  const date = dateFromDateId(dateId);
  if (!date) return dateId;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(date);
}

export function validRescheduleBounds(task: DemoPlanTask | null) {
  if (!task || task.section !== "subsequent_days") return null;
  const min = addDaysToDateId(todayDateId(), 1);
  const max = task.deadlineDateId ? addDaysToDateId(task.deadlineDateId, -1) : undefined;
  return { min, max };
}

export function canUseScheduleDate(task: DemoPlanTask | null, dateId: string) {
  const bounds = validRescheduleBounds(task);
  if (!bounds || !dateId) return false;
  if (dateId < bounds.min) return false;
  if (bounds.max && dateId > bounds.max) return false;
  return true;
}

export function canMoveTaskDate(task: DemoPlanTask | null, direction: -1 | 1) {
  if (!task?.scheduledDateId) return false;
  return canUseScheduleDate(task, addDaysToDateId(task.scheduledDateId, direction));
}

export function nextDayForTask(task: DemoPlanTask) {
  const dateId = task.scheduledDateId ?? todayDateId();
  return addDaysToDateId(dateId, 1);
}

export function baseTaskTitle(title: string) {
  return title.replace(/\s+[—-]\s+Session \d+$/, "");
}

export function scheduleLabelForTask(task: DemoPlanTask) {
  return scheduleLabelWithTimeRange(task) ?? "the selected slot";
}

function dateSortValue(task: DemoPlanTask) {
  if (task.scheduledDateId) {
    const timestamp = Date.parse(`${task.scheduledDateId}T00:00:00`);
    if (Number.isFinite(timestamp)) return timestamp;
  }

  const label = task.scheduledDate ?? task.scheduledDateRange;
  if (!label) return Number.POSITIVE_INFINITY;

  const normalized = label.toLowerCase();
  const monthMatch = normalized.match(
    /january|february|march|april|may|june|july|august|september|october|november|december/,
  );
  if (!monthMatch) return Number.POSITIVE_INFINITY;

  const dayMatch = normalized.match(/\b\d{1,2}\b/);
  const month = monthOrder[monthMatch[0]];
  const day = dayMatch ? Number(dayMatch[0]) : 1;
  return Date.UTC(new Date().getFullYear(), month - 1, day);
}

export function sortSubsequentDayTasks(tasks: DemoPlanTask[]) {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const byDate = dateSortValue(a.task) - dateSortValue(b.task);
      return byDate || a.index - b.index;
    })
    .map(({ task }) => task);
}

function defaultScheduleRationale(task: DemoPlanTask) {
  const title = baseTaskTitle(task.title);
  const slot = scheduleLabelForTask(task);
  const duration = task.estimatedMinutes
    ? `${task.estimatedMinutes}-minute block`
    : "focused block";
  const placement =
    task.section === "do_now"
      ? "it is the most immediate commitment in the plan"
      : task.section === "do_next"
        ? "it can follow the first priority without pushing fixed events"
        : "it belongs after today's commitments while still keeping the longer-term plan moving";
  const deadline = task.deadline
    ? ` and leaves room before ${task.deadline}`
    : "";
  const source = task.source ? ` The source is ${task.source}.` : "";

  return `StudentOS placed ${title} at ${slot} because ${placement}, the ${duration} fits that window${deadline}.${source}`;
}

function normalizedRationale(value?: string) {
  return normalizeSearchText(value ?? "");
}

function isGenericScheduleRationale(value?: string) {
  const normalized = normalizedRationale(value);
  if (!normalized) return true;

  return [
    "studentos placed this where it best fits the available evidence and schedule constraints",
    "studentos placed this task where it best fits the current deadlines fixed events and available energy",
    "studentos uses a conservative short work block until exact deadlines event details and workload are confirmed",
  ].includes(normalized);
}

export function enrichPlanTasksWithRationales(tasks: DemoPlanTask[]) {
  const rangedTasks = ensureTaskTimeRanges(tasks);
  const rationaleCounts = rangedTasks.reduce<Record<string, number>>((counts, task) => {
    const key = normalizedRationale(task.scheduleRationale);
    if (!key) return counts;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  return rangedTasks.map((task) => {
    const key = normalizedRationale(task.scheduleRationale);
    const shouldRegenerate =
      !task.scheduleRationale ||
      isGenericScheduleRationale(task.scheduleRationale) ||
      (key && rationaleCounts[key] > 1);

    return {
      ...task,
      scheduleRationale: shouldRegenerate
        ? defaultScheduleRationale(task)
        : task.scheduleRationale,
    };
  });
}

export function scheduleRationaleForTask(task: DemoPlanTask) {
  return task.scheduleRationale ?? defaultScheduleRationale(task);
}

function taskForTimelineEvent(event: TimelineEvent | null, tasks: DemoPlanTask[]) {
  if (!event) return undefined;

  const eventText = normalizeSearchText([event.id, event.title].join(" "));
  return tasks.find((task) => {
    const taskText = normalizeSearchText([task.id, task.title, task.source, task.goalId].filter(Boolean).join(" "));
    return (
      task.id === event.id ||
      task.goalId === event.id ||
      taskText.includes(eventText) ||
      eventText.includes(taskText)
    );
  });
}

export function scheduleRationaleForEvent(event: TimelineEvent | null, tasks: DemoPlanTask[]) {
  if (!event) return "";
  const matchingTask = taskForTimelineEvent(event, tasks);
  return matchingTask
    ? scheduleRationaleForTask(matchingTask)
    : event.scheduleRationale ??
        "StudentOS placed this block around fixed events, urgency, and the student's remaining focus for the day.";
}

function calendarDayDiff(from: Date, to: Date) {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((toDay - fromDay) / 86400000);
}

function formatDayDistance(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function parseDeadlineTime(task: DemoPlanTask, date: Date) {
  const match = task.deadline?.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && hours < 12) hours += 12;
  if (ampm === "AM" && hours === 12) hours = 0;

  const deadline = new Date(date);
  deadline.setHours(hours, minutes, 0, 0);
  return deadline;
}

export function completionToastForTask(task: DemoPlanTask, now: Date) {
  if (task.deadlineDateId) {
    const deadlineDate = dateFromDateId(task.deadlineDateId);

    if (deadlineDate) {
      const daysUntilDeadline = calendarDayDiff(now, deadlineDate);

      if (daysUntilDeadline > 0) {
        return `Completed. Deadline is ${formatDayDistance(daysUntilDeadline)}.`;
      }

      if (daysUntilDeadline === 0) {
        const deadlineTime = parseDeadlineTime(task, deadlineDate);
        if (!deadlineTime) return "Completed before today's deadline.";

        const minutesUntilDeadline = Math.round((deadlineTime.getTime() - now.getTime()) / 60000);
        if (minutesUntilDeadline >= 0) {
          const hours = Math.floor(minutesUntilDeadline / 60);
          const mins = minutesUntilDeadline % 60;
          const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
          return `Completed ${timeStr} before the deadline.`;
        }

        return "Completed after the deadline.";
      }

      return "Completed after the deadline.";
    }
  }

  if (task.scheduledDateId) {
    const scheduledDate = dateFromDateId(task.scheduledDateId);
    if (scheduledDate) {
      const daysUntilScheduled = calendarDayDiff(now, scheduledDate);
      if (daysUntilScheduled > 0) {
        return `Completed early. This was scheduled ${formatDayDistance(daysUntilScheduled)}.`;
      }
    }
  }

  return "Completed. Plan updated.";
}

function estimatedMinutesFromDuration(value: string, type: Commitment["type"]) {
  const hourMatch = value.match(/(\d+(?:\.\d+)?)\s*h/i);
  if (hourMatch) return Math.max(15, Math.round(Number(hourMatch[1]) * 60));

  const minuteMatch = value.match(/(\d+)\s*m/i);
  if (minuteMatch) return Math.max(1, Number(minuteMatch[1]));

  if (type === "event") return 30;
  if (type === "goal") return 30;
  return 25;
}

function slugFromText(value: string) {
  return normalizeSearchText(value).split(" ").slice(0, 5).join("-") || "added-task";
}

function titleFromAddedText(text: string) {
  const withoutDeadline = text
    .replace(/\b(due|by|before)\b.+$/i, "")
    .replace(/\b(today|tonight|tomorrow|tmr)\b/gi, "")
    .trim();
  const title = withoutDeadline || text.trim();

  return title.length > 70 ? `${title.slice(0, 67).trim()}...` : title;
}

function deadlineFromAddedText(text: string) {
  const timeMatch = text.match(/\b(?:due|by|before)\s+((?:\d{1,2})(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?)\b/i);
  const dayMatch = text.match(/\b(today|tonight|tomorrow|tmr)\b/i);
  const rawTime = timeMatch?.[1]?.replace(/\./g, "").replace(/\s+/g, " ").trim();

  if (!rawTime && !dayMatch) return null;

  const timeLabel = rawTime ? rawTime.toUpperCase().replace(/([0-9])([AP]M)$/i, "$1 $2") : "";
  const dayLabel = dayMatch?.[1]?.toLowerCase();
  const isTomorrow = dayLabel === "tomorrow" || dayLabel === "tmr";
  const dateId = isTomorrow ? addDaysToDateId(todayDateId(), 1) : todayDateId();

  return {
    label: [timeLabel, dayLabel && !isTomorrow ? "tonight" : isTomorrow ? "tomorrow" : ""]
      .filter(Boolean)
      .join(" "),
    dateId,
    timeLabel: timeLabel ? `Before ${timeLabel}` : "After current focus",
  };
}

function typeFromAddedText(text: string): Commitment["type"] {
  if (/\b(goal|learn|improve|practice|become|proficient)\b/i.test(text)) return "goal";
  if (/\b(meet|meeting|tuition|briefing|training|class|lesson|event)\b/i.test(text)) return "event";
  if (/\b(due|deadline|submit|submission|by|before)\b/i.test(text)) return "deadline";
  return "task";
}

export function interpretAddedSource(text: string): AddedCommitmentInterpretation {
  const normalized = text.trim();
  const isUnclear = normalized.length < 8 || !/[a-z0-9]/i.test(normalized);
  const title = isUnclear ? "Clarify added task" : titleFromAddedText(normalized);
  const type = isUnclear ? "task" : typeFromAddedText(normalized);
  const deadline = isUnclear ? null : deadlineFromAddedText(normalized);
  const id = `added-${slugFromText(normalized)}`;
  const estimatedDuration = type === "event" ? "30min" : type === "goal" ? "30min/session" : "30min";
  const commitment: Commitment = {
    id,
    title: capitalize(title),
    type,
    state: isUnclear ? "needs_clarification" : "confirmed",
    confidence: isUnclear ? 45 : deadline ? 88 : 76,
    source: "Added task",
    estimatedDuration,
    explanation: isUnclear
      ? "The added text did not include enough detail to schedule confidently."
      : `Interpreted from added input: "${normalized}".`,
  };
  const task: DemoPlanTask = {
    id,
    title: type === "goal" ? `Plan next step for ${commitment.title}` : commitment.title,
    section: "do_next",
    estimatedMinutes: estimatedMinutesFromDuration(estimatedDuration, type),
    timeLabel: deadline?.timeLabel ?? "After current focus",
    deadline: deadline?.label,
    deadlineDateId: deadline?.dateId,
    reason: deadline ? "New commitment inserted before its deadline" : "New commitment added mid-plan",
    scheduleRationale: deadline
      ? `StudentOS schedules ${commitment.title} before ${deadline.label} because that deadline came from the added input.`
      : `StudentOS adds ${commitment.title} after the current focus because the added input did not include a fixed deadline.`,
    source: "Added task",
    goalId: type === "goal" ? id : undefined,
    isRoadmapTask: type === "goal" ? true : undefined,
    updated: true,
  };
  const impactItems = [
    isUnclear ? "Ask for details before scheduling" : `Add ${commitment.title}`,
    deadline ? `Schedule before ${deadline.label}` : "Place after current focus",
    "Keep existing fixed commitments stable",
  ];

  return {
    commitment,
    task: ensureTaskTimeRange(task),
    impactItems,
    clarificationQuestion: isUnclear
      ? {
          id: `${id}-clarification`,
          commitmentId: id,
          kind: "general",
          title: "Clarify added task",
          subtitle: "Choose the closest type so StudentOS can ask for only the missing details.",
          question: "What kind of item should this become?",
          options: [
            { label: "School task", recommended: true },
            { label: "Deadline" },
            { label: "Fixed event" },
            { label: "Personal goal" },
          ],
          customPlaceholder: "Type details, like 'Chemistry worksheet due tonight by 8 PM'",
          resolvedCommitment: {
            title: "Clarified added task",
            state: "confirmed",
            confidence: 82,
            estimatedDuration: "30min",
            explanation: "Clarified from the user's added task details.",
          },
        }
      : undefined,
  };
}

function commitmentHasScheduledTask(commitment: Commitment, tasks: DemoPlanTask[]) {
  const title = normalizeSearchText(commitment.title);
  return tasks.some((task) => {
    const taskTitle = normalizeSearchText(task.title);
    return (
      task.id === commitment.id ||
      task.id === `clarified-${commitment.id}` ||
      task.goalId === commitment.id ||
      taskTitle.includes(title) ||
      title.includes(taskTitle)
    );
  });
}

export function taskFromClarifiedCommitment(
  commitment: Commitment,
  clarificationSummary: string,
): DemoPlanTask {
  const title =
    commitment.type === "goal"
      ? `Plan next step for ${commitment.title}`
      : commitment.title;

  return ensureTaskTimeRange({
    id: `clarified-${commitment.id}`,
    title,
    section: "do_next",
    estimatedMinutes: estimatedMinutesFromDuration(commitment.estimatedDuration, commitment.type),
    timeLabel: "After current focus",
    reason: "Added after user clarification resolved the missing context",
    scheduleRationale: `StudentOS schedules this because the earlier ambiguity was resolved by the user's clarification: ${clarificationSummary}.`,
    source: commitment.source,
    goalId: commitment.type === "goal" ? commitment.id : undefined,
    isRoadmapTask: commitment.type === "goal" ? true : undefined,
    updated: true,
  });
}

export function upsertClarifiedCommitmentTask(
  tasks: DemoPlanTask[],
  commitment: Commitment,
  clarificationSummary: string,
) {
  if (commitmentHasScheduledTask(commitment, tasks)) return tasks;

  const task = taskFromClarifiedCommitment(commitment, clarificationSummary);
  const futureIndex = tasks.findIndex((item) => item.section === "subsequent_days");
  if (futureIndex < 0) return ensureTaskTimeRanges([...tasks, task]);

  return ensureTaskTimeRanges([...tasks.slice(0, futureIndex), task, ...tasks.slice(futureIndex)]);
}

export function commitmentsWithAddedCommitment(current: Commitment[], commitment: Commitment) {
  if (current.some((item) => item.id === commitment.id)) return current;
  return [...current, commitment];
}

function isFlexiblePlanTask(task: DemoPlanTask) {
  const text = `${task.title} ${task.reason ?? ""} ${task.source ?? ""}`.toLowerCase();
  if (/\bfixed\b|calendar|appointment|class|lesson/.test(text)) return false;
  return task.section !== "do_now";
}

export function planTasksWithAddedTask(
  current: DemoPlanTask[],
  commitment: Commitment,
  task: DemoPlanTask,
) {
  if (current.some((item) => item.id === task.id) || commitment.state === "needs_clarification") {
    return current;
  }

  const movableIndex = current.findIndex(isFlexiblePlanTask);
  const firstFutureIndex = current.findIndex((item) => item.section === "subsequent_days");
  const insertionIndex =
    movableIndex >= 0 ? movableIndex : firstFutureIndex >= 0 ? firstFutureIndex : current.length;
  const next = current.map((item, index) =>
    index === movableIndex
      ? {
          ...item,
          reason: `Moved after ${commitment.title}`,
          scheduleRationale: `StudentOS moved ${item.title} after ${commitment.title} because it was the first flexible block available.`,
          updated: true,
        }
      : item,
  );

  return ensureTaskTimeRanges([
    ...next.slice(0, insertionIndex),
    task,
    ...next.slice(insertionIndex),
  ]);
}

function taskMatchesCommitment(task: DemoPlanTask, commitment: Commitment) {
  if (task.id === commitment.id) return true;
  if (task.id === `clarified-${commitment.id}`) return true;
  if (task.goalId === commitment.id) return true;
  if (task.id.startsWith(`${commitment.id}-`)) return true;

  const taskSource = normalizeSearchText(task.source ?? "");
  const commitmentSource = normalizeSearchText(commitment.source);
  if (
    taskSource &&
    taskSource === commitmentSource &&
    !["screenshot", "message screenshot", "plan"].includes(taskSource)
  ) {
    return true;
  }

  const taskText = normalizeSearchText([task.title, task.source].filter(Boolean).join(" "));
  const commitmentText = normalizeSearchText([commitment.title, commitment.source].join(" "));
  const titleWords = normalizeSearchText(commitment.title)
    .split(" ")
    .filter((word) => word.length > 3);

  if (titleWords.length > 0) {
    const matchingWords = titleWords.filter((word) => taskText.includes(word)).length;
    if (matchingWords >= Math.min(2, titleWords.length)) return true;
  }

  return taskText.length > 0 && commitmentText.length > 0 && (
    taskText.includes(commitmentText) || commitmentText.includes(taskText)
  );
}

export function planTasksWithEditedCommitment(
  current: DemoPlanTask[],
  previousCommitment: Commitment,
  nextCommitment: Commitment,
) {
  const nextTitle =
    nextCommitment.type === "goal"
      ? `Plan next step for ${nextCommitment.title}`
      : nextCommitment.title;
  const nextEstimatedMinutes = estimatedMinutesFromDuration(
    nextCommitment.estimatedDuration,
    nextCommitment.type,
  );

  return ensureTaskTimeRanges(current.map((task) => {
    if (!taskMatchesCommitment(task, previousCommitment)) return task;

    return ensureTaskTimeRange({
      ...task,
      title: task.isRoadmapTask && nextCommitment.type === "goal" ? nextTitle : nextCommitment.title,
      estimatedMinutes: nextEstimatedMinutes,
      source: nextCommitment.source,
      goalId: nextCommitment.type === "goal" ? nextCommitment.id : task.goalId,
      isRoadmapTask: nextCommitment.type === "goal" ? true : task.isRoadmapTask,
      reason: task.reason ?? "Updated from edited commitment",
      scheduleRationale: `StudentOS updated this scheduled task after the commitment was edited to "${nextCommitment.title}".`,
      updated: true,
    });
  }));
}

export function planTasksWithoutCommitment(
  current: DemoPlanTask[],
  commitment: Commitment,
) {
  return current.filter((task) => !taskMatchesCommitment(task, commitment));
}

export function fallbackPlanSummary(commitments: Commitment[], tasks: DemoPlanTask[]) {
  const focus = tasks.find((task) => task.section === "do_now") ?? tasks[0];
  const fixedCount = commitments.filter((item) => item.type === "event").length;
  const unresolvedCount = commitments.filter(
    (item) => item.state === "needs_clarification" || item.state === "unsure",
  ).length;

  return [
    focus ? `StudentOS keeps ${focus.title} as the current focus` : "StudentOS keeps the current plan visible",
    fixedCount ? `protects ${fixedCount} fixed event${fixedCount === 1 ? "" : "s"}` : "protects fixed-time commitments",
    unresolvedCount ? `and leaves ${unresolvedCount} item${unresolvedCount === 1 ? "" : "s"} marked for clarification.` : "and keeps flexible work movable.",
  ].join(", ");
}

export function fallbackPlanBullets(commitments: Commitment[], tasks: DemoPlanTask[]) {
  const focus = tasks.find((task) => task.section === "do_now") ?? tasks[0];
  const fixedEvents = commitments.filter((item) => item.type === "event");
  const goals = commitments.filter((item) => item.type === "goal");

  return [
    focus ? `Current focus: ${focus.title}.` : "Current focus stays visible.",
    fixedEvents.length
      ? `${fixedEvents.length} fixed event${fixedEvents.length === 1 ? "" : "s"} stay protected.`
      : "Fixed-time events stay protected when present.",
    "Flexible work moves only after schedule constraints are checked.",
    goals.length
      ? `${goals.length} longer-term goal${goals.length === 1 ? "" : "s"} remain in the roadmap.`
      : "Longer-term goals stay separate from urgent tasks.",
  ];
}

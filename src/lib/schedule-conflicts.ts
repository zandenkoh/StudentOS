export type SchedulableTimelineEvent = {
  id: string;
  time: string;
  chip?: string;
  duration?: string;
  tone?: "conflict" | "success" | "priority";
  conflictGroupId?: string;
};

export type ConfirmedConflictGroup = {
  id: string;
  eventIds: string[];
  overlapMinutes: number;
  overlapLabel: string;
};

type TimeInterval = {
  startMinutes: number;
  endMinutes: number;
};

function cleanMeridiem(value: string) {
  return value.replace(/\./g, "").toUpperCase();
}

function parseClockTime(hourText: string, minuteText: string | undefined, meridiemText: string) {
  let hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;
  const meridiem = cleanMeridiem(meridiemText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

export function parseTimeInterval(label?: string): TimeInterval | null {
  if (!label) return null;

  const rangeMatch = label.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM|A\.M\.|P\.M\.)\b/i,
  );

  if (!rangeMatch) return null;

  const [, startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem] = rangeMatch;
  const resolvedStartMeridiem = startMeridiem ?? endMeridiem;
  const startMinutes = parseClockTime(startHour, startMinute, resolvedStartMeridiem);
  const endMinutes = parseClockTime(endHour, endMinute, endMeridiem);

  if (startMinutes === null || endMinutes === null) return null;

  return {
    startMinutes,
    endMinutes: endMinutes <= startMinutes ? endMinutes + 24 * 60 : endMinutes,
  };
}

function overlapMinutes(first: TimeInterval, second: TimeInterval) {
  return Math.max(0, Math.min(first.endMinutes, second.endMinutes) - Math.max(first.startMinutes, second.startMinutes));
}

function isMovableLabel(value: string) {
  return ["flexible", "moved", "weekly goal", "high priority", "priority", "handled", "review", "unscheduled"].some((label) =>
    value.includes(label),
  );
}

export function isFixedTimeConflictCandidate(event: SchedulableTimelineEvent) {
  const chip = event.chip?.toLowerCase() ?? "";
  return !isMovableLabel(chip) && Boolean(parseTimeInterval(event.duration ?? event.time));
}

export function formatOverlapLabel(minutes: number) {
  if (minutes <= 0) return "No confirmed overlap";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) return `${hours} hr ${remainingMinutes} min`;
  if (hours > 0) return `${hours} hr`;
  return `${minutes} min`;
}

export function validateTimelineConflicts<TEvent extends SchedulableTimelineEvent>(events: TEvent[]) {
  const sanitizedEvents = events.map((event) => ({ ...event }));
  const eventsById = new Map(sanitizedEvents.map((event) => [event.id, event]));
  const groupsById = new Map<string, TEvent[]>();
  const confirmedGroups: ConfirmedConflictGroup[] = [];

  events.forEach((event) => {
    if (!event.conflictGroupId) return;

    const group = groupsById.get(event.conflictGroupId) ?? [];
    group.push(event);
    groupsById.set(event.conflictGroupId, group);
  });

  groupsById.forEach((groupEvents, groupId) => {
    const intervals = groupEvents
      .filter(isFixedTimeConflictCandidate)
      .map((event) => ({
        event,
        interval: parseTimeInterval(event.duration ?? event.time),
      }));
    const confirmedEventIds = new Set<string>();
    let maxOverlapMinutes = 0;

    for (let firstIndex = 0; firstIndex < intervals.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < intervals.length; secondIndex += 1) {
        const first = intervals[firstIndex];
        const second = intervals[secondIndex];
        if (!first.interval || !second.interval) continue;

        const minutes = overlapMinutes(first.interval, second.interval);
        if (minutes <= 0) continue;

        confirmedEventIds.add(first.event.id);
        confirmedEventIds.add(second.event.id);
        maxOverlapMinutes = Math.max(maxOverlapMinutes, minutes);
      }
    }

    if (confirmedEventIds.size >= 2) {
      groupEvents.forEach((event) => {
        if (confirmedEventIds.has(event.id)) return;

        const sanitizedEvent = eventsById.get(event.id);
        if (!sanitizedEvent) return;

        delete sanitizedEvent.conflictGroupId;
        if (sanitizedEvent.tone === "conflict") delete sanitizedEvent.tone;
      });

      confirmedGroups.push({
        id: groupId,
        eventIds: Array.from(confirmedEventIds),
        overlapMinutes: maxOverlapMinutes,
        overlapLabel: formatOverlapLabel(maxOverlapMinutes),
      });
      return;
    }

    groupEvents.forEach((event) => {
      const sanitizedEvent = eventsById.get(event.id);
      if (!sanitizedEvent) return;

      delete sanitizedEvent.conflictGroupId;
      if (sanitizedEvent.tone === "conflict") delete sanitizedEvent.tone;
    });
  });

  sanitizedEvents.forEach((event) => {
    if (!event.conflictGroupId && event.tone === "conflict") {
      delete event.tone;
    }
  });

  return {
    events: sanitizedEvents,
    groups: confirmedGroups,
  };
}

"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import type { TimelineEvent } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function TimelineEventBlock({
  event,
  onClick,
  actionLabel = "Tap for details"
}: {
  event: TimelineEvent;
  onClick: () => void;
  actionLabel?: string;
}) {
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={cn(
        "w-full rounded-[20px] border bg-white p-4 text-left shadow-[0_10px_35px_rgba(0,0,0,0.04)]",
        event.tone === "conflict" && "border-red-200 bg-red-50",
        event.tone === "success" && "border-emerald-200 bg-emerald-50",
        event.tone === "priority" && "border-neutral-300"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold">{event.title}</p>
          <p className="mt-1 text-[13px] text-muted">{event.duration ?? event.time}</p>
        </div>
        <ChevronRight className="size-4 text-neutral-300" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <SourceChip tone={event.tone === "conflict" ? "danger" : event.tone === "success" ? "success" : "neutral"}>
          {event.chip}
        </SourceChip>
        <span className="text-xs font-semibold text-neutral-400">{actionLabel}</span>
      </div>
    </motion.button>
  );
}

function TimelineRow({
  event,
  onEventClick
}: {
  event: TimelineEvent;
  onEventClick: (event: TimelineEvent) => void;
}) {
  return (
    <div className="grid grid-cols-[56px_1fr] gap-4">
      <div className="pt-4 text-right text-xs font-semibold text-neutral-400">
        {event.time}
      </div>
      <TimelineEventBlock event={event} onClick={() => onEventClick(event)} />
    </div>
  );
}

function groupTimelineEvents(events: TimelineEvent[], resolved: boolean) {
  const groups: Array<
    | { type: "single"; event: TimelineEvent }
    | { type: "conflict"; id: string; events: TimelineEvent[] }
  > = [];

  events.forEach((event) => {
    if (resolved || !event.conflictGroupId) {
      groups.push({ type: "single", event });
      return;
    }

    const lastGroup = groups[groups.length - 1];
    if (
      lastGroup?.type === "conflict" &&
      lastGroup.id === event.conflictGroupId
    ) {
      lastGroup.events.push(event);
      return;
    }

    groups.push({
      type: "conflict",
      id: event.conflictGroupId,
      events: [event]
    });
  });

  return groups;
}

export function MobileTimeline({
  events,
  resolved,
  onEventClick
}: {
  events: TimelineEvent[];
  resolved: boolean;
  onEventClick: (event: TimelineEvent) => void;
}) {
  const eventGroups = groupTimelineEvents(events, resolved);

  return (
    <section className="relative rounded-[28px] border border-neutral-200 bg-[#F7F7F8] p-4 shadow-soft">
      <div className="absolute bottom-8 left-[4.8rem] top-8 w-px bg-neutral-200" />
      <div className="space-y-4">
        {eventGroups.map((group) => {
          if (group.type === "single") {
            return (
              <TimelineRow
                key={group.event.id}
                event={group.event}
                onEventClick={onEventClick}
              />
            );
          }

          return (
            <div
              key={group.id}
              className="relative rounded-[24px] border border-red-200 bg-red-50/70 p-3 pt-9 shadow-[0_12px_35px_rgba(239,68,68,0.08)]"
            >
              <span className="absolute right-3 top-3 rounded-full border border-red-200 bg-white/85 px-3 py-1 text-xs font-semibold text-red-700">
                45 min overlap
              </span>
              <div className="space-y-3">
                {group.events.map((event) => (
                  <TimelineRow
                    key={event.id}
                    event={event}
                    onEventClick={onEventClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

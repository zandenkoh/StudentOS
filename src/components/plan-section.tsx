import { CalendarDays, CheckCircle2, ChevronRight, Clock3 } from "lucide-react";
import type { DemoPlanTask } from "@/lib/demo-data";
import { scheduleLabelWithTimeRange } from "@/lib/time-scheduling";
import { cn } from "@/lib/utils";

function durationLabel(task: DemoPlanTask) {
  if (!task.estimatedMinutes) return null;
  return `${task.estimatedMinutes} min`;
}

function scheduleLabel(task: DemoPlanTask) {
  return scheduleLabelWithTimeRange(task);
}


function PlanTaskCard({
  task,
  future,
  highlighted,
  onClick
}: {
  task: DemoPlanTask;
  future: boolean;
  highlighted: boolean;
  onClick: () => void;
}) {
  const schedule = scheduleLabel(task);
  const duration = durationLabel(task);

  return (
    <button
      id={`plan-task-${task.id}`}
      type="button"
      onClick={onClick}
      className={cn(
        "w-full scroll-mt-24 rounded-[22px] border bg-white p-4 text-left shadow-[0_10px_35px_rgba(0,0,0,0.035)] transition hover:bg-neutral-50",
        task.updated ? "border-ink" : "border-neutral-200",
        highlighted && "border-amber-400 bg-amber-50/80 ring-4 ring-amber-200/80 shadow-[0_18px_45px_rgba(245,158,11,0.22)]"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 text-[15px] font-semibold leading-5 text-ink">
              {task.title}
            </p>
            {task.updated ? (
              <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">
                Updated
              </span>
            ) : null}
            {task.isRoadmapTask && future ? (
              <span className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                Roadmap
              </span>
            ) : null}
          </div>

          {future ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-neutral-500">
              {schedule ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {schedule}
                </span>
              ) : null}
              {schedule && task.deadline ? (
                <span className="text-neutral-300" aria-hidden="true">
                  {"\u00b7"}
                </span>
              ) : null}
              {task.deadline ? <span>{task.deadline}</span> : null}
              {(schedule || task.deadline) && duration ? (
                <span className="text-neutral-300" aria-hidden="true">
                  {"\u00b7"}
                </span>
              ) : null}
              {duration ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  {duration}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              {schedule ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {schedule}
                </span>
              ) : null}
              {duration ? <span>{duration}</span> : null}
              {task.deadline ? <span>Deadline: {task.deadline}</span> : null}
            </div>
          )}
        </div>
        <ChevronRight className="mt-1 size-4 shrink-0 text-neutral-300" />
      </div>
    </button>
  );
}

export function PlanSection({
  title,
  items,
  highlightedTaskId,
  onTaskClick
}: {
  title: string;
  items: DemoPlanTask[];
  highlightedTaskId?: string | null;
  onTaskClick: (task: DemoPlanTask) => void;
}) {
  const future = title === "Subsequent days";

  return (
    <section className="space-y-3">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <PlanTaskCard
            key={item.id}
            task={item}
            future={future}
            highlighted={highlightedTaskId === item.id}
            onClick={() => onTaskClick(item)}
          />
        ))}
      </div>
    </section>
  );
}

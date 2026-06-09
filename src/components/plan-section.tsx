import { CalendarDays, CheckCircle2, ChevronRight, Clock3 } from "lucide-react";
import type { DemoPlanTask } from "@/lib/demo-data";

function durationLabel(task: DemoPlanTask) {
  if (!task.estimatedMinutes) return null;
  return `${task.estimatedMinutes} min`;
}

function scheduleLabel(task: DemoPlanTask) {
  return task.scheduledDateRange ?? task.scheduledDate ?? task.timeLabel ?? null;
}

function scheduleRationale(task: DemoPlanTask) {
  return task.scheduleRationale ?? task.reason ?? null;
}

function PlanTaskCard({
  task,
  future,
  onClick
}: {
  task: DemoPlanTask;
  future: boolean;
  onClick: () => void;
}) {
  const schedule = scheduleLabel(task);
  const duration = durationLabel(task);
  const rationale = scheduleRationale(task);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border bg-white p-4 text-left shadow-[0_10px_35px_rgba(0,0,0,0.035)] transition hover:bg-neutral-50 ${
        task.updated ? "border-ink" : "border-neutral-200"
      }`}
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
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {schedule ? (
                  <div className="rounded-2xl bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                      Scheduled
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-ink">{schedule}</p>
                  </div>
                ) : null}
                {task.deadline ? (
                  <div className="rounded-2xl bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                      Deadline
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-ink">{task.deadline}</p>
                  </div>
                ) : null}
              </div>
              {duration ? (
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-500">
                  <Clock3 className="size-3.5" />
                  {duration}
                </p>
              ) : null}
              {rationale ? (
                <p className="text-[13px] leading-5 text-muted">{rationale}</p>
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
              {rationale ? <span>{rationale}</span> : null}
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
  onTaskClick
}: {
  title: string;
  items: DemoPlanTask[];
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
            onClick={() => onTaskClick(item)}
          />
        ))}
      </div>
    </section>
  );
}

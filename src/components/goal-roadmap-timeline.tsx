import { CheckCircle2, Clock3 } from "lucide-react";
import { SourceChip } from "@/components/source-chip";
import type { DemoGoalRoadmapStep } from "@/lib/demo-data";

const statusLabel: Record<DemoGoalRoadmapStep["status"], string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  upcoming: "Upcoming"
};

function scheduleLabel(step: DemoGoalRoadmapStep) {
  return step.scheduledDateRange ?? step.scheduledDate ?? "Scheduled";
}

export function GoalRoadmapTimeline({
  steps
}: {
  steps: DemoGoalRoadmapStep[];
}) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.id} className="relative rounded-[26px] border border-neutral-200 bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.035)]">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[16px] font-semibold leading-5 text-ink">{step.title}</h3>
                <SourceChip tone={step.status === "scheduled" ? "success" : "neutral"}>
                  {statusLabel[step.status]}
                </SourceChip>
              </div>
              <p className="mt-1.5 text-[13px] font-semibold text-neutral-500">
                Scheduled: {scheduleLabel(step)}
              </p>
              {step.description ? (
                <p className="mt-2 text-[13px] leading-5 text-muted">{step.description}</p>
              ) : null}

              <div className="mt-3 space-y-2">
                {step.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-[18px] border border-neutral-100 bg-neutral-50 px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-5 text-ink">
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-semibold text-neutral-500">
                          {task.scheduledDate ? <span>{task.scheduledDate}</span> : null}
                          {task.estimatedMinutes ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="size-3" />
                              {task.estimatedMinutes} min
                            </span>
                          ) : null}
                          {task.deadline ? <span>Deadline: {task.deadline}</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

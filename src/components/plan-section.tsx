import { CheckCircle2 } from "lucide-react";

export function PlanSection({
  title,
  items
}: {
  title: string;
  items: { title: string; meta: string; badge?: string; highlight?: boolean }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.title}
            className={`flex items-center gap-3 rounded-[22px] border bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.035)] ${
              item.highlight ? "border-ink" : "border-neutral-200"
            }`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-[15px] font-semibold">{item.title}</p>
                {item.badge ? (
                  <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] text-muted">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { CheckCircle2 } from "lucide-react";

export function PlanSection({
  title,
  items
}: {
  title: string;
  items: { title: string; meta: string }[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 rounded-[22px] border border-neutral-200 bg-white p-4 shadow-[0_10px_35px_rgba(0,0,0,0.035)]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="size-4" />
            </span>
            <div>
              <p className="text-[15px] font-semibold">{item.title}</p>
              <p className="mt-1 text-[13px] text-muted">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

import { CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-500">
      {value}% confidence
    </span>
  );
}

export function DurationBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-500">
      {value}
    </span>
  );
}

export function UncertaintyBadge({
  state
}: {
  state: "confirmed" | "needs_clarification" | "unsure" | "resolved";
}) {
  const confirmed = state === "confirmed" || state === "resolved";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        confirmed
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      )}
    >
      {confirmed ? <CheckCircle2 className="size-3.5" /> : <CircleAlert className="size-3.5" />}
      {state === "needs_clarification"
        ? "Need clarification"
        : state === "unsure"
          ? "Unsure"
          : state === "resolved"
            ? "Resolved"
            : "Understand"}
    </span>
  );
}

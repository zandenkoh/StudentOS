import { cn } from "@/lib/utils";

export function SourceChip({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "success";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "border-neutral-200 bg-white text-neutral-500",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {children}
    </span>
  );
}

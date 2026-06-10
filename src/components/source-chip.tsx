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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "border-neutral-200 bg-white text-neutral-500",
        tone === "danger" && "border-red-200 bg-red-50 text-red-700",
        tone === "success" && "border-neutral-300 bg-neutral-50 text-neutral-700"
      )}
    >
      {children}
    </span>
  );
}

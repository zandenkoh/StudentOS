import { cn } from "@/lib/utils";

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  className
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          {eyebrow}
        </p>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-[30px] font-semibold leading-[1.04] tracking-normal text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-[350px] text-[15px] leading-6 text-muted">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}

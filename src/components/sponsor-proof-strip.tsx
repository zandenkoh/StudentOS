import {
  Bot,
  CheckCircle2,
  CircleAlert,
  Cloud,
  FileSearch,
  Search,
  Server,
} from "lucide-react";
import type { AISponsorTraceItem } from "@/lib/studentos-ai-types";
import { cn } from "@/lib/utils";

type ProofProvider = {
  id: string;
  label: string;
  role: "critical" | "optional";
  match: (item: AISponsorTraceItem) => boolean;
  icon: typeof Server;
};

const providers: ProofProvider[] = [
  {
    id: "aws-lambda",
    label: "AWS Lambda",
    role: "critical",
    icon: Server,
    match: (item) =>
      item.provider.toLowerCase().includes("aws lambda") ||
      /agent orchestrator|aws-hosted agent/i.test(item.action),
  },
  {
    id: "aws-source",
    label: "Bedrock/Textract",
    role: "optional",
    icon: FileSearch,
    match: (item) =>
      /bedrock|textract/i.test(`${item.provider} ${item.action} ${item.detail}`),
  },
  {
    id: "vercel",
    label: "Vercel Gateway",
    role: "critical",
    icon: Cloud,
    match: (item) => item.provider.includes("Vercel AI Gateway"),
  },
  {
    id: "exa",
    label: "Exa",
    role: "optional",
    icon: Search,
    match: (item) => item.provider.includes("Exa"),
  },
];

function bestTraceItem(items: AISponsorTraceItem[]) {
  return (
    items.find((item) => item.status === "success") ??
    items.find((item) => item.status === "error") ??
    items.find((item) => item.status === "fallback") ??
    items[0]
  );
}

function statusLabel(item: AISponsorTraceItem | undefined, role: ProofProvider["role"]) {
  if (!item) return role === "critical" ? "needs proof" : "optional";
  if (item.status === "success") return "verified";
  if (item.status === "fallback") return role === "critical" ? "needs proof" : "fallback";
  return "error";
}

function statusClasses(item?: AISponsorTraceItem) {
  if (!item) return "border-neutral-200 bg-white text-neutral-400";
  if (item.status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (item.status === "fallback") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export function SponsorProofStrip({
  trace,
  className,
}: {
  trace: AISponsorTraceItem[];
  className?: string;
}) {
  return (
    <section className={cn(
      "rounded-[8px] border border-neutral-200 bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.04)]",
      className,
    )}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="size-4 shrink-0 text-ink" />
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            Sponsor proof
          </p>
        </div>
        <p className="shrink-0 text-[11px] font-semibold text-neutral-400">
          {trace.length} traces
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {providers.map((provider) => {
          const matchingItems = trace.filter(provider.match);
          const item = bestTraceItem(matchingItems);
          const Icon = provider.icon;

          return (
            <div
              key={provider.id}
              title={item?.detail}
              className={cn(
                "min-w-0 rounded-[8px] border px-2.5 py-2",
                statusClasses(item),
              )}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {item?.status === "success" ? (
                  <CheckCircle2 className="size-3.5 shrink-0" />
                ) : item ? (
                  <CircleAlert className="size-3.5 shrink-0" />
                ) : (
                  <Icon className="size-3.5 shrink-0" />
                )}
                <span className="min-w-0 truncate text-[12px] font-bold">
                  {provider.label}
                </span>
              </div>
              <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
                {statusLabel(item, provider.role)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold opacity-60">
                {provider.role === "critical" ? "Required" : "Optional"}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import {
  Bot,
  Check,
  CircleAlert,
  Cloud,
  FileSearch,
  Search,
  Server,
  TriangleAlert,
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
    label: "Textract",
    role: "optional",
    icon: FileSearch,
    match: (item) =>
      /bedrock|textract/i.test(`${item.provider} ${item.action} ${item.detail}`),
  },
  {
    id: "vercel",
    label: "Gateway",
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
  if (!item) return role === "critical" ? "not verified" : "optional";
  if (item.status === "success") return "ok";
  if (item.status === "fallback") return role === "critical" ? "fallback" : "optional fallback";
  return "error";
}

function statusClasses(item: AISponsorTraceItem | undefined, role: ProofProvider["role"]) {
  if (!item) return "border-neutral-200 bg-white text-neutral-400";
  if (item.status === "error") return "border-red-200 bg-red-50 text-red-700";
  if (item.status === "fallback" && role === "critical") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-neutral-200 bg-neutral-50 text-neutral-600";
}

function StatusIcon({
  item,
  provider,
}: {
  item?: AISponsorTraceItem;
  provider: ProofProvider;
}) {
  if (item?.status === "success") return <Check className="size-3 shrink-0" />;
  if (item?.status === "error") return <CircleAlert className="size-3 shrink-0" />;
  if (item?.status === "fallback" && provider.role === "critical") {
    return <TriangleAlert className="size-3 shrink-0" />;
  }

  const Icon = provider.icon;
  return <Icon className="size-3 shrink-0" />;
}

export function SponsorProofStrip({
  trace,
  className,
}: {
  trace: AISponsorTraceItem[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[8px] border border-neutral-200 bg-white p-3 shadow-[0_12px_30px_rgba(0,0,0,0.035)]",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Bot className="size-4 shrink-0 text-ink" />
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500">
            Tool proof
          </p>
        </div>
        <p className="shrink-0 text-[11px] font-medium text-neutral-400">
          {trace.length} traces
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {providers.map((provider) => {
          const matchingItems = trace.filter(provider.match);
          const item = bestTraceItem(matchingItems);

          return (
            <span
              key={provider.id}
              className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-[7px] border px-2 py-1 text-[11px] font-semibold",
                statusClasses(item, provider.role),
              )}
            >
              <StatusIcon item={item} provider={provider} />
              <span className="truncate">{provider.label}</span>
              <span className="text-neutral-300">/</span>
              <span className="truncate text-[10px] font-medium">{statusLabel(item, provider.role)}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

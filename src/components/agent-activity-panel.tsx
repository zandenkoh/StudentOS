"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bot, X } from "lucide-react";
import { iconForStatus, type AgentLog, type AgentStatus } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function AgentLogRow({
  row,
  status
}: {
  row: AgentLog;
  status: AgentStatus;
}) {
  const Icon = iconForStatus[status];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[18px] border p-3",
        status === "active"
          ? "border-neutral-300 bg-white shadow-[0_10px_35px_rgba(0,0,0,0.045)]"
          : "border-neutral-100 bg-neutral-50"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          status === "completed" && "bg-emerald-50 text-emerald-700",
          status === "active" && "bg-ink text-white",
          status === "pending" && "bg-white text-neutral-300"
        )}
      >
        <Icon className={cn("size-4", status === "active" && "animate-pulse")} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold">{row.label}</p>
        {row.sponsor ? (
          <p className="mt-0.5 text-xs font-semibold text-neutral-400">{row.sponsor}</p>
        ) : null}
      </div>
      {status === "active" ? (
        <span className="flex gap-1">
          <span className="size-1 rounded-full bg-neutral-400 animate-pulse" />
          <span className="size-1 rounded-full bg-neutral-400 animate-pulse [animation-delay:120ms]" />
          <span className="size-1 rounded-full bg-neutral-400 animate-pulse [animation-delay:240ms]" />
        </span>
      ) : null}
    </div>
  );
}

export function AgentActivityPanel({
  open,
  rows,
  activeIndex,
  onClose
}: {
  open: boolean;
  rows: AgentLog[];
  activeIndex: number;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-[2px] lg:items-center lg:justify-end lg:p-6"
        >
          <motion.aside
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="max-h-[86vh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-neutral-200 bg-white p-5 shadow-lift lg:rounded-[28px]"
          >
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-ink text-white">
                  <Bot className="size-5" />
                </span>
                <div>
                  <h2 className="text-[20px] font-semibold">StudentOS Agent</h2>
                  <p className="text-sm text-muted">Working quietly in the background.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-2.5">
              {rows.map((row, index) => (
                <AgentLogRow
                  key={row.id}
                  row={row}
                  status={index < activeIndex ? "completed" : index === activeIndex ? "active" : "pending"}
                />
              ))}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

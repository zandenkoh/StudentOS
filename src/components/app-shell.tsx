"use client";

import { Bot, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  onAgentClick,
  onReset,
  stepLabel,
  progress,
  route = "main",
  hideHeader = false
}: {
  children: ReactNode;
  onAgentClick?: () => void;
  onReset?: () => void;
  stepLabel?: string;
  progress?: number;
  route?: "main" | "goal";
  hideHeader?: boolean;
}) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.03)]">
        {!hideHeader && (
          <>
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-100 bg-white/85 px-5 py-3 backdrop-blur-xl">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">
                  OS
                </span>
                <span className="text-sm font-semibold">StudentOS</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  href={route === "goal" ? "/" : "/goal"}
                  className="rounded-full border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600"
                >
                  {route === "goal" ? "Demo" : "/goal"}
                </Link>
                {onReset ? (
                  <button
                    onClick={onReset}
                    aria-label="Reset demo"
                    className="flex size-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                ) : null}
                {onAgentClick ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onAgentClick}
                    className="flex size-9 items-center justify-center rounded-full bg-ink text-white"
                    aria-label="Open agent log"
                  >
                    <Bot className="size-4" />
                  </motion.button>
                ) : null}
              </div>
            </div>
            {typeof progress === "number" ? (
              <div className="h-[3px] bg-neutral-100">
                <motion.div
                  className="h-full bg-ink"
                  animate={{ width: `${Math.max(8, progress * 100)}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>
            ) : null}
          </>
        )}
        {!hideHeader && stepLabel ? (
          <div className="px-5 pt-4 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {stepLabel}
          </div>
        ) : null}
        <div className={cn("flex-1", (!hideHeader && stepLabel) ? "pt-4" : "")}>{children}</div>
      </div>
    </main>
  );
}

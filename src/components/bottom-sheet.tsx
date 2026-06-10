"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function BottomSheet({
  open,
  title,
  subtitle,
  children,
  onClose,
  headerAction
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  headerAction?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 px-0 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-h-[86vh] w-full max-w-[430px] overflow-y-auto rounded-t-[28px] border border-neutral-200 bg-white p-5 shadow-lift"
          >
            <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-neutral-200" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-[22px] font-semibold leading-tight">{title}</h2>
                {subtitle ? <p className="mt-2 break-words text-[14px] leading-5 text-muted">{subtitle}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerAction}
                <button
                  onClick={onClose}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

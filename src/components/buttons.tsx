"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = HTMLMotionProps<"button"> & {
  children: ReactNode;
};

export function PrimaryButton({ children, className, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex h-[60px] w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-white shadow-soft transition disabled:cursor-not-allowed disabled:bg-neutral-300",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function SecondaryButton({ children, className, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-5 text-[15px] font-semibold text-ink shadow-[0_10px_35px_rgba(0,0,0,0.04)] transition hover:bg-neutral-50",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}

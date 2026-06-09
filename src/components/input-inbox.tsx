"use client";

import { motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { InputSourceCard } from "@/components/input-source-card";
import type { InputSource } from "@/lib/demo-data";

export function InputInbox({ sources }: { sources: InputSource[] }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-neutral-200 bg-[#F7F7F8] p-4 shadow-soft"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-white">
            <Inbox className="size-4 text-neutral-700" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold">Input Inbox</h2>
            <p className="text-xs text-muted">{sources.length} inputs captured</p>
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-500">
          Ready
        </span>
      </div>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07 } }
        }}
        className="space-y-3"
      >
        {sources.map((source) => (
          <motion.div
            key={source.id}
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
          >
            <InputSourceCard source={source} />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

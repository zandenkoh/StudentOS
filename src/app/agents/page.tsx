"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";

type ThinkingStep = {
  id: number;
  title: string;
  description: string;
  isCheckmark?: boolean;
};

const steps: ThinkingStep[] = [
  {
    id: 1,
    title: "Describing landing page image and improvements",
    description: "The user wants a description of the landing page image in our usual writing style. It features a centered mobile landing with a pale warm background, a pill label, bold headline, subtitle, black CTA button, and an icon row. There's also a \"Today brain dump preview.\" A minimal, Apple-inspired aesthetic. Improvements should be included."
  },
  {
    id: 2,
    title: "Crafting landing page description with improvements",
    description: "The user wants a concise, copyable description of the landing page image, perhaps to feed into a prompt. It should be styled in a dense, direct tone. I’ll start with the \"Mobile-first landing screen for StudentOS\" and add context, including the desired improvements. The description should highlight the current design and what needs to change."
  },
  {
    id: 3,
    title: "Thought for 10s",
    description: "Done",
    isCheckmark: true
  }
];

export default function AgentsThinkingPage() {
  const router = useRouter();
  const [visibleSteps, setVisibleSteps] = useState<number[]>([1]);

  useEffect(() => {
    // Write footprint to localStorage
    if (typeof window !== "undefined") {
      window.localStorage.setItem("studentos_footprint", "completed");
      window.localStorage.setItem("agent_log_visited", "true");
    }

    // Step 2 appears after 1.5 seconds
    const timer1 = setTimeout(() => {
      setVisibleSteps((prev) => [...prev, 2]);
    }, 1500);

    // Step 3 (checkmark, Done) appears after 3 seconds
    const timer2 = setTimeout(() => {
      setVisibleSteps((prev) => [...prev, 3]);
    }, 3000);

    // Automatically redirect to /commitments after 4.2 seconds
    const timer3 = setTimeout(() => {
      router.push("/commitments");
    }, 4200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [router]);

  return (
    <AppShell hideHeader={true}>
      <div className="flex min-h-dvh flex-col bg-white px-8 py-12">
        <h1 className="text-[22px] font-medium tracking-tight text-neutral-800 mb-8">
          Thinking
        </h1>

        <div className="flex flex-col">
          {steps.map((step, index) => {
            const isVisible = visibleSteps.includes(step.id);
            const isLast = index === steps.length - 1;
            
            return (
              <AnimatePresence key={step.id}>
                {isVisible && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex gap-4"
                  >
                    {/* Left Column: Bullet & Connector Line */}
                    <div className="flex flex-col items-center shrink-0 pt-1.5">
                      {step.isCheckmark ? (
                        <motion.div 
                          initial={{ scale: 0.7 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          className="flex size-5 items-center justify-center rounded-full border border-neutral-400 bg-white text-neutral-600"
                        >
                          <Check className="size-3.5 stroke-[2.5]" />
                        </motion.div>
                      ) : (
                        <div className="flex size-5 items-center justify-center">
                          <div className="size-2 rounded-full bg-neutral-600" />
                        </div>
                      )}
                      
                      {!isLast && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: "100%" }}
                          transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
                          className="w-[1.5px] bg-neutral-200 grow my-2 min-h-[45px]" 
                        />
                      )}
                    </div>

                    {/* Right Column: Content */}
                    <div className="flex-1 pb-8">
                      <h2 className="text-[14.5px] font-medium text-neutral-850 leading-snug">
                        {step.title}
                      </h2>
                      <p className="text-[13px] text-neutral-500 leading-relaxed mt-1.5 font-normal">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

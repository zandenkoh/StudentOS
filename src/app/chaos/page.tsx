"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Image, MessageSquare, Mic, Mail, Bell, Calendar, Sparkles, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";

type ChaosCard = {
  id: number;
  text: string;
  chip: string;
  icon: LucideIcon;
  className: string;
  rotate: number;
};

const chaosCardsData: ChaosCard[] = [
  { id: 1, text: "Physics worksheet due tmr 8am", chip: "Screenshot", icon: Image, className: "-left-10 top-[-28px] w-[160px] sm:left-6", rotate: -6 },
  { id: 2, text: "Chapter 12 worksheet.pdf", chip: "PDF", icon: FileText, className: "right-[-42px] top-[-18px] w-[165px] sm:right-6", rotate: 5 },
  { id: 6, text: "Email: Project update", chip: "Email", icon: Mail, className: "left-[18px] top-[34px] w-[155px] sm:left-[110px]", rotate: -4 },
  { id: 17, text: "Tuition clash email", chip: "Email", icon: Mail, className: "right-[22px] top-[42px] w-[145px] sm:right-[120px]", rotate: -8 },
  { id: 5, text: "1:24 voice note", chip: "Voice", icon: Mic, className: "-left-8 top-[102px] w-[135px] sm:left-7", rotate: 5 },
  { id: 4, text: "Revision block scheduled", chip: "Event", icon: Calendar, className: "right-[-34px] top-[106px] w-[145px] sm:right-7", rotate: -5 },
  { id: 3, text: "CCA briefing 5:30pm", chip: "Message", icon: MessageSquare, className: "left-[42px] top-[168px] w-[145px] sm:left-[170px]", rotate: 8 },
  { id: 18, text: "Ask physics teacher tmr", chip: "Reminder", icon: Bell, className: "right-[42px] top-[170px] w-[150px] sm:right-[170px]", rotate: 4 },

  { id: 7, text: "Ask teammate about deck", chip: "Reminder", icon: Bell, className: "-left-12 bottom-[176px] w-[155px] sm:left-8", rotate: 10 },
  { id: 8, text: "Chemistry lab report", chip: "PDF", icon: FileText, className: "right-[-42px] bottom-[184px] w-[145px] sm:right-8", rotate: -7 },
  { id: 10, text: "Buy poster board", chip: "Task", icon: FileText, className: "right-[34px] bottom-[112px] w-[145px] sm:right-[150px]", rotate: 6 },

  { id: 11, text: "Late submission warning", chip: "Alert", icon: Bell, className: "-left-10 bottom-[52px] w-[150px] sm:left-8", rotate: 9 },
  { id: 12, text: "Coding practice 5h/wk", chip: "Goal", icon: Sparkles, className: "right-[-34px] bottom-[56px] w-[155px] sm:right-8", rotate: -8 },
  { id: 15, text: "11 Jun competition due", chip: "Deadline", icon: Calendar, className: "left-[48px] bottom-[-12px] w-[160px] sm:left-[180px]", rotate: -4 },
  { id: 16, text: "Voice note: teammate.wav", chip: "Voice", icon: Mic, className: "right-[48px] bottom-[-8px] w-[150px] sm:right-[180px]", rotate: 7 },
  { id: 13, text: "Group chat transcript", chip: "Message", icon: MessageSquare, className: "-left-16 bottom-[-26px] w-[160px] sm:left-12", rotate: 5 },
  { id: 14, text: "Syllabus revision.pdf", chip: "PDF", icon: FileText, className: "right-[-58px] bottom-[-22px] w-[155px] sm:right-12", rotate: -6 }
];

export default function ChaosPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"intro" | "populating" | "clumping" | "reveal" | "leaving">("intro");
  const [visibleCardCount, setVisibleCardCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [clumpTargets, setClumpTargets] = useState<{[key: number]: {x: number, y: number}}>({});

  useLayoutEffect(() => {
    if (stage !== "clumping" || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2;

    const newTargets: {[key: number]: {x: number, y: number}} = {};

    chaosCardsData.forEach((card) => {
      const el = document.getElementById(`chaos-card-${card.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;
        
        newTargets[card.id] = {
          x: centerX - cardCenterX,
          y: centerY - cardCenterY
        };
      }
    });

    setClumpTargets(newTargets);
  }, [stage]);

  useEffect(() => {
    // 1. Start populating after intro text fades in (800ms)
    const introTimer = setTimeout(() => {
      setStage("populating");
    }, 1200);

    return () => clearTimeout(introTimer);
  }, []);

  useEffect(() => {
    if (stage !== "populating") return;

    // 2. Add cards rapidly one by one
    const popupInterval = setInterval(() => {
      setVisibleCardCount((prev) => {
        if (prev >= chaosCardsData.length) {
          clearInterval(popupInterval);
          // Wait a bit, then clump together in the center
          setTimeout(() => {
            setStage("clumping");
          }, 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 120);

    return () => clearInterval(popupInterval);
  }, [stage]);

  useEffect(() => {
    if (stage !== "clumping") return;

    // 3. Clumping finishes after 800ms, then reveal the plan card
    const clumpTimer = setTimeout(() => {
      setStage("reveal");
    }, 800);

    return () => clearTimeout(clumpTimer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "reveal") return;

    // 4. Stay on the narrative for 3.6s, then start transitioning out
    const redirectTimer = setTimeout(() => {
      setStage("leaving");
    }, 3600);

    return () => clearTimeout(redirectTimer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "leaving") return;

    // 5. Let the exit transition play for 600ms, then route to /input
    const redirectTimer = setTimeout(() => {
      router.push("/input");
    }, 600);

    return () => clearTimeout(redirectTimer);
  }, [stage, router]);

  return (
    <AppShell hideHeader={true}>
      <motion.div
        ref={containerRef}
        animate={stage === "leaving" ? { backgroundColor: "#ffffff" } : { backgroundColor: "#FAF9F6" }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="relative flex min-h-dvh w-full flex-col justify-center overflow-hidden px-6 py-8"
      >
        {/* Scanning beam transition effect */}
        {stage === "leaving" && (
          <motion.div
            initial={{ y: "0%", opacity: 0 }}
            animate={{ 
              y: ["0%", "100%"],
              opacity: [0, 1, 1, 0]
            }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute left-0 right-0 top-0 z-50 h-2.5 bg-gradient-to-r from-transparent via-ink/25 to-transparent blur-[1px] pointer-events-none"
          />
        )}
        
        {/* Dynamic Cards Container */}
        {(stage === "intro" || stage === "populating" || stage === "clumping" || stage === "reveal" || stage === "leaving") && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {chaosCardsData.map((card, index) => {
              const isVisible = index < visibleCardCount;
              const Icon = card.icon;
              
              return (
                <motion.div
                  key={card.id}
                  id={`chaos-card-${card.id}`}
                  className={`absolute z-0 rounded-[20px] border border-neutral-200/90 bg-white/95 p-3.5 shadow-soft backdrop-blur-sm ${card.className}`}
                  initial={{ opacity: 0, scale: 0.7, rotate: card.rotate, y: 0, x: 0 }}
                  animate={
                    stage === "reveal" || stage === "leaving"
                      ? {
                          opacity: 0,
                          scale: 0.15,
                          x: clumpTargets[card.id]?.x || 0,
                          y: clumpTargets[card.id]?.y || 0,
                          rotate: 0,
                        }
                      : stage === "clumping"
                      ? { 
                          opacity: 1, 
                          scale: 0.45,
                          x: clumpTargets[card.id]?.x || 0,
                          y: clumpTargets[card.id]?.y || 0,
                          rotate: (index % 3 - 1) * 3,
                        }
                      : isVisible
                      ? { opacity: 1, scale: 1, rotate: card.rotate, y: 0, x: 0 }
                      : { opacity: 0, scale: 0.7, rotate: card.rotate, y: 0, x: 0 }
                  }
                  transition={
                    stage === "clumping"
                      ? { 
                          type: "spring",
                          stiffness: 90,
                          damping: 14,
                          delay: index * 0.015 
                        }
                      : stage === "reveal" || stage === "leaving"
                      ? {
                          type: "tween",
                          ease: "easeInOut",
                          duration: 0.6,
                        }
                      : { 
                          type: "spring", 
                          stiffness: 260, 
                          damping: 18 
                        }
                  }
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className="flex size-8 items-center justify-center rounded-full bg-neutral-100">
                      <Icon className="size-4 text-neutral-700" />
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                      {card.chip}
                    </span>
                  </div>
                  <p className="truncate text-[14px] font-bold leading-relaxed text-ink">
                    {card.text}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Initial centered Title & Description */}
        <AnimatePresence>
          {(stage === "intro" || stage === "populating") && (
            <motion.div
              key="intro-content"
              className="z-30 mx-auto w-full max-w-[320px] text-center pointer-events-none"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 800, transition: { ease: "easeIn", duration: 0.6 } }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-[32px] font-bold leading-tight tracking-tight text-ink mb-3">
                Everything is everywhere.
              </h1>
              <p className="text-[16px] font-semibold leading-relaxed text-muted">
                Screenshots, PDFs, reminders, voice notes, deadlines, and goals are scattered across your day.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Revealed Narrative Title & Description */}
        <AnimatePresence>
          {stage === "reveal" && (
            <motion.div
              key="reveal-content"
              className="z-30 mx-auto w-full max-w-[360px] text-center flex flex-col items-center justify-center gap-5"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.75, ease: "easeOut", delay: 0.15 } }}
              exit={{ opacity: 0, scale: 0.95, y: -15, transition: { duration: 0.6, ease: "easeIn" } }}
            >
              <div>
                <h1 className="text-[32px] font-bold leading-tight tracking-tight text-ink mb-2">
                  One inbox for your school mess.
                </h1>
                <p className="text-[16px] font-semibold leading-relaxed text-muted">
                  StudentOS pulls everything together, parses your commitments, and builds your day.
                </p>
              </div>

              {/* Minimalistic Plan Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.3, y: 0 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 110, damping: 14, delay: 0.15 }}
                className="w-full rounded-[24px] border border-neutral-200/90 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] text-left"
              >
                <div className="mb-3.5 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold uppercase tracking-wider text-neutral-400">
                    Just do these 3 today
                  </h3>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                
                <div className="space-y-3">
                  {/* Task 1 */}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.4 }}
                    className="flex items-center gap-3"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                      1
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-ink leading-tight">
                        Physics Chapter 12 homework
                      </p>
                      <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                        Due tomorrow 8 AM
                      </p>
                    </div>
                  </motion.div>

                  {/* Task 2 */}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.55 }}
                    className="flex items-center gap-3"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                      2
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-ink leading-tight">
                        CCA briefing
                      </p>
                      <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                        Scheduled at 5:30 PM
                      </p>
                    </div>
                  </motion.div>

                  {/* Task 3 */}
                  <motion.div
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 100, damping: 15, delay: 0.7 }}
                    className="flex items-center gap-3"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                      3
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-ink leading-tight">
                        Coding practice (5h/wk)
                      </p>
                      <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">
                        Flexible block allocated
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              <div className="mt-2 flex justify-center">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                  <span>Entering inbox</span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-ink animate-ping" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </AppShell>
  );
}

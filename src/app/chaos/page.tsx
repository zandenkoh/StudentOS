"use client";

import { useEffect, useState } from "react";
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
  { id: 1, text: "Physics worksheet due tmr 8am", chip: "Screenshot", icon: Image, className: "left-4 top-4 w-[160px]", rotate: -6 },
  { id: 2, text: "Chapter 12 worksheet.pdf", chip: "PDF", icon: FileText, className: "right-4 top-8 w-[165px]", rotate: 5 },
  { id: 3, text: "CCA briefing 5:30pm", chip: "Message", icon: MessageSquare, className: "-left-3 top-24 w-[150px]", rotate: 8 },
  { id: 4, text: "Revision block scheduled", chip: "Event", icon: Calendar, className: "right-[-12px] top-[115px] w-[145px]", rotate: -5 },
  { id: 5, text: "1:24 voice note", chip: "Voice", icon: Mic, className: "left-10 top-[100px] w-[130px]", rotate: 5 },
  { id: 6, text: "Email: Project update", chip: "Email", icon: Mail, className: "right-6 top-[205px] w-[160px]", rotate: -4 },
  { id: 7, text: "Ask teammate about deck", chip: "Reminder", icon: Bell, className: "left-[-8px] top-[180px] w-[155px]", rotate: 10 },
  { id: 8, text: "Chemistry lab report", chip: "PDF", icon: FileText, className: "right-[-10px] top-[290px] w-[145px]", rotate: -7 },
  { id: 9, text: "Math tuition tomorrow", chip: "Event", icon: Calendar, className: "left-2 bottom-[140px] w-[160px]", rotate: -4 },
  { id: 10, text: "Buy poster board", chip: "Task", icon: FileText, className: "right-2 bottom-[150px] w-[145px]", rotate: 6 },
  { id: 11, text: "Late submission warning", chip: "Alert", icon: Bell, className: "-left-4 bottom-[230px] w-[150px]", rotate: 9 },
  { id: 12, text: "Coding practice 5h/wk", chip: "Goal", icon: Sparkles, className: "right-[-10px] bottom-[230px] w-[160px]", rotate: -8 },
  { id: 13, text: "Group chat transcript", chip: "Message", icon: MessageSquare, className: "left-4 bottom-4 w-[170px]", rotate: 5 },
  { id: 14, text: "Syllabus revision.pdf", chip: "PDF", icon: FileText, className: "right-6 bottom-8 w-[160px]", rotate: -6 },
  { id: 15, text: "11 Jun competition due", chip: "Deadline", icon: Calendar, className: "left-10 bottom-24 w-[165px]", rotate: -4 },
  { id: 16, text: "Voice note: teammate.wav", chip: "Voice", icon: Mic, className: "right-8 bottom-[80px] w-[150px]", rotate: 7 },
  { id: 17, text: "Tuition clash email", chip: "Email", icon: Mail, className: "left-[-15px] top-[280px] w-[140px]", rotate: -8 },
  { id: 18, text: "Ask physics teacher tmr", chip: "Reminder", icon: Bell, className: "right-[-12px] top-[375px] w-[160px]", rotate: 4 }
];

export default function ChaosPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"intro" | "populating" | "falling" | "reveal" | "leaving">("intro");
  const [visibleCardCount, setVisibleCardCount] = useState(0);

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
          // Wait a bit, then collapse/fall down
          setTimeout(() => {
            setStage("falling");
          }, 1000);
          return prev;
        }
        return prev + 1;
      });
    }, 120);

    return () => clearInterval(popupInterval);
  }, [stage]);

  useEffect(() => {
    if (stage !== "falling") return;

    // 3. Fall finishes after 900ms, then reveal the new narrative
    const fallTimer = setTimeout(() => {
      setStage("reveal");
    }, 1000);

    return () => clearTimeout(fallTimer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "reveal") return;

    // 4. Stay on the narrative for 2.6s, then start transitioning out
    const redirectTimer = setTimeout(() => {
      setStage("leaving");
    }, 2600);

    return () => clearTimeout(redirectTimer);
  }, [stage]);

  return (
    <AppShell hideHeader={true}>
      <motion.div
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
        {stage !== "reveal" && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {chaosCardsData.map((card, index) => {
              const isVisible = index < visibleCardCount;
              const Icon = card.icon;
              
              return (
                <motion.div
                  key={card.id}
                  className={`absolute z-20 rounded-[20px] border border-neutral-200/90 bg-white/95 p-3 shadow-soft backdrop-blur-sm ${card.className}`}
                  initial={{ opacity: 0, scale: 0.7, rotate: card.rotate, y: 0 }}
                  animate={
                    stage === "falling"
                      ? { 
                          opacity: 0, 
                          y: 850, 
                          rotate: card.rotate + (Math.random() * 30 - 15), 
                          scale: 0.95
                        }
                      : isVisible
                      ? { opacity: 1, scale: 1, rotate: card.rotate, y: 0 }
                      : { opacity: 0, scale: 0.7, rotate: card.rotate, y: 0 }
                  }
                  transition={
                    stage === "falling"
                      ? { 
                          type: "tween", 
                          ease: "easeIn", 
                          duration: 0.65, 
                          delay: index * 0.015 
                        }
                      : { 
                          type: "spring", 
                          stiffness: 260, 
                          damping: 18 
                        }
                  }
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className="flex size-7 items-center justify-center rounded-full bg-neutral-100">
                      <Icon className="size-3.5 text-neutral-700" />
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold text-neutral-500">
                      {card.chip}
                    </span>
                  </div>
                  <p className="truncate text-xs font-semibold leading-relaxed text-ink">
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
              className="z-10 mx-auto w-full max-w-[290px] text-center pointer-events-none"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 800, transition: { ease: "easeIn", duration: 0.6 } }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink mb-3">
                Everything is everywhere.
              </h1>
              <p className="text-[13px] font-medium leading-relaxed text-muted">
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
              className="z-10 mx-auto w-full max-w-[300px] text-center"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.75, ease: "easeOut", delay: 0.15 } }}
              exit={{ opacity: 0, scale: 0.95, y: -15, transition: { duration: 0.6, ease: "easeIn" } }}
              onAnimationComplete={() => {
                if ((stage as string) === "leaving") {
                  router.push("/input");
                }
              }}
            >
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink mb-3">
                One inbox for your school mess.
              </h1>
              <p className="text-[14px] font-medium leading-relaxed text-muted">
                StudentOS pulls everything together, parses your commitments, and builds your day.
              </p>
              <div className="mt-8 flex justify-center">
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

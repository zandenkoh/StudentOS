"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileText,
  Mail,
  MessageSquare,
  School,
  Sparkles,
  Target,
  Zap,
  CheckCircle2,
  Brain,
  Check
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PrimaryButton } from "@/components/buttons";
import { clearStudentOSDemoState } from "@/lib/demo-state";

const sourceChaos = [
  {
    icon: MessageSquare,
    label: "Class chat",
    text: "Bring chem file tmr. Also group check-in moved.",
    className: "left-4 top-[92px] rotate-[-4deg]"
  },
  {
    icon: Mail,
    label: "Email",
    text: "History essay rubric updated. Submit by 8pm.",
    className: "right-4 top-[146px] rotate-[5deg]"
  },
  {
    icon: Calendar,
    label: "Calendar",
    text: "CCA briefing overlaps tuition by 25 minutes.",
    className: "left-6 top-[205px] rotate-[2deg]"
  },
  {
    icon: FileText,
    label: "Worksheet",
    text: "Physics set has corrections due tomorrow.",
    className: "right-6 top-[266px] rotate-[-3deg]"
  }
];

const pressurePoints = [
  { label: "Due dates", value: "6", tone: "bg-[#FEE2E2] text-[#991B1B]" },
  { label: "Conflicts", value: "2", tone: "bg-[#FFEDD5] text-[#9A3412]" },
  { label: "Free hours", value: "1.5", tone: "bg-[#DBEAFE] text-[#1E3A8A]" }
];


const slowReveal = {
  initial: { opacity: 0, y: 46, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.38 },
  transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] }
} as const;

function WhatStudentOSDoesScrollytelling() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  const { scrollYProgress: activeProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // 1. Heading Opacities
  const header1Opacity = useTransform(activeProgress, [0, 0.22, 0.26], [1, 1, 0]);
  const header2Opacity = useTransform(activeProgress, [0.22, 0.26, 0.47, 0.51], [0, 1, 1, 0]);
  const header3Opacity = useTransform(activeProgress, [0.47, 0.51, 0.73, 0.77], [0, 1, 1, 0]);
  const header4Opacity = useTransform(activeProgress, [0.73, 0.77, 1.0], [0, 1, 1]);

  // 2. Phase 1 - Chaos Cards Animating In and Fading Out
  const chaosOpacity = useTransform(activeProgress, [0.0, 0.05, 0.24, 0.30], [0, 1, 1, 0]);
  const chaosScale = useTransform(activeProgress, [0.0, 0.20], [0.85, 1.0]);

  // Individual card positions and rotations (x, y, rotate)
  // Card 1: WhatsApp Chat (Left Top)
  const c1X = useTransform(activeProgress, [0.0, 0.20], [-80, -25]);
  const c1Y = useTransform(activeProgress, [0.0, 0.20], [20, 60]);
  const c1Rotate = useTransform(activeProgress, [0.0, 0.20], [-18, -4]);

  // Card 2: Email (Right Top)
  const c2X = useTransform(activeProgress, [0.0, 0.20], [80, 20]);
  const c2Y = useTransform(activeProgress, [0.0, 0.20], [80, 120]);
  const c2Rotate = useTransform(activeProgress, [0.0, 0.20], [15, 6]);

  // Card 3: PDF / Document (Left Bottom)
  const c3X = useTransform(activeProgress, [0.0, 0.20], [-95, -20]);
  const c3Y = useTransform(activeProgress, [0.0, 0.20], [240, 200]);
  const c3Rotate = useTransform(activeProgress, [0.0, 0.20], [-10, -3]);

  // Card 4: Calendar (Right Bottom)
  const c4X = useTransform(activeProgress, [0.0, 0.20], [90, 15]);
  const c4Y = useTransform(activeProgress, [0.0, 0.20], [280, 250]);
  const c4Rotate = useTransform(activeProgress, [0.0, 0.20], [12, 3]);

  // 3. Phase 2 - AI Scan & Extract
  const scanlineY = useTransform(activeProgress, [0.22, 0.45], [-20, 360]);
  const scanlineOpacity = useTransform(activeProgress, [0.20, 0.23, 0.44, 0.47], [0, 1, 1, 0]);

  // Extracted Cards fade in
  const extOpacity = useTransform(activeProgress, [0.26, 0.32, 0.46, 0.50], [0, 1, 1, 0]);
  const extY_stagger = useTransform(activeProgress, [0.26, 0.32], [20, 0]);

  // 4. Phase 3 - Timeline & Conflict
  const timelineOpacity = useTransform(activeProgress, [0.47, 0.51, 0.74, 0.78], [0, 1, 1, 0]);
  const timelineY = useTransform(activeProgress, [0.47, 0.51], [30, 0]);

  // Conflict Warning box
  const warningOpacity = useTransform(activeProgress, [0.51, 0.56, 0.65, 0.70], [0, 1, 1, 0]);
  const warningScale = useTransform(activeProgress, [0.51, 0.56], [0.9, 1.0]);

  // CCA Event Block Height and Colors
  const ccaHeight = useTransform(activeProgress, [0.60, 0.70], [68, 34]);
  const ccaBorderColor = useTransform(activeProgress, [0.60, 0.70], ["rgba(239, 68, 68, 0.8)", "rgba(16, 185, 129, 0.8)"]);
  const ccaBgColor = useTransform(activeProgress, [0.60, 0.70], ["rgba(239, 68, 68, 0.12)", "rgba(16, 185, 129, 0.12)"]);
  const ccaTextColor = useTransform(activeProgress, [0.60, 0.70], ["#FCA5A5", "#A7F3D0"]);
  
  // Status pills
  const conflictPillOpacity = useTransform(activeProgress, [0.51, 0.60], [1, 0]);
  const resolvedPillOpacity = useTransform(activeProgress, [0.65, 0.70], [0, 1]);

  // Resolved Success message card
  const resolvedCardOpacity = useTransform(activeProgress, [0.66, 0.71, 0.74, 0.77], [0, 1, 1, 0]);
  const resolvedCardY = useTransform(activeProgress, [0.66, 0.71], [15, 0]);

  // 5. Phase 4 - Final Consolidated Day Plan
  const planOpacity = useTransform(activeProgress, [0.73, 0.77], [0, 1]);
  const planScale = useTransform(activeProgress, [0.73, 0.78], [0.94, 1.0]);
  const planY = useTransform(activeProgress, [0.73, 0.77], [40, 0]);

  // Checkmark circles inside final plan
  const item1Check = useTransform(activeProgress, [0.78, 0.81], [0, 1]);
  const item2Check = useTransform(activeProgress, [0.81, 0.84], [0, 1]);
  const item3Check = useTransform(activeProgress, [0.84, 0.87], [0, 1]);
  const item4Check = useTransform(activeProgress, [0.87, 0.90], [0, 1]);

  if (prefersReducedMotion) {
    return (
      <div className="rounded-[32px] border border-[#BBF7D0] bg-[#F0FDF4] p-5 shadow-[0_30px_90px_rgba(21,128,61,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]">What StudentOS does</p>
            <h3 className="mt-1 text-[21px] font-black leading-tight text-ink">
              It turns scattered proof into a plan with reasons.
            </h3>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3 rounded-[24px] border border-[#BBF7D0] bg-white p-4 shadow-[0_14px_38px_rgba(21,128,61,0.08)]">
            <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-[13px] font-black text-white">4:10</div>
            <div>
              <p className="text-[14px] font-bold leading-5 text-ink">Physics Corrections</p>
              <p className="mt-1 text-[12px] font-medium leading-5 text-muted">Before tuition, matches syllabus due date.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-[24px] border border-[#BBF7D0] bg-white p-4 shadow-[0_14px_38px_rgba(21,128,61,0.08)]">
            <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-[13px] font-black text-white">5:00</div>
            <div>
              <p className="text-[14px] font-bold leading-5 text-ink">CCA Briefing</p>
              <p className="mt-1 text-[12px] font-medium leading-5 text-muted">Shortened (early exit). Team notified.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-[24px] border border-[#BBF7D0] bg-white p-4 shadow-[0_14px_38px_rgba(21,128,61,0.08)]">
            <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-[13px] font-black text-white">5:30</div>
            <div>
              <p className="text-[14px] font-bold leading-5 text-ink">Math Tuition</p>
              <p className="mt-1 text-[12px] font-medium leading-5 text-muted">Attend on-time, zero overlaps.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-[24px] border border-[#BBF7D0] bg-white p-4 shadow-[0_14px_38px_rgba(21,128,61,0.08)]">
            <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-[13px] font-black text-white">8:20</div>
            <div>
              <p className="text-[14px] font-bold leading-5 text-ink">History Essay</p>
              <p className="mt-1 text-[12px] font-medium leading-5 text-muted">Submit by 8:20 PM using updated rubric.</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-[13px] font-bold text-ink shadow-soft">
          <Target className="size-4 text-[#15803D]" />
          <span>Less guessing. Fewer missed commitments. A day that can actually happen.</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-[280vh] w-full">
      <div className="sticky top-12 h-[550px] w-full overflow-hidden flex flex-col justify-between py-2">
        {/* Dynamic Titles */}
        <div className="relative h-24 w-full">
          {/* Header 1 */}
          <motion.div style={{ opacity: header1Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]">What StudentOS does</span>
            <h3 className="mt-1 text-[18px] font-black leading-tight text-ink">1. We capture the daily chaos</h3>
            <p className="mt-1.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              Class chats, emails, syllabus files, calendars—all overlapping and unorganized.
            </p>
          </motion.div>
          
          {/* Header 2 */}
          <motion.div style={{ opacity: header2Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]">What StudentOS does</span>
            <h3 className="mt-1 text-[18px] font-black leading-tight text-ink">2. AI parses & extracts tasks</h3>
            <p className="mt-1.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              A glowing scanning pass automatically extracts commitments, due dates, and links.
            </p>
          </motion.div>

          {/* Header 3 */}
          <motion.div style={{ opacity: header3Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]">What StudentOS does</span>
            <h3 className="mt-1 text-[18px] font-black leading-tight text-ink">3. Auto-resolves schedule conflicts</h3>
            <p className="mt-1.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              It flags overlaps like a CCA meeting clashing with tuition, and proposes logic-based adjustments.
            </p>
          </motion.div>

          {/* Header 4 */}
          <motion.div style={{ opacity: header4Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#15803D]">What StudentOS does</span>
            <h3 className="mt-1 text-[18px] font-black leading-tight text-ink">4. Your clean, feasible day plan</h3>
            <p className="mt-1.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              A chronological plan designed to keep you focused. No guessing, no missed deadlines.
            </p>
          </motion.div>
        </div>

        {/* Mock Device Canvas */}
        <div className="relative w-full h-[410px] rounded-[28px] border border-neutral-900/10 bg-[#070A10] overflow-hidden p-4 shadow-[0_24px_50px_rgba(0,0,0,0.18)] flex flex-col">
          {/* Cyber grid & ambient glow */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293718_1px,transparent_1px),linear-gradient(to_bottom,#1f293718_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-60" />
          <div className="absolute top-0 right-0 size-28 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 size-28 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
          
          {/* Engine Header */}
          <div className="relative z-10 flex items-center justify-between border-b border-neutral-800/40 pb-2 mb-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold tracking-wider text-neutral-400 uppercase">StudentOS Parser</span>
            </div>
            <div className="text-[8px] font-bold text-neutral-500 uppercase bg-neutral-900/60 px-2 py-0.5 rounded-full">
              LIVE ENGINE
            </div>
          </div>

          {/* Engine Sandbox Content Area */}
          <div className="relative flex-1 w-full overflow-hidden">
            
            {/* Phase 1: Incoming Chaos Cards */}
            <motion.div
              style={{ opacity: chaosOpacity, scale: chaosScale }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* WhatsApp Card */}
              <motion.div
                style={{ x: c1X, y: c1Y, rotate: c1Rotate }}
                className="absolute w-[225px] rounded-2xl bg-white border border-neutral-200/80 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.1)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-600 uppercase tracking-wider">
                  <MessageSquare className="size-2.5" /> WhatsApp · Class
                </div>
                <p className="mt-1 text-[10.5px] font-bold text-ink leading-snug">
                  &quot;Bring chem file tmr. Also CCA briefing overlaps tuition by 25 mins&quot;
                </p>
              </motion.div>

              {/* Email Card */}
              <motion.div
                style={{ x: c2X, y: c2Y, rotate: c2Rotate }}
                className="absolute w-[225px] rounded-2xl bg-white border border-neutral-200/80 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.1)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-black text-blue-600 uppercase tracking-wider">
                  <Mail className="size-2.5" /> Email · Prof. Evans
                </div>
                <p className="mt-1 text-[10.5px] font-bold text-ink leading-snug">
                  &quot;History essay rubric updated. Submit tomorrow by 8:20pm.&quot;
                </p>
              </motion.div>

              {/* Calendar Card */}
              <motion.div
                style={{ x: c3X, y: c3Y, rotate: c3Rotate }}
                className="absolute w-[225px] rounded-2xl bg-white border border-neutral-200/80 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.1)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-black text-red-500 uppercase tracking-wider">
                  <Calendar className="size-2.5" /> Calendar · CCA
                </div>
                <p className="mt-1 text-[10.5px] font-bold text-ink leading-snug">
                  &quot;CCA Briefing: 5:00 PM - 6:00 PM today&quot;
                </p>
              </motion.div>

              {/* PDF Card */}
              <motion.div
                style={{ x: c4X, y: c4Y, rotate: c4Rotate }}
                className="absolute w-[225px] rounded-2xl bg-white border border-neutral-200/80 p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.1)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-black text-amber-600 uppercase tracking-wider">
                  <FileText className="size-2.5" /> Syllabus · Physics
                </div>
                <p className="mt-1 text-[10.5px] font-bold text-ink leading-snug">
                  &quot;Physics corrections set due tomorrow morning (4:10pm)&quot;
                </p>
              </motion.div>
            </motion.div>

            {/* Phase 2: AI Scanning laser line */}
            <motion.div
              style={{ y: scanlineY, opacity: scanlineOpacity }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 shadow-[0_0_12px_#10b981] z-20 pointer-events-none"
            />

            {/* Phase 2: Clean Extracted Cards */}
            <motion.div
              style={{ opacity: extOpacity, y: extY_stagger }}
              className="absolute inset-x-0 top-2 flex flex-col items-center gap-2 pointer-events-none"
            >
              <div className="w-[280px] rounded-xl border border-emerald-500/30 bg-[#0F1E19]/90 p-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Sparkles className="size-2" /> Extracted Event</span>
                  <span>WhatsApp</span>
                </div>
                <p className="text-white text-[11px] font-black mt-0.5">CCA Briefing</p>
                <p className="text-neutral-400 text-[9px]">Today · 5:00 PM - 6:00 PM</p>
              </div>

              <div className="w-[280px] rounded-xl border border-emerald-500/30 bg-[#0F1E19]/90 p-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Sparkles className="size-2" /> Extracted Event</span>
                  <span>WhatsApp</span>
                </div>
                <p className="text-white text-[11px] font-black mt-0.5">Math Tuition</p>
                <p className="text-neutral-400 text-[9px]">Today · 5:30 PM - 7:00 PM</p>
              </div>

              <div className="w-[280px] rounded-xl border border-emerald-500/30 bg-[#0F1E19]/90 p-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1"><Sparkles className="size-2" /> Extracted Task</span>
                  <span>Syllabus</span>
                </div>
                <p className="text-white text-[11px] font-black mt-0.5">Physics Corrections</p>
                <p className="text-neutral-400 text-[9px]">Due tomorrow · 4:10 PM Buffer</p>
              </div>
            </motion.div>

            {/* Phase 3: Timeline & Conflict Overlap */}
            <motion.div
              style={{ opacity: timelineOpacity, y: timelineY }}
              className="absolute inset-0 flex flex-col pointer-events-none"
            >
              <div className="flex-1 relative border-l border-neutral-850 ml-12">
                {/* Horizontal Dashed Hours */}
                <div className="absolute top-[30px] left-0 right-0 border-t border-dashed border-neutral-800/40" />
                <span className="absolute top-[22px] left-[-42px] text-[9px] font-bold text-neutral-500">4:00 PM</span>
                
                <div className="absolute top-[95px] left-0 right-0 border-t border-dashed border-neutral-800/40" />
                <span className="absolute top-[87px] left-[-42px] text-[9px] font-bold text-neutral-500">5:00 PM</span>

                <div className="absolute top-[160px] left-0 right-0 border-t border-dashed border-neutral-800/40" />
                <span className="absolute top-[152px] left-[-42px] text-[9px] font-bold text-neutral-500">6:00 PM</span>

                <div className="absolute top-[225px] left-0 right-0 border-t border-dashed border-neutral-800/40" />
                <span className="absolute top-[217px] left-[-42px] text-[9px] font-bold text-neutral-500">7:00 PM</span>

                <div className="absolute top-[290px] left-0 right-0 border-t border-dashed border-neutral-800/40" />
                <span className="absolute top-[282px] left-[-42px] text-[9px] font-bold text-neutral-500">8:00 PM</span>

                {/* Event block: CCA Briefing */}
                <motion.div
                  style={{
                    height: ccaHeight,
                    borderColor: ccaBorderColor,
                    backgroundColor: ccaBgColor
                  }}
                  className="absolute top-[95px] left-[10px] w-[100px] rounded-lg border-2 p-1 relative flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    <motion.p style={{ color: ccaTextColor }} className="text-[10px] font-bold leading-none">CCA Briefing</motion.p>
                    <p className="text-[7.5px] text-neutral-400 mt-0.5">5:00 PM</p>
                  </div>
                  
                  {/* Status pills inside block */}
                  <motion.div style={{ opacity: conflictPillOpacity }} className="absolute inset-0 flex items-center justify-center bg-red-950/65 rounded-md pointer-events-none">
                    <span className="text-[7.5px] font-black text-red-400 px-1 py-0.5 rounded bg-red-900/40 border border-red-500/20">CLASH</span>
                  </motion.div>
                  <motion.div style={{ opacity: resolvedPillOpacity }} className="absolute inset-0 flex items-center justify-center bg-emerald-950/65 rounded-md pointer-events-none">
                    <span className="text-[7.5px] font-black text-emerald-400 px-1 py-0.5 rounded bg-emerald-900/40 border border-emerald-500/20">OK</span>
                  </motion.div>
                </motion.div>

                {/* Event block: Math Tuition */}
                <div className="absolute top-[127.5px] right-[10px] w-[100px] h-[97.5px] rounded-lg border-2 border-indigo-500/40 bg-indigo-500/10 p-1 flex flex-col justify-between overflow-hidden">
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 leading-none">Math Tuition</p>
                    <p className="text-[7.5px] text-neutral-400 mt-0.5">5:30 - 7:00 PM</p>
                  </div>
                  <span className="text-[7px] font-bold text-indigo-400/75 tracking-wide">CONFIRMED</span>
                </div>

                {/* Overlap Clash indicator */}
                <motion.div
                  style={{ opacity: conflictPillOpacity }}
                  className="absolute top-[127.5px] left-[10px] w-[100px] h-[32.5px] border border-dashed border-red-500 bg-red-500/10 rounded-lg pointer-events-none"
                />
              </div>

              {/* Floating overlap warning block */}
              <motion.div
                style={{ opacity: warningOpacity, scale: warningScale }}
                className="absolute bottom-2 left-2 right-2 bg-red-950/90 border border-red-500/30 p-2 rounded-xl flex items-center gap-2 shadow-xl"
              >
                <AlertTriangle className="size-3.5 text-red-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] font-bold text-red-300 leading-none">Overlap Detected</p>
                  <p className="text-[8.5px] text-neutral-300 mt-0.5 leading-tight truncate">CCA overlaps Tuition by 30 mins.</p>
                </div>
              </motion.div>

              {/* Floating success resolution block */}
              <motion.div
                style={{ opacity: resolvedCardOpacity, y: resolvedCardY }}
                className="absolute bottom-2 left-2 right-2 bg-emerald-950/90 border border-emerald-500/30 p-2 rounded-xl flex items-center gap-2 shadow-xl"
              >
                <Brain className="size-3.5 text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] font-bold text-emerald-300 leading-none">AI Optimization</p>
                  <p className="text-[8.5px] text-neutral-300 mt-0.5 leading-tight truncate">Rescheduled CCA for early exit & notified team.</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Phase 4: Consolidated Day Plan */}
            <motion.div
              style={{ opacity: planOpacity, scale: planScale, y: planY }}
              className="absolute inset-0 flex flex-col p-1 pointer-events-none"
            >
              {/* Day Plan Header */}
              <div className="flex items-center justify-between bg-neutral-900/60 p-2 rounded-xl border border-neutral-800/40 mb-2.5">
                <div>
                  <p className="text-[7.5px] font-bold text-neutral-500 uppercase tracking-wider">CONSOLIDATED PLAN</p>
                  <p className="text-[11px] font-black text-white">Your Perfect Day</p>
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <Check className="size-2.5" /> Feasible Day
                </div>
              </div>

              {/* Optimized Plan Items */}
              <div className="flex-1 flex flex-col gap-1.5">
                {/* Item 1 */}
                <div className="flex gap-2 items-center bg-neutral-900/30 border border-neutral-800/30 p-1.5 rounded-xl">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                    4:10
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight">Physics Corrections</p>
                    <p className="text-[8px] text-neutral-400 leading-none mt-0.5 truncate">Done before tuition (matches due date)</p>
                  </div>
                  <motion.div style={{ opacity: item1Check }} className="shrink-0">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                  </motion.div>
                </div>

                {/* Item 2 */}
                <div className="flex gap-2 items-center bg-neutral-900/30 border border-neutral-800/30 p-1.5 rounded-xl">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                    5:00
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight">CCA Briefing</p>
                    <p className="text-[8px] text-neutral-400 leading-none mt-0.5 truncate">Shortened (early exit). Team notified.</p>
                  </div>
                  <motion.div style={{ opacity: item2Check }} className="shrink-0">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                  </motion.div>
                </div>

                {/* Item 3 */}
                <div className="flex gap-2 items-center bg-neutral-900/30 border border-neutral-800/30 p-1.5 rounded-xl">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                    5:30
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight">Math Tuition</p>
                    <p className="text-[8px] text-neutral-400 leading-none mt-0.5 truncate">Attend on-time, zero overlaps.</p>
                  </div>
                  <motion.div style={{ opacity: item3Check }} className="shrink-0">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                  </motion.div>
                </div>

                {/* Item 4 */}
                <div className="flex gap-2 items-center bg-neutral-900/30 border border-neutral-800/30 p-1.5 rounded-xl">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400">
                    8:20
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-white leading-tight">History Essay</p>
                    <p className="text-[8px] text-neutral-400 leading-none mt-0.5 truncate">Submit using updated email rubric.</p>
                  </div>
                  <motion.div style={{ opacity: item4Check }} className="shrink-0">
                    <CheckCircle2 className="size-3.5 text-emerald-400" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    clearStudentOSDemoState();
  }, []);

  return (
    <AppShell hideHeader={true}>
      <motion.div
        initial={{ opacity: 1 }}
        animate={isFadingOut ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        onAnimationComplete={() => {
          if (isFadingOut) {
            router.push("/chaos");
          }
        }}
        className="flex min-h-dvh flex-col bg-[#FAF9F6] px-6 pb-12 pt-16"
      >
        {/* Brand Pill */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-600 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <span>Student</span>
            <span className="flex size-[15px] items-center justify-center rounded-full bg-ink text-[8px] font-semibold text-white leading-none">
              OS
            </span>
            <span className="ml-0.5 text-neutral-300 font-normal">·</span>
            <span>Demo</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink mb-4 px-2">
            Turn school chaos into a plan you can actually follow.
          </h1>
          <p className="text-[17px] font-medium leading-relaxed text-neutral-500 px-3">
            School shouldn&apos;t feel like a project management nightmare. StudentOS automatically extracts commitments from your messy class chats, email threads, and syllabus files, resolving schedule conflicts to build a daily plan you can actually follow.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-8">
          <PrimaryButton
            onClick={() => {
              clearStudentOSDemoState();
              setIsFadingOut(true);
            }}
            className="relative justify-center px-6"
          >
            <span className="text-[15px] font-semibold">Start Demo</span>
            <ChevronRight className="absolute right-6 size-4" />
          </PrimaryButton>
        </div>

        {/* Trust Row */}
        <div className="mb-10 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Works seamlessly with
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-neutral-400">
            <MessageSquare className="size-5" />
            <Mail className="size-5" />
            <Calendar className="size-5" />
            <School className="size-5 animate-pulse" />
            <FileText className="size-5" />
          </div>
        </div>

        <section className="mt-14 space-y-20">
          <motion.div {...slowReveal} className="text-center">
            <h2 className="text-[25px] font-bold leading-tight tracking-tight text-ink">
              The problem is not that students are lazy.
            </h2>
            <p className="mt-4 text-[16px] font-medium leading-relaxed text-neutral-500">
              Your work is scattered across class group chats, PDF guidelines, email updates, and lecture slides. No student has the time to manually organize a dozen different platforms.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.42 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.24, delayChildren: 0.16 } }
            }}
            className="relative h-[380px] overflow-hidden rounded-[32px] border border-neutral-900/10 bg-[#111111] p-5 text-white shadow-[0_32px_90px_rgba(0,0,0,0.24)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(255,255,255,0.12),transparent_28%)]" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Input overload</p>
                <h3 className="mt-1 text-[18px] font-bold leading-tight">Every reminder lives somewhere else.</h3>
              </div>
            </div>
            {sourceChaos.map((source) => {
              const Icon = source.icon;
              return (
                <motion.div
                  key={source.label}
                  variants={{
                    hidden: { opacity: 0, y: 38, scale: 0.9, filter: "blur(6px)" },
                    show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
                  }}
                  transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute z-10 w-[235px] rounded-[24px] border border-white/80 bg-white p-3.5 text-ink shadow-[0_16px_32px_rgba(0,0,0,0.24),_0_8px_16px_rgba(0,0,0,0.16)] ${source.className}`}
                >
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                    <Icon className="size-3.5" />
                    {source.label}
                  </div>
                  <p className="mt-2 text-[13px] font-semibold leading-5">{source.text}</p>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            {...slowReveal}
            className="rounded-[32px] border border-neutral-200/90 bg-white p-5 shadow-[0_28px_85px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-start gap-3">
              <div>
                <h3 className="text-[20px] font-bold leading-tight text-ink">The cost is invisible until the day breaks.</h3>
                <p className="mt-3 text-[15px] font-medium leading-relaxed text-neutral-500">
                  Traditional calendars store items, but they don&apos;t warn you when you&apos;ve committed the same hours to three different things. StudentOS automatically scans your day to surface hidden schedule conflicts.
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {pressurePoints.map((point) => (
                <motion.div
                  key={point.label}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={`rounded-[20px] px-3 py-4 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)] ${point.tone}`}
                >
                  <p className="text-[24px] font-black leading-none">{point.value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em]">{point.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-[26px] bg-[#F7F7F8] p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]">
              <div className="relative h-[176px]">
                {/* Timeline background track */}
                <div className="absolute left-0 right-0 top-[85px] h-1 rounded-full bg-neutral-200/80" />
                
                {/* Timeline active progress */}
                <motion.div
                  initial={{ width: "14%" }}
                  whileInView={{ width: "76%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.1, ease: "easeInOut" }}
                  className="absolute left-0 top-[85px] h-1 rounded-full bg-ink"
                />

                {/* Timeline indicator dots */}
                <motion.div
                  initial={{ left: "4%" }}
                  whileInView={{ left: "8%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-[87px] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-neutral-400 z-20"
                />
                <motion.div
                  initial={{ left: "18%" }}
                  whileInView={{ left: "58%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-[87px] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-red-500 z-20"
                />

                {/* Conflict card (CCA/tuition overlap) */}
                <motion.div
                  initial={{ left: "18%" }}
                  whileInView={{ left: "58%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute bottom-[102px] z-10 w-[130px] rounded-xl border border-red-200 bg-white p-2.5 shadow-[0_8px_30px_rgba(239,68,68,0.08)] -translate-x-4"
                >
                  <p className="text-[11px] font-bold text-red-600">Conflict</p>
                  <p className="mt-1 text-[12px] font-semibold leading-tight text-ink">CCA and tuition overlap.</p>
                  <div className="absolute bottom-[-11px] left-4 w-[1px] h-[11px] bg-red-200" />
                </motion.div>

                {/* Deadline card (Physics corrections due) */}
                <motion.div
                  initial={{ left: "4%" }}
                  whileInView={{ left: "8%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-[102px] z-10 w-[130px] rounded-xl border border-neutral-200 bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] -translate-x-4"
                >
                  <p className="text-[11px] font-bold text-neutral-400">Deadline</p>
                  <p className="mt-1 text-[12px] font-semibold leading-tight text-ink">Physics due tomorrow.</p>
                  <div className="absolute top-[-13px] left-4 w-[1px] h-[13px] bg-neutral-300" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          <WhatStudentOSDoesScrollytelling />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 34 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[32px] bg-ink p-5 text-white shadow-[0_34px_90px_rgba(0,0,0,0.26)]"
          >
            <Zap className="size-6 text-white/70" />
            <h2 className="mt-3 text-[24px] font-black leading-tight">Try it with messy student inputs.</h2>
            <p className="mt-3 text-[15px] font-medium leading-relaxed text-white/75">
              Experience the full flow: parse unstructured student screenshots, extract actionable tasks, auto-detect schedule conflicts, and watch our agents generate a clean daily timeline.
            </p>
            <button
              onClick={() => {
                clearStudentOSDemoState();
                setIsFadingOut(true);
              }}
              className="mt-5 relative inline-flex h-[56px] w-full items-center justify-center rounded-full bg-white px-5 text-[15px] font-bold text-ink shadow-soft transition hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Start Demo</span>
              <ChevronRight className="absolute right-5 size-4" />
            </button>
          </motion.div>
        </section>
      </motion.div>
    </AppShell>
  );
}

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

  // 2. 3D Tilt of the Mockup Phone (Defying static box layouts!)
  const deviceRotateX = useTransform(activeProgress, [0.0, 0.25, 0.5, 0.75, 1.0], [6, -4, 5, -3, 0]);
  const deviceRotateY = useTransform(activeProgress, [0.0, 0.25, 0.5, 0.75, 1.0], [-10, 8, -8, 6, 0]);
  const deviceScale = useTransform(activeProgress, [0.0, 0.20, 0.45, 0.75, 1.0], [0.94, 1.02, 0.97, 1.04, 1.0]);

  // 3. Central Slot AI Engine Opacity & Scaling
  const slotOpacity = useTransform(activeProgress, [0.0, 0.05, 0.45, 0.49], [0, 1, 1, 0]);
  const slotScale = useTransform(activeProgress, [0.0, 0.08, 0.45, 0.49], [0.9, 1.0, 1.0, 0.9]);

  // 4. Phase 1 - Chaos Cards vacuum funnel (sucked from OUTSIDE the mockup into x: 0, y: 35)
  const chaosScale = useTransform(activeProgress, [0.0, 0.16, 0.22], [1.0, 0.80, 0.0]);
  const chaosOpacity = useTransform(activeProgress, [0.0, 0.04, 0.20, 0.22], [0, 1, 1, 0]);

  // Card 1: WhatsApp Chat (From far Left Top -> Center)
  const c1X = useTransform(activeProgress, [0.0, 0.22], [-145, 0]);
  const c1Y = useTransform(activeProgress, [0.0, 0.22], [-120, 35]);
  const c1Rotate = useTransform(activeProgress, [0.0, 0.22], [-18, 45]);

  // Card 2: Email (From far Right Top -> Center)
  const c2X = useTransform(activeProgress, [0.0, 0.22], [145, 0]);
  const c2Y = useTransform(activeProgress, [0.0, 0.22], [-70, 35]);
  const c2Rotate = useTransform(activeProgress, [0.0, 0.22], [14, -45]);

  // Card 3: PDF / Document (From far Left Bottom -> Center)
  const c3X = useTransform(activeProgress, [0.0, 0.22], [-155, 0]);
  const c3Y = useTransform(activeProgress, [0.0, 0.22], [115, 35]);
  const c3Rotate = useTransform(activeProgress, [0.0, 0.22], [-12, 30]);

  // Card 4: Calendar (From far Right Bottom -> Center)
  const c4X = useTransform(activeProgress, [0.0, 0.22], [155, 0]);
  const c4Y = useTransform(activeProgress, [0.0, 0.22], [165, 35]);
  const c4Rotate = useTransform(activeProgress, [0.0, 0.22], [12, -30]);

  // 5. Radial Particle Sparks Bursting on Intake (activeProgress 0.20 -> 0.28)
  const pOpacity = useTransform(activeProgress, [0.20, 0.22, 0.28], [0, 1, 0]);
  
  // Particle offsets (bursting out past phone borders)
  const p1X = useTransform(activeProgress, [0.20, 0.28], [0, 150]);
  const p1Y = useTransform(activeProgress, [0.20, 0.28], [35, 35]);
  
  const p2X = useTransform(activeProgress, [0.20, 0.28], [0, 85]);
  const p2Y = useTransform(activeProgress, [0.20, 0.28], [35, -80]);
  
  const p3X = useTransform(activeProgress, [0.20, 0.28], [0, -85]);
  const p3Y = useTransform(activeProgress, [0.20, 0.28], [35, -80]);

  const p4X = useTransform(activeProgress, [0.20, 0.28], [0, -150]);
  const p4Y = useTransform(activeProgress, [0.20, 0.28], [35, 35]);

  const p5X = useTransform(activeProgress, [0.20, 0.28], [0, -85]);
  const p5Y = useTransform(activeProgress, [0.20, 0.28], [35, 150]);

  const p6X = useTransform(activeProgress, [0.20, 0.28], [0, 85]);
  const p6Y = useTransform(activeProgress, [0.20, 0.28], [35, 150]);

  // Intake glowing ripple circles
  const rippleScale = useTransform(activeProgress, [0.18, 0.29], [0.6, 2.5]);
  const rippleOpacity = useTransform(activeProgress, [0.18, 0.21, 0.29], [0, 0.9, 0]);

  // 6. Phase 2 - Extracted dispenser popping out on Z-axis (scale: 1.25)
  const extOpacity = useTransform(activeProgress, [0.22, 0.28, 0.45, 0.49], [0, 1, 1, 0]);
  
  // Extracted 1: CCA Briefing
  const ext1Y = useTransform(activeProgress, [0.22, 0.34], [155, 225]);
  const ext1Scale = useTransform(activeProgress, [0.22, 0.28, 0.34, 0.38], [0.6, 1.25, 1.0, 1.0]);

  // Extracted 2: Math Tuition
  const ext2Y = useTransform(activeProgress, [0.25, 0.37], [155, 300]);
  const ext2Scale = useTransform(activeProgress, [0.25, 0.31, 0.37, 0.41], [0.6, 1.25, 1.0, 1.0]);

  // Extracted 3: Physics corrections
  const ext3Y = useTransform(activeProgress, [0.28, 0.40], [155, 70]);
  const ext3Scale = useTransform(activeProgress, [0.28, 0.34, 0.40, 0.44], [0.6, 1.25, 1.0, 1.0]);

  // 7. Phase 3 - Timeline & Overlaps
  const timelineOpacity = useTransform(activeProgress, [0.47, 0.51, 0.74, 0.78], [0, 1, 1, 0]);
  const timelineY = useTransform(activeProgress, [0.47, 0.51], [30, 0]);

  // 3D Warning Clash banner (popping out, rotating in space!)
  const warningOpacity = useTransform(activeProgress, [0.51, 0.56, 0.65, 0.70], [0, 1, 1, 0]);
  const warningScale = useTransform(activeProgress, [0.51, 0.56], [0.6, 1.15]);
  const warningRotateZ = useTransform(activeProgress, [0.51, 0.56], [-10, -3]);
  const warningRotateX = useTransform(activeProgress, [0.51, 0.56], [20, 8]);
  const warningRotateY = useTransform(activeProgress, [0.51, 0.56], [-20, -8]);

  // Red dashed overlap clash box
  const overlapBoxOpacity = useTransform(activeProgress, [0.51, 0.58, 0.60, 0.65], [0, 1, 1, 0]);

  const conflictPillOpacity = useTransform(activeProgress, [0.51, 0.60], [1, 0]);
  const resolvedPillOpacity = useTransform(activeProgress, [0.65, 0.70], [0, 1]);

  // 3D Resolved Success banner (sliding in with dynamic angle)
  const resolvedCardOpacity = useTransform(activeProgress, [0.66, 0.71, 0.74, 0.78], [0, 1, 1, 0]);
  const resolvedCardY = useTransform(activeProgress, [0.66, 0.71], [15, 0]);
  const resolvedScale = useTransform(activeProgress, [0.66, 0.71], [0.6, 1.12]);
  const resolvedRotateZ = useTransform(activeProgress, [0.66, 0.71], [10, 3]);
  const resolvedRotateX = useTransform(activeProgress, [0.66, 0.71], [-20, -8]);
  const resolvedRotateY = useTransform(activeProgress, [0.66, 0.71], [20, 8]);

  // CCA Event Block Height and Colors
  const ccaHeight = useTransform(activeProgress, [0.60, 0.70], [68, 34]);
  const ccaBorderColor = useTransform(activeProgress, [0.60, 0.70], ["#EF4444", "#10B981"]);
  const ccaBgColor = useTransform(activeProgress, [0.60, 0.70], ["#FEF2F2", "#ECFDF5"]);
  const ccaTextColor = useTransform(activeProgress, [0.60, 0.70], ["#991B1B", "#065F46"]);

  // 8. Phase 4 - Final Consolidated Day Plan
  const planOpacity = useTransform(activeProgress, [0.73, 0.77], [0, 1]);
  const planScale = useTransform(activeProgress, [0.73, 0.78], [0.90, 1.08]);
  const planY = useTransform(activeProgress, [0.73, 0.77], [40, 0]);
  const planRotateX = useTransform(activeProgress, [0.73, 0.78], [15, 0]);

  // Checkmarks drawing paths (0 to 1)
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
        <div className="relative h-22 w-full z-20">
          {/* Header 1 */}
          <motion.div style={{ opacity: header1Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#15803D] uppercase bg-[#E8F5E9] px-2.5 py-0.5 rounded-full mb-1">
              Phase 1
            </span>
            <h3 className="text-[18px] font-black leading-tight text-ink">We capture the daily chaos</h3>
            <p className="mt-0.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              Your unstructured chats, syllabus guides, emails, and calendar details.
            </p>
          </motion.div>
          
          {/* Header 2 */}
          <motion.div style={{ opacity: header2Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2.5 py-0.5 rounded-full mb-1">
              Phase 2
            </span>
            <h3 className="text-[18px] font-black leading-tight text-ink">AI extracts structured commitments</h3>
            <p className="mt-0.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              The AI Engine vacuums up unstructured inputs, parsing dates and clashing times.
            </p>
          </motion.div>

          {/* Header 3 */}
          <motion.div style={{ opacity: header3Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2.5 py-0.5 rounded-full mb-1">
              Phase 3
            </span>
            <h3 className="text-[18px] font-black leading-tight text-ink">Intelligently resolves overlaps</h3>
            <p className="mt-0.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              Detects overlaps instantly and adjusts schedules with smart logic buffers.
            </p>
          </motion.div>

          {/* Header 4 */}
          <motion.div style={{ opacity: header4Opacity }} className="absolute inset-x-0 top-0 flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2.5 py-0.5 rounded-full mb-1">
              Finished
            </span>
            <h3 className="text-[18px] font-black leading-tight text-ink">A plan you can actually follow</h3>
            <p className="mt-0.5 text-[12px] font-medium text-neutral-500 max-w-[320px] leading-relaxed">
              A logical, stress-free schedule loaded with actionable due dates.
            </p>
          </motion.div>
        </div>

        {/* 3D Perspective Device Stage */}
        <div className="relative w-full h-[415px] flex items-center justify-center" style={{ perspective: 1000 }}>
          
          {/* Centered canvas aligning boundary-defying cards */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            
            {/* Phase 1: Boundary-Defying Chaos Cards (Funnels from outside) */}
            <motion.div
              style={{ opacity: chaosOpacity, scale: chaosScale }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* WhatsApp Card (Left Top -> Center) */}
              <motion.div
                style={{ x: c1X, y: c1Y, rotate: c1Rotate }}
                className="absolute w-[220px] rounded-xl border border-neutral-200/80 bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-600 uppercase tracking-wider">
                  <MessageSquare className="size-2.5" /> Chat · WhatsApp
                </div>
                <p className="mt-1 text-[10px] font-bold text-ink leading-snug">
                  &quot;Bring chem file tmr. Also CCA briefing overlaps tuition at 5:30&quot;
                </p>
              </motion.div>

              {/* Email Card (Right Top -> Center) */}
              <motion.div
                style={{ x: c2X, y: c2Y, rotate: c2Rotate }}
                className="absolute w-[220px] rounded-xl border border-neutral-200/80 bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-blue-500 uppercase tracking-wider">
                  <Mail className="size-2.5" /> Email · Prof. Evans
                </div>
                <p className="mt-1 text-[10px] font-bold text-ink leading-snug">
                  &quot;History essay rubric updated. Submit by 8:20pm tomorrow.&quot;
                </p>
              </motion.div>

              {/* PDF Card (Left Bottom -> Center) */}
              <motion.div
                style={{ x: c3X, y: c3Y, rotate: c3Rotate }}
                className="absolute w-[220px] rounded-xl border border-neutral-200/80 bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-amber-600 uppercase tracking-wider">
                  <FileText className="size-2.5" /> Syllabus · Physics
                </div>
                <p className="mt-1 text-[10px] font-bold text-ink leading-snug">
                  &quot;Physics corrections corrections due tomorrow morning before CCA&quot;
                </p>
              </motion.div>

              {/* Calendar Card (Right Bottom -> Center) */}
              <motion.div
                style={{ x: c4X, y: c4Y, rotate: c4Rotate }}
                className="absolute w-[220px] rounded-xl border border-neutral-200/80 bg-white p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] left-1/2 -translate-x-1/2"
              >
                <div className="flex items-center gap-1.5 text-[8px] font-bold text-red-500 uppercase tracking-wider">
                  <Calendar className="size-2.5" /> Calendar · CCA
                </div>
                <p className="mt-1 text-[10px] font-bold text-ink leading-snug">
                  &quot;Tuition overlaps CCA briefing 5:00 - 6:00 PM today&quot;
                </p>
              </motion.div>
            </motion.div>

            {/* Phase 2: Radial Spark Explosion Particles (Explodes outwards from center) */}
            <motion.div style={{ opacity: pOpacity }} className="absolute inset-0 pointer-events-none">
              <motion.div style={{ x: p1X, y: p1Y }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <motion.div style={{ x: p2X, y: p2Y }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <motion.div style={{ x: p3X, y: p3Y }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <motion.div style={{ x: p4X, y: p4Y }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <motion.div style={{ x: p5X, y: p5Y }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <motion.div style={{ x: p6X, y: p6Y }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            </motion.div>

            {/* Glowing Intake Ripples */}
            <motion.div
              style={{ scale: rippleScale, opacity: rippleOpacity }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-48 rounded-full border border-emerald-400 bg-emerald-500/5 pointer-events-none"
            />
          </div>

          {/* 3D Mockup Device Frame */}
          <motion.div
            style={{
              rotateX: deviceRotateX,
              rotateY: deviceRotateY,
              scale: deviceScale,
              transformStyle: "preserve-3d"
            }}
            className="w-[310px] h-[400px] rounded-[28px] border border-neutral-200 bg-[#FAF9F6] p-4 shadow-[0_24px_50px_rgba(0,0,0,0.06)] flex flex-col relative transition-shadow duration-300"
          >
            {/* Cyber light grid & ambient mint glow */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb70_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb70_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-80" />
            <div className="absolute top-0 right-0 size-28 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
            
            {/* Sandbox Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-neutral-200 pb-2 mb-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-[#15803D] animate-pulse" />
                <span className="text-[9px] font-bold tracking-wider text-neutral-500 uppercase">StudentOS AI Core</span>
              </div>
              <div className="text-[8px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                Engine Sandbox
              </div>
            </div>

            {/* Sandbox Inner Content Viewport */}
            <div className="relative flex-1 w-full overflow-hidden bg-white/60 border border-neutral-100/60 rounded-2xl shadow-inner">
              
              {/* Phase 1 & 2: Central AI Parser Slot */}
              <motion.div
                style={{ opacity: slotOpacity, scale: slotScale }}
                className="absolute left-1/2 top-[135px] -translate-x-1/2 w-[240px] h-[52px] border border-emerald-500/60 bg-emerald-50/90 rounded-2xl flex items-center justify-between px-3.5 z-10 shadow-[0_8px_24px_rgba(16,185,129,0.06)] pointer-events-none"
              >
                <div className="flex items-center gap-2">
                  <Brain className="size-3.5 text-emerald-600 animate-pulse" />
                  <div className="text-left">
                    <p className="text-[9px] font-black text-emerald-800 leading-none">AI PARSER SLOT</p>
                    <p className="text-[7.5px] text-emerald-600/80 mt-0.5 font-semibold">Feed chaotic inputs...</p>
                  </div>
                </div>
                <Sparkles className="size-3 text-emerald-500" />
              </motion.div>

              {/* Phase 2: Extracted dispenser flowing on Z-axis */}
              <motion.div
                style={{ opacity: extOpacity }}
                className="absolute inset-0 pointer-events-none"
              >
                {/* Extracted Card 1 */}
                <motion.div
                  style={{ y: ext1Y, scale: ext1Scale }}
                  className="absolute left-1/2 -translate-x-1/2 w-[240px] rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-2 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[7px] font-bold text-emerald-700 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Sparkles className="size-2" /> Extracted Event</span>
                    <span>WhatsApp</span>
                  </div>
                  <p className="text-emerald-900 text-[10px] font-bold mt-0.5 leading-none">CCA Briefing</p>
                  <p className="text-emerald-700 text-[8px] mt-0.5">Today · 5:00 PM - 6:00 PM</p>
                </motion.div>

                {/* Extracted Card 2 */}
                <motion.div
                  style={{ y: ext2Y, scale: ext2Scale }}
                  className="absolute left-1/2 -translate-x-1/2 w-[240px] rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-2 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[7px] font-bold text-emerald-700 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Sparkles className="size-2" /> Extracted Event</span>
                    <span>Calendar</span>
                  </div>
                  <p className="text-emerald-900 text-[10px] font-bold mt-0.5 leading-none">Math Tuition</p>
                  <p className="text-emerald-700 text-[8px] mt-0.5">Today · 5:30 PM - 7:00 PM</p>
                </motion.div>

                {/* Extracted Card 3 */}
                <motion.div
                  style={{ y: ext3Y, scale: ext3Scale }}
                  className="absolute left-1/2 -translate-x-1/2 w-[240px] rounded-xl border border-emerald-500/20 bg-emerald-50/50 p-2 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[7px] font-bold text-emerald-700 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Sparkles className="size-2" /> Extracted Task</span>
                    <span>Syllabus</span>
                  </div>
                  <p className="text-emerald-900 text-[10px] font-bold mt-0.5 leading-none">Physics Corrections</p>
                  <p className="text-emerald-700 text-[8px] mt-0.5">Due tomorrow · 4:10 PM buffer</p>
                </motion.div>
              </motion.div>

              {/* Phase 3: Timeline (Confined inside, but clash pop-outs will defy phone limits below) */}
              <motion.div
                style={{ opacity: timelineOpacity, y: timelineY }}
                className="absolute inset-0 flex flex-col pointer-events-none"
              >
                <div className="flex-1 relative border-l border-neutral-250 ml-12">
                  <div className="absolute top-[30px] left-0 right-0 border-t border-dashed border-neutral-200" />
                  <span className="absolute top-[22px] left-[-42px] text-[8.5px] font-bold text-neutral-400">4:00 PM</span>
                  
                  <div className="absolute top-[95px] left-0 right-0 border-t border-dashed border-neutral-200" />
                  <span className="absolute top-[87px] left-[-42px] text-[8.5px] font-bold text-neutral-400">5:00 PM</span>

                  <div className="absolute top-[160px] left-0 right-0 border-t border-dashed border-neutral-200" />
                  <span className="absolute top-[152px] left-[-42px] text-[8.5px] font-bold text-neutral-400">6:00 PM</span>

                  <div className="absolute top-[225px] left-0 right-0 border-t border-dashed border-neutral-200" />
                  <span className="absolute top-[217px] left-[-42px] text-[8.5px] font-bold text-neutral-400">7:00 PM</span>

                  <div className="absolute top-[290px] left-0 right-0 border-t border-dashed border-neutral-200" />
                  <span className="absolute top-[282px] left-[-42px] text-[8.5px] font-bold text-neutral-400">8:00 PM</span>

                  {/* CCA Briefing event block */}
                  <motion.div
                    style={{
                      height: ccaHeight,
                      borderColor: ccaBorderColor,
                      backgroundColor: ccaBgColor
                    }}
                    className="absolute top-[95px] left-[10px] w-[85px] rounded-lg border-2 p-1 relative flex flex-col justify-between overflow-hidden transition-colors duration-250"
                  >
                    <div>
                      <motion.p style={{ color: ccaTextColor }} className="text-[9px] font-black leading-none">CCA Briefing</motion.p>
                      <p className="text-[7px] text-neutral-500 mt-0.5">5:00 PM</p>
                    </div>
                    
                    {/* Clash status labels */}
                    <motion.div style={{ opacity: conflictPillOpacity }} className="absolute inset-0 flex items-center justify-center bg-red-100/90 rounded-md pointer-events-none">
                      <span className="text-[7px] font-black text-red-700 px-1 py-0.5 rounded bg-red-50 border border-red-200">CLASH</span>
                    </motion.div>
                    <motion.div style={{ opacity: resolvedPillOpacity }} className="absolute inset-0 flex items-center justify-center bg-emerald-100/90 rounded-md pointer-events-none">
                      <span className="text-[7px] font-black text-emerald-700 px-1 py-0.5 rounded bg-emerald-50 border border-emerald-200">OK</span>
                    </motion.div>
                  </motion.div>

                  {/* Math Tuition event block */}
                  <div className="absolute top-[127.5px] right-[10px] w-[85px] h-[97.5px] rounded-lg border-2 border-indigo-200 bg-indigo-50/50 p-1 flex flex-col justify-between overflow-hidden">
                    <div>
                      <p className="text-[9px] font-black text-indigo-700 leading-none">Math Tuition</p>
                      <p className="text-[7px] text-indigo-500 mt-0.5">5:30 - 7:00 PM</p>
                    </div>
                    <span className="text-[7px] font-bold text-indigo-600/70 tracking-wide">CONFIRMED</span>
                  </div>

                  {/* Red dashed overlap clash box */}
                  <motion.div
                    style={{ opacity: overlapBoxOpacity }}
                    className="absolute top-[127.5px] left-[10px] w-[85px] h-[32.5px] border border-dashed border-red-400 bg-red-50/40 rounded-lg pointer-events-none"
                  />
                </div>
              </motion.div>

              {/* Phase 4: Day Plan Card inside sandbox (will pop out of frame using planScale below) */}
              <motion.div
                style={{ opacity: planOpacity, scale: planScale, y: planY, rotateX: planRotateX }}
                className="absolute inset-0 flex flex-col p-1 pointer-events-none"
              >
                <div className="flex items-center justify-between bg-neutral-50 p-2 rounded-xl border border-neutral-100/90 mb-2">
                  <div>
                    <p className="text-[7.5px] font-bold text-neutral-400 uppercase tracking-wider">CONSOLIDATED PLAN</p>
                    <p className="text-[11px] font-black text-ink">Your Perfect Day</p>
                  </div>
                  <div className="flex items-center gap-0.5 text-[8.5px] font-bold text-[#15803D] bg-[#E8F5E9] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                    <Check className="size-2.5" /> 100% Feasible
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex gap-2 items-center bg-white border border-neutral-100 p-1.5 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#E8F5E9] border border-[#BBF7D0] text-[9px] font-bold text-[#15803D]">
                      4:10
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-ink leading-tight">Physics Corrections</p>
                      <p className="text-[8px] text-neutral-500 leading-none mt-0.5 truncate">Done before tuition (matches due date)</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center size-5 bg-[#E8F5E9] rounded-full">
                      <svg className="size-3 text-[#15803D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ pathLength: item1Check }} />
                      </svg>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center bg-white border border-neutral-100 p-1.5 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#E8F5E9] border border-[#BBF7D0] text-[9px] font-bold text-[#15803D]">
                      5:00
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-ink leading-tight">CCA Briefing</p>
                      <p className="text-[8px] text-neutral-500 leading-none mt-0.5 truncate">Shortened (early exit). Team notified.</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center size-5 bg-[#E8F5E9] rounded-full">
                      <svg className="size-3 text-[#15803D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ pathLength: item2Check }} />
                      </svg>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center bg-white border border-neutral-100 p-1.5 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#E8F5E9] border border-[#BBF7D0] text-[9px] font-bold text-[#15803D]">
                      5:30
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-ink leading-tight">Math Tuition</p>
                      <p className="text-[8px] text-neutral-500 leading-none mt-0.5 truncate">Attend on-time, zero overlaps.</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center size-5 bg-[#E8F5E9] rounded-full">
                      <svg className="size-3 text-[#15803D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ pathLength: item3Check }} />
                      </svg>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center bg-white border border-neutral-100 p-1.5 rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[#E8F5E9] border border-[#BBF7D0] text-[9px] font-bold text-[#15803D]">
                      8:20
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-ink leading-tight">History Essay</p>
                      <p className="text-[8px] text-neutral-500 leading-none mt-0.5 truncate">Submit using updated email rubric.</p>
                    </div>
                    <div className="shrink-0 flex items-center justify-center size-5 bg-[#E8F5E9] rounded-full">
                      <svg className="size-3 text-[#15803D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <motion.path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" style={{ pathLength: item4Check }} />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Phase 3 Boundary-Defying 3D Popouts (Renders OUTSIDE device markup stack!) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            
            {/* Clashing overlap warning popout (tilting in 3D perspective!) */}
            <motion.div
              style={{
                opacity: warningOpacity,
                scale: warningScale,
                rotateZ: warningRotateZ,
                rotateX: warningRotateX,
                rotateY: warningRotateY,
                transformStyle: "preserve-3d"
              }}
              className="absolute w-[280px] bg-red-50 border-2 border-red-400 p-3 rounded-2xl flex items-center gap-2.5 shadow-[0_20px_45px_rgba(239,68,68,0.18)]"
            >
              <AlertTriangle className="size-4.5 text-red-600 shrink-0 animate-pulse" />
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-black text-red-800 leading-none">Overlap Detected</p>
                <p className="text-[9px] text-red-600 mt-1 font-semibold leading-tight">CCA Briefing overlaps Tuition by 30 mins.</p>
              </div>
            </motion.div>

            {/* Resolved success banner popout (tilting green indicator!) */}
            <motion.div
              style={{
                opacity: resolvedCardOpacity,
                y: resolvedCardY,
                scale: resolvedScale,
                rotateZ: resolvedRotateZ,
                rotateX: resolvedRotateX,
                rotateY: resolvedRotateY,
                transformStyle: "preserve-3d"
              }}
              className="absolute w-[280px] bg-emerald-50 border-2 border-emerald-400 p-3 rounded-2xl flex items-center gap-2.5 shadow-[0_20px_45px_rgba(16,185,129,0.18)]"
            >
              <Brain className="size-4.5 text-emerald-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10.5px] font-black text-emerald-800 leading-none">AI Optimization</p>
                <p className="text-[9px] text-emerald-600 mt-1 font-semibold leading-tight">Rescheduled CCA for early exit & notified team.</p>
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
            An AI chief of staff that turns messy class chats, emails, and syllabus files into a conflict-free daily plan. Less organizing, more execution.
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

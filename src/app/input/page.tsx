"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Image, Globe2,
  Paperclip, ArrowUp, X, Play, Pause, Volume2, Sparkles, ChevronRight,
  type LucideIcon
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BottomSheet } from "@/components/bottom-sheet";

type InputSource = {
  id: string;
  icon: LucideIcon;
  title: string;
  source: string;
  snippet: string;
  fileSize?: string;
  fileType?: "pdf" | "image" | "audio" | "text" | "link" | "email";
  filePath?: string;
};

const exampleSources: InputSource[] = [
  {
    id: "goal-demo",
    icon: FileText,
    title: "goalDemo.txt",
    source: "Assets File",
    snippet: "I currently have zero experience coding with python. I want to be proficient in data-handling Python libraries by the end of this year.",
    fileSize: "1 KB",
    fileType: "text",
    filePath: "/goalDemo.txt"
  },
  {
    id: "wa-image",
    icon: Image,
    title: "IMG-20260609-WA0004.jpg",
    source: "WhatsApp Image",
    snippet: "Extracted chat screenshot with team updates",
    fileSize: "185 KB",
    fileType: "image",
    filePath: "/IMG-20260609-WA0004.jpg"
  },
  {
    id: "physics-screenshot",
    icon: Image,
    title: "Screenshot 2026-06-09 121842.jpg",
    source: "Desktop Screenshot",
    snippet: "Physics assignment portal and due details",
    fileSize: "324 KB",
    fileType: "image",
    filePath: "/Screenshot%202026-06-09%20121842.jpg"
  },
  {
    id: "cca-screenshot",
    icon: Image,
    title: "Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg",
    source: "Mobile Screenshot",
    snippet: "CCA notification chat announcement",
    fileSize: "492 KB",
    fileType: "image",
    filePath: "/Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg"
  },
  {
    id: "tuition-screenshot",
    icon: Image,
    title: "Screenshot 2026-06-09 123905.jpg",
    source: "Desktop Screenshot",
    snippet: "Tuition calendar timetable schedule",
    fileSize: "210 KB",
    fileType: "image",
    filePath: "/Screenshot%202026-06-09%20123905.jpg"
  },
  {
    id: "sticky-chemistry",
    icon: Sparkles,
    title: "Chemistry Lab prep",
    source: "Sticky Note",
    snippet: "Revise stoichiometry calculations for the lab report due tomorrow.",
    fileSize: "12 KB",
    fileType: "text"
  },
  {
    id: "sticky-teammate",
    icon: Sparkles,
    title: "Follow-up",
    source: "Sticky Note",
    snippet: "Ask teammate about slide deck design reviews.",
    fileSize: "8 KB",
    fileType: "text"
  }
];

export default function InputPage() {
  const router = useRouter();
  const [sources, setSources] = useState<InputSource[]>([]);
  const [inputText, setInputText] = useState("");
  const [isInjecting, setIsInjecting] = useState(false);
  const [previewSource, setPreviewSource] = useState<InputSource | null>(null);
  
  // Audio player state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const injectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  // Audio simulation
  useEffect(() => {
    if (audioPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setAudioTime((prev) => {
          if (prev >= 84) {
            setAudioPlaying(false);
            if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    }
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, [audioPlaying]);

  useEffect(() => {
    return () => {
      if (injectionIntervalRef.current) {
        clearInterval(injectionIntervalRef.current);
      }
    };
  }, []);

  const handlePlayPause = () => {
    setAudioPlaying(!audioPlaying);
  };

  const formatAudioTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Add text from textarea
  const handleAddText = () => {
    if (!inputText.trim()) return;
    const newSource: InputSource = {
      id: `custom-text-${Date.now()}`,
      icon: FileText,
      title: "Typed Note",
      source: "Manual Input",
      snippet: inputText.trim(),
      fileSize: `${Math.round(inputText.length * 0.1)} KB`,
      fileType: "text"
    };
    setSources((prev) => [newSource, ...prev]);
    setInputText("");
  };

  // Trigger file upload simulation
  const handleSimulateUpload = () => {
    const mockFiles: InputSource[] = [
      {
        id: `uploaded-img-${Date.now()}`,
        icon: Image,
        title: "schedule_screenshot.png",
        source: "Upload",
        snippet: "Timetable schedule and tuition slots",
        fileSize: "320 KB",
        fileType: "image"
      },
      {
        id: `uploaded-pdf-${Date.now()}`,
        icon: FileText,
        title: "syllabus_draft.pdf",
        source: "Upload",
        snippet: "Syllabus goals and reading milestones",
        fileSize: "2.1 MB",
        fileType: "pdf"
      }
    ];
    // Add one randomly
    const randomFile = mockFiles[Math.floor(Math.random() * mockFiles.length)];
    setSources((prev) => [randomFile, ...prev]);
  };

  // Inject example sources one by one
  const handleInjectExamples = () => {
    if (isInjecting) return;
    setIsInjecting(true);
    setSources([]);

    let currentIndex = 0;
    injectionIntervalRef.current = setInterval(() => {
      const nextSource = exampleSources[currentIndex];

      if (!nextSource) {
        if (injectionIntervalRef.current) {
          clearInterval(injectionIntervalRef.current);
          injectionIntervalRef.current = null;
        }
        setIsInjecting(false);
        return;
      }

      setSources((prev) => [...prev, nextSource]);
      currentIndex++;

      if (currentIndex >= exampleSources.length) {
        if (injectionIntervalRef.current) {
          clearInterval(injectionIntervalRef.current);
          injectionIntervalRef.current = null;
        }
        setIsInjecting(false);
      }
    }, 280);
  };

  const handleRemoveSource = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSources((prev) => prev.filter((item) => item.id !== id));
  };

  const handleOpenPreview = (source: InputSource) => {
    setPreviewSource(source);
    setAudioPlaying(false);
    setAudioTime(0);
  };

  const handleAnalyse = () => {
    if (sources.length === 0) return;
    router.push("/agents");
  };

  return (
    <AppShell 
      hideHeader={false} 
      stepLabel="Inbox Capture" 
      progress={sources.length > 0 ? 0.33 : 0.15}
    >
      <div className="safe-bottom-padding relative flex min-h-[calc(100dvh-140px)] flex-col px-5 pt-2">
        {/* Screen Title */}
        <div className="mb-6 text-center">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink mb-1">
            Drop the mess here
          </h1>
          <p className="text-[13px] font-medium text-muted">
            Add your scattered sources or inject the demo inputs to see the magic.
          </p>
        </div>

        {/* ChatGPT-style Input Container */}
        <div className="relative rounded-[24px] border border-neutral-200 bg-white p-3 shadow-[0_8px_32px_rgba(0,0,0,0.03)] focus-within:border-neutral-400 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a reminder, paste a syllabus, or write goals..."
            className="w-full resize-none border-0 p-1 text-[15px] font-medium text-ink placeholder:text-neutral-400 focus:outline-none focus:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddText();
              }
            }}
          />
          
          <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2.5">
            <button
              onClick={handleSimulateUpload}
              className="flex size-9 items-center justify-center rounded-full bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-ink transition-colors"
              title="Upload file"
            >
              <Paperclip className="size-4.5" />
            </button>

            <button
              disabled={!inputText.trim()}
              onClick={handleAddText}
              className={`flex size-9 items-center justify-center rounded-full transition-all ${
                inputText.trim() 
                  ? "bg-ink text-white hover:scale-105" 
                  : "bg-neutral-100 text-neutral-300"
              }`}
            >
              <ArrowUp className="size-4.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Attach Example Input Button */}
        <div className="mt-4 flex justify-center">
          <button
            disabled={isInjecting}
            onClick={handleInjectExamples}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.04)] border transition-all ${
              isInjecting 
                ? "bg-neutral-50 text-neutral-400 border-neutral-100 cursor-not-allowed"
                : "bg-[#FAFAFA] text-neutral-700 border-neutral-200 hover:bg-neutral-100"
            }`}
          >
            <Sparkles className={`size-3.5 ${isInjecting ? "animate-spin" : "text-amber-500"}`} />
            <span>Attach example input</span>
          </button>
        </div>

        {/* Added Sources List */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Captured Sources ({sources.length})
            </p>
            {sources.length > 0 && (
              <button 
                onClick={() => setSources([])} 
                className="text-[11px] font-bold text-neutral-400 hover:text-red-500 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {sources.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-[20px] border border-dashed border-neutral-200 p-8 text-center text-xs font-medium text-neutral-400"
              >
                Inbox is empty. Click &quot;Attach example input&quot; above to load realistic demo files.
              </motion.div>
            ) : (
              <div className="space-y-2.5">
                {sources.map((source) => {
                  const Icon = source.icon;
                  return (
                    <motion.div
                      key={source.id}
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      onClick={() => handleOpenPreview(source)}
                      className="group flex cursor-pointer items-center gap-3.5 rounded-[20px] border border-neutral-200 bg-white p-3.5 shadow-sm hover:border-neutral-300 transition-all"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-neutral-50 text-neutral-600 group-hover:bg-neutral-100 transition-colors">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14px] font-bold text-ink leading-tight">
                            {source.title}
                          </p>
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-400">
                            {source.fileSize || "10 KB"}
                          </span>
                        </div>
                        <p className="truncate text-xs font-medium text-muted mt-0.5">
                          {source.snippet}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="hidden sm:inline-flex rounded-full bg-[#FAFAFA] border border-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-500">
                          {source.source}
                        </span>
                        <button
                          onClick={(e) => handleRemoveSource(source.id, e)}
                          className="flex size-7 items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-ink transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Action Container */}
        <div className="fixed-bottom-action">
          <button
            disabled={sources.length === 0}
            onClick={handleAnalyse}
            className={`w-full flex h-13 items-center justify-center gap-2 rounded-full font-bold text-[15px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
              sources.length > 0 
                ? "bg-ink text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
                : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
            }`}
          >
            <span>Analyse</span>
            <ChevronRight className="size-4.5" />
          </button>
        </div>

      </div>

      {/* Attachment Preview Modal */}
      <BottomSheet
        open={previewSource !== null}
        title={previewSource?.title ?? "File Preview"}
        subtitle={previewSource ? `${previewSource.source} · ${previewSource.fileSize}` : undefined}
        onClose={() => setPreviewSource(null)}
      >
        <div className="w-full pb-4">
          {previewSource?.fileType === "pdf" && (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 font-mono text-xs text-neutral-700 space-y-3">
              <div className="border-b border-neutral-200 pb-2 flex justify-between font-sans font-semibold text-[10px] uppercase text-neutral-400">
                <span>physics_chapter12.pdf</span>
                <span>Page 1 of 1</span>
              </div>
              <p className="font-sans font-bold text-sm text-ink">Chapter 12: Electromagnetic Induction</p>
              <p className="leading-relaxed font-sans text-neutral-600">
                Determine the magnetic flux and calculate the induced electromotive force (EMF) in a coil of 500 turns when the magnetic field changes from 0.1 T to 0.5 T in 2.0 seconds.
              </p>
              <p className="leading-relaxed font-sans text-neutral-600">
                Explain how Lenz&apos;s law dictates the direction of the induced current in accordance with the conservation of energy.
              </p>
              <div className="rounded-lg bg-amber-50/70 p-2.5 border border-amber-100 font-sans text-amber-800 text-[11px] font-semibold">
                ⚠️ Submit all problems via LMS before 10 June (tomorrow) at 8:00 AM.
              </div>
            </div>
          )}

          {previewSource?.fileType === "image" && (
            previewSource.filePath ? (
              <div className="rounded-xl border border-neutral-100 bg-[#FAFAFA] overflow-hidden shadow-sm flex items-center justify-center p-2">
                <img 
                  src={previewSource.filePath} 
                  className="max-h-[50vh] w-auto object-contain rounded-lg shadow-sm" 
                  alt={previewSource.title} 
                />
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-100 bg-[#FAFAFA] overflow-hidden shadow-sm">
                <div className="bg-[#EDEDED] px-4 py-2.5 text-xs font-semibold text-neutral-700 flex items-center justify-between border-b border-neutral-200">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                    Physics Class Bulletin
                  </span>
                  <span className="text-[10px] text-neutral-400">Today</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex gap-3">
                    <div className="size-8 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-xs shrink-0">
                      PT
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-neutral-500">
                        Physics Teacher
                      </p>
                      <div className="bg-white rounded-[16px] rounded-tl-none p-3 border border-neutral-100 shadow-sm max-w-[240px]">
                        <p className="text-xs font-semibold text-neutral-800 leading-relaxed">
                          Hey everyone! Don&apos;t forget that Chapter 12 worksheet is due tomorrow morning by 8:00 AM sharp. No late submissions will be accepted.
                        </p>
                      </div>
                      <span className="text-[9px] text-neutral-400">2:14 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {previewSource?.fileType === "audio" && (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              {/* Audio Player Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={handlePlayPause}
                  className="flex size-12 items-center justify-center rounded-full bg-ink text-white hover:scale-105 active:scale-95 transition-transform"
                >
                  {audioPlaying ? <Pause className="size-5 fill-white" /> : <Play className="size-5 fill-white ml-0.5" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Volume2 className="size-3 text-neutral-400" />
                      Teammate Voice Note
                    </span>
                    <span>{formatAudioTime(audioTime)} / 1:24</span>
                  </div>
                  
                  {/* Waveform Visualization */}
                  <div className="flex h-8 items-end gap-[3px] px-0.5">
                    {Array.from({ length: 32 }).map((_, i) => {
                      // Generate random heights
                      const baseHeight = [15, 30, 45, 60, 20, 35, 50, 75, 40, 20, 60, 80, 50, 30, 25, 45, 65, 80, 55, 35, 15, 45, 60, 30, 50, 70, 40, 20, 35, 60, 45, 20][i];
                      const heightPercent = audioPlaying 
                        ? `${Math.max(10, Math.sin(audioTime + i) * 35 + baseHeight / 1.25)}%` 
                        : `${baseHeight * 0.7}%`;
                      
                      return (
                        <div
                          key={i}
                          style={{ height: heightPercent }}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            audioPlaying ? "bg-ink opacity-90" : "bg-neutral-300 opacity-60"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Transcript */}
              <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  TRANSCRIPT SUMMARY
                </p>
                <p className="text-xs font-semibold text-neutral-600 leading-relaxed italic">
                  &quot;Hey, about the project meeting tonight, Sarah mentioned she has a CCA briefing at 5:30 PM and tuition before that, so we might need to reschedule. Can we push to tomorrow morning?&quot;
                </p>
              </div>
            </div>
          )}

          {previewSource?.fileType === "text" && (
            previewSource.filePath ? (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 font-mono text-xs text-neutral-700 space-y-3">
                <div className="border-b border-neutral-200 pb-2 flex justify-between font-sans font-semibold text-[10px] uppercase text-neutral-400">
                  <span>{previewSource.title}</span>
                  <span>Text Document</span>
                </div>
                <p className="font-sans text-sm text-ink leading-relaxed font-semibold whitespace-pre-wrap">
                  {previewSource.snippet}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-100 bg-[#FFFDF6] p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-2">
                  STICKY NOTE
                </p>
                <p className="text-sm font-semibold leading-relaxed text-neutral-800 font-sans">
                  {previewSource.snippet}
                </p>
                <p className="mt-4 text-[10px] text-neutral-400">
                  Created: Just now
                </p>
              </div>
            )
          )}

          {previewSource?.fileType === "link" && (
            <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400">
                <Globe2 className="size-3.5" />
                <span className="font-mono">https://nationalcomp2026.org/portal</span>
              </div>
              <h4 className="text-sm font-bold text-ink leading-snug mb-1">
                National Coding Challenge 2026 - Submissions
              </h4>
              <p className="text-xs text-neutral-500 leading-normal mb-3">
                Ensure all repository links, walkthrough recordings, and PDFs of design specifications are uploaded before the cutoff window.
              </p>
              <div className="rounded-lg bg-red-50 p-2.5 border border-red-100 text-red-800 text-xs font-semibold">
                Deadline: 11 June, 12:00 AM (Midnight)
              </div>
            </div>
          )}

          {previewSource?.fileType === "email" && (
            <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm space-y-3">
              <div className="border-b border-neutral-100 pb-2">
                <p className="text-xs font-medium text-neutral-400">From: <span className="font-semibold text-neutral-700">sarah.lee@student.edu</span></p>
                <p className="text-xs font-medium text-neutral-400 mt-0.5">Subject: <span className="font-semibold text-neutral-700">Re: CCA Briefing clash & reschedule</span></p>
              </div>
              <p className="text-xs font-semibold text-neutral-700 leading-relaxed">
                Hi team,<br/><br/>
                Just saw the announcement that our CCA briefing starts at 5:30 PM today in the auditorium. Since it overlaps with our planned meeting time, we should reschedule. Let me know if tomorrow works!
              </p>
            </div>
          )}
        </div>
      </BottomSheet>
    </AppShell>
  );
}

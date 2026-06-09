"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AudioLines, CalendarDays, FileText, Image, Globe2, MessageSquare,
  Paperclip, ArrowUp, X, Play, Pause, Volume2, Sparkles, ChevronRight, Cloud, Mic,
  type LucideIcon
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BottomSheet } from "@/components/bottom-sheet";
import type { CapturedSourceForAI } from "@/lib/studentos-ai-types";

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}


type InputSource = {
  id: string;
  icon: LucideIcon;
  title: string;
  source: string;
  snippet: string;
  fileSize?: string;
  fileType?: "pdf" | "image" | "audio" | "text" | "link" | "email";
  filePath?: string;
  s3Key?: string;
  provider?: string;
  ocrText?: string;
  sourceSummary?: string;
  extractedTasks?: string[];
  extractedEvidence?: string[];
  sourceConfidence?: number;
  languageNotes?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
  sponsorStatus?: "cached" | "uploaded" | "extracted" | "fallback" | "error";
  durationSeconds?: number;
};

type SponsorTraceItem = {
  provider: string;
  action: string;
  status: "success" | "fallback" | "error";
  detail: string;
};

type AwsUploadResponse = {
  provider: string;
  warning?: string;
  error?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  bucket?: string;
  key?: string;
  readUrl?: string;
};

type AwsExtractResponse = {
  provider: string;
  warning?: string;
  error?: string;
  text?: string;
  blockCount?: number;
  summary?: string;
  extractedTasks?: string[];
  extractedEvidence?: string[];
  confidence?: number;
  languageNotes?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
  interpretationProvider?: string;
};

type CachedSourceResponse = {
  sourceId: string;
  title: string;
  source: string;
  snippet: string;
  fileSize?: string;
  fileType?: InputSource["fileType"];
  filePath?: string;
  s3Key?: string;
  provider?: string;
  textractText?: string;
  sourceSummary?: string;
  extractedTasks?: string[];
  extractedEvidence?: string[];
  sourceConfidence?: number;
  languageNotes?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
  sponsorStatus?: InputSource["sponsorStatus"];
};

type DemoPacketImportResponse = {
  provider: string;
  warning?: string;
  sources?: CachedSourceResponse[];
  trace?: SponsorTraceItem[];
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring" as const,
      stiffness: 110,
      damping: 17
    } 
  }
};

const exampleSources: InputSource[] = [
  {
    id: "whatsapp-screenshot",
    icon: Image,
    title: "WhatsApp project chat.jpg",
    source: "WhatsApp Screenshot",
    snippet: "Team chat: project meeting may move because Sarah has CCA and tuition.",
    fileSize: "185 KB",
    fileType: "image",
    filePath: "/IMG-20260609-WA0004.jpg"
  },
  {
    id: "physics-homework-pdf",
    icon: FileText,
    title: "Physics Chapter 12 homework.pdf",
    source: "Homework PDF",
    snippet: "Worksheet due tomorrow 8 AM with Chapter 12 induction questions.",
    fileSize: "2.1 MB",
    fileType: "pdf"
  },
  {
    id: "team-voice-note",
    icon: AudioLines,
    title: "Teammate voice note.m4a",
    source: "Voice Note",
    snippet: "1:24 transcript: ask if the project meeting can move to tomorrow morning.",
    fileSize: "1:24",
    fileType: "audio"
  },
  {
    id: "calendar-conflict",
    icon: CalendarDays,
    title: "Tuition calendar clash.png",
    source: "Calendar Conflict",
    snippet: "Tuition is fixed from 4:30-6:30 PM, overlapping the CCA briefing.",
    fileSize: "210 KB",
    fileType: "image",
    filePath: "/Screenshot%202026-06-09%20123905.jpg"
  },
  {
    id: "cca-screenshot",
    icon: MessageSquare,
    title: "CCA announcement screenshot.jpg",
    source: "CCA Announcement",
    snippet: "Briefing starts at 5:30 PM today in the auditorium.",
    fileSize: "492 KB",
    fileType: "image",
    filePath: "/Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg"
  },
  {
    id: "coding-goal",
    icon: FileText,
    title: "goalDemo.txt",
    source: "Long-term Coding Goal",
    snippet: "I have zero Python experience and want to be proficient with data-handling libraries by year end.",
    fileSize: "1 KB",
    fileType: "text",
    filePath: "/goalDemo.txt"
  },
  {
    id: "team-project-message",
    icon: MessageSquare,
    title: "Team project follow-up",
    source: "Team Message",
    snippet: "Ask teammate first before locking tonight's project discussion.",
    fileSize: "8 KB",
    fileType: "text"
  }
];

export default function InputPage() {
  const router = useRouter();
  const [sources, setSources] = useState<InputSource[]>([]);
  const [inputText, setInputText] = useState("");
  const [isInjecting, setIsInjecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [previewSource, setPreviewSource] = useState<InputSource | null>(null);
  
  // Audio player state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const injectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRecognitionRef = useRef<ISpeechRecognition | null>(null);
  const transcriptionRef = useRef<string>("");
  const recordingStartTimeRef = useRef<number>(0);

  // Auto-grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    const goalFromUrl = new URLSearchParams(window.location.search).get("goal")?.trim();
    const savedGoal = goalFromUrl || window.localStorage.getItem("studentos_manual_goal")?.trim();

    if (!savedGoal) return;
    if (goalFromUrl) {
      window.localStorage.setItem("studentos_manual_goal", goalFromUrl);
    }

    setSources([
      {
        id: "manual-goal",
        icon: FileText,
        title: "Manual goal",
        source: "Goal Command",
        snippet: savedGoal,
        fileSize: `${Math.max(1, Math.round(savedGoal.length * 0.1))} KB`,
        fileType: "text",
      },
    ]);
  }, []);

  // Audio simulation (only for demo team-voice-note without a real filePath)
  useEffect(() => {
    if (audioPlaying && (!previewSource || !previewSource.filePath)) {
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
  }, [audioPlaying, previewSource]);

  useEffect(() => {
    return () => {
      if (injectionIntervalRef.current) {
        clearInterval(injectionIntervalRef.current);
      }
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handlePlayPause = () => {
    if (!previewSource) return;

    if (previewSource.filePath) {
      if (!audioRef.current) {
        audioRef.current = new Audio(previewSource.filePath);
        audioRef.current.addEventListener("timeupdate", () => {
          if (audioRef.current) {
            setAudioTime(Math.floor(audioRef.current.currentTime));
          }
        });
        audioRef.current.addEventListener("ended", () => {
          setAudioPlaying(false);
          setAudioTime(0);
        });
      }

      if (audioPlaying) {
        audioRef.current.pause();
        setAudioPlaying(false);
      } else {
        audioRef.current.play().catch((err) => console.error("Audio playback error:", err));
        setAudioPlaying(true);
      }
    } else {
      setAudioPlaying(!audioPlaying);
    }
  };

  const formatAudioTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const createTextSource = (text: string): InputSource => ({
    id: `custom-text-${Date.now()}`,
    icon: FileText,
    title: "Typed Note",
    source: "Manual Input",
    snippet: text,
    fileSize: `${Math.max(1, Math.round(text.length * 0.1))} KB`,
    fileType: "text"
  });

  const trimmedInputText = inputText.trim();
  const hasAnalyseInput = sources.length > 0 || trimmedInputText.length > 0;
  const isAnalyseDisabled = isInjecting || !hasAnalyseInput;

  // Add text from textarea
  const handleAddText = () => {
    if (!trimmedInputText) return;
    const newSource = createTextSource(trimmedInputText);
    setSources((prev) => [newSource, ...prev]);
    setInputText("");
  };

  const addSponsorTrace = (item: SponsorTraceItem) => {
    if (typeof window === "undefined") return;

    const existing = window.localStorage.getItem("studentos_sponsor_trace");
    let trace: SponsorTraceItem[] = [];

    if (existing) {
      try {
        trace = JSON.parse(existing) as SponsorTraceItem[];
      } catch {
        trace = [];
      }
    }

    window.localStorage.setItem("studentos_sponsor_trace", JSON.stringify([item, ...trace].slice(0, 8)));
  };

  const addSponsorTraces = (items: SponsorTraceItem[]) => {
    items.forEach(addSponsorTrace);
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const inferFileType = (file: File): InputSource["fileType"] => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type === "application/pdf") return "pdf";
    if (file.type.startsWith("audio/")) return "audio";
    return "text";
  };

  const iconForFileType = (fileType: InputSource["fileType"]) => {
    if (fileType === "image") return Image;
    if (fileType === "audio") return AudioLines;
    return FileText;
  };

  const fallbackSnippetForFile = (file: File) => {
    if (file.type.startsWith("image/")) return "Uploaded image queued for commitment extraction.";
    if (file.type === "application/pdf") return "Uploaded PDF queued for commitment extraction.";
    return "Uploaded file queued for source processing.";
  };

  const handleFileSelected = async (file: File | undefined) => {
    if (!file || isUploading) return;

    const fileType = inferFileType(file);
    const localPreviewUrl = fileType === "image" ? URL.createObjectURL(file) : undefined;
    const pendingSource: InputSource = {
      id: `upload-${Date.now()}`,
      icon: iconForFileType(fileType),
      title: file.name,
      source: "Upload",
      snippet: "Uploading to AWS S3...",
      fileSize: formatFileSize(file.size),
      fileType,
      filePath: localPreviewUrl,
      provider: "aws-s3",
      sponsorStatus: "uploaded",
    };

    setIsUploading(true);
    setSources((prev) => [pendingSource, ...prev]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/sponsor/aws/upload-source", {
        method: "POST",
        body: formData,
      });
      const upload = (await uploadResponse.json()) as AwsUploadResponse;

      if (upload.provider !== "aws-s3" || !upload.key) {
        addSponsorTrace({
          provider: "AWS",
          action: "Stored source packet in S3",
          status: "fallback",
          detail: upload.warning || "S3 upload skipped; demo fallback source kept.",
        });
        setSources((prev) =>
          prev.map((source) =>
            source.id === pendingSource.id
              ? {
                  ...source,
                  snippet: fallbackSnippetForFile(file),
                  provider: upload.provider,
                  sponsorStatus: "fallback",
                }
              : source,
          ),
        );
        return;
      }

      addSponsorTrace({
        provider: "AWS",
        action: "Stored source packet in S3",
        status: "success",
        detail: `${file.name} -> ${upload.key}`,
      });

      let snippet = fallbackSnippetForFile(file);
      let ocrText = "";
      let sponsorStatus: InputSource["sponsorStatus"] = "uploaded";
      let sourceSummary: string | undefined;
      let extractedTasks: string[] | undefined;
      let extractedEvidence: string[] | undefined;
      let sourceConfidence: number | undefined;
      let languageNotes: string | undefined;
      let needsClarification: boolean | undefined;
      let clarificationPrompt: string | undefined;

      if (fileType === "image" || fileType === "pdf") {
        const extractResponse = await fetch("/api/sponsor/aws/extract-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: upload.key,
            name: file.name,
            mimeType: file.type,
            fileType,
          }),
        });
        const extraction = (await extractResponse.json()) as AwsExtractResponse;

        if (extraction.provider === "aws-textract" && (extraction.text || extraction.summary)) {
          ocrText = extraction.text || "";
          sourceSummary = extraction.summary;
          extractedTasks = extraction.extractedTasks;
          extractedEvidence = extraction.extractedEvidence;
          sourceConfidence = extraction.confidence;
          languageNotes = extraction.languageNotes;
          needsClarification = extraction.needsClarification;
          clarificationPrompt = extraction.clarificationPrompt;
          snippet = extraction.summary || (extraction.text ?? "").split("\n").find(Boolean)?.slice(0, 110) || snippet;
          sponsorStatus = "extracted";
          addSponsorTrace({
            provider: extraction.interpretationProvider === "vercel-ai-gateway" ? "Vercel AI Gateway" : "AWS",
            action: extraction.interpretationProvider === "vercel-ai-gateway"
              ? "Interpreted uploaded source"
              : "Extracted worksheet text with Textract",
            status: "success",
            detail: extraction.summary || `${extraction.blockCount || 0} Textract blocks returned.`,
          });
        } else {
          addSponsorTrace({
            provider: "AWS",
            action: "Extracted worksheet text with Textract",
            status: "fallback",
            detail: extraction.warning || extraction.error || "Textract returned no text.",
          });
        }
      }

      setSources((prev) =>
        prev.map((source) =>
          source.id === pendingSource.id
            ? {
                ...source,
                source: sponsorStatus === "extracted" ? "AWS Textract" : "AWS S3",
                snippet,
                s3Key: upload.key,
                provider: upload.provider,
                ocrText,
                sourceSummary,
                extractedTasks,
                extractedEvidence,
                sourceConfidence,
                languageNotes,
                needsClarification,
                clarificationPrompt,
                sponsorStatus,
              }
            : source,
        ),
      );
    } catch (error) {
      addSponsorTrace({
        provider: "AWS",
        action: "Processed uploaded source",
        status: "error",
        detail: error instanceof Error ? error.message : "Upload failed.",
      });
      setSources((prev) =>
        prev.map((source) =>
          source.id === pendingSource.id
            ? {
                ...source,
                snippet: fallbackSnippetForFile(file),
                sponsorStatus: "error",
              }
            : source,
        ),
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const stopRecordingTracks = () => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  };

  const handleToggleRecording = async () => {
    setRecordingError("");

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Voice recording is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      
      // Initialize speech recognition
      transcriptionRef.current = "";
      recordingStartTimeRef.current = Date.now();
      
      const SpeechRecognitionClass = (window as Window & {
        SpeechRecognition?: new () => ISpeechRecognition;
        webkitSpeechRecognition?: new () => ISpeechRecognition;
      }).SpeechRecognition || (window as Window & {
        SpeechRecognition?: new () => ISpeechRecognition;
        webkitSpeechRecognition?: new () => ISpeechRecognition;
      }).webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let accumulatedTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              accumulatedTranscript += event.results[i][0].transcript;
            }
            transcriptionRef.current = accumulatedTranscript.trim();
          };

          recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error:", e.error);
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (recognitionErr) {
          console.error("Failed to start SpeechRecognition:", recognitionErr);
        }
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordingBlob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const durationMs = Date.now() - recordingStartTimeRef.current;
        const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
        const audioUrl = URL.createObjectURL(recordingBlob);
        const transcriptText = transcriptionRef.current.trim();

        if (recordingBlob.size > 0) {
          const newSource: InputSource = {
            id: `voice-recording-${Date.now()}`,
            icon: AudioLines,
            title: `Voice recording (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).webm`,
            source: "Voice Recording",
            snippet: transcriptText || "No voice transcription captured.",
            fileSize: formatFileSize(recordingBlob.size),
            fileType: "audio",
            filePath: audioUrl,
            ocrText: transcriptText || undefined,
            sourceSummary: transcriptText ? `Transcribed Voice Note: "${transcriptText}"` : undefined,
            durationSeconds: durationSeconds,
          };
          setSources((prev) => [newSource, ...prev]);
        }

        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        speechRecognitionRef.current = null;
        setIsRecording(false);
        stopRecordingTracks();
      };

      recorder.onerror = () => {
        setRecordingError("Voice recording stopped unexpectedly.");
        setIsRecording(false);
        stopRecordingTracks();
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setRecordingError("Microphone access was not granted.");
      setIsRecording(false);
      stopRecordingTracks();
    }
  };

  const sourceFromCachedResponse = (source: CachedSourceResponse): InputSource => {
    const fileType = source.fileType || "text";

    return {
      id: source.sourceId,
      icon: iconForFileType(fileType),
      title: source.title,
      source: source.source,
      snippet: source.snippet,
      fileSize: source.fileSize,
      fileType,
      filePath: source.filePath,
      s3Key: source.s3Key,
      provider: source.provider,
      ocrText: source.textractText,
      sourceSummary: source.sourceSummary,
      extractedTasks: source.extractedTasks,
      extractedEvidence: source.extractedEvidence,
      sourceConfidence: source.sourceConfidence,
      languageNotes: source.languageNotes,
      needsClarification: source.needsClarification,
      clarificationPrompt: source.clarificationPrompt,
      sponsorStatus: source.sponsorStatus,
    };
  };

  const revealSources = (nextSources: InputSource[]) => {
    setIsInjecting(true);
    setSources([]);

    let currentIndex = 0;
    injectionIntervalRef.current = setInterval(() => {
      const nextSource = nextSources[currentIndex];

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

      if (currentIndex >= nextSources.length) {
        if (injectionIntervalRef.current) {
          clearInterval(injectionIntervalRef.current);
          injectionIntervalRef.current = null;
        }
        setIsInjecting(false);
      }
    }, 280);
  };

  // Import stable demo sources through the AWS source cache, then reveal them one by one.
  const handleInjectExamples = async () => {
    if (isInjecting) return;

    setIsInjecting(true);

    try {
      const response = await fetch("/api/sponsor/aws/import-demo-packet", { method: "POST" });
      const packet = (await response.json()) as DemoPacketImportResponse;
      const importedSources = packet.sources?.map(sourceFromCachedResponse) ?? exampleSources;

      if (packet.trace) addSponsorTraces(packet.trace);
      revealSources(importedSources);
    } catch (error) {
      addSponsorTrace({
        provider: "AWS",
        action: "Imported demo packet",
        status: "fallback",
        detail: error instanceof Error ? error.message : "Demo packet import failed.",
      });
      revealSources(exampleSources);
    }
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
    if (!hasAnalyseInput) return;

    const analysisSources = trimmedInputText
      ? [createTextSource(trimmedInputText), ...sources]
      : sources;
    const capturedSources: CapturedSourceForAI[] = analysisSources.map((source) => ({
      id: source.id,
      title: source.title,
      source: source.source,
      snippet: source.snippet,
      fileType: source.fileType,
      fileSize: source.fileSize,
      filePath: source.filePath,
      s3Key: source.s3Key,
      provider: source.provider,
      sponsorStatus: source.sponsorStatus,
      ocrText: source.ocrText,
      sourceSummary: source.sourceSummary,
      extractedTasks: source.extractedTasks,
      extractedEvidence: source.extractedEvidence,
      sourceConfidence: source.sourceConfidence,
      languageNotes: source.languageNotes,
      needsClarification: source.needsClarification,
      clarificationPrompt: source.clarificationPrompt,
      durationSeconds: source.durationSeconds,
    }));

    window.localStorage.setItem("studentos_captured_sources", JSON.stringify(capturedSources));
    window.localStorage.removeItem("studentos_commitment_footprint");
    window.localStorage.removeItem("studentos_ai_footprint");
    window.localStorage.removeItem("studentos_plan_overrides");
    window.localStorage.removeItem("studentos_vercel_plan_day_recommended_standard");
    window.localStorage.removeItem("studentos_vercel_plan_day_recommended_chemistry");
    router.push("/agents");
  };

  return (
    <AppShell 
      hideHeader={false} 
      stepLabel="Inbox Capture" 
      progress={sources.length > 0 ? 0.33 : 0.15}
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="safe-bottom-padding relative flex min-h-[calc(100dvh-140px)] flex-col px-5 pt-2"
      >
        {/* Screen Title */}
        <motion.div variants={itemVariants} className="mb-6 text-center">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink mb-1">
            Drop the mess here
          </h1>
          <p className="text-[13px] font-medium text-muted">
            Add your scattered sources or import the demo packet.
          </p>
        </motion.div>

        {/* ChatGPT-style Input Container */}
        <motion.div variants={itemVariants} className="relative rounded-[24px] border border-neutral-200 bg-white p-3 shadow-[0_8px_32px_rgba(0,0,0,0.03)] focus-within:border-neutral-400 transition-colors">
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,text/plain,audio/*"
              className="hidden"
              onChange={(event) => handleFileSelected(event.target.files?.[0])}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex size-9 items-center justify-center rounded-full bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-ink transition-colors"
                title="Upload file"
                type="button"
              >
                {isUploading ? <Cloud className="size-4.5 animate-pulse" /> : <Paperclip className="size-4.5" />}
              </button>
              <button
                onClick={handleToggleRecording}
                className={`flex size-9 items-center justify-center rounded-full transition-colors ${
                  isRecording
                    ? "bg-red-50 text-red-600 ring-2 ring-red-100"
                    : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-ink"
                }`}
                title={isRecording ? "Stop recording" : "Record voice note"}
                type="button"
                aria-pressed={isRecording}
              >
                <Mic className={`size-4.5 ${isRecording ? "animate-pulse" : ""}`} />
              </button>
            </div>

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
          {recordingError ? (
            <p className="mt-2 px-1 text-[11px] font-semibold text-red-500">{recordingError}</p>
          ) : null}
        </motion.div>

        {/* Import Demo Packet Button */}
        <motion.div variants={itemVariants} className="mt-4 flex justify-center">
          <button
            disabled={isInjecting}
            onClick={handleInjectExamples}
            type="button"
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-[0_2px_8px_rgba(0,0,0,0.04)] border transition-all ${
              isInjecting 
                ? "bg-neutral-50 text-neutral-400 border-neutral-100 cursor-not-allowed"
                : "bg-[#FAFAFA] text-neutral-700 border-neutral-200 hover:bg-neutral-100"
            }`}
          >
            <Sparkles className={`size-3.5 ${isInjecting ? "animate-spin" : "text-amber-500"}`} />
            <span>Load demo packet</span>
          </button>
        </motion.div>

        {/* Added Sources List */}
        <motion.div variants={itemVariants} className="mt-8 space-y-3">
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
                Inbox is empty. Load the demo packet to see realistic student chaos.
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
                        {source.sponsorStatus && (
                          <span className="hidden sm:inline-flex rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700">
                            {source.sponsorStatus === "cached"
                              ? "Cached"
                              : source.sponsorStatus === "extracted"
                                ? "Textract"
                                : source.sponsorStatus === "uploaded"
                                  ? "S3"
                                  : "Fallback"}
                          </span>
                        )}
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
        </motion.div>

        {/* Fixed Bottom Action Container */}
        <div className="fixed-bottom-action">
          <motion.div variants={itemVariants}>
            <button
              disabled={isAnalyseDisabled}
              onClick={handleAnalyse}
              type="button"
              className={`flex h-[60px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all ${
                !isAnalyseDisabled
                  ? "bg-ink text-white hover:scale-[1.01] active:scale-[0.99] cursor-pointer" 
                  : "bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none"
              }`}
            >
              <span>Analyse</span>
              <ChevronRight className="size-4.5" />
            </button>
          </motion.div>
        </div>

      </motion.div>

      {/* Attachment Preview Modal */}
      <BottomSheet
        open={previewSource !== null}
        title={previewSource?.title ?? "File Preview"}
        subtitle={previewSource ? `${previewSource.source} · ${previewSource.fileSize}` : undefined}
        onClose={() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          setPreviewSource(null);
        }}
      >
        <div className="w-full pb-4">
          {previewSource?.s3Key && (
            <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 p-3 text-[11px] font-semibold text-sky-800">
              AWS S3 stored this source at <span className="font-mono">{previewSource.s3Key}</span>
              {previewSource.ocrText ? " and Textract extracted text below." : "."}
            </div>
          )}

          {previewSource?.sourceSummary && (
            <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[11px] font-semibold text-emerald-900">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-emerald-700">
                <span>Interpreted evidence</span>
                {previewSource.provider ? <span>{previewSource.provider}</span> : null}
                {typeof previewSource.sourceConfidence === "number" ? (
                  <span>{Math.round(previewSource.sourceConfidence * 100)}% confidence</span>
                ) : null}
              </div>
              <p>{previewSource.sourceSummary}</p>
              {previewSource.extractedTasks?.length ? (
                <div className="mt-2 rounded-lg border border-emerald-200/70 bg-white/55 p-2">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-emerald-700">
                    Extracted commitments
                  </p>
                  <ul className="space-y-1">
                    {previewSource.extractedTasks.slice(0, 4).map((task) => (
                      <li key={task} className="leading-snug">- {task}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {previewSource.extractedEvidence?.length ? (
                <p className="mt-2 border-l-2 border-emerald-200 pl-2 text-emerald-800">
                  Evidence: {previewSource.extractedEvidence.slice(0, 2).join(" | ")}
                </p>
              ) : null}
              {previewSource.languageNotes ? (
                <p className="mt-2 text-emerald-800">{previewSource.languageNotes}</p>
              ) : null}
              {previewSource.needsClarification && previewSource.clarificationPrompt ? (
                <p className="mt-2 text-amber-800">Uncertainty: {previewSource.clarificationPrompt}</p>
              ) : null}
            </div>
          )}

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
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      {previewSource.title}
                    </span>
                    <span>
                      {formatAudioTime(audioTime)} / {
                        previewSource.filePath
                          ? formatAudioTime(previewSource.durationSeconds || 0)
                          : "1:24"
                      }
                    </span>
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
                  {previewSource.filePath ? (
                    `"${previewSource.ocrText || previewSource.snippet || "No transcription captured."}"`
                  ) : (
                    `"Hey, about the project meeting tonight, Sarah mentioned she has a CCA briefing at 5:30 PM and tuition before that, so we might need to reschedule. Can we push to tomorrow morning?"`
                  )}
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

          {previewSource?.ocrText && (
            <div className="mt-3 rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                AWS Textract OCR
              </p>
              <p className="whitespace-pre-wrap text-xs font-semibold leading-relaxed text-neutral-700">
                {previewSource.ocrText}
              </p>
            </div>
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

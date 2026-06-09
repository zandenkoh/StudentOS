import {
  AudioLines,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileText,
  Globe2,
  Image,
  Link,
  Mail,
  MessageCircle,
  Mic,
  PencilLine,
  Sparkles,
  TriangleAlert,
  type LucideIcon
} from "lucide-react";

export type SourceType =
  | "screenshot"
  | "pdf"
  | "voice"
  | "note"
  | "message"
  | "web"
  | "email"
  | "reminder";

export type CommitmentType =
  | "task"
  | "event"
  | "deadline"
  | "goal"
  | "conflict";

export type CommitmentState =
  | "confirmed"
  | "needs_clarification"
  | "unsure"
  | "resolved";

export type AgentStatus = "completed" | "active" | "pending";

export type ChaosInput = {
  id: string;
  icon: LucideIcon;
  text: string;
  chip: string;
  tone?: "danger" | "uncertain";
  className: string;
  rotate: number;
};

export type InputSource = {
  id: string;
  icon: LucideIcon;
  title: string;
  source: string;
  snippet: string;
};

export type Commitment = {
  id: string;
  title: string;
  type: CommitmentType;
  source: string;
  confidence: number;
  estimatedDuration: string;
  state: CommitmentState;
  explanation: string;
};

export type ProcessingStepData = {
  id: string;
  label: string;
  sponsor?: "AWS" | "Exa" | "Vercel";
};

export type AgentLog = {
  id: string;
  label: string;
  sponsor?: "AWS" | "Exa" | "Vercel";
};

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  duration?: string;
  chip: string;
  tone?: "conflict" | "success" | "priority";
};

export const sourceIconMap: Record<SourceType, LucideIcon> = {
  screenshot: Image,
  pdf: FileText,
  voice: Mic,
  note: PencilLine,
  message: MessageCircle,
  web: Globe2,
  email: Mail,
  reminder: Bell
};

export const chaosInputs: ChaosInput[] = [
  {
    id: "physics-shot",
    icon: Image,
    text: "Physics worksheet due tmr 8am",
    chip: "Screenshot",
    tone: "danger",
    className: "left-4 top-20 w-[220px]",
    rotate: -6
  },
  {
    id: "worksheet-pdf",
    icon: FileText,
    text: "Chapter 12 worksheet.pdf",
    chip: "PDF",
    className: "right-1 top-36 w-[205px]",
    rotate: 5
  },
  {
    id: "voice-note",
    icon: AudioLines,
    text: "1:24 voice note from teammate",
    chip: "Voice",
    className: "left-9 top-[15.2rem] w-[214px]",
    rotate: 3
  },
  {
    id: "coding-note",
    icon: PencilLine,
    text: "Need to learn coding by Dec",
    chip: "Note",
    className: "right-7 top-[20.7rem] w-[206px]",
    rotate: -5
  },
  {
    id: "cca",
    icon: MessageCircle,
    text: "CCA briefing 5.30pm",
    chip: "Message",
    className: "-left-3 top-[26.3rem] w-[215px]",
    rotate: 7
  },
  {
    id: "competition",
    icon: Link,
    text: "Competition submission 11 Jun",
    chip: "Link",
    className: "right-3 top-[30.8rem] w-[225px]",
    rotate: -4
  },
  {
    id: "email",
    icon: Mail,
    text: "Project meeting update",
    chip: "Email",
    className: "left-8 top-[36.6rem] w-[196px]",
    rotate: -2
  },
  {
    id: "reminder",
    icon: Bell,
    text: "Ask teammate about deck ???",
    chip: "Reminder",
    tone: "uncertain",
    className: "right-6 top-[40.7rem] w-[210px]",
    rotate: 4
  }
];

export const inputSources: InputSource[] = [
  {
    id: "teacher-message",
    icon: Image,
    title: "Teacher message screenshot",
    source: "Screenshot",
    snippet: "Physics worksheet due tmr 8am"
  },
  {
    id: "chapter-pdf",
    icon: FileText,
    title: "Chapter 12 worksheet.pdf",
    source: "PDF",
    snippet: "Homework instructions"
  },
  {
    id: "team-voice",
    icon: AudioLines,
    title: "Team voice note",
    source: "Voice",
    snippet: "Discuss project meeting timing"
  },
  {
    id: "personal-goal",
    icon: PencilLine,
    title: "Personal goal",
    source: "Note",
    snippet: "Learn coding by December · 5h/week"
  },
  {
    id: "cca-announcement",
    icon: MessageCircle,
    title: "CCA announcement screenshot",
    source: "Message",
    snippet: "Briefing at 5.30pm"
  },
  {
    id: "competition-page",
    icon: Globe2,
    title: "Competition page",
    source: "Web Link",
    snippet: "Submission deadline: 11 Jun, 12am"
  },
  {
    id: "project-email",
    icon: Mail,
    title: "Project update email",
    source: "Email",
    snippet: "Team meeting may need reschedule"
  }
];

export const baseCommitments: Commitment[] = [
  {
    id: "physics",
    title: "Physics worksheet due tomorrow 8 AM",
    type: "task",
    source: "Screenshot",
    confidence: 94,
    estimatedDuration: "35min",
    state: "confirmed",
    explanation: "Detected from teacher message."
  },
  {
    id: "cca",
    title: "CCA briefing at 5:30 PM",
    type: "event",
    source: "Message screenshot",
    confidence: 91,
    estimatedDuration: "45min",
    state: "confirmed",
    explanation: "Time detected from CCA announcement."
  },
  {
    id: "competition",
    title: "Competition submission: 11 June, 12 AM",
    type: "deadline",
    source: "Web link",
    confidence: 96,
    estimatedDuration: "30min",
    state: "confirmed",
    explanation: "Deadline recognised and prioritised."
  },
  {
    id: "coding",
    title: "Learn coding by December",
    type: "goal",
    source: "Written note",
    confidence: 78,
    estimatedDuration: "5hr/week",
    state: "needs_clarification",
    explanation: "StudentOS needs a target outcome."
  },
  {
    id: "team",
    title: "Team meeting may need reschedule",
    type: "event",
    source: "Voice note",
    confidence: 63,
    estimatedDuration: "3min",
    state: "unsure",
    explanation: "Voice note sounded tentative."
  }
];

export const processingSteps: ProcessingStepData[] = [
  { id: "read", label: "Reading files", sponsor: "AWS" },
  { id: "extract", label: "Extracting text", sponsor: "AWS" },
  { id: "commitments", label: "Finding commitments" },
  { id: "calendar", label: "Checking calendar" },
  { id: "goal", label: "Enriching goal", sponsor: "Exa" },
  { id: "plan", label: "Building plan" }
];

export const agentLogs: AgentLog[] = [
  { id: "gathered", label: "Gathered screenshots, files, audio, and notes" },
  { id: "pdf", label: "Extracted text from PDF", sponsor: "AWS" },
  { id: "image", label: "Read message screenshot", sponsor: "AWS" },
  { id: "voice", label: "Parsed voice note summary" },
  { id: "found", label: "Identified 5 commitments" },
  { id: "flagged", label: "Flagged 2 uncertain items" },
  { id: "clarified", label: "Clarified coding goal" },
  { id: "exa", label: "Enriched coding roadmap", sponsor: "Exa" },
  { id: "calendar", label: "Checked existing calendar" },
  { id: "conflict", label: "Found 45 min conflict" },
  { id: "priority", label: "Prioritised Physics deadline" },
  { id: "plan", label: "Built final day plan" },
  { id: "export", label: "Prepared calendar export" },
  { id: "vercel", label: "Live app running", sponsor: "Vercel" }
];

export const timelineEvents: TimelineEvent[] = [
  { id: "revision", time: "3:30 PM", title: "Revision block", chip: "Flexible" },
  {
    id: "tuition",
    time: "4:30 PM",
    title: "Tuition",
    duration: "4:30-6:30 PM",
    chip: "Fixed"
  },
  {
    id: "cca",
    time: "5:30 PM",
    title: "CCA briefing",
    duration: "5:30-6:15 PM",
    chip: "Needs decision",
    tone: "conflict"
  },
  { id: "dinner", time: "7:00 PM", title: "Dinner", chip: "Fixed" },
  {
    id: "physics",
    time: "8:00 PM",
    title: "Physics worksheet",
    chip: "High priority",
    tone: "priority"
  },
  {
    id: "coding",
    time: "9:00 PM",
    title: "Coding practice",
    chip: "Weekly goal"
  }
];

export const resolvedTimelineEvents: TimelineEvent[] = [
  { id: "tuition", time: "4:30 PM", title: "Tuition", duration: "4:30-6:30 PM", chip: "Fixed" },
  { id: "notes", time: "6:40 PM", title: "Get CCA briefing notes", chip: "Handled", tone: "success" },
  { id: "dinner", time: "7:00 PM", title: "Dinner", chip: "Fixed" },
  { id: "revision", time: "7:45 PM", title: "Revision block", chip: "Moved" },
  { id: "physics", time: "8:00 PM", title: "Physics worksheet", chip: "High priority", tone: "priority" },
  { id: "coding", time: "9:00 PM", title: "Coding practice", chip: "Weekly goal" }
];

export const planSections = [
  {
    title: "Do now",
    items: [{ title: "Finish Physics worksheet", meta: "35 min · Submit before school" }]
  },
  {
    title: "Do next",
    items: [
      { title: "Message teammate", meta: "Draft ready · 3 min" },
      { title: "Ask CCA lead for briefing notes", meta: "Resolves 45 min clash" }
    ]
  },
  {
    title: "Do later",
    items: [
      { title: "Tuition", meta: "4:30-6:30 PM · Fixed" },
      { title: "Revision block", meta: "7:45 PM · Moved after dinner" },
      { title: "Coding practice", meta: "1 hour · Weekly goal started" }
    ]
  }
];

export const goalPlan = [
  { day: "Monday", task: "1h foundations" },
  { day: "Wednesday", task: "1h project build" },
  { day: "Friday", task: "1h practice" },
  { day: "Saturday", task: "2h deep work" }
];

export const iconForStatus = {
  completed: CheckCircle2,
  active: Sparkles,
  pending: Bot
} satisfies Record<AgentStatus, LucideIcon>;

export const ConflictIcon = TriangleAlert;
export const CalendarIcon = CalendarDays;

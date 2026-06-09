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
  conflictGroupId?: string;
};

export type PlanTaskSection = "do_now" | "do_next" | "subsequent_days";

export type DemoPlanTask = {
  id: string;
  title: string;
  section: PlanTaskSection;
  estimatedMinutes?: number;
  timeLabel?: string;
  scheduledDate?: string;
  scheduledDateId?: string;
  scheduledDateRange?: string;
  deadline?: string;
  deadlineDateId?: string;
  reason?: string;
  source?: string;
  goalId?: string;
  isRoadmapTask?: boolean;
  updated?: boolean;
};

export type DemoScheduleDateOption = {
  id: string;
  label: string;
};

export type DemoGoalRoadmapStep = {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  scheduledDateRange?: string;
  tasks: DemoPlanTask[];
  status: "scheduled" | "in_progress" | "upcoming";
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
    chip: "Fixed",
    conflictGroupId: "tuition-cca"
  },
  {
    id: "cca",
    time: "5:30 PM",
    title: "CCA briefing",
    duration: "5:30-6:15 PM",
    chip: "Needs decision",
    tone: "conflict",
    conflictGroupId: "tuition-cca"
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

export const manualResolvedTimelineEvents: TimelineEvent[] = [
  {
    id: "tuition",
    time: "6:20 PM",
    title: "Tuition rescheduled",
    duration: "6:20-7:50 PM",
    chip: "Rescheduled",
    tone: "success"
  },
  {
    id: "cca",
    time: "5:30 PM",
    title: "CCA briefing",
    duration: "5:30-6:15 PM",
    chip: "Fixed"
  },
  {
    id: "physics-extension",
    time: "16 Jun",
    title: "Physics worksheet deadline",
    chip: "Extension recorded",
    tone: "success"
  },
  { id: "dinner", time: "8:00 PM", title: "Dinner", chip: "Fixed" },
  {
    id: "coding",
    time: "9:00 PM",
    title: "Coding practice",
    chip: "Weekly goal"
  }
];

export const demoScheduleDateOptions: DemoScheduleDateOption[] = [
  { id: "2026-06-16", label: "16 June" },
  { id: "2026-06-17", label: "17 June" },
  { id: "2026-06-18", label: "18 June" },
  { id: "2026-06-19", label: "19 June" },
  { id: "2026-06-24", label: "24 June" },
  { id: "2026-06-30", label: "30 June" },
  { id: "2026-07-08", label: "8 July" },
  { id: "2026-08-05", label: "5 August" },
  { id: "2026-09-09", label: "9 September" },
  { id: "2026-11-04", label: "4 November" }
];

export const initialPlanTasks: DemoPlanTask[] = [
  {
    id: "physics-focus",
    title: "Finish Physics worksheet",
    section: "do_now",
    estimatedMinutes: 35,
    timeLabel: "Now",
    deadline: "tomorrow 8 AM",
    deadlineDateId: "2026-06-10",
    reason: "Submit before school",
    source: "Screenshot"
  },
  {
    id: "message-teammate",
    title: "Message teammate",
    section: "do_next",
    estimatedMinutes: 3,
    timeLabel: "After Physics",
    reason: "Draft ready",
    source: "Voice note"
  },
  {
    id: "cca-notes",
    title: "Ask CCA lead for briefing notes",
    section: "do_next",
    estimatedMinutes: 5,
    timeLabel: "Before briefing",
    reason: "Resolves the CCA and tuition clash",
    source: "CCA announcement"
  },
  {
    id: "tuition",
    title: "Tuition",
    section: "do_next",
    timeLabel: "4:30-6:30 PM",
    reason: "Fixed calendar block",
    source: "Calendar"
  },
  {
    id: "revision",
    title: "Revision block",
    section: "do_next",
    estimatedMinutes: 45,
    timeLabel: "7:45 PM",
    reason: "Moved after dinner",
    source: "Plan"
  },
  {
    id: "coding-practice",
    title: "Coding practice",
    section: "do_next",
    estimatedMinutes: 60,
    timeLabel: "9:00 PM",
    deadline: "December",
    deadlineDateId: "2026-12-31",
    reason: "Weekly goal started",
    source: "Goal",
    goalId: "learn-coding",
    isRoadmapTask: true
  },
  {
    id: "coding-fundamentals-session-1",
    title: "Coding fundamentals — Session 1",
    section: "subsequent_days",
    estimatedMinutes: 30,
    scheduledDate: "17 June",
    scheduledDateId: "2026-06-17",
    deadline: "December",
    deadlineDateId: "2026-12-31",
    reason: "First scheduled step for the coding goal",
    source: "Goal roadmap",
    goalId: "learn-coding",
    isRoadmapTask: true
  },
  {
    id: "mini-project-brief",
    title: "Build mini project brief",
    section: "subsequent_days",
    estimatedMinutes: 45,
    scheduledDate: "24 June",
    scheduledDateId: "2026-06-24",
    deadline: "December",
    deadlineDateId: "2026-12-31",
    reason: "Turns the broad goal into a concrete build",
    source: "Goal roadmap",
    goalId: "learn-coding",
    isRoadmapTask: true
  },
  {
    id: "physics-circuits",
    title: "Physics revision: circuits",
    section: "subsequent_days",
    estimatedMinutes: 40,
    scheduledDate: "16 June",
    scheduledDateId: "2026-06-16",
    deadline: "next Friday",
    deadlineDateId: "2026-06-19",
    reason: "Keeps next week’s Physics revision from becoming urgent",
    source: "Homework PDF"
  },
  {
    id: "project-meeting-prep",
    title: "Project meeting prep",
    section: "subsequent_days",
    estimatedMinutes: 25,
    scheduledDate: "18 June",
    scheduledDateId: "2026-06-18",
    deadline: "19 June",
    deadlineDateId: "2026-06-19",
    reason: "Prep before the rescheduled team discussion",
    source: "Team message"
  }
];

export const goalRoadmapSteps: DemoGoalRoadmapStep[] = [
  {
    id: "define-outcome",
    goalId: "learn-coding",
    title: "Define target outcome",
    scheduledDate: "16 June",
    description:
      "Decide whether success means building an app, joining competitions, or portfolio readiness.",
    status: "scheduled",
    tasks: [
      {
        id: "define-coding-outcome",
        title: "Define coding target outcome",
        section: "subsequent_days",
        estimatedMinutes: 20,
        scheduledDate: "16 June",
        scheduledDateId: "2026-06-16",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      }
    ]
  },
  {
    id: "fundamentals",
    goalId: "learn-coding",
    title: "Fundamentals sprint",
    scheduledDateRange: "17-30 June",
    status: "in_progress",
    tasks: [
      {
        id: "coding-fundamentals-session-1",
        title: "Coding fundamentals — Session 1",
        section: "subsequent_days",
        estimatedMinutes: 30,
        scheduledDate: "17 June",
        scheduledDateId: "2026-06-17",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "coding-fundamentals-session-2",
        title: "Coding fundamentals — Session 2",
        section: "subsequent_days",
        estimatedMinutes: 30,
        scheduledDate: "30 June",
        scheduledDateId: "2026-06-30",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      }
    ]
  },
  {
    id: "first-project",
    goalId: "learn-coding",
    title: "Build first small project",
    scheduledDateRange: "July",
    description: "Start with a habit tracker so the work has a real interface and state.",
    status: "upcoming",
    tasks: [
      {
        id: "habit-tracker",
        title: "Build a simple habit tracker",
        section: "subsequent_days",
        estimatedMinutes: 60,
        scheduledDate: "8 July",
        scheduledDateId: "2026-07-08",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "habit-tracker-state",
        title: "Connect UI to local state",
        section: "subsequent_days",
        estimatedMinutes: 45,
        scheduledDate: "July",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "habit-tracker-v1",
        title: "Ship v1",
        section: "subsequent_days",
        estimatedMinutes: 45,
        scheduledDate: "July",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      }
    ]
  },
  {
    id: "apis-database",
    goalId: "learn-coding",
    title: "Learn APIs + database",
    scheduledDateRange: "August",
    status: "upcoming",
    tasks: [
      {
        id: "api-route-practice",
        title: "Build API route practice",
        section: "subsequent_days",
        estimatedMinutes: 45,
        scheduledDate: "5 August",
        scheduledDateId: "2026-08-05",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "supabase-table",
        title: "Connect Supabase table",
        section: "subsequent_days",
        estimatedMinutes: 45,
        scheduledDate: "August",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "auth-mock",
        title: "Add auth mock",
        section: "subsequent_days",
        estimatedMinutes: 30,
        scheduledDate: "August",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      }
    ]
  },
  {
    id: "real-project",
    goalId: "learn-coding",
    title: "Ship a real project",
    scheduledDateRange: "September-October",
    status: "upcoming",
    tasks: [
      {
        id: "scope-mvp",
        title: "Scope MVP",
        section: "subsequent_days",
        estimatedMinutes: 45,
        scheduledDate: "9 September",
        scheduledDateId: "2026-09-09",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "core-feature",
        title: "Build core feature",
        section: "subsequent_days",
        estimatedMinutes: 90,
        scheduledDate: "September",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "deploy-vercel",
        title: "Deploy on Vercel",
        section: "subsequent_days",
        estimatedMinutes: 30,
        scheduledDate: "October",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      }
    ]
  },
  {
    id: "polish-present",
    goalId: "learn-coding",
    title: "Polish and present",
    scheduledDateRange: "November-December",
    status: "upcoming",
    tasks: [
      {
        id: "readme",
        title: "Write README",
        section: "subsequent_days",
        estimatedMinutes: 45,
        scheduledDate: "4 November",
        scheduledDateId: "2026-11-04",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "record-demo",
        title: "Record demo",
        section: "subsequent_days",
        estimatedMinutes: 45,
        scheduledDate: "November",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      },
      {
        id: "portfolio-page",
        title: "Prepare portfolio page",
        section: "subsequent_days",
        estimatedMinutes: 60,
        scheduledDate: "December",
        deadline: "December",
        deadlineDateId: "2026-12-31",
        goalId: "learn-coding",
        isRoadmapTask: true
      }
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

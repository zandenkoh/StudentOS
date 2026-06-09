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

export type DemoSourcePreview = {
  title: string;
  source: string;
  fileSize: string;
  fileType: "image" | "text" | "link" | "audio";
  snippet: string;
  filePath?: string;
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
  scheduleRationale?: string;
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
  scheduleRationale?: string;
  source?: string;
  goalId?: string;
  isRoadmapTask?: boolean;
  updated?: boolean;
};

export type DemoScheduleDateOption = {
  id: string;
  label: string;
};

export const commitmentDemoSourcePreviews: Record<string, DemoSourcePreview> = {
  physics: {
    title: "Screenshot 2026-06-09 121842.jpg",
    source: "Desktop Screenshot",
    fileSize: "324 KB",
    fileType: "image",
    snippet: "Physics assignment portal and due details",
    filePath: "/Screenshot%202026-06-09%20121842.jpg",
  },
  cca: {
    title: "Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg",
    source: "Mobile Screenshot",
    fileSize: "492 KB",
    fileType: "image",
    snippet: "CCA notification chat announcement",
    filePath: "/Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg",
  },
  competition: {
    title: "National Coding Challenge 2026 - Submissions",
    source: "Web Link",
    fileSize: "18 KB",
    fileType: "link",
    snippet: "Ensure all repository links, walkthrough recordings, and PDFs of design specifications are uploaded before the cutoff window.",
  },
  coding: {
    title: "goalDemo.txt",
    source: "Assets File",
    fileSize: "1 KB",
    fileType: "text",
    snippet: "I currently have zero experience coding with python. I want to be proficient in data-handling Python libraries by the end of this year.",
  },
  team: {
    title: "Team voice note",
    source: "Voice note",
    fileSize: "1:24",
    fileType: "audio",
    snippet: "Hey, about the project meeting tonight, Sarah mentioned she has a CCA briefing at 5:30 PM and tuition before that, so we might need to reschedule. Can we push to tomorrow morning?",
  },
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
  {
    id: "revision",
    time: "3:30 PM",
    title: "Revision block",
    chip: "Flexible",
    scheduleRationale:
      "StudentOS initially treats revision as the movable buffer because it has no hard attendance window; it can slide later if fixed events or urgent homework need the afternoon."
  },
  {
    id: "tuition",
    time: "4:30 PM",
    title: "Tuition",
    duration: "4:30-6:30 PM",
    chip: "Fixed",
    conflictGroupId: "tuition-cca",
    scheduleRationale:
      "Tuition stays at 4:30-6:30 PM because it is a fixed calendar block with an external teacher; moving flexible study or requesting CCA notes costs less than breaking this commitment."
  },
  {
    id: "cca",
    time: "5:30 PM",
    title: "CCA briefing",
    duration: "5:30-6:15 PM",
    chip: "Needs decision",
    tone: "conflict",
    conflictGroupId: "tuition-cca",
    scheduleRationale:
      "StudentOS flags the CCA briefing instead of force-scheduling it because it overlaps tuition; the optimal action is to resolve the clash before pretending both can be attended."
  },
  {
    id: "dinner",
    time: "7:00 PM",
    title: "Dinner",
    chip: "Fixed",
    scheduleRationale:
      "Dinner is kept at 7:00 PM as a recovery boundary so the later Physics and coding blocks are not pushed into a low-energy stretch."
  },
  {
    id: "physics",
    time: "8:00 PM",
    title: "Physics worksheet",
    chip: "High priority",
    tone: "priority",
    scheduleRationale:
      "Physics is placed at 8:00 PM after fixed evening commitments because it is due tomorrow morning and still needs enough alert time for careful problem-solving."
  },
  {
    id: "coding",
    time: "9:00 PM",
    title: "Coding practice",
    chip: "Weekly goal",
    scheduleRationale:
      "Coding practice sits at 9:00 PM because it is important but not urgent; it can use the later evening once deadline work and fixed events are protected."
  }
];

export const resolvedTimelineEvents: TimelineEvent[] = [
  {
    id: "tuition",
    time: "4:30 PM",
    title: "Tuition",
    duration: "4:30-6:30 PM",
    chip: "Fixed",
    scheduleRationale:
      "Tuition remains at 4:30-6:30 PM because it is the least flexible block; StudentOS resolves the clash around it instead of moving the external appointment."
  },
  {
    id: "notes",
    time: "6:40 PM",
    title: "Get CCA briefing notes",
    chip: "Handled",
    tone: "success",
    scheduleRationale:
      "The notes request is placed right after tuition because the CCA briefing has just ended, so the update is fresh while the action still stays short and low-effort."
  },
  {
    id: "dinner",
    time: "7:00 PM",
    title: "Dinner",
    chip: "Fixed",
    scheduleRationale:
      "Dinner stays at 7:00 PM to create a clean reset before cognitively heavier Physics work."
  },
  {
    id: "revision",
    time: "7:45 PM",
    title: "Revision block",
    chip: "Moved",
    scheduleRationale:
      "Revision moves after dinner because it is flexible and lighter than the urgent Physics worksheet; this avoids crowding the tuition conflict window."
  },
  {
    id: "physics",
    time: "8:00 PM",
    title: "Physics worksheet",
    chip: "High priority",
    tone: "priority",
    scheduleRationale:
      "Physics is scheduled before late-night fatigue sets in because the worksheet is due tomorrow morning and needs careful thought rather than tired guessing."
  },
  {
    id: "coding",
    time: "9:00 PM",
    title: "Coding practice",
    chip: "Weekly goal",
    scheduleRationale:
      "Coding practice is later because it supports a December goal, so it should not steal the student’s best focus from tomorrow’s Physics deadline."
  }
];

export const manualResolvedTimelineEvents: TimelineEvent[] = [
  {
    id: "tuition",
    time: "6:20 PM",
    title: "Tuition rescheduled",
    duration: "6:20-7:50 PM",
    chip: "Rescheduled",
    tone: "success",
    scheduleRationale:
      "Tuition is moved after CCA because the manual instruction makes the briefing fixed and the Physics extension opens enough evening slack."
  },
  {
    id: "cca",
    time: "5:30 PM",
    title: "CCA briefing",
    duration: "5:30-6:15 PM",
    chip: "Fixed",
    scheduleRationale:
      "CCA remains at 5:30 PM because the user explicitly protected it; StudentOS moves tuition instead of treating the briefing as optional."
  },
  {
    id: "physics-extension",
    time: "16 Jun",
    title: "Physics worksheet deadline",
    chip: "Extension recorded",
    tone: "success",
    scheduleRationale:
      "The Physics deadline moves to 16 June because the teacher granted an extension, so it no longer needs the most urgent slot tonight."
  },
  {
    id: "dinner",
    time: "8:00 PM",
    title: "Dinner",
    chip: "Fixed",
    scheduleRationale:
      "Dinner shifts to 8:00 PM because rescheduled tuition now occupies the earlier recovery window."
  },
  {
    id: "coding",
    time: "9:00 PM",
    title: "Coding practice",
    chip: "Weekly goal",
    scheduleRationale:
      "Coding remains at 9:00 PM because the urgent Physics pressure is reduced, but the roadmap still benefits from a small consistent evening block."
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
    timeLabel: "3:30-4:05 PM",
    deadline: "tomorrow 8 AM",
    deadlineDateId: "2026-06-10",
    reason: "Submit before school",
    scheduleRationale:
      "StudentOS makes Physics the immediate focus because it is due tomorrow at 8 AM and needs the clearest remaining attention before the evening gets fragmented.",
    source: "Screenshot"
  },
  {
    id: "message-teammate",
    title: "Message teammate",
    section: "do_next",
    estimatedMinutes: 3,
    timeLabel: "4:10-4:13 PM",
    reason: "Draft ready",
    scheduleRationale:
      "The teammate message is placed after Physics because it is a 3 minute clarification task that should not interrupt the high-focus deadline work.",
    source: "Voice note"
  },
  {
    id: "cca-notes",
    title: "Ask CCA lead for briefing notes",
    section: "do_next",
    estimatedMinutes: 5,
    timeLabel: "5:20-5:25 PM",
    reason: "Resolves the CCA and tuition clash",
    scheduleRationale:
      "StudentOS schedules this before the briefing so the CCA lead can capture notes during the event while the student stays in tuition.",
    source: "CCA announcement"
  },
  {
    id: "tuition",
    title: "Tuition",
    section: "do_next",
    timeLabel: "4:30-6:30 PM",
    reason: "Fixed calendar block",
    scheduleRationale:
      "Tuition is kept at 4:30-6:30 PM because it is externally fixed; the planner moves flexible work around it instead of pretending it can bend.",
    source: "Calendar"
  },
  {
    id: "revision",
    title: "Revision block",
    section: "do_next",
    estimatedMinutes: 45,
    timeLabel: "7:45-8:30 PM",
    reason: "Moved after dinner",
    scheduleRationale:
      "Revision moves to 7:45 PM because it is flexible and lighter than deadline homework, making it a better post-dinner block.",
    source: "Plan"
  },
  {
    id: "coding-practice",
    title: "Coding practice",
    section: "do_next",
    estimatedMinutes: 60,
    timeLabel: "9:00-10:00 PM",
    deadline: "December",
    deadlineDateId: "2026-12-31",
    reason: "Weekly goal started",
    scheduleRationale:
      "Coding practice is scheduled at 9:00 PM because it advances the December goal without stealing the student’s strongest focus from tomorrow’s Physics deadline.",
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
    scheduleRationale:
      "The first coding fundamentals session starts on 17 June so the student gets a near-term next action after immediate school deadlines clear.",
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
    scheduleRationale:
      "The mini-project brief is placed on 24 June after a fundamentals session so the student defines a build only after getting basic syntax context.",
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
    scheduleRationale:
      "Circuits revision is scheduled on 16 June to create a buffer before the Friday deadline while avoiding the overloaded conflict day.",
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
    scheduleRationale:
      "Project meeting prep lands on 18 June because it is close enough to the 19 June discussion to stay relevant without competing with immediate homework.",
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

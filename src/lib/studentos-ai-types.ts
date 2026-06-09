import type {
  Commitment,
  DemoGoalRoadmapStep,
  DemoPlanTask,
  TimelineEvent,
} from "@/lib/demo-data";

export type AISponsorTraceItem = {
  provider: string;
  action: string;
  status: "success" | "fallback" | "error";
  detail: string;
};

export type CapturedSourceForAI = {
  id: string;
  title: string;
  source: string;
  snippet: string;
  fileType?: string;
  fileSize?: string;
  filePath?: string;
  s3Key?: string;
  provider?: string;
  sponsorStatus?: string;
  ocrText?: string;
  textractText?: string;
  sourceSummary?: string;
  extractedTasks?: string[];
  needsClarification?: boolean;
  clarificationPrompt?: string;
};

export type AIClarificationOption = {
  label: string;
  recommended?: boolean;
};

export type AIResolvedCommitment = Partial<
  Pick<Commitment, "title" | "state" | "confidence" | "estimatedDuration" | "explanation">
>;

export type AIClarificationQuestion = {
  id: string;
  commitmentId: string;
  kind: "goal" | "team" | "general";
  title: string;
  subtitle: string;
  question: string;
  options: AIClarificationOption[];
  customPlaceholder: string;
  resolvedCommitment: AIResolvedCommitment;
};

export type AIConflictAnalysis = {
  title: string;
  unresolvedSummary: string;
  resolvedTitle: string;
  resolvedSummary: string;
  fixedEventTitle: string;
  fixedEventTime: string;
  conflictingEventTitle: string;
  conflictingEventTime: string;
  overlapLabel: string;
  impactLabel: string;
  resolvedImpactLabel: string;
  recommendationSummary: string;
  recommendedActions: string[];
  manualActions: string[];
};

export type AIRationale = {
  summary: string;
  bullets: string[];
};

export type AIAgentLog = {
  id: string;
  at: number;
  kind: "thought" | "analysis" | "tool" | "decision" | "footprint";
  title: string;
  body: string;
  detail?: string;
  tool?: {
    provider: "AWS" | "Exa" | "Vercel AI Gateway" | "StudentOS";
    result: string;
  };
};

export type AIGoalResearch = {
  query: string;
  summary: string;
  model?: string;
  searchQueries?: string[];
  sections?: Array<{
    title: string;
    bullets: string[];
  }>;
  clarificationQuestions?: Array<{
    question: string;
    why: string;
  }>;
  researchGaps?: string[];
  citations: Array<{
    title: string;
    url: string;
  }>;
};

export type StudentOSAgentFootprint = {
  createdAt: string;
  currentDate: string;
  provider: "vercel-ai-gateway" | "fallback";
  status: "success" | "fallback" | "error";
  model?: string;
  sourceSummary: {
    totalSources: number;
    realSources: number;
    ocrReadySources: number;
  };
  sources: CapturedSourceForAI[];
  commitments: Commitment[];
  clarificationQuestions: AIClarificationQuestion[];
  timelineEvents: TimelineEvent[];
  resolvedTimelineEvents: TimelineEvent[];
  conflict: AIConflictAnalysis;
  planTasks: DemoPlanTask[];
  roadmapSteps: DemoGoalRoadmapStep[];
  rationale: AIRationale;
  goalResearch?: AIGoalResearch;
  agentLogs: AIAgentLog[];
  sponsorTrace: AISponsorTraceItem[];
};

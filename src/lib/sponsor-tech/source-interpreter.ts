import "server-only";

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type DocumentFormat,
  type ImageFormat,
} from "@aws-sdk/client-bedrock-runtime";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getObjectBytes, getReadUrl } from "@/lib/sponsor-tech/aws-s3";
import { gatewayLanguageModel } from "@/lib/sponsor-tech/ai-gateway-model";
import { isBedrockReady, isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";

const InterpretedTaskSchema = z.object({
  title: z.string(),
  type: z.enum(["task", "event", "deadline", "goal", "reminder", "unclear"]),
  evidence: z.string(),
});

const VerifiedFactSchema = z.object({
  field: z.enum(["date", "start_time", "end_time", "duration", "venue"]),
  value: z.string(),
  evidence: z.string(),
  status: z.enum(["confirmed", "ambiguous", "missing"]),
});

const SourceInterpretationSchema = z.object({
  summary: z.string(),
  sourceKind: z.enum(["task", "event", "deadline", "goal", "mixed", "unclear"]).default("unclear"),
  extractedTasks: z.array(InterpretedTaskSchema).max(6),
  needsClarification: z.boolean(),
  clarificationPrompt: z.string(),
  confidence: z.number().min(0).max(1),
  languageNotes: z.string(),
  verifiedFacts: z.array(VerifiedFactSchema).max(10).default([]),
});

export type SourceInterpretation = z.infer<typeof SourceInterpretationSchema>;

export type SourceInterpretationInput = {
  title: string;
  fileType?: string;
  mimeType?: string;
  s3Key?: string;
  rawText?: string;
  model?: string;
};

const sourceInterpreterSystemPrompt = [
  "You are the StudentOS source interpreter.",
  "Your job is to summarize messy student attachments before the planner sees them.",
  "Read the actual image or PDF when provided; use OCR as supporting evidence, not as the only truth.",
  "Do not infer tasks, events, subjects, deadlines, or summaries from filenames, S3 keys, or generated storage names.",
  "Never extract the attachment filename or S3 key as a task itself.",
  "Every extracted task must be grounded by quoted or near-quoted source evidence. If evidence is missing, return no task and ask for clarification.",
  "Check every attachment for date, start time, end time, duration, and venue.",
  "Record those details in verifiedFacts. Mark a value confirmed only when it is directly visible in the attachment; otherwise mark it ambiguous or missing.",
  "Never calculate a duration unless both start and end times are confirmed and unambiguous. Never infer a venue from context, filenames, or common knowledge.",
  "When multiple dates, times, or venues appear, preserve each relevant fact and mark ambiguous unless the attachment clearly links it to the extracted commitment.",
  "Preserve and interpret non-English text, including Chinese, instead of ignoring it.",
  "A single attachment may contain multiple worksheets, messages, events, or tasks; extract each distinct actionable item, but never create multiple duplicate tasks for the same underlying action.",
  "Do not split one broad learning goal into multiple extracted goals, prerequisites, milestones, or sub-skills. Return one goal and leave milestones for the roadmap planner.",
  "If the source only identifies a packet, cover page, or unclear chat context, mark needsClarification=true.",
  "Keep summaries short, factual, and useful for a review page.",
].join("\n");

function compactText(value = "", maxLength = 5000) {
  const text = value.replace(/\n{3,}/g, "\n\n").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

const groundingStopwords = new Set([
  "about",
  "action",
  "added",
  "after",
  "again",
  "before",
  "commitment",
  "complete",
  "confirm",
  "details",
  "from",
  "have",
  "need",
  "needs",
  "review",
  "schedule",
  "source",
  "student",
  "studentos",
  "task",
  "that",
  "this",
  "uploaded",
  "with",
]);

function meaningfulTokens(value: string) {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .replace(/['’]/g, "")
        .match(/[a-z0-9\u4e00-\u9fff]{2,}/gi)
        ?.map((token) => token.trim())
        .filter((token) => token.length >= 2 && !groundingStopwords.has(token)) ?? [],
    ),
  );
}

function supportedByEvidence(candidate: string, evidence: string) {
  const candidateTokens = meaningfulTokens(candidate);
  if (candidateTokens.length === 0) return true;

  const evidenceTokens = new Set(meaningfulTokens(evidence));
  const overlap = candidateTokens.filter((token) => evidenceTokens.has(token)).length;
  const requiredOverlap = candidateTokens.length <= 2 ? 1 : 2;

  return overlap >= requiredOverlap;
}

function appendLanguageNote(current: string, note: string) {
  return [current, note].filter(Boolean).join(" ");
}

function isGoalLikeTask(task: z.infer<typeof InterpretedTaskSchema>) {
  return (
    task.type === "goal" ||
    /\b(goal|learn|proficient|master|skill|coding|python|library|libraries|roadmap)\b/i.test(`${task.title} ${task.evidence}`)
  );
}

function sentenceGoalTitle(rawText: string) {
  const sentence = rawText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.trim())
    .find((line) => /\b(i\s+want|goal|learn|proficient|master|skill|coding|python)\b/i.test(line));

  if (!sentence) return "";

  return sentence
    .replace(/^my\s+goal\s+is\s+(?:to\s+)?/i, "")
    .replace(/^i\s+want\s+to\s+/i, "")
    .replace(/^i\s+need\s+to\s+/i, "")
    .replace(/^i\s+currently\s+have\b.*?\bi\s+want\s+to\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[a-z]/, (char) => char.toUpperCase())
    .slice(0, 120);
}

function consolidateSingleLearningGoal(
  input: SourceInterpretationInput,
  interpretation: SourceInterpretation,
): SourceInterpretation {
  const goalLikeTasks = interpretation.extractedTasks.filter(isGoalLikeTask);
  if (goalLikeTasks.length < 2) return interpretation;

  const combinedText = goalLikeTasks.map((task) => `${task.title} ${task.evidence}`).join(" ");
  const tokens = meaningfulTokens(combinedText);
  const hasSharedLearningTarget =
    /\b(python|coding|programming|data[-\s]?handling|pandas|numpy|library|libraries)\b/i.test(combinedText) ||
    tokens.filter((token) => ["learn", "proficient", "python", "coding", "data", "libraries"].includes(token)).length >= 2;

  if (!hasSharedLearningTarget) return interpretation;

  const rawText = compactText(input.rawText, 1200);
  const primaryGoal = goalLikeTasks[0];
  const consolidatedTitle = sentenceGoalTitle(rawText) || primaryGoal.title;
  const consolidatedEvidence = goalLikeTasks
    .map((task) => task.evidence || task.title)
    .filter(Boolean)
    .join(" ");
  const nonGoalTasks = interpretation.extractedTasks.filter((task) => !isGoalLikeTask(task));

  return {
    ...interpretation,
    summary: interpretation.summary.includes("single learning goal")
      ? interpretation.summary
      : `${interpretation.summary} Treated as one learning goal; sub-skills belong in the roadmap.`,
    sourceKind: "goal",
    extractedTasks: [
      {
        title: consolidatedTitle,
        type: "goal" as const,
        evidence: consolidatedEvidence || rawText || primaryGoal.evidence,
      },
      ...nonGoalTasks,
    ].slice(0, 6),
    languageNotes: appendLanguageNote(
      interpretation.languageNotes,
      "Multiple goal-like extracted rows were consolidated into one goal so roadmap milestones do not appear as duplicate commitments.",
    ),
  };
}

function groundedInterpretation(
  input: SourceInterpretationInput,
  interpretation: SourceInterpretation,
): SourceInterpretation {
  const consolidatedInterpretation = consolidateSingleLearningGoal(input, interpretation);
  const rawText = compactText(input.rawText);
  const hasReliableText = rawText.length >= 20 && !isLowSignalOcr(rawText);
  const hasMultimodalAttachment = Boolean(input.s3Key && (input.fileType === "image" || input.fileType === "pdf"));

  if (!hasReliableText && hasMultimodalAttachment) {
    return {
      ...consolidatedInterpretation,
      languageNotes: appendLanguageNote(
        consolidatedInterpretation.languageNotes,
        "The multimodal model read the attachment directly; OCR was used only as supporting context.",
      ),
    };
  }

  if (!hasReliableText && consolidatedInterpretation.extractedTasks.length > 0) {
    const fallback = fallbackInterpretSource(input);

    return {
      ...fallback,
      needsClarification: true,
      confidence: Math.min(fallback.confidence, 0.42),
      languageNotes: appendLanguageNote(
        fallback.languageNotes,
        "Model-extracted tasks were withheld because they could not be grounded in readable source text.",
      ),
    };
  }

  if (!hasReliableText) return consolidatedInterpretation;

  const supportedTasks = consolidatedInterpretation.extractedTasks.filter((task) =>
    supportedByEvidence(`${task.title}\n${task.evidence}`, rawText),
  );

  if (supportedTasks.length === consolidatedInterpretation.extractedTasks.length) return consolidatedInterpretation;

  if (supportedTasks.length === 0) {
    const fallback = fallbackInterpretSource(input);

    return {
      ...fallback,
      needsClarification: true,
      confidence: Math.min(fallback.confidence, 0.48),
      languageNotes: appendLanguageNote(
        fallback.languageNotes,
        "Unsupported model-extracted tasks were removed before the review step.",
      ),
    };
  }

  return {
    ...consolidatedInterpretation,
    extractedTasks: supportedTasks,
    needsClarification: true,
    clarificationPrompt:
      consolidatedInterpretation.clarificationPrompt ||
      "Some extracted items were not clearly supported by the source text. Which remaining item should StudentOS schedule?",
    confidence: Math.min(consolidatedInterpretation.confidence, 0.74),
    languageNotes: appendLanguageNote(
      consolidatedInterpretation.languageNotes,
      "Unsupported model-extracted tasks were removed before the review step.",
    ),
  };
}

function sourceInterpreterPrompt(input: SourceInterpretationInput) {
  return JSON.stringify(
    {
      title: input.title,
      fileType: input.fileType,
      mimeType: input.mimeType,
      ocrText: compactText(input.rawText),
      outputGuidance: [
        "Return JSON only.",
        "Use the title only as an attachment label; do not use it as evidence for extracted tasks.",
        "summary: one sentence, under 180 characters if possible.",
        "sourceKind: the dominant label for this attachment: task, event, deadline, goal, mixed, or unclear.",
        "extractedTasks: student commitments only; use type='unclear' for ambiguous actions. Ensure task titles are highly accurate and descriptive, correctly incorporating the specific subject, action, date, due date, time, and venue.",
        "If the source is one broad learning goal, return exactly one extracted task of type='goal'. Do not extract prerequisites, milestones, sub-skills, or roadmap steps as separate commitments.",
        "For each extracted task, evidence must quote or closely paraphrase text visible in ocrText or the attachment.",
        "clarificationPrompt: direct question for the review page when needed. If a task is missing crucial details like a date, due date, time, or venue, set needsClarification to true and generate a prompt asking for those specific missing details.",
        "languageNotes: mention if OCR likely dropped Chinese/non-English text or visual context.",
        "verifiedFacts: inspect date, start_time, end_time, duration, and venue. Include direct visible evidence for confirmed or ambiguous values; use an empty value/evidence for missing fields.",
        "Do not silently normalize an ambiguous date or time. Preserve the visible wording in value and explain ambiguity through status.",
      ],
      outputShape: {
        summary: "string",
        sourceKind: "task|event|deadline|goal|mixed|unclear",
        extractedTasks: [{ title: "string", type: "task|event|deadline|goal|reminder|unclear", evidence: "string" }],
        needsClarification: "boolean",
        clarificationPrompt: "string",
        confidence: "number 0..1",
        languageNotes: "string",
        verifiedFacts: [{
          field: "date|start_time|end_time|duration|venue",
          value: "string",
          evidence: "direct visible evidence",
          status: "confirmed|ambiguous|missing",
        }],
      },
    },
    null,
    2,
  );
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Bedrock did not return a JSON object.");
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

function neutralDocumentName(title: string) {
  const cleaned = title
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-zA-Z0-9 ()[\]-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return cleaned || "StudentOS source";
}

function imageFormatFromMime(mimeType = ""): ImageFormat {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("webp")) return "webp";
  return "jpeg";
}

async function buildBedrockAttachment(input: SourceInterpretationInput): Promise<ContentBlock | undefined> {
  if (!input.s3Key || !(input.fileType === "image" || input.fileType === "pdf")) return undefined;

  const bytes = await getObjectBytes(input.s3Key);
  if (!bytes.length) return undefined;

  if (input.fileType === "image") {
    if (bytes.byteLength > 3.75 * 1024 * 1024) {
      throw new Error("Image is larger than Bedrock Converse's inline image limit.");
    }

    return {
      image: {
        format: imageFormatFromMime(input.mimeType),
        source: { bytes },
      },
    };
  }

  if (bytes.byteLength > 4.5 * 1024 * 1024) {
    throw new Error("PDF is larger than Bedrock Converse's inline document limit.");
  }

  return {
    document: {
      format: "pdf" as DocumentFormat,
      name: neutralDocumentName(input.title),
      source: { bytes },
    },
  };
}

async function interpretWithBedrock(input: SourceInterpretationInput): Promise<SourceInterpretation> {
  if (!isBedrockReady()) throw new Error("Bedrock is disabled or missing credentials.");

  const attachment = await buildBedrockAttachment(input);
  if (!attachment) throw new Error("No Bedrock-compatible attachment was available.");

  const client = new BedrockRuntimeClient({ region: sponsorEnv.bedrockRegion });
  const response = await client.send(
    new ConverseCommand({
      modelId: sponsorEnv.bedrockModelId,
      system: [{ text: sourceInterpreterSystemPrompt }],
      messages: [
        {
          role: "user",
          content: [{ text: sourceInterpreterPrompt(input) }, attachment],
        },
      ],
      inferenceConfig: {
        maxTokens: 1200,
        temperature: 0,
      },
    }),
  );

  const text = response.output?.message?.content
    ?.map((part) => ("text" in part ? part.text : ""))
    .filter(Boolean)
    .join("\n");

  if (!text) throw new Error("Bedrock returned no text.");

  return groundedInterpretation(input, SourceInterpretationSchema.parse(extractJsonObject(text)));
}

function looksLikeExamCoverPage(text: string) {
  return /instructions to all candidates|name:\s*class:\s*index number|o[- ]?level|end[- ]?of[- ]?year examination/i.test(
    text,
  );
}

function isLowSignalOcr(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 20) return true;

  const alphaNumericCount = (normalized.match(/[a-z0-9]/gi) ?? []).length;
  return alphaNumericCount / normalized.length < 0.35;
}

export function fallbackInterpretSource(input: SourceInterpretationInput): SourceInterpretation {
  const rawText = compactText(input.rawText, 1200);

  if (rawText && looksLikeExamCoverPage(rawText)) {
    const subjectMatch = rawText.match(/\b(biology|physics|chemistry|math(?:ematics)?|english|history|geography|science|computing|literature)\b/i);
    const subject = subjectMatch ? subjectMatch[0] : "biology";
    const taskTitle = `Clarify which ${subject} worksheet questions to complete`;

    return {
      summary:
        `${subject.charAt(0).toUpperCase() + subject.slice(1)} exam or worksheet cover page detected. It identifies the packet but does not specify which questions the student needs to complete.`,
      sourceKind: "unclear",
      extractedTasks: [
        {
          title: taskTitle,
          type: "unclear",
          evidence: rawText.split("\n").find(Boolean) ?? input.title,
        },
      ],
      needsClarification: true,
      clarificationPrompt:
        `This looks like a ${subject} exam or worksheet packet cover page. Which worksheet, page, or question numbers should StudentOS work on?`,
      confidence: 0.62,
      languageNotes: "Fallback interpretation used OCR text only.",
      verifiedFacts: [],
    };
  }

  if ((input.fileType === "image" || input.fileType === "pdf") && (!rawText || isLowSignalOcr(rawText))) {
    // Try to derive a better title from the filename
    const cleanTitle = input.title
      .replace(/\.[a-z]{2,5}$/i, "")
      .replace(/[_\-]+/g, " ")
      .replace(/^(IMG|DSC|Screenshot|Photo|Scan|Document|File|image)\s*/i, "")
      .trim();
    const hasUsefulFilename = cleanTitle.length > 3 && !/^\d+$/.test(cleanTitle);
    const taskTitle = hasUsefulFilename
      ? `Review ${cleanTitle}`
      : "Clarify what to schedule from this attachment";

    return {
      summary:
        "The attachment needs visual or multilingual interpretation, but OCR alone did not provide enough readable text.",
      sourceKind: "unclear",
      extractedTasks: [
        {
          title: taskTitle,
          type: "unclear",
          evidence: rawText || input.title,
        },
      ],
      needsClarification: true,
      clarificationPrompt:
        "I could not confidently read the attachment from OCR alone. What should StudentOS extract or schedule from it?",
      confidence: 0.35,
      languageNotes: "OCR may have missed non-English text or visual layout.",
      verifiedFacts: [],
    };
  }

  // For text sources, derive a clean summary instead of raw OCR dumps
  if (rawText) {
    const firstMeaningfulLine = rawText
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 12 && line.length < 120 && !/^(name|class|index|date|instructions)/i.test(line));
    const summary = firstMeaningfulLine
      ? firstMeaningfulLine.slice(0, 180)
      : rawText.slice(0, 180);

    return {
      summary,
      sourceKind: "unclear",
      extractedTasks: [],
      needsClarification: false,
      clarificationPrompt: "",
      confidence: 0.5,
      languageNotes: "Fallback interpretation used available text only.",
      verifiedFacts: [],
    };
  }

  return {
    summary: "Source uploaded for StudentOS review.",
    sourceKind: "unclear",
    extractedTasks: [],
    needsClarification: false,
    clarificationPrompt: "",
    confidence: 0.25,
    languageNotes: "Fallback interpretation used available text only.",
    verifiedFacts: [],
  };
}

async function getAttachmentPart(input: SourceInterpretationInput) {
  if (!input.s3Key || !(input.fileType === "image" || input.fileType === "pdf")) return undefined;

  const readUrl = new URL(await getReadUrl(input.s3Key, 600));

  if (input.fileType === "image") {
    return {
      type: "image" as const,
      image: readUrl,
      mediaType: input.mimeType?.startsWith("image/") ? input.mimeType : undefined,
    };
  }

  return {
    type: "file" as const,
    data: readUrl,
    filename: input.title,
    mediaType: input.mimeType || "application/pdf",
  };
}

export async function interpretSourceAttachment(
  input: SourceInterpretationInput,
): Promise<SourceInterpretation & { provider: "aws-bedrock" | "vercel-ai-gateway" | "fallback" }> {
  const fallback = fallbackInterpretSource(input);

  try {
    const bedrockOutput = await interpretWithBedrock(input);
    return { ...bedrockOutput, provider: "aws-bedrock" };
  } catch {
    // Bedrock is optional for the hackathon demo; AI Gateway and heuristics keep the flow stable.
  }

  if (!isVercelAiReady()) {
    return { ...fallback, provider: "fallback" };
  }

  try {
    const attachmentPart = await getAttachmentPart(input);
    const rawText = compactText(input.rawText);

    const { output } = await generateText({
      model: gatewayLanguageModel(input.model || sponsorEnv.aiGatewayFallbackModel || sponsorEnv.aiGatewayModel),
      output: Output.object({ schema: SourceInterpretationSchema }),
      system: sourceInterpreterSystemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: sourceInterpreterPrompt({ ...input, rawText }),
            },
            ...(attachmentPart ? [attachmentPart] : []),
          ],
        },
      ],
    });

    return { ...groundedInterpretation(input, output), provider: "vercel-ai-gateway" };
  } catch {
    return { ...fallback, provider: "fallback" };
  }
}

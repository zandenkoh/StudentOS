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
import { isBedrockReady, isVercelAiReady, sponsorEnv } from "@/lib/sponsor-tech/env";

const InterpretedTaskSchema = z.object({
  title: z.string(),
  type: z.enum(["task", "event", "deadline", "goal", "reminder", "unclear"]),
  evidence: z.string(),
});

const SourceInterpretationSchema = z.object({
  summary: z.string(),
  extractedTasks: z.array(InterpretedTaskSchema).max(6),
  needsClarification: z.boolean(),
  clarificationPrompt: z.string(),
  confidence: z.number().min(0).max(1),
  languageNotes: z.string(),
});

export type SourceInterpretation = z.infer<typeof SourceInterpretationSchema>;

export type SourceInterpretationInput = {
  title: string;
  fileType?: string;
  mimeType?: string;
  s3Key?: string;
  rawText?: string;
};

const sourceInterpreterSystemPrompt = [
  "You are the StudentOS source interpreter.",
  "Your job is to summarize messy student attachments before the planner sees them.",
  "Read the actual image or PDF when provided; use OCR as supporting evidence, not as the only truth.",
  "Do not infer tasks, events, subjects, deadlines, or summaries from filenames, S3 keys, or generated storage names.",
  "Preserve and interpret non-English text, including Chinese, instead of ignoring it.",
  "A single attachment may contain multiple worksheets, messages, events, or tasks; extract each distinct actionable item.",
  "If the source only identifies a packet, cover page, or unclear chat context, mark needsClarification=true.",
  "Keep summaries short, factual, and useful for a review page.",
].join("\n");

function compactText(value = "", maxLength = 5000) {
  const text = value.replace(/\n{3,}/g, "\n\n").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
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
        "extractedTasks: student commitments only; use type='unclear' for ambiguous actions.",
        "clarificationPrompt: direct question for the review page when needed.",
        "languageNotes: mention if OCR likely dropped Chinese/non-English text or visual context.",
      ],
      outputShape: {
        summary: "string",
        extractedTasks: [{ title: "string", type: "task|event|deadline|goal|reminder|unclear", evidence: "string" }],
        needsClarification: "boolean",
        clarificationPrompt: "string",
        confidence: "number 0..1",
        languageNotes: "string",
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

  return SourceInterpretationSchema.parse(extractJsonObject(text));
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
    return {
      summary:
        "Exam or worksheet cover page detected. It identifies the packet but does not say which biology questions the student wants done.",
      extractedTasks: [
        {
          title: "Clarify which biology worksheet questions to complete",
          type: "unclear",
          evidence: rawText.split("\n").find(Boolean) ?? input.title,
        },
      ],
      needsClarification: true,
      clarificationPrompt:
        "This looks like a biology exam or worksheet packet cover page. Which worksheet, page, or question numbers should StudentOS work on?",
      confidence: 0.62,
      languageNotes: "Fallback interpretation used OCR text only.",
    };
  }

  if ((input.fileType === "image" || input.fileType === "pdf") && (!rawText || isLowSignalOcr(rawText))) {
    return {
      summary:
        "The attachment appears to need visual or multilingual interpretation, but OCR alone did not provide enough reliable text.",
      extractedTasks: [
        {
          title: "Ask the student what action to take from this attachment",
          type: "unclear",
          evidence: rawText || input.title,
        },
      ],
      needsClarification: true,
      clarificationPrompt:
        "I could not confidently read the attachment from OCR alone. What should StudentOS extract or schedule from it?",
      confidence: 0.35,
      languageNotes: "OCR may have missed non-English text or visual layout.",
    };
  }

  return {
    summary: rawText
      ? rawText.split("\n").find((line) => line.trim().length > 12)?.slice(0, 180) ?? rawText.slice(0, 180)
      : "Source uploaded for StudentOS review.",
    extractedTasks: [],
    needsClarification: false,
    clarificationPrompt: "",
    confidence: rawText ? 0.5 : 0.25,
    languageNotes: "Fallback interpretation used available text only.",
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
      model: sponsorEnv.aiGatewayModel,
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

    return { ...output, provider: "vercel-ai-gateway" };
  } catch {
    return { ...fallback, provider: "fallback" };
  }
}

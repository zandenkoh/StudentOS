import { NextResponse } from "next/server";
import { z } from "zod";
import { detectTextFromS3 } from "@/lib/sponsor-tech/aws-textract";
import { getObjectText } from "@/lib/sponsor-tech/aws-s3";
import { isAwsReady, sponsorEnv } from "@/lib/sponsor-tech/env";
import { interpretSourceAttachment } from "@/lib/sponsor-tech/source-interpreter";

export const runtime = "nodejs";

const RequestSchema = z.object({
  key: z.string().min(1),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  fileType: z.enum(["image", "pdf", "text", "audio", "link", "email"]).optional(),
});

export async function POST(req: Request) {
  let requestBody: unknown;

  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(requestBody);

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing S3 object key" }, { status: 400 });
  }

  if (!isAwsReady()) {
    return NextResponse.json({
      provider: "mock",
      text: "AWS Textract disabled. Use demo OCR text.",
      blocks: [],
    });
  }

  try {
    const isTextSource = parsed.data.fileType === "text" || parsed.data.mimeType?.startsWith("text/");
    const result = isTextSource
      ? { text: await getObjectText(parsed.data.key), raw: { Blocks: [] } }
      : await detectTextFromS3(parsed.data.key);
    const interpretation = await interpretSourceAttachment({
      title: parsed.data.name || parsed.data.key,
      fileType: parsed.data.fileType,
      mimeType: parsed.data.mimeType,
      s3Key: parsed.data.key,
      rawText: result.text,
    });

    return NextResponse.json({
      provider: isTextSource ? "aws-s3-text" : "aws-textract",
      region: sponsorEnv.awsTextractRegion,
      text: result.text,
      blockCount: result.raw.Blocks?.length || 0,
      summary: interpretation.summary,
      sourceKind: interpretation.sourceKind,
      interpretedItems: interpretation.extractedTasks,
      extractedTasks: interpretation.extractedTasks.map((task) => task.title),
      extractedEvidence: interpretation.extractedTasks.map((task) => task.evidence).filter(Boolean),
      confidence: interpretation.confidence,
      languageNotes: interpretation.languageNotes,
      needsClarification: interpretation.needsClarification,
      clarificationPrompt: interpretation.clarificationPrompt,
      interpretationProvider: interpretation.provider,
    });
  } catch (error) {
    const interpretation = await interpretSourceAttachment({
      title: parsed.data.name || parsed.data.key,
      fileType: parsed.data.fileType,
      mimeType: parsed.data.mimeType,
      s3Key: parsed.data.key,
      rawText: "",
    });

    return NextResponse.json({
      provider: "aws-textract",
      warning: "Textract failed; demo can continue with demo OCR text.",
      text: "",
      blocks: [],
      summary: interpretation.summary,
      sourceKind: interpretation.sourceKind,
      interpretedItems: interpretation.extractedTasks,
      extractedTasks: interpretation.extractedTasks.map((task) => task.title),
      extractedEvidence: interpretation.extractedTasks.map((task) => task.evidence).filter(Boolean),
      confidence: interpretation.confidence,
      languageNotes: interpretation.languageNotes,
      needsClarification: interpretation.needsClarification,
      clarificationPrompt: interpretation.clarificationPrompt,
      interpretationProvider: interpretation.provider,
      error: error instanceof Error ? error.message : "Unknown Textract error",
    });
  }
}

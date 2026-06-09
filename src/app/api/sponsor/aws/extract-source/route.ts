import { NextResponse } from "next/server";
import { z } from "zod";
import { detectTextFromS3 } from "@/lib/sponsor-tech/aws-textract";
import { isAwsReady, sponsorEnv } from "@/lib/sponsor-tech/env";

export const runtime = "nodejs";

const RequestSchema = z.object({
  key: z.string().min(1),
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
      text: "AWS Textract disabled. Use demo fallback OCR text.",
      blocks: [],
    });
  }

  try {
    const result = await detectTextFromS3(parsed.data.key);

    return NextResponse.json({
      provider: "aws-textract",
      region: sponsorEnv.awsTextractRegion,
      text: result.text,
      blockCount: result.raw.Blocks?.length || 0,
    });
  } catch (error) {
    return NextResponse.json({
      provider: "aws-textract",
      warning: "Textract failed; demo can continue with fallback OCR text.",
      text: "",
      blocks: [],
      error: error instanceof Error ? error.message : "Unknown Textract error",
    });
  }
}

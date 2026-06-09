import { NextResponse } from "next/server";
import { z } from "zod";
import { uploadBufferToS3 } from "@/lib/sponsor-tech/aws-s3";
import { isAwsReady } from "@/lib/sponsor-tech/env";
import {
  loadSourceCache,
  saveSourceCache,
  sha256,
  sourceCacheKey,
  type CachedSourceRecord,
} from "@/lib/sponsor-tech/source-cache";

export const runtime = "nodejs";

const RequestSchema = z.object({
  origin: z.enum(["mid_flow_add", "user_upload"]).default("mid_flow_add"),
  title: z.string().min(1).default("Added source"),
  text: z.string().min(1),
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
    return NextResponse.json({ error: "Missing source text" }, { status: 400 });
  }

  const { origin, title, text } = parsed.data;
  const contentHash = sha256(text);
  const sourceId = `${origin}-${contentHash.slice(0, 16)}`;
  const cacheKey = sourceCacheKey(origin, sourceId);

  if (!isAwsReady()) {
    return NextResponse.json({
      provider: "mock",
      source: {
        sourceId,
        origin,
        title,
        source: "Added task",
        fileType: "text",
        snippet: text,
        provider: "mock",
        sponsorStatus: "fallback",
      },
      trace: [
        {
          provider: "AWS",
          action: "Stored added source",
          status: "fallback",
          detail: "AWS is disabled or missing credentials.",
        },
      ],
    });
  }

  try {
    const manifest = await loadSourceCache();
    const cached = manifest.records[cacheKey];

    if (cached?.contentHash === contentHash && cached.s3Key) {
      return NextResponse.json({
        provider: "aws-source-cache",
        source: {
          ...cached,
          sponsorStatus: "cached",
        },
        trace: [
          {
            provider: "AWS",
            action: "Reused added source cache",
            status: "success",
            detail: `${title} already exists at ${cached.s3Key}.`,
          },
        ],
      });
    }

    const safeTitle = title.replace(/[^a-zA-Z0-9._-]/g, "_");
    const s3Key = `studentos-demo/mid-flow/${contentHash.slice(0, 16)}-${safeTitle}.txt`;

    await uploadBufferToS3({
      key: s3Key,
      body: Buffer.from(text),
      contentType: "text/plain",
    });

    const record: CachedSourceRecord = {
      sourceId,
      origin,
      title,
      source: "AWS S3",
      fileType: "text",
      snippet: text,
      s3Key,
      contentHash,
      textractText: text,
      provider: "aws-s3",
      sponsorStatus: "uploaded",
      processedAt: new Date().toISOString(),
    };

    manifest.records[cacheKey] = record;
    await saveSourceCache(manifest);

    return NextResponse.json({
      provider: "aws-source-cache",
      source: record,
      trace: [
        {
          provider: "AWS",
          action: "Stored added source",
          status: "success",
          detail: `${title} -> ${s3Key}`,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({
      provider: "aws-source-cache",
      warning: "Added source cache failed; demo can continue with fallback data.",
      error: error instanceof Error ? error.message : "Unknown added source cache error",
      source: {
        sourceId,
        origin,
        title,
        source: "Added task",
        fileType: "text",
        snippet: text,
        provider: "mock",
        sponsorStatus: "fallback",
      },
    });
  }
}

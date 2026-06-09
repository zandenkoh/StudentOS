import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { detectTextFromS3 } from "@/lib/sponsor-tech/aws-textract";
import { uploadBufferToS3 } from "@/lib/sponsor-tech/aws-s3";
import { isAwsReady } from "@/lib/sponsor-tech/env";
import { interpretSourceAttachment } from "@/lib/sponsor-tech/source-interpreter";
import {
  loadSourceCache,
  saveSourceCache,
  sha256,
  sourceCacheKey,
  type CachedSourceRecord,
} from "@/lib/sponsor-tech/source-cache";

export const runtime = "nodejs";

type DemoPacketFile = {
  sourceId: string;
  title: string;
  source: string;
  snippet: string;
  fileSize: string;
  fileType: CachedSourceRecord["fileType"];
  publicPath?: string;
  mimeType?: string;
};

const demoPacketFiles: DemoPacketFile[] = [
  {
    sourceId: "whatsapp-screenshot",
    title: "WhatsApp project chat.jpg",
    source: "WhatsApp Screenshot",
    snippet: "Team chat: project meeting may move because Sarah has CCA and tuition.",
    fileSize: "185 KB",
    fileType: "image",
    publicPath: "/IMG-20260609-WA0004.jpg",
    mimeType: "image/jpeg",
  },
  {
    sourceId: "physics-homework-pdf",
    title: "Physics Chapter 12 homework.pdf",
    source: "Homework PDF",
    snippet: "Worksheet due tomorrow 8 AM with Chapter 12 induction questions.",
    fileSize: "2.1 MB",
    fileType: "pdf",
  },
  {
    sourceId: "team-voice-note",
    title: "Teammate voice note.m4a",
    source: "Voice Note",
    snippet: "1:24 transcript: ask if the project meeting can move to tomorrow morning.",
    fileSize: "1:24",
    fileType: "audio",
  },
  {
    sourceId: "calendar-conflict",
    title: "Tuition calendar clash.png",
    source: "Calendar Conflict",
    snippet: "Tuition is fixed from 4:30-6:30 PM, overlapping the CCA briefing.",
    fileSize: "210 KB",
    fileType: "image",
    publicPath: "/Screenshot 2026-06-09 123905.jpg",
    mimeType: "image/jpeg",
  },
  {
    sourceId: "cca-screenshot",
    title: "CCA announcement screenshot.jpg",
    source: "CCA Announcement",
    snippet: "Briefing starts at 5:30 PM today in the auditorium.",
    fileSize: "492 KB",
    fileType: "image",
    publicPath: "/Screenshot_2026-06-04-08-22-40-94_6012fa4d4ddec268fc5c7112cbb265e7.jpg",
    mimeType: "image/jpeg",
  },
  {
    sourceId: "coding-goal",
    title: "goalDemo.txt",
    source: "Long-term Coding Goal",
    snippet: "I have zero Python experience and want to be proficient with data-handling libraries by year end.",
    fileSize: "1 KB",
    fileType: "text",
    publicPath: "/goalDemo.txt",
    mimeType: "text/plain",
  },
  {
    sourceId: "team-project-message",
    title: "Team project follow-up",
    source: "Team Message",
    snippet: "Ask teammate first before locking tonight's project discussion.",
    fileSize: "8 KB",
    fileType: "text",
  },
];

function filePathForPublicPath(publicPath: string) {
  return path.join(process.cwd(), "public", decodeURIComponent(publicPath.replace(/^\//, "")));
}

function templateS3Key(source: DemoPacketFile, contentHash: string) {
  const safeTitle = source.title.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `studentos-demo/templates/${source.sourceId}-${contentHash.slice(0, 12)}-${safeTitle}`;
}

async function processFileBackedSource(source: DemoPacketFile, manifestRecords: Record<string, CachedSourceRecord>) {
  if (!source.publicPath || !source.mimeType) {
    return {
      sourceId: source.sourceId,
      origin: "initial_packet" as const,
      title: source.title,
      source: source.source,
      fileType: source.fileType,
      fileSize: source.fileSize,
      filePath: source.publicPath,
      snippet: source.snippet,
      provider: "mock" as const,
      sponsorStatus: "fallback" as const,
      processedAt: new Date().toISOString(),
    };
  }

  const buffer = await readFile(filePathForPublicPath(source.publicPath));
  const contentHash = sha256(buffer);
  const cacheKey = sourceCacheKey("initial_packet", source.sourceId);
  const cached = manifestRecords[cacheKey];

  if (cached?.contentHash === contentHash && cached.s3Key) {
    if (!cached.sourceSummary && (source.fileType === "image" || source.fileType === "pdf" || source.fileType === "text")) {
      const interpretation = await interpretSourceAttachment({
        title: source.title,
        fileType: source.fileType,
        mimeType: source.mimeType,
        s3Key: cached.s3Key,
        rawText: cached.textractText,
      });

      return {
        ...cached,
        sourceSummary: interpretation.summary,
        extractedTasks: interpretation.extractedTasks.map((task) => task.title),
        needsClarification: interpretation.needsClarification,
        clarificationPrompt: interpretation.clarificationPrompt,
        sponsorStatus: "cached" as const,
        snippet: interpretation.summary || cached.textractText?.split("\n").find(Boolean)?.slice(0, 110) || cached.snippet,
      };
    }

    return {
      ...cached,
      sponsorStatus: "cached" as const,
      snippet: cached.sourceSummary || cached.textractText?.split("\n").find(Boolean)?.slice(0, 110) || cached.snippet,
    };
  }

  const s3Key = templateS3Key(source, contentHash);
  await uploadBufferToS3({
    key: s3Key,
    body: buffer,
    contentType: source.mimeType,
  });

  let textractText = "";
  let textractBlockCount = 0;
  let provider: CachedSourceRecord["provider"] = "aws-s3";
  let sponsorStatus: CachedSourceRecord["sponsorStatus"] = "uploaded";

  if (source.fileType === "image" || source.fileType === "pdf") {
    try {
      const result = await detectTextFromS3(s3Key);
      textractText = result.text;
      textractBlockCount = result.raw.Blocks?.length || 0;
      provider = "aws-textract";
      sponsorStatus = textractText ? "extracted" : "uploaded";
    } catch {
      sponsorStatus = "fallback";
    }
  } else if (source.fileType === "text") {
    textractText = buffer.toString("utf8");
  }

  const interpretation = await interpretSourceAttachment({
    title: source.title,
    fileType: source.fileType,
    mimeType: source.mimeType,
    s3Key,
    rawText: textractText,
  });

  return {
    sourceId: source.sourceId,
    origin: "initial_packet" as const,
    title: source.title,
    source: provider === "aws-textract" ? "AWS Textract" : "AWS S3",
    fileType: source.fileType,
    fileSize: source.fileSize,
    filePath: source.publicPath,
    snippet: interpretation.summary || textractText.split("\n").find(Boolean)?.slice(0, 110) || source.snippet,
    s3Key,
    contentHash,
    textractText,
    textractBlockCount,
    sourceSummary: interpretation.summary,
    extractedTasks: interpretation.extractedTasks.map((task) => task.title),
    needsClarification: interpretation.needsClarification,
    clarificationPrompt: interpretation.clarificationPrompt,
    provider,
    sponsorStatus,
    processedAt: new Date().toISOString(),
  };
}

export async function POST() {
  if (!isAwsReady()) {
    return NextResponse.json({
      provider: "mock",
      warning: "USE_REAL_AWS=false or AWS credentials are missing; demo packet was not uploaded.",
      sources: demoPacketFiles.map((source) => ({
        sourceId: source.sourceId,
        title: source.title,
        source: source.source,
        fileType: source.fileType,
        fileSize: source.fileSize,
        filePath: source.publicPath,
        snippet: source.snippet,
        provider: "mock",
        sponsorStatus: "fallback",
      })),
      trace: [
        {
          provider: "AWS",
          action: "Reused demo packet fallback",
          status: "fallback",
          detail: "AWS is disabled or missing credentials.",
        },
      ],
    });
  }

  try {
    const manifest = await loadSourceCache();
    const sources = await Promise.all(
      demoPacketFiles.map((source) => processFileBackedSource(source, manifest.records)),
    );

    for (const source of sources) {
      manifest.records[sourceCacheKey("initial_packet", source.sourceId)] = source;
    }

    await saveSourceCache(manifest);

    const cachedCount = sources.filter((source) => source.sponsorStatus === "cached").length;
    const storedCount = sources.filter((source) => source.s3Key).length;
    const ocrReadyCount = sources.filter((source) => source.textractText).length;
    const newlyProcessedCount = storedCount - cachedCount;

    return NextResponse.json({
      provider: "aws-source-cache",
      cacheKey: "initial_packet",
      sources,
      trace: [
        {
          provider: "AWS",
          action: cachedCount > 0 ? "Reused cached demo packet sources" : "Cached demo packet sources",
          status: "success",
          detail: `${cachedCount} cached, ${newlyProcessedCount} newly processed, ${ocrReadyCount} OCR/text-ready.`,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({
      provider: "aws-source-cache",
      warning: "Demo packet cache failed; demo packet fallback was returned.",
      error: error instanceof Error ? error.message : "Unknown demo packet cache error",
      sources: demoPacketFiles.map((source) => ({
        sourceId: source.sourceId,
        title: source.title,
        source: source.source,
        fileType: source.fileType,
        fileSize: source.fileSize,
        filePath: source.publicPath,
        snippet: source.snippet,
        provider: "mock",
        sponsorStatus: "fallback",
      })),
    });
  }
}

import { readdir, readFile, stat } from "fs/promises";
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
  absolutePath?: string;
};

const ASSETS_DIR = path.join(process.cwd(), "assets");

const mimeTypesByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".json": "application/json",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function fileTypeForExtension(extension: string): CachedSourceRecord["fileType"] {
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extension)) return "image";
  if (extension === ".pdf") return "pdf";
  if ([".m4a", ".mp3", ".wav"].includes(extension)) return "audio";
  return "text";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slugForFilename(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function sourceLabelForFileType(fileType: CachedSourceRecord["fileType"]) {
  if (fileType === "image") return "Assets Image";
  if (fileType === "pdf") return "Assets PDF";
  if (fileType === "audio") return "Assets Audio";
  return "Assets Text";
}

async function discoverDemoPacketFiles(): Promise<DemoPacketFile[]> {
  const entries = await readdir(ASSETS_DIR, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && !entry.name.startsWith(".") && entry.name !== "Screenshot 2026-06-10 070725.jpg")
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(async (entry) => {
        const absolutePath = path.join(ASSETS_DIR, entry.name);
        const extension = path.extname(entry.name).toLowerCase();
        const fileType = fileTypeForExtension(extension);
        const fileStat = await stat(absolutePath);
        const publicPath = `/api/sponsor/aws/demo-asset/${encodeURIComponent(entry.name)}`;

        return {
          sourceId: slugForFilename(entry.name) || sha256(entry.name).slice(0, 12),
          title: entry.name,
          source: sourceLabelForFileType(fileType),
          snippet: `Imported from assets/${entry.name}.`,
          fileSize: formatFileSize(fileStat.size),
          fileType,
          publicPath,
          mimeType: mimeTypesByExtension[extension] || "application/octet-stream",
          absolutePath,
        };
      }),
  );

  return files;
}

function templateS3Key(source: DemoPacketFile) {
  const filename = source.publicPath ? path.basename(decodeURIComponent(source.publicPath)) : source.title;
  const safeTitle = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `assets/${safeTitle}`;
}

function usesCurrentTemplateKey(source: DemoPacketFile, cached?: CachedSourceRecord) {
  return cached?.s3Key === templateS3Key(source);
}

async function processFileBackedSource(
  source: DemoPacketFile,
  manifestRecords: Record<string, CachedSourceRecord>,
  forceMultimodalRefresh = false,
) {
  if (!source.absolutePath || !source.publicPath || !source.mimeType) {
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
      sponsorStatus: "uploaded" as const,
      processedAt: new Date().toISOString(),
    };
  }

  const buffer = await readFile(source.absolutePath);
  const contentHash = sha256(buffer);
  const cacheKey = sourceCacheKey("initial_packet", source.sourceId);
  const cached = manifestRecords[cacheKey];

  if (
    !forceMultimodalRefresh &&
    cached?.contentHash === contentHash &&
    cached.s3Key &&
    cached.title === source.title &&
    usesCurrentTemplateKey(source, cached)
  ) {
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
        sourceKind: interpretation.sourceKind,
        interpretedItems: interpretation.extractedTasks,
        extractedTasks: interpretation.extractedTasks.map((task) => task.title),
        extractedEvidence: interpretation.extractedTasks.map((task) => task.evidence).filter(Boolean),
        sourceConfidence: interpretation.confidence,
        languageNotes: interpretation.languageNotes,
        needsClarification: interpretation.needsClarification,
        clarificationPrompt: interpretation.clarificationPrompt,
        verifiedFacts: interpretation.verifiedFacts,
        interpretationProvider: interpretation.provider,
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

  const s3Key = templateS3Key(source);
  if (!cached?.s3Key || cached.contentHash !== contentHash || !usesCurrentTemplateKey(source, cached)) {
    await uploadBufferToS3({
      key: s3Key,
      body: buffer,
      contentType: source.mimeType,
    });
  }

  let textractText = "";
  let textractBlockCount = 0;
  let provider: CachedSourceRecord["provider"] = "aws-s3";
  let sponsorStatus: CachedSourceRecord["sponsorStatus"] = "uploaded";

  if (!forceMultimodalRefresh && (source.fileType === "image" || source.fileType === "pdf")) {
    try {
      const result = await detectTextFromS3(s3Key);
      textractText = result.text;
      textractBlockCount = result.raw.Blocks?.length || 0;
      provider = "aws-textract";
      sponsorStatus = textractText ? "extracted" : "uploaded";
    } catch {
      sponsorStatus = "uploaded";
    }
  } else if (source.fileType === "text") {
    textractText = buffer.toString("utf8");
  }

  const interpretation = await interpretSourceAttachment({
    title: source.title,
    fileType: source.fileType,
    mimeType: source.mimeType,
    s3Key,
    rawText: forceMultimodalRefresh && (source.fileType === "image" || source.fileType === "pdf")
      ? ""
      : textractText,
    model: forceMultimodalRefresh ? process.env.AI_GATEWAY_MULTIMODAL_MODEL : undefined,
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
    sourceKind: interpretation.sourceKind,
    interpretedItems: interpretation.extractedTasks,
    extractedTasks: interpretation.extractedTasks.map((task) => task.title),
    extractedEvidence: interpretation.extractedTasks.map((task) => task.evidence).filter(Boolean),
    sourceConfidence: interpretation.confidence,
    languageNotes: interpretation.languageNotes,
    needsClarification: interpretation.needsClarification,
    clarificationPrompt: interpretation.clarificationPrompt,
    verifiedFacts: interpretation.verifiedFacts,
    interpretationProvider: interpretation.provider,
    provider,
    sponsorStatus,
    processedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const demoPacketFiles = await discoverDemoPacketFiles();
  const forceMultimodalRefresh =
    new URL(request.url).searchParams.get("refresh") === "multimodal";

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
        sponsorStatus: "uploaded",
      })),
      trace: [
        {
          provider: "AWS",
          action: "Reused demo packet data",
          status: "success",
          detail: "AWS is disabled or missing credentials.",
        },
      ],
    });
  }

  try {
    const manifest = await loadSourceCache();
    const sources = await Promise.all(
      demoPacketFiles.map((source) =>
        processFileBackedSource(source, manifest.records, forceMultimodalRefresh),
      ),
    );
    const currentCacheKeys = new Set(sources.map((source) => sourceCacheKey("initial_packet", source.sourceId)));

    for (const key of Object.keys(manifest.records)) {
      if (key.startsWith("initial_packet:") && !currentCacheKeys.has(key)) {
        delete manifest.records[key];
      }
    }

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
          action: forceMultimodalRefresh
            ? "Refreshed cached summaries with multimodal source reads"
            : cachedCount > 0
              ? "Reused cached demo packet sources"
              : "Cached demo packet sources",
          status: "success",
          detail: `${cachedCount} cached, ${newlyProcessedCount} newly processed, ${ocrReadyCount} OCR/text-ready.`,
        },
      ],
    });
  } catch (error) {
    return NextResponse.json({
      provider: "aws-source-cache",
      warning: "Demo packet cache failed; demo packet was returned.",
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
        sponsorStatus: "uploaded",
      })),
    });
  }
}

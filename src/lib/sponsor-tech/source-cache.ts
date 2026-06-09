import "server-only";

import { createHash } from "crypto";
import { getObjectText, uploadBufferToS3 } from "./aws-s3";

export type CachedSourceRecord = {
  sourceId: string;
  origin: "initial_packet" | "user_upload" | "mid_flow_add";
  title: string;
  source: string;
  fileType: "pdf" | "image" | "audio" | "text" | "link" | "email";
  fileSize?: string;
  filePath?: string;
  snippet: string;
  s3Key?: string;
  contentHash?: string;
  textractText?: string;
  textractBlockCount?: number;
  provider: "aws-s3" | "aws-textract" | "mock";
  sponsorStatus: "cached" | "uploaded" | "extracted" | "fallback" | "error";
  processedAt: string;
};

type SourceCacheManifest = {
  version: 1;
  updatedAt: string;
  records: Record<string, CachedSourceRecord>;
};

export const SOURCE_CACHE_MANIFEST_KEY = "studentos-demo/cache/source-manifest.json";

export function sha256(buffer: Buffer | string) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function loadSourceCache(): Promise<SourceCacheManifest> {
  try {
    const text = await getObjectText(SOURCE_CACHE_MANIFEST_KEY);
    const parsed = JSON.parse(text) as SourceCacheManifest;

    if (parsed.version === 1 && parsed.records) return parsed;
  } catch {
    // Missing or invalid cache should never break the demo path.
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    records: {},
  };
}

export async function saveSourceCache(manifest: SourceCacheManifest) {
  const nextManifest: SourceCacheManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
  };

  await uploadBufferToS3({
    key: SOURCE_CACHE_MANIFEST_KEY,
    body: Buffer.from(JSON.stringify(nextManifest, null, 2)),
    contentType: "application/json",
  });
}

export function sourceCacheKey(origin: CachedSourceRecord["origin"], sourceId: string) {
  return `${origin}:${sourceId}`;
}

import { AudioLines, FileText, Globe2 } from "lucide-react";
import { commitmentDemoSourcePreviews, type Commitment } from "@/lib/demo-data";
import type { CapturedSourceForAI, StudentOSAgentFootprint } from "@/lib/studentos-ai-types";
import { SourceChip } from "@/components/source-chip";

export type SourcePreview = {
  title: string;
  source: string;
  fileSize: string;
  fileType: "image" | "text" | "link" | "audio";
  snippet: string;
  filePath?: string;
  durationSeconds?: number;
  provider?: string;
  sponsorStatus?: string;
  sourceSummary?: string;
  extractedTasks?: string[];
  extractedEvidence?: string[];
  sourceConfidence?: number;
  languageNotes?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
};

const commitmentSourceKeywords: Record<string, RegExp> = {
  physics: /physics|homework|worksheet|chapter|teacher/i,
  cca: /cca|briefing|announcement/i,
  competition: /competition|submission|portal|web/i,
  coding: /coding|python|goal|data-handling/i,
  team: /voice|teammate|team|project|whatsapp/i,
};

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceTextForMatch(source: CapturedSourceForAI) {
  return normalizeSearchText(
    [
      source.id,
      source.title,
      source.source,
      source.snippet,
      source.sourceSummary,
      source.ocrText,
      source.textractText,
      source.extractedTasks?.join(" "),
      source.extractedEvidence?.join(" "),
      source.languageNotes,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function previewFromCapturedSource(source: CapturedSourceForAI): SourcePreview {
  const rawFileType = source.fileType?.toLowerCase();
  const isImage =
    rawFileType === "image" || /\.(png|jpe?g|webp|gif|heic)$/i.test(source.title);
  const isAudio = rawFileType === "audio";
  const isLink = rawFileType === "link" || /^https?:\/\//i.test(source.source);
  const snippet =
    source.sourceSummary ||
    source.snippet ||
    source.ocrText ||
    source.textractText ||
    "Original source";

  return {
    title: source.title,
    source: source.source,
    fileSize: source.fileSize ?? (source.s3Key ? "AWS source" : "Source"),
    fileType: isImage ? "image" : isAudio ? "audio" : isLink ? "link" : "text",
    snippet,
    filePath: source.filePath,
    durationSeconds: source.durationSeconds,
    provider: source.provider,
    sponsorStatus: source.sponsorStatus,
    sourceSummary: source.sourceSummary,
    extractedTasks: source.extractedTasks,
    extractedEvidence: source.extractedEvidence,
    sourceConfidence: source.sourceConfidence,
    languageNotes: source.languageNotes,
    needsClarification: source.needsClarification,
    clarificationPrompt: source.clarificationPrompt,
  };
}

export function resolveCommitmentSourcePreview(
  commitment: Commitment,
  footprint?: StudentOSAgentFootprint | null,
) {
  const staticPreview = commitmentDemoSourcePreviews[commitment.id];
  const sources = footprint?.sources ?? [];

  if (sources.length === 0) return staticPreview ?? null;

  const commitmentText = normalizeSearchText(
    [commitment.id, commitment.title, commitment.source, commitment.explanation].join(" "),
  );
  const sourceLabel = normalizeSearchText(commitment.source);
  const keywordMatcher = commitmentSourceKeywords[commitment.id];

  const rankedSources = sources
    .map((source) => {
      const searchable = sourceTextForMatch(source);
      let score = 0;

      if (source.id === commitment.id) score += 12;
      if (source.id.includes(commitment.id) || commitment.id.includes(source.id)) score += 8;
      if (sourceLabel && searchable.includes(sourceLabel)) score += 5;
      if (keywordMatcher?.test(searchable)) score += 5;

      for (const token of commitmentText.split(" ").filter((token) => token.length > 3)) {
        if (searchable.includes(token)) score += 1;
      }

      return { source, score };
    })
    .sort((a, b) => b.score - a.score);

  const matchedSource = rankedSources.find((item) => item.score >= 5)?.source;

  if (!matchedSource) return staticPreview ?? null;

  const matchedPreview = previewFromCapturedSource(matchedSource);

  if (
    staticPreview?.fileType === "image" &&
    matchedPreview.fileType !== "image" &&
    !matchedPreview.filePath
  ) {
    return staticPreview;
  }

  return matchedPreview;
}

function EvidenceMetadata({ preview }: { preview: SourcePreview }) {
  if (
    !preview.provider &&
    !preview.sourceSummary &&
    !preview.extractedTasks?.length &&
    !preview.extractedEvidence?.length &&
    !preview.languageNotes &&
    !preview.clarificationPrompt
  ) {
    return null;
  }

  return (
    <div className="mb-3 rounded-[8px] border border-neutral-200 bg-neutral-50 p-3 text-[11px] font-semibold text-neutral-700">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em] text-neutral-500">
        <span>Interpreted evidence</span>
        {preview.provider ? <span>{preview.provider}</span> : null}
        {preview.sponsorStatus ? <span>{preview.sponsorStatus}</span> : null}
        {typeof preview.sourceConfidence === "number" ? (
          <span>{Math.round(preview.sourceConfidence * 100)}% confidence</span>
        ) : null}
      </div>
      {preview.sourceSummary ? <p>{preview.sourceSummary}</p> : null}
      {preview.extractedTasks?.length ? (
        <div className="mt-2 rounded-[8px] border border-neutral-200 bg-white p-2">
          <p className="mb-1 text-[10px] uppercase tracking-[0.1em] text-neutral-500">
            Extracted commitments
          </p>
          <ul className="space-y-1">
            {preview.extractedTasks.slice(0, 4).map((task) => (
              <li key={task} className="leading-snug">- {task}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {preview.extractedEvidence?.length ? (
        <p className="mt-2 border-l border-neutral-300 pl-2 text-neutral-600">
          Evidence: {preview.extractedEvidence.slice(0, 2).join(" | ")}
        </p>
      ) : null}
      {preview.languageNotes ? <p className="mt-2 text-neutral-600">{preview.languageNotes}</p> : null}
      {preview.needsClarification && preview.clarificationPrompt ? (
        <p className="mt-2 text-amber-800">Uncertainty: {preview.clarificationPrompt}</p>
      ) : null}
    </div>
  );
}

export function CommitmentSourcePreview({ preview }: { preview: SourcePreview }) {
  if (preview.fileType === "image") {
    return (
      <div className="w-full pb-4">
        <EvidenceMetadata preview={preview} />
        {preview.filePath ? (
          <div className="flex items-center justify-center overflow-hidden rounded-[8px] border border-neutral-100 bg-[#FAFAFA] p-2 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.filePath}
              className="max-h-[50vh] w-auto rounded-[7px] object-contain shadow-sm"
              alt={preview.title}
            />
          </div>
        ) : (
          <div className="rounded-[8px] border border-neutral-100 bg-[#FAFAFA] p-4 text-sm font-semibold text-neutral-600">
            {preview.snippet}
          </div>
        )}
      </div>
    );
  }

  if (preview.fileType === "link") {
    return (
      <div className="w-full pb-4">
        <EvidenceMetadata preview={preview} />
        <div className="rounded-[8px] border border-neutral-100 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-1.5 text-xs text-neutral-400">
            <Globe2 className="size-3.5" />
            <span className="break-all font-mono">{preview.source}</span>
          </div>
          <h4 className="mb-1 text-sm font-bold leading-snug text-ink">
            {preview.title}
          </h4>
          <p className="mb-3 text-xs leading-normal text-neutral-500">{preview.snippet}</p>
          <SourceChip>{preview.fileSize}</SourceChip>
        </div>
      </div>
    );
  }

  if (preview.fileType === "audio") {
    const formatAudioDuration = (secs?: number) => {
      if (!secs) return "1:24";
      const minutes = Math.floor(secs / 60);
      const seconds = secs % 60;
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    return (
      <div className="w-full pb-4">
        <EvidenceMetadata preview={preview} />
        <div className="rounded-[8px] border border-neutral-100 bg-neutral-50 p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-ink text-white">
              <AudioLines className="size-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{preview.title}</p>
              <p className="text-xs font-semibold text-neutral-400">
                Transcript summary · {preview.durationSeconds ? formatAudioDuration(preview.durationSeconds) : preview.fileSize || "1:24"}
              </p>
            </div>
          </div>
          <div className="rounded-[8px] border border-neutral-200 bg-white p-3.5 shadow-sm">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
              Transcript summary
            </p>
            <p className="text-xs font-semibold italic leading-relaxed text-neutral-600">
              &quot;{preview.snippet}&quot;
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-4">
      <EvidenceMetadata preview={preview} />
      <div className="space-y-3 rounded-[8px] border border-neutral-100 bg-neutral-50 p-4 font-mono text-xs text-neutral-700">
        <div className="flex justify-between gap-3 border-b border-neutral-200 pb-2 font-sans text-[10px] font-semibold uppercase text-neutral-400">
          <span className="break-words">{preview.title}</span>
          <span className="shrink-0">Text Document</span>
        </div>
        <div className="flex items-center gap-2 font-sans text-sm font-bold text-ink">
          <FileText className="size-4" />
          Original text
        </div>
        <p className="whitespace-pre-wrap font-sans text-sm font-semibold leading-relaxed text-ink">
          {preview.snippet}
        </p>
      </div>
    </div>
  );
}

export function cleanResearchCopy(text: string) {
  return text
    .replace(/\[\.{3}\]/g, ". ")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .trim();
}

export function compactResearchCopy(text: string, maxLength = 160) {
  const cleaned = cleanResearchCopy(text);
  if (cleaned.length <= maxLength) return cleaned;

  const clipped = cleaned.slice(0, maxLength);
  const sentenceBreak = Math.max(clipped.lastIndexOf(". "), clipped.lastIndexOf("? "), clipped.lastIndexOf("! "));
  if (sentenceBreak > 70) return clipped.slice(0, sentenceBreak + 1).trim();

  const wordBreak = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, wordBreak > 70 ? wordBreak : maxLength - 3).trim()}...`;
}

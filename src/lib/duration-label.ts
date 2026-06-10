export function normalizeDurationLabel(value: string | number | undefined, fallbackMinutes = 30) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${Math.max(0, Math.round(value))} min`;
  }

  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!text) return `${fallbackMinutes} min`;

  const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  const minutesMatch = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  let totalMinutes = 0;

  if (hoursMatch) totalMinutes += Math.round(Number(hoursMatch[1]) * 60);
  if (minutesMatch) totalMinutes += Number(minutesMatch[1]);

  if (!totalMinutes && /\bsessions?\s*\/?\s*(?:week|day)\b/i.test(text)) {
    totalMinutes = fallbackMinutes;
  }

  if (!totalMinutes) {
    const numeric = text.match(/\b(\d+)\b/)?.[1];
    if (numeric && /\bmin|duration|session|block\b/i.test(text)) {
      totalMinutes = Number(numeric);
    }
  }

  if (!totalMinutes) totalMinutes = fallbackMinutes;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = /\/\s*session|per\s+session/i.test(text) || /\bsessions?\s*\/?\s*(?:week|day)\b/i.test(text)
    ? "/session"
    : "";

  if (hours && minutes) return `${hours} hr ${minutes} min${suffix}`;
  if (hours) return `${hours} hr${hours === 1 ? "" : "s"}${suffix}`;
  return `${minutes} min${suffix}`;
}

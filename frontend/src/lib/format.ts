export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function wordCount(md: string): number {
  return md.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(md: string): number {
  return Math.max(1, Math.round(wordCount(md) / 230));
}

/** 75 -> "01:15" */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const MODE_LABEL = {
  closed_book: "closed book",
  hybrid: "hybrid",
  open_book: "open book",
} as const;

export const KIND_LABEL = {
  explainer: "Explainer",
  tutorial: "Tutorial",
  news_roundup: "News roundup",
  comparison: "Comparison",
  system_design: "System design",
} as const;

"use client";

import { useState } from "react";

import { API_URL, apiUrl } from "@/lib/api";
import { clock, readingMinutes, wordCount } from "@/lib/format";

type Props = { markdown: string; downloadUrl: string; tookMs: number };

export function ArticleActions({ markdown, downloadUrl, tookMs }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    // absolute image URLs, so the copy works when pasted anywhere
    await navigator.clipboard.writeText(markdown.replaceAll("](/outputs/", `](${API_URL}/outputs/`));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const button =
    "px-3 py-2 font-mono text-[0.66rem] tracking-[0.14em] uppercase transition-colors border border-ink hover:bg-ink hover:text-paper";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
      <p className="font-mono text-[0.7rem] text-ink-2 tabular-nums">
        {wordCount(markdown).toLocaleString()} words · {readingMinutes(markdown)} min read · set in {clock(tookMs)}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={button} aria-live="polite">
          {copied ? "Copied ✓" : "Copy markdown"}
        </button>
        <a href={apiUrl(downloadUrl)} className={`${button} bg-ink text-paper hover:border-accent hover:bg-accent`}>
          Download .md
        </a>
      </div>
    </div>
  );
}

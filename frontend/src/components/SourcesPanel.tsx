"use client";

import { useState } from "react";

import { domainOf } from "@/lib/format";
import type { EvidenceItem } from "@/lib/types";

const COLLAPSED = 6;

type Props = { queries: string[]; evidence: EvidenceItem[] };

export function SourcesPanel({ queries, evidence }: Props) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? evidence : evidence.slice(0, COLLAPSED);

  return (
    <section aria-label="Sources" className="set-in">
      <h2 className="label">Research sources</h2>

      {queries.length > 0 && (
        <ul className="mt-3 space-y-1 border-l border-rule pl-3">
          {queries.map((q) => (
            <li key={q} className="font-mono text-[0.68rem] leading-snug break-words text-ink-2">
              <span className="text-muted">q · </span>
              {q}
            </li>
          ))}
        </ul>
      )}

      {evidence.length > 0 && (
        <>
          <ol className="mt-4 space-y-2.5">
            {shown.map((e, i) => (
              <li key={e.url} className="grid grid-cols-[1.75rem_1fr] gap-x-1">
                <span className="font-mono text-[0.68rem] text-accent">[{i + 1}]</span>
                <a href={e.url} target="_blank" rel="noreferrer" className="group min-w-0">
                  <span className="line-clamp-2 font-serif text-[0.92rem] leading-snug text-ink group-hover:text-accent">
                    {e.title || e.url}
                  </span>
                  <span className="font-mono text-[0.64rem] text-muted">
                    {domainOf(e.url)}
                    {e.published_at && ` · ${e.published_at}`}
                  </span>
                </a>
              </li>
            ))}
          </ol>
          {evidence.length > COLLAPSED && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 font-mono text-[0.66rem] tracking-[0.12em] text-ink-2 uppercase underline decoration-rule underline-offset-4 hover:text-accent"
            >
              {expanded ? "Show fewer" : `Show all ${evidence.length} sources`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

"use client";

import { KIND_LABEL, MODE_LABEL, clock } from "@/lib/format";
import type { StageId, StageStatus } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import type { RunState } from "@/lib/useRun";

const STAGES: { id: StageId; label: string }[] = [
  { id: "router", label: "Understand the brief" },
  { id: "research", label: "Find reliable sources" },
  { id: "orchestrator", label: "Build the outline" },
  { id: "workers", label: "Write the sections" },
  { id: "reducer", label: "Finish the article" },
];

function detail(id: StageId, status: StageStatus, run: RunState): string {
  const total = run.plan?.tasks.length ?? 0;
  const written = Object.keys(run.sections).length;

  switch (id) {
    case "router":
      if (run.route) return `${MODE_LABEL[run.route.mode]} · ${run.route.queries.length} queries`;
      return status === "running" ? "Does this need fresh sources?" : "Decides whether to research";
    case "research":
      if (status === "skipped") return "Evergreen topic — no search needed";
      if (status === "done") return `${run.evidence.length} sources via Tavily MCP`;
      if (status === "running") return `Searching ${run.route?.queries.length ?? 0} queries`;
      return "Web search, only when it matters";
    case "orchestrator":
      if (run.plan) return `${total} sections · ${KIND_LABEL[run.plan.blog_kind]}`;
      return status === "running" ? "Drafting the outline" : "Sections, goals, word targets";
    case "workers":
      if (total) return `${written} of ${total} written`;
      return "Drafting each section";
    case "reducer":
      if (status === "done") return "Ready to read";
      if (status === "running")
        return run.imagesPlanned != null ? `Placing ${run.imagesPlanned} figures` : "Stitching sections together";
      return "Review and assemble the article";
  }
}

const MARK: Record<StageStatus, string> = {
  pending: "queued",
  running: "working",
  done: "done",
  skipped: "skipped",
};

export function StageTimeline({ run }: { run: RunState }) {
  const now = useNow(); // only this component re-renders each second, not the article
  const elapsed = run.startedAt ? (run.finishedAt ?? Math.max(now, run.startedAt)) - run.startedAt : 0;

  return (
    <section aria-label="Writing progress">
      <div className="flex items-baseline justify-between">
        <h2 className="label">Writing progress</h2>
        <span className="font-mono text-[0.72rem] text-ink-2 tabular-nums">
          {run.startedAt ? clock(elapsed) : "--:--"}
        </span>
      </div>

      <ol className="mt-3 border-t border-ink">
        {STAGES.map((stage, i) => {
          const status = run.stages[stage.id];
          return (
            <li
              key={stage.id}
              className="relative grid grid-cols-[1.75rem_1fr_auto] items-baseline gap-x-3 border-b border-rule py-3"
            >
              <span className={`font-mono text-[0.7rem] ${status === "running" ? "text-accent" : "text-muted"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p
                  className={`font-serif text-[1.05rem] leading-tight ${
                    status === "skipped" ? "text-muted line-through decoration-rule" : status === "pending" ? "text-ink-2" : "text-ink"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="mt-0.5 truncate font-mono text-[0.68rem] text-muted">{detail(stage.id, status, run)}</p>
              </div>
              <span
                className={`font-mono text-[0.62rem] tracking-[0.14em] uppercase ${
                  status === "running" ? "text-accent" : status === "done" ? "text-ink" : "text-muted"
                }`}
              >
                {status === "running" && <span className="blink mr-1">●</span>}
                {status === "done" && <span className="mr-1">✓</span>}
                {MARK[status]}
              </span>
              {status === "running" && <div className="ink-bar absolute inset-x-0 -bottom-px" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

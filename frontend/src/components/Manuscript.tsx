import type { RunState } from "@/lib/useRun";

import { ArticleActions } from "./ArticleActions";
import { MarkdownView } from "./MarkdownView";

function GalleyLines({ count = 4 }: { count?: number }) {
  // widths vary like real ragged-right text
  const widths = ["100%", "96%", "99%", "72%", "94%", "88%"];
  return (
    <div aria-hidden className="mt-4 space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="galley-line" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  );
}

function BlankSheet() {
  return (
    <div className="empty-preview">
      <div className="document-illustration" aria-hidden><div className="illustration-badge">&#10022;</div><div className="document-topline" /><div className="document-title" /><div className="document-line" /><div className="document-line" /><div className="document-line short" /><div className="document-block" /><div className="document-line" /><div className="document-line short" /><span className="document-check">&#10003;</span></div>
      <span className="preview-eyebrow">A SPACE FOR YOUR NEXT GREAT IDEA</span>
      <h2>Your story starts here.</h2>
      <p>Turn a spark of inspiration into a researched,<br className="hidden sm:block" /> well-structured article, ready for your finishing touch.</p>
      <div className="preview-steps"><span><b>01</b> Share your idea</span><i>&#8594;</i><span><b>02</b> Let it take shape</span><i>&#8594;</i><span><b>03</b> Make it yours</span></div>
    </div>
  );
}

function WritingSheet({ run }: { run: RunState }) {
  const running = run.status === "running";

  if (!run.plan) {
    return (
      <div>
        <p className="label">Getting started</p>
        <h1 className="mt-5 font-display text-[clamp(2.2rem,1.6rem+2.4vw,3.4rem)] leading-[1.04] text-ink-2 italic">
          “{run.topic}”
        </h1>
        <GalleyLines count={6} />
      </div>
    );
  }

  return (
    <div className="manuscript">
      <h1>{run.plan.blog_title}</h1>
      {run.plan.tasks.map((task) =>
        task.id in run.sections ? (
          <div key={task.id} className="set-in [&>*+*]:mt-[1.15em]">
            <MarkdownView markdown={run.sections[task.id]} />
          </div>
        ) : (
          <div key={task.id}>
            <h2 className="text-muted">{task.title}</h2>
            {running ? (
              <>
                <p className="font-mono text-[0.7rem] text-muted">
                  <span className="blink">●</span> Writing {task.target_words} words — {task.goal}
                </p>
                <GalleyLines />
              </>
            ) : (
              <p className="font-mono text-[0.7rem] text-muted">Not written — the run ended before this section.</p>
            )}
          </div>
        ),
      )}
    </div>
  );
}

function Notice({ tone, title, body }: { tone: "error" | "quiet"; title: string; body: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-8 border-l-2 py-1 pl-4 ${tone === "error" ? "border-accent" : "border-ink-2"}`}
    >
      <p className={`font-display text-[1.5rem] leading-tight ${tone === "error" ? "text-accent" : "text-ink"}`}>{title}</p>
      <p className="mt-1 font-mono text-[0.72rem] leading-relaxed break-words text-ink-2">{body}</p>
    </div>
  );
}

export function Manuscript({ run }: { run: RunState }) {
  const tookMs = run.startedAt && run.finishedAt ? run.finishedAt - run.startedAt : 0;
  const hasDraft = run.plan !== null || run.status === "running";
  const written = Object.keys(run.sections).length;

  return (
    <article
      aria-busy={run.status === "running"}
      className="article-panel panel min-w-0"
    >
      <div className="preview-header"><div><span className="preview-icon" aria-hidden>&#9636;</span><h2>Article preview</h2></div><span className={`preview-status ${run.status === "running" ? "active" : ""}`}>{{ idle: "Ready when you are", running: "Writing your article", done: "Ready to review", error: "Needs attention", cancelled: "Generation stopped" }[run.status]}</span></div>
      <div className="article-content">
      <div className="mx-auto max-w-[68ch]">
        {run.status === "error" && (
          <Notice tone="error" title="Article generation failed." body={run.error ?? "Something went wrong."} />
        )}
        {run.status === "cancelled" && (
          <Notice
            tone="quiet"
            title="Stopped."
            body={
              written
                ? `The run was cancelled. ${written} of ${run.plan?.tasks.length ?? written} sections were set before it stopped — they're below.`
                : run.plan
                  ? "The run was cancelled after the outline, before any section was written."
                  : "The run was cancelled before anything was written."
            }
          />
        )}

        {run.final ? (
          <>
            <ArticleActions markdown={run.final.markdown} downloadUrl={run.final.downloadUrl} tookMs={tookMs} />
            <div className="manuscript mt-10">
              <MarkdownView markdown={run.final.markdown} />
            </div>
          </>
        ) : hasDraft ? (
          <WritingSheet run={run} />
        ) : (
          <BlankSheet />
        )}
      </div>
      </div>
    </article>
  );
}

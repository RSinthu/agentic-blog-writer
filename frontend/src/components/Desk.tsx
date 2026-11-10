"use client";
import { useRun } from "@/lib/useRun";
import { BriefForm } from "./BriefForm";
import { Manuscript } from "./Manuscript";
import { PlanPanel } from "./PlanPanel";
import { SourcesPanel } from "./SourcesPanel";
import { StageTimeline } from "./StageTimeline";

export function Desk() {
  const { state: run, start, stop } = useRun();
  const running = run.status === "running";
  const showSources = (run.route?.queries.length ?? 0) > 0 || run.evidence.length > 0;
  return <main id="main-content" className="workspace">
    <div className="page-intro"><div><p className="eyebrow"><span /> FROM IDEA TO ARTICLE</p><h1>Good ideas deserve<br className="mobile-break" /> great words<span>.</span></h1><p>Your next article starts here. Bring the idea. We?ll help shape the story.</p></div><div className="intro-note"><span aria-hidden>&#10022;</span> A little inspiration.<br />A lot of possibility.</div></div>
    <div className="desk-grid"><aside className="brief-column"><BriefForm running={running} onSubmit={start} onStop={stop} />
      <details className="panel progress-panel" open={run.status !== "idle"}><summary>Writing progress <span className="progress-state">{running ? "In progress" : run.status === "done" ? "Complete" : "Details"}</span></summary><div className="progress-content"><StageTimeline run={run} />{run.plan && <PlanPanel plan={run.plan} written={run.sections} />}{showSources && <SourcesPanel queries={run.route?.queries ?? []} evidence={run.evidence} />}</div></details>
    </aside><Manuscript run={run} /></div>
    <div className="workspace-note"><span aria-hidden>&#10022;</span> Made for your ideas. Built for your workflow.<span>Always review your article before publishing.</span></div>
  </main>;
}

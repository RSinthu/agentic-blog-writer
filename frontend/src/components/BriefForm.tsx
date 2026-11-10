"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

const SUGGESTIONS = [
  { label: "AI & technology", topic: "How AI agents are changing software development" },
  { label: "Business insights", topic: "A practical guide to building a customer-first business" },
  { label: "Developer guide", topic: "Rust ownership explained for Python developers" },
];
type Props = { running: boolean; onSubmit: (topic: string) => void; onStop: () => void };

export function BriefForm({ running, onSubmit, onStop }: Props) {
  const [topic, setTopic] = useState("");
  const [industry, setIndustry] = useState("");
  const [audience, setAudience] = useState("");
  const [touched, setTouched] = useState(false);
  const length = topic.trim().length;
  const brief = [topic.trim(), industry && `Industry: ${industry}.`, audience && `Write for ${audience}.`].filter(Boolean).join("\n");
  const invalid = length < 3 || brief.length > 1000;
  function submit(e?: FormEvent) {
    e?.preventDefault();
    setTouched(true);
    if (!invalid && !running) onSubmit(brief);
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
  }
  return (
    <form onSubmit={submit} noValidate className="brief-card panel">
      <div className="card-heading"><span className="step-number">01</span><div><h2>Your article brief</h2><p>A little direction. A great starting point.</p></div></div>
      <label htmlFor="brief" className="field-label">What would you like to write about?</label>
      <textarea id="brief" value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={onKeyDown} disabled={running} rows={5} maxLength={1000} placeholder="Share a topic, a question, or an idea worth exploring..." aria-invalid={touched && invalid} aria-describedby="brief-hint" />
      <div id="brief-hint" className="input-hint"><span>{touched && invalid ? (length < 3 ? "Add at least 3 characters to get started." : "Keep your brief and preferences within 1,000 characters.") : "Be specific for a more focused article."}</span><span>{brief.length}/1000</span></div>
      <div className="field-grid">
        <div><label className="field-label" htmlFor="industry">Industry <span>optional</span></label><select id="industry" value={industry} onChange={e => setIndustry(e.target.value)} disabled={running}><option value="">General</option><option>Technology</option><option>Business & finance</option><option>Healthcare</option><option>Education</option><option>Marketing</option><option>Sustainability</option></select></div>
        <div><label className="field-label" htmlFor="audience">Audience <span>optional</span></label><select id="audience" value={audience} onChange={e => setAudience(e.target.value)} disabled={running}><option value="">Everyone</option><option>Beginners</option><option>Industry professionals</option><option>Developers</option><option>Business leaders</option></select></div>
      </div>
      {running ? <button key="stop" type="button" className="primary-button stop-button" onClick={onStop}>Stop generation <span aria-hidden>&#9632;</span></button> : <button key="start" type="submit" className="primary-button">Generate article <span aria-hidden>&#8599;</span></button>}
      <p className="button-hint">{running ? "Your article is taking shape. Follow its progress below." : "Research, outline, and writing, in one flow."}</p>
      {!running && <div className="suggestions"><p className="field-label">Need a little inspiration?</p>{SUGGESTIONS.map(s => <button key={s.label} type="button" onClick={() => { setTopic(s.topic); setTouched(false); }}><span>{s.label}</span><span aria-hidden>&#8599;</span></button>)}</div>}
    </form>
  );
}

// Mirrors backend/app/graph/schemas.py and the SSE events in backend/app/stream.py

export type Mode = "closed_book" | "hybrid" | "open_book";
export type BlogKind = "explainer" | "tutorial" | "news_roundup" | "comparison" | "system_design";

export type Task = {
  id: number;
  title: string;
  goal: string;
  bullets: string[];
  target_words: number;
  tags: string[];
  requires_research: boolean;
  requires_citations: boolean;
  requires_code: boolean;
};

export type Plan = {
  blog_title: string;
  audience: string;
  tone: string;
  blog_kind: BlogKind;
  constraints: string[];
  tasks: Task[];
};

export type EvidenceItem = {
  title: string;
  url: string;
  published_at: string | null;
  snippet: string | null;
  source: string | null;
};

export type StageId = "router" | "research" | "orchestrator" | "workers" | "reducer";
export type StageStatus = "pending" | "running" | "done" | "skipped";

export type RunEvent =
  | { type: "run_started"; run_id: string; topic: string }
  | { type: "stage"; id: StageId; status: Exclude<StageStatus, "pending">; total?: number; detail?: string }
  | { type: "route"; mode: Mode; needs_research: boolean; queries: string[] }
  | { type: "sources"; evidence: EvidenceItem[] }
  | { type: "plan"; plan: Plan }
  | { type: "section_done"; task_id: number; title: string; markdown: string; done: number; total: number }
  | { type: "images_planned"; count: number }
  | { type: "final"; run_id: string; markdown: string; download_url: string }
  | { type: "error"; run_id: string; message: string };

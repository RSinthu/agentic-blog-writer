"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { streamRun } from "./stream";
import type { EvidenceItem, Mode, Plan, RunEvent, StageId, StageStatus } from "./types";

export type RunStatus = "idle" | "running" | "done" | "error" | "cancelled";

export type RunState = {
  status: RunStatus;
  topic: string;
  runId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  stages: Record<StageId, StageStatus>;
  route: { mode: Mode; needsResearch: boolean; queries: string[] } | null;
  evidence: EvidenceItem[];
  plan: Plan | null;
  sections: Record<number, string>; // task id -> section markdown, as each writer finishes
  imagesPlanned: number | null;
  final: { markdown: string; downloadUrl: string } | null;
  error: string | null;
};

const IDLE_STAGES: Record<StageId, StageStatus> = {
  router: "pending",
  research: "pending",
  orchestrator: "pending",
  workers: "pending",
  reducer: "pending",
};

export const initialRunState: RunState = {
  status: "idle",
  topic: "",
  runId: null,
  startedAt: null,
  finishedAt: null,
  stages: IDLE_STAGES,
  route: null,
  evidence: [],
  plan: null,
  sections: {},
  imagesPlanned: null,
  final: null,
  error: null,
};

type Action =
  | { type: "start"; topic: string; at: number }
  | { type: "event"; event: RunEvent; at: number }
  | { type: "closed"; at: number }
  | { type: "failed"; message: string; at: number }
  | { type: "cancelled"; at: number };

function finish(state: RunState, status: RunStatus, at: number, error: string | null = null): RunState {
  // stop any stage spinner that was still running
  const stages = Object.fromEntries(
    Object.entries(state.stages).map(([id, s]) => [id, s === "running" && status !== "done" ? "pending" : s]),
  ) as RunState["stages"];
  return { ...state, status, finishedAt: at, error, stages };
}

export function runReducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start":
      return { ...initialRunState, status: "running", topic: action.topic, startedAt: action.at };

    case "event": {
      if (state.status !== "running") return state;
      const e = action.event;
      switch (e.type) {
        case "run_started":
          return { ...state, runId: e.run_id };
        case "stage":
          return { ...state, stages: { ...state.stages, [e.id]: e.status } };
        case "route":
          return { ...state, route: { mode: e.mode, needsResearch: e.needs_research, queries: e.queries } };
        case "sources":
          return { ...state, evidence: e.evidence };
        case "plan":
          return { ...state, plan: e.plan };
        case "section_done":
          return { ...state, sections: { ...state.sections, [e.task_id]: e.markdown } };
        case "images_planned":
          return { ...state, imagesPlanned: e.count };
        case "final":
          return finish({ ...state, final: { markdown: e.markdown, downloadUrl: e.download_url } }, "done", action.at);
        case "error":
          return finish(state, "error", action.at, e.message);
      }
      return state;
    }

    case "closed":
      // the stream ended without a final or error event
      return state.status === "running"
        ? finish(state, "error", action.at, "The connection closed before the article was finished.")
        : state;

    case "failed":
      return state.status === "running" ? finish(state, "error", action.at, action.message) : state;

    case "cancelled":
      return state.status === "running" ? finish(state, "cancelled", action.at) : state;
  }
}

export function useRun() {
  const [state, dispatch] = useReducer(runReducer, initialRunState);
  const controller = useRef<AbortController | null>(null);

  const start = useCallback((topic: string) => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    dispatch({ type: "start", topic, at: Date.now() });

    streamRun(topic, (event) => dispatch({ type: "event", event, at: Date.now() }), ac.signal)
      .then(() => dispatch({ type: "closed", at: Date.now() }))
      .catch((err: unknown) => {
        if (ac.signal.aborted) return; // stop() already recorded it
        const message =
          err instanceof TypeError
            ? "Couldn't reach the writing desk. Is the backend running on the API URL?"
            : err instanceof Error
              ? err.message
              : "Something went wrong.";
        dispatch({ type: "failed", message, at: Date.now() });
      });
  }, []);

  const stop = useCallback(() => {
    controller.current?.abort(); // closing the stream makes the backend cancel the run
    dispatch({ type: "cancelled", at: Date.now() });
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { state, start, stop };
}

import { api, ApiError } from "./api";
import type { RunEvent } from "./types";

/**
 * POST the topic and read the Server-Sent Events body as it arrives.
 * (EventSource can't be used: it only does GET.)
 */
export async function streamRun(
  topic: string,
  onEvent: (event: RunEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  // The fetch adapter exposes a ReadableStream in browsers; XHR would buffer SSE.
  const { data } = await api.post<ReadableStream<Uint8Array<ArrayBuffer>>>(
    "/api/runs/stream",
    { topic },
    {
      headers: { Accept: "text/event-stream" },
      responseType: "stream",
      timeout: 0, // Article generation can outlast the default JSON request timeout.
      signal,
    },
  );
  if (!data || typeof data.getReader !== "function") {
    throw new ApiError("The server did not return an article stream.");
  }

  const reader = data.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      // Normalize after appending so CRLF split across chunks stays intact.
      buffer = buffer.replace(/\r\n/g, "\n");

      // one SSE message per blank-line-terminated block
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);

        const data = block
          .split("\n")
          .filter((line) => line.startsWith("data:")) // ": keep-alive" comments are skipped
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) onEvent(JSON.parse(data) as RunEvent);
      }
    }
  } finally {
    // Release the connection even if parsing or an event callback fails.
    try {
      await reader.cancel();
    } catch {
      // An aborted request may already have errored the stream.
    }
    reader.releaseLock();
  }
}


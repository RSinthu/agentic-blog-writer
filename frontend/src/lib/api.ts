import axios from "axios";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

/** Shared configuration for JSON requests and browser-compatible streaming. */
export const api = axios.create({
  baseURL: API_URL,
  adapter: "fetch",
  timeout: 10_000,
  headers: { Accept: "application/json" },
  fetchOptions: { cache: "no-store" },
});

/** Backend paths like /outputs/... or /api/... become absolute URLs on the API host. */
export function apiUrl(path: string): string {
  return path.startsWith("/") ? `${API_URL}${path}` : path;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

/** Normalize FastAPI errors, including JSON returned instead of an SSE stream. */
async function errorMessage(data: unknown, status: number): Promise<string> {
  try {
    const body: unknown = data instanceof ReadableStream
      ? await new Response(data).json()
      : typeof data === "string" ? JSON.parse(data) : data;
    if (body && typeof body === "object" && "detail" in body) {
      if (typeof body.detail === "string") return body.detail;
      if (Array.isArray(body.detail) && typeof body.detail[0]?.msg === "string") {
        return body.detail[0].msg;
      }
    }
  } catch {
    // Non-JSON error responses fall back to the HTTP status.
  }
  return `Request failed (${status})`;
}

api.interceptors.response.use(
  response => response,
  async (error: unknown) => {
    // Preserve Axios cancellation so callers can distinguish intentional aborts.
    if (axios.isCancel(error)) throw error;
    if (!axios.isAxiosError(error)) throw error;
    if (error.response) {
      throw new ApiError(await errorMessage(error.response.data, error.response.status), error.response.status);
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new ApiError("The request timed out. Please try again.");
    }
    throw new ApiError("Couldn't reach the writing desk. Is the backend running on the API URL?");
  },
);

export async function getHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const { data } = await api.get<{ status: string }>("/api/health", { signal });
    return data?.status === "ok";
  } catch {
    return false;
  }
}

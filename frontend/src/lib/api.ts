import { API_BASE_URL } from "./config";
import type {
  ApiErrorBody,
  ShortenResponse,
  StatsResponse,
} from "../types/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function parseErrorBody(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return Array.isArray(body.message) ? body.message.join(", ") : body.message;
  } catch {
    return res.statusText || "Something went wrong";
  }
}

export async function shortenUrl(longUrl: string): Promise<ShortenResponse> {
  const res = await fetch(`${API_BASE_URL}/shorten`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ longUrl }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseErrorBody(res));
  return res.json() as Promise<ShortenResponse>;
}

export async function getStats(code: string): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE_URL}/stats/${code}`);
  if (!res.ok) throw new ApiError(res.status, await parseErrorBody(res));
  return res.json() as Promise<StatsResponse>;
}

/**
 * Measures round-trip latency of a redirect probe as a rough proxy for
 * cache hit/miss (we can't read the API's internal Redis state directly).
 */
export async function probeRedirect(
  code: string,
): Promise<{ status: number; ms: number; location: string | null }> {
  const start = performance.now();
  const res = await fetch(`${API_BASE_URL}/${code}`, { redirect: "manual" });
  const ms = performance.now() - start;
  return {
    status: res.status,
    ms: Math.round(ms),
    location: res.headers.get("location"),
  };
}

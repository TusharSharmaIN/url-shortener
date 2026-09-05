const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (!rawBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");

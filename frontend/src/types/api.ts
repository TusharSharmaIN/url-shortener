export interface ShortenResponse {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
}

export interface StatsResponse {
  shortCode: string;
  totalClicks: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

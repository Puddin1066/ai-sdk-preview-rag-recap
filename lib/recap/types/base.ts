export interface RecapCase {
  title: string;
  date: string;
  summary: string;
  url: string;
  court: string;
}

export interface APIConfig {
  authToken?: string;
  rateLimit?: number;
  timeout?: number;
}

export interface SearchOptions {
  limit?: number;
  orderBy?: 'dateFiled' | 'score' | 'relevance';
  court?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
}

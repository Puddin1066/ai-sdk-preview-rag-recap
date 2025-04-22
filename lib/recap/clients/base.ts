import { APIConfig } from '../types/base';

export abstract class BaseAPIClient {
  protected config: APIConfig;
  protected baseUrl: string;

  constructor(config: APIConfig) {
    this.config = {
      timeout: 30000,  // 30 seconds default
      rateLimit: 10,   // 10 requests per hour default
      ...config
    };
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.baseUrl + endpoint;
    const headers = {
      'Accept': 'application/json',
      ...(this.config.authToken && {
        'Authorization': `Token ${this.config.authToken}`
      }),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: AbortSignal.timeout(this.config.timeout!)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  protected handleError(error: unknown): never {
    // TODO: Implement proper error handling
    throw error;
  }
}

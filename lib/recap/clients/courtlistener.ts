import { BaseAPIClient } from './base';
import { RecapCase, SearchOptions, APIConfig } from '../types/base';

export class CourtListenerClient extends BaseAPIClient {
  constructor(config: APIConfig) {
    super(config);
    this.baseUrl = 'https://www.courtlistener.com/api/rest/v3';
  }

  async searchOpinions(query: string, options: SearchOptions = {}): Promise<RecapCase[]> {
    const params = new URLSearchParams({
      search: query,
      page_size: options.limit?.toString() || '3',
      ...(options.court && { court: options.court }),
      ...(options.orderBy && { order_by: options.orderBy }),
      ...(options.dateRange?.start && { filed_after: options.dateRange.start }),
      ...(options.dateRange?.end && { filed_before: options.dateRange.end })
    });

    try {
      const data = await this.request<any>(`/opinions/?${params}`);
      
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((opinion: any) => ({
        title: opinion.case_name || 'Untitled Case',
        date: opinion.date_filed || 'Date unknown',
        summary: opinion.plain_text?.slice(0, 1000) ?? 'No summary available.',
        url: `https://www.courtlistener.com${opinion.absolute_url || ''}`,
        court: opinion.court?.name_abbreviation ?? 'Unknown Court',
      }));
    } catch (error) {
      console.error('Error searching opinions:', error);
      return [];
    }
  }

  async getDocument(id: string) {
    return this.request<any>(`/recap-document/${id}/`);
  }

  async getDocket(id: string) {
    return this.request<any>(`/dockets/${id}/`);
  }
}

import { CourtListenerClient } from '../clients/courtlistener';
import { RecapCase, SearchOptions, APIConfig } from '../types/base';

export class SearchService {
  private courtListener: CourtListenerClient;

  constructor(config: APIConfig = {}) {
    this.courtListener = new CourtListenerClient(config);
  }

  async searchCases(query: string, options?: SearchOptions): Promise<RecapCase[]> {
    try {
      return await this.courtListener.searchOpinions(query, options);
    } catch (error) {
      console.error('Search service error:', error);
      return [];
    }
  }
}

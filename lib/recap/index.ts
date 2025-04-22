// Export types
export * from './types/base';
export * from './types/pacer';

// Export main service
export { SearchService } from './services/search';

// Export clients for advanced usage
export { CourtListenerClient } from './clients/courtlistener';

// Re-export types used in services
export type { RecapCase, SearchOptions, APIConfig } from './types/base';

// Export base client
export { BaseAPIClient } from './clients/base';

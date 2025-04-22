export interface PACERCredentials {
  username: string;
  password: string;
  clientCode: string;
}

export interface PACERRequest {
  court: string;           // Court identifier (e.g., 'cand', 'nysd')
  caseNumber: string;      // PACER case number
  documentNumber?: string; // Optional specific document number
}

export interface PACERCostEstimate {
  pages: number;
  costPerPage: number;
  totalCost: number;
  isFree: boolean;        // True if available in RECAP
}

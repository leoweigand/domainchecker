// Shared interfaces for domain availability checking

export interface PricingInfo {
  registration: number;
  renewal: number;
  firstYear?: number; // Optional first-year discount price
  currency: string;
}

export interface DomainCheckResult {
  domain: string;
  available: boolean;
  provider: "domainr";
  pricing?: PricingInfo;
  error?: string;
}

export interface DomainChecker {
  checkAvailability(domain: string): Promise<DomainCheckResult>;
  getSupportedTLDs(): Promise<string[]>;
}

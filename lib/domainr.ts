// Domainr API implementation

import type { DomainChecker, DomainCheckResult } from "./types.ts";
import { getCachedTLDs, setCachedTLDs } from "./kv.ts";
import { extractTLD } from "./utils.ts";

const DOMAINR_RAPIDAPI_KEY = Deno.env.get("DOMAINR_RAPIDAPI_KEY");
const DOMAINR_API_BASE = "https://domainr.p.rapidapi.com/v2";

interface DomainrStatusResponse {
  status: DomainStatus[];
}

interface DomainStatus {
  domain: string;
  zone?: string;
  status: string;
  summary: string;
}

// Map of Domainr status values to availability
// Based on Domainr docs: inactive/undelegated = available, active/claimed/parked = taken
const STATUS_AVAILABILITY_MAP: Record<string, boolean> = {
  // Available statuses
  "inactive": true,
  "undelegated": true,
  "undelegated inactive": true,

  // Unavailable statuses
  "active": false,
  "claimed": false,
  "parked": false,
  "premium": false,
  "reserved": false,
  "expiring": false,
};

export class DomainrDomainChecker implements DomainChecker {
  private async makeRequest(endpoint: string, params: Record<string, string>): Promise<Response> {
    const url = new URL(`${DOMAINR_API_BASE}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": DOMAINR_RAPIDAPI_KEY!,
        "X-RapidAPI-Host": "domainr.p.rapidapi.com",
      },
    });

    return response;
  }

  async checkAvailability(domain: string): Promise<DomainCheckResult> {
    try {
      // Check if TLD is supported (optional - Domainr supports many TLDs)
      const tld = extractTLD(domain);
      const supportedTLDs = await this.getSupportedTLDs();

      if (supportedTLDs.length > 0 && !supportedTLDs.includes(tld)) {
        return {
          domain,
          available: false,
          provider: "domainr",
          error: "TLD not supported",
        };
      }

      // Check domain status
      const response = await this.makeRequest("/status", {
        domain: domain,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Domainr API error: ${response.status} ${response.statusText}`,
        );
        console.error(`Response body: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DomainrStatusResponse = await response.json();

      if (!data.status || data.status.length === 0) {
        console.error("Unexpected API response:", JSON.stringify(data));
        throw new Error("Missing status data from Domainr API");
      }

      // Get the first status entry (should match our queried domain)
      const domainStatus = data.status[0];

      // Determine availability based on status
      // Status can contain multiple space-separated values (e.g., "undelegated inactive")
      const statusKey = domainStatus.status.toLowerCase();

      // Check if we have a direct match first
      let available = STATUS_AVAILABILITY_MAP[statusKey];

      // If no direct match, check if any individual status word matches
      if (available === undefined) {
        const statusWords = statusKey.split(/\s+/);
        for (const word of statusWords) {
          if (STATUS_AVAILABILITY_MAP[word] !== undefined) {
            available = STATUS_AVAILABILITY_MAP[word];
            break;
          }
        }
      }

      if (available === undefined) {
        // Unknown status, treat as unavailable to be safe
        console.warn(`Unknown Domainr status: ${domainStatus.status}`);
        return {
          domain,
          available: false,
          provider: "domainr",
          error: `Unknown status: ${domainStatus.status}`,
        };
      }

      return {
        domain,
        available,
        provider: "domainr",
        // No pricing info - Domainr doesn't provide pricing
      };
    } catch (error) {
      return {
        domain,
        available: false,
        provider: "domainr",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSupportedTLDs(): Promise<string[]> {
    // Check cache first
    const cached = await getCachedTLDs("domainr");
    if (cached) {
      return cached;
    }

    // Domainr doesn't provide a TLD listing endpoint
    // We could either:
    // 1. Return empty array (skip TLD validation)
    // 2. Maintain a hardcoded list of common TLDs
    // For now, returning empty array to allow all TLDs through
    const tlds: string[] = [];

    // Cache the result (even if empty)
    await setCachedTLDs("domainr", tlds);

    return tlds;
  }
}

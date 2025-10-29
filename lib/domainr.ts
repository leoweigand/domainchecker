// Domainr API implementation

import type { DomainChecker, DomainCheckResult } from "./types.ts";
import { getWaitTime, recordFailure, recordSuccess } from "./kv.ts";

const DOMAINR_RAPIDAPI_KEY = Deno.env.get("DOMAINR_RAPIDAPI_KEY");
const DOMAINR_API_BASE = "https://domainr.p.rapidapi.com/v2";
const PROVIDER_NAME = "domainr";

// Retry configuration
const MAX_RETRIES = 3;
const RATE_LIMIT_STATUS_CODES = [429]; // HTTP codes that indicate rate limiting

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
  inactive: true,
  undelegated: true,
  "undelegated inactive": true,

  // Unavailable statuses
  active: false,
  claimed: false,
  parked: false,
  premium: false,
  reserved: false,
  expiring: false,
};

export class DomainrDomainChecker implements DomainChecker {
  /**
   * Makes an API request with exponential backoff retry logic
   * Checks KV store for rate limit state before making requests
   * Records failures and successes to manage backoff state
   */
  private async makeRequest(
    endpoint: string,
    params: Record<string, string>,
  ): Promise<Response> {
    const url = new URL(`${DOMAINR_API_BASE}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Check if we need to wait before making the request
      const waitTime = await getWaitTime(PROVIDER_NAME);
      if (waitTime > 0) {
        console.log(
          `Rate limit backoff: waiting ${waitTime}ms before retry (attempt ${
            attempt + 1
          }/${MAX_RETRIES + 1})`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-RapidAPI-Key": DOMAINR_RAPIDAPI_KEY!,
            "X-RapidAPI-Host": "domainr.p.rapidapi.com",
          },
        });

        // Check if we hit rate limit
        if (RATE_LIMIT_STATUS_CODES.includes(response.status)) {
          const rateLimitState = await recordFailure(PROVIDER_NAME);
          console.warn(
            `Rate limit hit (${response.status}). Failure count: ${rateLimitState.failureCount}, next retry after: ${new Date(
              rateLimitState.nextRetryAfter,
            ).toISOString()}`,
          );

          // If this isn't our last attempt, consume body and retry
          if (attempt < MAX_RETRIES) {
            // Consume the response body to prevent leaks
            await response.text().catch(() => {});
            lastError = new Error(
              `Rate limit exceeded (${response.status}). Retrying...`,
            );
            continue;
          }

          // Last attempt failed, return the response
          return response;
        }

        // Success! Clear any rate limit state
        if (response.ok) {
          await recordSuccess(PROVIDER_NAME);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        console.error(
          `Request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
          lastError.message,
        );

        // Record failure for network errors too
        await recordFailure(PROVIDER_NAME);

        // If this was our last attempt, throw
        if (attempt === MAX_RETRIES) {
          throw lastError;
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error("Request failed after all retries");
  }

  async checkAvailability(domain: string): Promise<DomainCheckResult> {
    try {
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
    // Domainr supports all TLDs, so return empty array (no validation needed)
    return [];
  }
}

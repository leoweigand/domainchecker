// Cloudflare Registrar API implementation

import type { DomainChecker, DomainCheckResult } from "./types.ts";
import { getCachedTLDs, setCachedTLDs } from "./kv.ts";
import { extractTLD } from "./utils.ts";

const CLOUDFLARE_API_TOKEN = Deno.env.get("CLOUDFLARE_API_TOKEN");
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
const CLOUDFLARE_EMAIL = Deno.env.get("CLOUDFLARE_EMAIL");
const CLOUDFLARE_API_BASE =
  `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/registrar`;

interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result?: T;
}

interface CloudflareAvailabilityResult {
  available: boolean;
  supported_tld: boolean;
}

interface CloudflarePricingResult {
  registration_price: number;
  renewal_price: number;
  transfer_price: number;
}

export class CloudflareDomainChecker implements DomainChecker {
  async checkAvailability(domain: string): Promise<DomainCheckResult> {
    try {
      // Check if TLD is supported
      const tld = extractTLD(domain);
      const supportedTLDs = await this.getSupportedTLDs();

      if (!supportedTLDs.includes(tld)) {
        return {
          domain,
          available: false,
          provider: "cloudflare",
          error: "TLD not supported by Cloudflare",
        };
      }

      // Check availability
      const availabilityResponse = await fetch(
        `${CLOUDFLARE_API_BASE}/domains/${domain}`,
        {
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
            "X-Auth-Email": CLOUDFLARE_EMAIL!,
          },
        },
      );

      const availabilityData: CloudflareResponse<CloudflareAvailabilityResult> =
        await availabilityResponse.json();

      if (!availabilityData.success || !availabilityData.result) {
        throw new Error(
          availabilityData.errors?.[0]?.message || "Unknown error",
        );
      }

      const isAvailable = availabilityData.result.available;

      if (!isAvailable) {
        return {
          domain,
          available: false,
          provider: "cloudflare",
        };
      }

      // Get pricing information
      const pricingResponse = await fetch(
        `${CLOUDFLARE_API_BASE}/domains/${domain}/pricing`,
        {
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
            "X-Auth-Email": CLOUDFLARE_EMAIL!,
          },
        },
      );

      const pricingData: CloudflareResponse<CloudflarePricingResult> =
        await pricingResponse.json();

      if (!pricingData.success || !pricingData.result) {
        throw new Error(pricingData.errors?.[0]?.message || "Unknown error");
      }

      return {
        domain,
        available: true,
        provider: "cloudflare",
        pricing: {
          registration: pricingData.result.registration_price,
          renewal: pricingData.result.renewal_price,
          currency: "USD",
        },
      };
    } catch (error) {
      return {
        domain,
        available: false,
        provider: "cloudflare",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSupportedTLDs(): Promise<string[]> {
    // Check cache first
    const cached = await getCachedTLDs("cloudflare");
    if (cached) {
      return cached;
    }

    // Fetch from API
    try {
      const response = await fetch(`${CLOUDFLARE_API_BASE}/tlds`, {
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "X-Auth-Email": CLOUDFLARE_EMAIL!,
        },
      });

      const data: CloudflareResponse<string[]> = await response.json();

      if (!data.success || !data.result) {
        throw new Error("Failed to fetch Cloudflare TLDs");
      }

      // Cache the result
      await setCachedTLDs("cloudflare", data.result);

      return data.result;
    } catch (error) {
      console.error("Failed to fetch Cloudflare TLDs:", error);
      return []; // Return empty array on error
    }
  }
}

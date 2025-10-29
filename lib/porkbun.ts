// Porkbun API implementation

import type { DomainChecker, DomainCheckResult } from "./types.ts";
import { getCachedTLDs, setCachedTLDs } from "./kv.ts";
import { extractTLD } from "./utils.ts";

const PORKBUN_API_KEY = Deno.env.get("PORKBUN_API_KEY");
const PORKBUN_SECRET_KEY = Deno.env.get("PORKBUN_SECRET_KEY");
const PORKBUN_API_BASE = "https://porkbun.com/api/json/v3";

interface PorkbunAuthBody {
  apikey: string;
  secretapikey: string;
}

interface PorkbunAvailabilityResponse {
  status: "SUCCESS" | "ERROR";
  availability?: "available" | "taken";
  price?: string;
  salePrice?: string;
  currency?: string;
  message?: string;
}

interface PorkbunPricingResponse {
  status: "SUCCESS" | "ERROR";
  pricing?: Record<
    string,
    {
      registration: string;
      renewal: string;
      transfer: string;
      coupons?: {
        registration?: {
          code: string;
          amount: string;
        };
      };
    }
  >;
}

export class PorkbunDomainChecker implements DomainChecker {
  private getAuthBody(): PorkbunAuthBody {
    return {
      apikey: PORKBUN_API_KEY!,
      secretapikey: PORKBUN_SECRET_KEY!,
    };
  }

  async checkAvailability(domain: string): Promise<DomainCheckResult> {
    try {
      // Check if TLD is supported
      const tld = extractTLD(domain);
      const supportedTLDs = await this.getSupportedTLDs();

      if (!supportedTLDs.includes(tld)) {
        return {
          domain,
          available: false,
          provider: "porkbun",
          error: "TLD not supported by Porkbun",
        };
      }

      // Check availability (includes pricing)
      const response = await fetch(
        `${PORKBUN_API_BASE}/domain/availability/${domain}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.getAuthBody()),
        },
      );

      const data: PorkbunAvailabilityResponse = await response.json();

      if (data.status === "ERROR") {
        throw new Error(data.message || "Unknown error");
      }

      if (data.availability === "taken") {
        return {
          domain,
          available: false,
          provider: "porkbun",
        };
      }

      if (data.availability === "available") {
        // Parse pricing
        const regularPrice = parseFloat(data.price || "0");
        const salePrice = data.salePrice
          ? parseFloat(data.salePrice)
          : undefined;

        return {
          domain,
          available: true,
          provider: "porkbun",
          pricing: {
            registration: regularPrice,
            renewal: regularPrice,
            firstYear: salePrice !== regularPrice ? salePrice : undefined,
            currency: data.currency || "USD",
          },
        };
      }

      throw new Error("Unexpected availability status");
    } catch (error) {
      return {
        domain,
        available: false,
        provider: "porkbun",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSupportedTLDs(): Promise<string[]> {
    // Check cache first
    const cached = await getCachedTLDs("porkbun");
    if (cached) {
      return cached;
    }

    // Fetch from API
    try {
      const response = await fetch(`${PORKBUN_API_BASE}/pricing/get`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.getAuthBody()),
      });

      const data: PorkbunPricingResponse = await response.json();

      if (data.status === "ERROR" || !data.pricing) {
        throw new Error("Failed to fetch Porkbun pricing");
      }

      // Extract TLDs from pricing object
      const tlds = Object.keys(data.pricing);

      // Cache the result
      await setCachedTLDs("porkbun", tlds);

      return tlds;
    } catch (error) {
      console.error("Failed to fetch Porkbun TLDs:", error);
      return []; // Return empty array on error
    }
  }
}

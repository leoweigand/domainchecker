// Porkbun API implementation

import type { DomainChecker, DomainCheckResult } from "./types.ts";
import { getCachedTLDs, setCachedTLDs } from "./kv.ts";
import { extractTLD } from "./utils.ts";

const PORKBUN_API_KEY = Deno.env.get("PORKBUN_API_KEY");
const PORKBUN_SECRET_KEY = Deno.env.get("PORKBUN_SECRET_KEY");
const PORKBUN_API_BASE = "https://api.porkbun.com/api/json/v3";

interface PorkbunAuthBody {
  apikey: string;
  secretapikey: string;
}

interface PorkbunAvailabilityResponse {
  status: "SUCCESS" | "ERROR";
  message?: string;
  response?: {
    avail: "yes" | "no";
    type: string;
    price: string;
    regularPrice: string;
    firstYearPromo: "yes" | "no";
    premium: "yes" | "no";
    additional?: {
      renewal: {
        type: string;
        price: string;
        regularPrice: string;
      };
      transfer: {
        type: string;
        price: string;
        regularPrice: string;
      };
    };
  };
}

interface PorkbunPricingResponse {
  status: "SUCCESS" | "ERROR";
  message?: string;
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
        `${PORKBUN_API_BASE}/domain/checkDomain/${domain}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(this.getAuthBody()),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Porkbun API error: ${response.status} ${response.statusText}`,
        );
        console.error(`Response body: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PorkbunAvailabilityResponse = await response.json();

      if (data.status === "ERROR") {
        throw new Error(data.message || "Unknown error");
      }

      if (!data.response) {
        console.error("Unexpected API response:", JSON.stringify(data));
        throw new Error("Missing response data from Porkbun API");
      }

      const resp = data.response;

      // Domain is not available
      if (resp.avail === "no") {
        return {
          domain,
          available: false,
          provider: "porkbun",
        };
      }

      // Domain is available
      if (resp.avail === "yes") {
        const firstYearPrice = parseFloat(resp.price);
        const regularPrice = parseFloat(resp.regularPrice);
        const renewalPrice = resp.additional?.renewal
          ? parseFloat(resp.additional.renewal.price)
          : regularPrice;

        return {
          domain,
          available: true,
          provider: "porkbun",
          pricing: {
            registration: regularPrice,
            renewal: renewalPrice,
            firstYear: resp.firstYearPromo === "yes"
              ? firstYearPrice
              : undefined,
            currency: "USD",
          },
        };
      }

      console.error("Unexpected API response:", JSON.stringify(data));
      throw new Error(`Unexpected availability status: ${resp.avail}`);
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Porkbun API error: ${response.status} ${response.statusText}`,
        );
        console.error(`Response body: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: PorkbunPricingResponse = await response.json();

      if (data.status === "ERROR" || !data.pricing) {
        console.error("Porkbun API response:", data);
        throw new Error(data.message || "Failed to fetch Porkbun pricing");
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

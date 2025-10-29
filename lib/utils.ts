// Domain validation and formatting utilities

import type { PricingInfo } from "./types.ts";

/**
 * Validates if a string is a valid domain name
 * Supports standard domains and internationalized domains
 */
export function isValidDomain(text: string): boolean {
  // Basic domain regex: alphanumeric, hyphens, dots
  // Must have at least one dot and valid TLD
  const domainRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(text.trim());
}

/**
 * Extracts the TLD from a domain name
 * e.g., "example.com" -> "com", "example.co.uk" -> "co.uk"
 */
export function extractTLD(domain: string): string {
  const parts = domain.split(".");

  // Handle multi-part TLDs like .co.uk
  if (parts.length >= 3) {
    const lastTwo = parts.slice(-2).join(".");
    // Common multi-part TLDs
    const multiPartTLDs = ["co.uk", "co.jp", "com.au", "co.nz", "co.za"];
    if (multiPartTLDs.includes(lastTwo)) {
      return lastTwo;
    }
  }

  // Return last part as TLD
  return parts[parts.length - 1];
}

/**
 * Formats pricing information for display
 */
export function formatPrice(pricing: PricingInfo, provider: string): string {
  const renewalPrice = pricing.renewal.toFixed(2);
  const currency = pricing.currency === "USD" ? "$" : pricing.currency;

  let priceText = `${currency}${renewalPrice} / yr`;

  // Add first year discount if available and different from renewal
  if (pricing.firstYear && pricing.firstYear !== pricing.renewal) {
    const firstYearPrice = pricing.firstYear.toFixed(2);
    priceText += ` (${currency}${firstYearPrice} first year)`;
  }

  priceText += ` (${provider})`;

  return priceText;
}

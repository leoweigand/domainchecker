// Integration tests for Cloudflare domain checker
// These tests make real API calls and require valid credentials

import { assertEquals, assertExists } from "jsr:@std/assert";
import { CloudflareDomainChecker } from "./cloudflare.ts";

Deno.test({
  name: "Cloudflare: Get supported TLDs",
  async fn() {
    const checker = new CloudflareDomainChecker();
    const tlds = await checker.getSupportedTLDs();

    assertExists(tlds);
    assertEquals(Array.isArray(tlds), true);
    // Cloudflare should support at least common TLDs
    assertEquals(tlds.includes("com"), true);
  },
});

Deno.test({
  name: "Cloudflare: Check unavailable domain",
  async fn() {
    const checker = new CloudflareDomainChecker();
    // google.com should always be taken
    const result = await checker.checkAvailability("google.com");

    assertEquals(result.domain, "google.com");
    assertEquals(result.provider, "cloudflare");
    assertEquals(result.available, false);
  },
});

Deno.test({
  name: "Cloudflare: Check available domain",
  async fn() {
    const checker = new CloudflareDomainChecker();
    // Use a very random domain that's likely available
    const randomDomain = `test-domain-${
      Math.random().toString(36).substring(7)
    }-${Date.now()}.com`;
    const result = await checker.checkAvailability(randomDomain);

    assertEquals(result.domain, randomDomain);
    assertEquals(result.provider, "cloudflare");
    // If available, should have pricing info
    if (result.available) {
      assertExists(result.pricing);
      assertExists(result.pricing.registration);
      assertExists(result.pricing.renewal);
      assertEquals(result.pricing.currency, "USD");
    }
  },
});

Deno.test({
  name: "Cloudflare: Unsupported TLD",
  async fn() {
    const checker = new CloudflareDomainChecker();
    // .xyz might not be supported by Cloudflare (or might be)
    // This tests the TLD checking logic
    const result = await checker.checkAvailability("example.club");

    assertEquals(result.domain, "example.club");
    assertEquals(result.provider, "cloudflare");
    // Should either return availability or TLD not supported error
    if (result.error) {
      assertEquals(
        result.error.includes("not supported") ||
          result.error.includes("TLD"),
        true,
      );
    }
  },
});

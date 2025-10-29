// Integration tests for Porkbun domain checker
// These tests make real API calls and require valid credentials

import { assertEquals, assertExists } from "jsr:@std/assert";
import { PorkbunDomainChecker } from "./porkbun.ts";

Deno.test({
  name: "Porkbun: Get supported TLDs",
  async fn() {
    const checker = new PorkbunDomainChecker();
    const tlds = await checker.getSupportedTLDs();

    assertExists(tlds);
    assertEquals(Array.isArray(tlds), true);
    // Porkbun should support hundreds of TLDs
    assertEquals(tlds.length > 100, true);
    assertEquals(tlds.includes("com"), true);
    assertEquals(tlds.includes("net"), true);
  },
});

Deno.test({
  name: "Porkbun: Check unavailable domain",
  async fn() {
    const checker = new PorkbunDomainChecker();
    // google.com should always be taken
    const result = await checker.checkAvailability("google.com");

    assertEquals(result.domain, "google.com");
    assertEquals(result.provider, "porkbun");
    assertEquals(result.available, false);
  },
});

Deno.test({
  name: "Porkbun: Check available domain",
  async fn() {
    const checker = new PorkbunDomainChecker();
    // Use a very random domain that's likely available
    const randomDomain = `test-domain-${
      Math.random().toString(36).substring(7)
    }-${Date.now()}.com`;
    const result = await checker.checkAvailability(randomDomain);

    assertEquals(result.domain, randomDomain);
    assertEquals(result.provider, "porkbun");
    // If available, should have pricing info
    if (result.available) {
      assertExists(result.pricing);
      assertExists(result.pricing.registration);
      assertExists(result.pricing.renewal);
      assertEquals(result.pricing.currency, "USD");
      // Check that firstYear discount is properly set (or undefined)
      if (result.pricing.firstYear !== undefined) {
        assertEquals(typeof result.pricing.firstYear, "number");
      }
    }
  },
});

Deno.test({
  name: "Porkbun: Check domain with first-year discount",
  async fn() {
    const checker = new PorkbunDomainChecker();
    // Use a random .online domain which often has first-year discounts
    const randomDomain = `test-${
      Math.random().toString(36).substring(7)
    }-${Date.now()}.online`;
    const result = await checker.checkAvailability(randomDomain);

    assertEquals(result.domain, randomDomain);
    assertEquals(result.provider, "porkbun");
    // Just verify the structure is correct, don't assert on discount presence
    if (result.available && result.pricing) {
      assertExists(result.pricing.registration);
      assertExists(result.pricing.renewal);
    }
  },
});

Deno.test({
  name: "Porkbun: Unsupported TLD",
  async fn() {
    const checker = new PorkbunDomainChecker();
    // Use a fake TLD that definitely doesn't exist
    const result = await checker.checkAvailability("example.fakeextension");

    assertEquals(result.domain, "example.fakeextension");
    assertEquals(result.provider, "porkbun");
    assertEquals(result.available, false);
    // Should have an error about TLD not being supported
    if (result.error) {
      assertEquals(
        result.error.includes("not supported") ||
          result.error.includes("TLD"),
        true,
      );
    }
  },
});

// Integration tests for Domainr domain checker
// These tests make real API calls and require valid credentials

import { assertEquals, assertExists } from "jsr:@std/assert@1";
import { DomainrDomainChecker } from "./domainr.ts";

Deno.test({
  name: "Domainr: Get supported TLDs",
  async fn() {
    const checker = new DomainrDomainChecker();
    const tlds = await checker.getSupportedTLDs();

    assertExists(tlds);
    assertEquals(Array.isArray(tlds), true);
    // Domainr doesn't provide TLD list, so we expect empty array
    assertEquals(tlds.length, 0);
  },
});

Deno.test({
  name: "Domainr: Check unavailable domain",
  async fn() {
    const checker = new DomainrDomainChecker();
    // google.com should always be taken
    const result = await checker.checkAvailability("google.com");

    assertEquals(result.domain, "google.com");
    assertEquals(result.provider, "domainr");
    assertEquals(result.available, false);
  },
});

Deno.test({
  name: "Domainr: Check available domain",
  async fn() {
    const checker = new DomainrDomainChecker();
    // Use a very random domain that's likely available
    const randomDomain = `test-domain-${
      Math.random().toString(36).substring(7)
    }-${Date.now()}.com`;
    const result = await checker.checkAvailability(randomDomain);

    assertEquals(result.domain, randomDomain);
    assertEquals(result.provider, "domainr");
    // If available, should not have pricing info (Domainr doesn't provide pricing)
    if (result.available) {
      assertEquals(result.pricing, undefined);
    }
  },
});

Deno.test({
  name: "Domainr: Check domain with uncommon TLD",
  async fn() {
    const checker = new DomainrDomainChecker();
    // Use a random .io domain
    const randomDomain = `test-${
      Math.random().toString(36).substring(7)
    }-${Date.now()}.io`;
    const result = await checker.checkAvailability(randomDomain);

    assertEquals(result.domain, randomDomain);
    assertEquals(result.provider, "domainr");
    // Should return a result without error
    assertEquals(result.error, undefined);
  },
});

Deno.test({
  name: "Domainr: Check multiple status handling",
  async fn() {
    const checker = new DomainrDomainChecker();
    // Check a domain that might return multiple statuses
    // Using a recently expired domain pattern
    const randomDomain = `abandoned-${
      Math.random().toString(36).substring(7)
    }.com`;
    const result = await checker.checkAvailability(randomDomain);

    assertEquals(result.domain, randomDomain);
    assertEquals(result.provider, "domainr");
    // Should have a boolean availability value
    assertEquals(typeof result.available, "boolean");
  },
});

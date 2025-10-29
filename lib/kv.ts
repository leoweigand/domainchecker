// Deno KV cache helpers for TLD lists

const kv = await Deno.openKv();

const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

/**
 * Gets cached TLD list for a provider
 * Returns null if not cached or expired
 */
export async function getCachedTLDs(
  provider: "cloudflare" | "porkbun",
): Promise<string[] | null> {
  const result = await kv.get<string[]>(["tlds", provider]);

  if (result.value === null) {
    return null;
  }

  return result.value;
}

/**
 * Caches TLD list for a provider with 1-day expiration
 */
export async function setCachedTLDs(
  provider: "cloudflare" | "porkbun",
  tlds: string[],
): Promise<void> {
  await kv.set(["tlds", provider], tlds, {
    expireIn: CACHE_EXPIRATION_MS,
  });
}

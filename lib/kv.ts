// Deno KV helpers for rate limit tracking and retry state

const kv = await Deno.openKv();

interface RateLimitState {
  failureCount: number;
  nextRetryAfter: number; // Unix timestamp in milliseconds
  lastFailureTime: number; // Unix timestamp in milliseconds
}

// Exponential backoff configuration
const INITIAL_BACKOFF_MS = 1000; // Start with 1 second
const MAX_BACKOFF_MS = 300000; // Max 5 minutes
const BACKOFF_MULTIPLIER = 2;
const MAX_FAILURES_BEFORE_LONG_BACKOFF = 3;

/**
 * Gets the current rate limit state for a provider
 * Returns null if no rate limit state exists (first request or expired)
 */
export async function getRateLimitState(
  provider: string,
): Promise<RateLimitState | null> {
  const result = await kv.get<RateLimitState>(["rate_limit", provider]);
  return result.value;
}

/**
 * Records a failed request and calculates next retry time using exponential backoff
 */
export async function recordFailure(
  provider: string,
): Promise<RateLimitState> {
  const now = Date.now();
  const currentState = await getRateLimitState(provider);

  const failureCount = (currentState?.failureCount || 0) + 1;

  // Calculate exponential backoff delay
  const backoffDelay = Math.min(
    INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, failureCount - 1),
    MAX_BACKOFF_MS,
  );

  const newState: RateLimitState = {
    failureCount,
    nextRetryAfter: now + backoffDelay,
    lastFailureTime: now,
  };

  // Store with expiration (2x max backoff to allow state to clear eventually)
  await kv.set(["rate_limit", provider], newState, {
    expireIn: MAX_BACKOFF_MS * 2,
  });

  return newState;
}

/**
 * Records a successful request and clears rate limit state
 */
export async function recordSuccess(provider: string): Promise<void> {
  await kv.delete(["rate_limit", provider]);
}

/**
 * Checks if we should wait before making a request
 * Returns the milliseconds to wait, or 0 if okay to proceed
 */
export async function getWaitTime(provider: string): Promise<number> {
  const state = await getRateLimitState(provider);

  if (!state) {
    return 0;
  }

  const now = Date.now();
  const waitTime = state.nextRetryAfter - now;

  return Math.max(0, waitTime);
}

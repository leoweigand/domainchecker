// Entry point for Deno Deploy

import handler from "./webhook.ts";

// Start the server
Deno.serve(handler);

// Re-export for compatibility
export default handler;

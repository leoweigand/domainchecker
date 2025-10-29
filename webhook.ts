// Main webhook handler for Telegram bot

import { PorkbunDomainChecker } from "./lib/porkbun.ts";
import { sendChatAction, sendMessage } from "./lib/telegram.ts";
import type { DomainCheckResult } from "./lib/types.ts";
import { formatPrice, isValidDomain } from "./lib/utils.ts";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

const porkbunChecker = new PorkbunDomainChecker();

/**
 * Checks domain availability using Porkbun
 */
async function checkDomain(domain: string): Promise<DomainCheckResult> {
  return await porkbunChecker.checkAvailability(domain);
}

/**
 * Formats the domain check result for display
 */
function formatResult(result: DomainCheckResult): string {
  // If there's an error and domain is not available
  if (result.error) {
    // If TLD is not supported
    if (result.error.includes("not supported")) {
      return `Error: The domain "${result.domain}" uses a TLD that is not supported by Porkbun.`;
    }
    return `Error: ${result.error}`;
  }

  // Domain is not available
  if (!result.available) {
    return `${result.domain} is not available.`;
  }

  // Domain is available
  if (!result.pricing) {
    return `${result.domain} is available!`;
  }

  const providerName = result.provider.charAt(0).toUpperCase() +
    result.provider.slice(1);
  const priceInfo = formatPrice(result.pricing, providerName);

  return `${result.domain} is available!\n${priceInfo}`;
}

/**
 * Handles incoming Telegram webhook updates
 */
export async function handleWebhook(update: TelegramUpdate): Promise<void> {
  // Extract message data
  const message = update.message;
  if (!message || !message.text) {
    return;
  }

  const chatId = message.chat.id;
  const messageId = message.message_id;
  const text = message.text.trim();

  // Validate domain
  if (!isValidDomain(text)) {
    await sendMessage(
      chatId,
      `Error: "${text}" is not a valid domain name.`,
      messageId,
    );
    return;
  }

  // Send typing indicator
  await sendChatAction(chatId, "typing");

  // Check domain availability
  const result = await checkDomain(text.toLowerCase());

  // Format and send result
  const responseText = formatResult(result);
  await sendMessage(chatId, responseText, messageId);
}

/**
 * Main HTTP handler for Deno Deploy
 */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Health check endpoint
  if (url.pathname === "/" && req.method === "GET") {
    return new Response("Domain Checker Bot is running!", { status: 200 });
  }

  // Webhook endpoint
  if (url.pathname === "/" && req.method === "POST") {
    try {
      const update: TelegramUpdate = await req.json();

      // Handle webhook asynchronously (don't wait)
      handleWebhook(update).catch((error) => {
        console.error("Error handling webhook:", error);
      });

      // Return 200 OK immediately to Telegram
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Error parsing webhook:", error);
      return new Response("Bad Request", { status: 400 });
    }
  }

  return new Response("Not Found", { status: 404 });
}

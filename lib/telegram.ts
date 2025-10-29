// Telegram Bot API helpers

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Sends a message to a chat, optionally replying to a specific message
 */
export async function sendMessage(
  chatId: number,
  text: string,
  replyToMessageId?: number,
): Promise<void> {
  const payload: {
    chat_id: number;
    text: string;
    reply_to_message_id?: number;
  } = {
    chat_id: chatId,
    text: text,
  };

  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
    }
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
}

/**
 * Sets a reaction to a message
 */
export async function setMessageReaction(
  chatId: number,
  messageId: number,
  emoji: string,
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API_BASE}/setMessageReaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reaction: [{
          type: "emoji",
          emoji: emoji,
        }],
      }),
    });
  } catch (error) {
    console.error("Failed to set message reaction:", error);
  }
}

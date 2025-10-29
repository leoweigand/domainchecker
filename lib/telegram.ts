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
 * Sends a chat action (e.g., "typing") to show activity
 */
export async function sendChatAction(
  chatId: number,
  action: "typing" | "upload_photo" | "upload_document",
): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API_BASE}/sendChatAction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: action,
      }),
    });
  } catch (error) {
    console.error("Failed to send chat action:", error);
  }
}

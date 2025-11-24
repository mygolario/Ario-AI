export type Channel = "WEB" | "TELEGRAM";

interface HandleUserMessageParams {
  userIdentifier: {
    telegramId?: string;
    email?: string;
  };
  channel: Channel;
  message: string;
}

const sanitizeMessage = (message: string) => message.trim();

export async function handleUserMessage(
  params: HandleUserMessageParams,
): Promise<{ reply: string }> {
  const trimmedMessage = sanitizeMessage(params.message);

  if (!trimmedMessage) {
    throw new Error("Message cannot be empty");
  }

  console.log("[handleUserMessage] channel =", params.channel, "message =", trimmedMessage);
  const replyText = `پیامت را گرفتم: ${trimmedMessage}`;

  return { reply: replyText };
}

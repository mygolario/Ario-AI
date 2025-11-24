import { prisma } from "@/lib/prisma";
import { MessageChannel, MessageRole } from "@prisma/client";

export type Channel = "WEB" | "TELEGRAM";

interface HandleUserMessageParams {
  userIdentifier: {
    telegramId?: string;
    email?: string;
  };
  channel: Channel;
  message: string;
}

const channelMap: Record<Channel, MessageChannel> = {
  WEB: MessageChannel.WEB,
  TELEGRAM: MessageChannel.TELEGRAM,
};

const sanitizeMessage = (message: string) => message.trim();

const upsertUser = async (identifier: HandleUserMessageParams["userIdentifier"]) => {
  const { telegramId, email } = identifier;

  if (telegramId) {
    return prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId },
    });
  }

  if (email) {
    return prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  }

  const fallback = await prisma.user.findFirst({
    where: {
      telegramId: null,
      email: null,
    },
  });

  if (fallback) return fallback;

  return prisma.user.create({ data: {} });
};

export async function handleUserMessage(
  params: HandleUserMessageParams,
): Promise<{ reply: string }> {
  const trimmedMessage = sanitizeMessage(params.message);

  if (!trimmedMessage) {
    throw new Error("Message cannot be empty");
  }

  const user = await upsertUser(params.userIdentifier);

  await prisma.message.create({
    data: {
      userId: user.id,
      role: MessageRole.USER,
      channel: channelMap[params.channel],
      content: trimmedMessage,
    },
  });

  const replyText = `پیامت را گرفتم: ${trimmedMessage}`;

  await prisma.message.create({
    data: {
      userId: user.id,
      role: MessageRole.ASSISTANT,
      channel: channelMap[params.channel],
      content: replyText,
    },
  });

  return { reply: replyText };
}

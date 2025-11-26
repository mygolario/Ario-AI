import { prisma } from "@/lib/prisma";
import { MessageRole } from "@prisma/client";
import type { ChatMessage } from "@/core/llm/types";

const MAX_CONTEXT_MESSAGES = 15;

const roleMap: Record<MessageRole, ChatMessage["role"]> = {
  USER: "user",
  ASSISTANT: "assistant",
};

export async function getConversationContext(
  userId: string,
): Promise<ChatMessage[]> {
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: MAX_CONTEXT_MESSAGES,
  });

  // Reverse to get chronological order (oldest first)
  return messages
    .reverse()
    .map((msg) => ({
      role: roleMap[msg.role],
      content: msg.content,
    }));
}


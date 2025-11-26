import { prisma } from "@/lib/prisma";
import { MessageRole } from "@prisma/client";

export interface MessageHistoryItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export async function getMessageHistory(
  userId: string,
): Promise<MessageHistoryItem[]> {
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role === MessageRole.USER ? "user" : "assistant",
    content: msg.content,
    createdAt: msg.createdAt,
  }));
}


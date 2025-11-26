import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const clientId = req.headers.get("x-client-id");
  const conversationId = params.id;

  if (!clientId) {
    return NextResponse.json({ messages: [] }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { clientId },
  });

  if (!user) {
    return NextResponse.json({ messages: [] }, { status: 404 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
  });

  if (!conversation) {
    return NextResponse.json({ messages: [] }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}

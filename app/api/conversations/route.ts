import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const clientId = req.headers.get("x-client-id");

  if (!clientId) {
    return NextResponse.json({ conversations: [] });
  }

  const user = await prisma.user.findUnique({
    where: { clientId },
  });

  if (!user) {
    return NextResponse.json({ conversations: [] });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const items = conversations.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    title: c.title ?? c.messages[0]?.content?.slice(0, 40) ?? "گفت‌وگوی بدون عنوان",
  }));

  return NextResponse.json({ conversations: items });
}

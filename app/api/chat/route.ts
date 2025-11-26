import { NextResponse } from "next/server";
import { handleUserMessage } from "@/core/conversation";
import type { ChatRequestBody, ChatResponseBody } from "@/types/chat";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<ChatRequestBody>;
    const message = payload.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "message field is required" },
        { status: 400 },
      );
    }

    const { reply, conversationId } = await handleUserMessage({
      userIdentifier: {
        clientId: payload.clientId ?? undefined,
      },
      channel: "WEB",
      message,
      conversationId: payload.conversationId ?? null,
    });

    const body: ChatResponseBody = { reply, conversationId };

    return NextResponse.json(body);
  } catch (error) {
    console.error("[api/chat] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


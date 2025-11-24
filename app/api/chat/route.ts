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

    const { reply } = await handleUserMessage({
      userIdentifier: {},
      channel: "WEB",
      message,
    });

    return NextResponse.json<ChatResponseBody>({ reply });
  } catch (error) {
    console.error("[api/chat] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


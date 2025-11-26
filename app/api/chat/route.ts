import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleUserMessage } from "@/core/conversation";
import { getMessageHistory } from "@/core/memory/messages";
import { prisma } from "@/lib/prisma";
import type { ChatRequestBody, ChatResponseBody } from "@/types/chat";

const SESSION_COOKIE_NAME = "ario_session_id";

async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existingSession = cookieStore.get(SESSION_COOKIE_NAME);

  if (existingSession?.value) {
    return existingSession.value;
  }

  // Generate and persist a simple session ID
  const newSessionId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  cookieStore.set(SESSION_COOKIE_NAME, newSessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return newSessionId;
}

async function getCurrentUser() {
  const sessionId = await getOrCreateSessionId();

  const existing = await prisma.user.findUnique({
    where: { clientId: sessionId },
  });

  if (existing) {
    return existing;
  }

  return prisma.user.create({
    data: { clientId: sessionId },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const history = await getMessageHistory(user.id);

    return NextResponse.json({ messages: history });
  } catch (error) {
    console.error("[api/chat] GET failed", error);
    return NextResponse.json(
      { error: "Failed to load conversation history" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const payload = (await request.json()) as Partial<ChatRequestBody>;
    const message = payload.message?.trim();

    // Safety guard: reject empty or whitespace-only messages
    if (!message || message.length === 0) {
      console.log("[api/chat] Rejected empty message");
      return NextResponse.json(
        { error: "پیام نمی‌تواند خالی باشد" },
        { status: 400 },
      );
    }

    const tone = (payload.tone || "default") as "default" | "friendly" | "creative" | "technical";
    const responseMode = (payload.responseMode || "auto") as "auto" | "fast" | "thinking";

    console.log(`[api/chat] Processing message (length: ${message.length}, tone: ${tone}, mode: ${responseMode})`);

    const sessionId = await getOrCreateSessionId();
    const clientId = payload.clientId ?? undefined;

    const { reply, conversationId } = await handleUserMessage({
      userIdentifier: {
        clientId,
      },
      channel: "WEB",
      message,
      conversationId: payload.conversationId ?? null,
      tone,
      responseMode,
    });

    const duration = Date.now() - startTime;
    console.log(`[api/chat] Request completed successfully (${duration}ms)`);

    return NextResponse.json<ChatResponseBody>({ reply, conversationId });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[api/chat] Request failed after ${duration}ms:`, errorMessage);
    if (errorStack) {
      console.error(`[api/chat] Error stack:`, errorStack);
    }
    console.error(`[api/chat] Full error:`, error);
    return NextResponse.json(
      { error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید.", details: process.env.NODE_ENV === "development" ? errorMessage : undefined },
      { status: 500 },
    );
  }
}


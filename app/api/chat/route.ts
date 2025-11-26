import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleUserMessage } from "@/core/conversation";
import { getMessageHistory } from "@/core/memory/messages";
import { prisma } from "@/lib/prisma";
import type { ChatRequestBody, ChatResponseBody } from "@/types/chat";

const SESSION_COOKIE_NAME = "ario_session_id";

function getOrCreateSessionId(): string {
  const cookieStore = cookies();
  const existingSession = cookieStore.get(SESSION_COOKIE_NAME);

  if (existingSession?.value) {
    return existingSession.value;
  }

  // Generate a simple session ID
  const newSessionId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return newSessionId;
}

async function getCurrentUser() {
  // For anonymous web users, get or create a user with no telegramId/email
  const user = await prisma.user.findFirst({
    where: {
      telegramId: null,
      email: null,
    },
  });

  if (user) return user;

  return prisma.user.create({ data: {} });
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

    console.log(`[api/chat] Processing message (length: ${message.length})`);

    const sessionId = getOrCreateSessionId();
    const clientId = payload.clientId ?? undefined;

    const { reply, conversationId } = await handleUserMessage({
      userIdentifier: {
        clientId,
      },
      channel: "WEB",
      message,
      conversationId: payload.conversationId ?? null,
    });

    const duration = Date.now() - startTime;
    console.log(`[api/chat] Request completed successfully (${duration}ms)`);

    const response = NextResponse.json<ChatResponseBody>({ reply, conversationId });

    // Set session cookie if it doesn't exist
    const cookieStore = cookies();
    if (!cookieStore.get(SESSION_COOKIE_NAME)) {
      response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[api/chat] Request failed after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { error: "خطای داخلی سرور. لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}


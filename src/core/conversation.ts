import { randomUUID } from "crypto";
import {
  SYSTEM_PROMPT,
  generateConversationTitle,
  generateLLMReply,
  type ChatMessage,
} from "@/core/llm";
import { detectAgent } from "@/core/agents/router";
import { handleBusinessAgent } from "@/core/agents/business";
import { handleContentAgent } from "@/core/agents/content";
import { handleMarketingAgent } from "@/core/agents/marketing";
import { handleStartupAgent } from "@/core/agents/startup";
import { handleTechAgent } from "@/core/agents/tech";
import { detectToolInvocation, runTool } from "@/core/tools";
import { prisma } from "@/lib/prisma";
import { MessageChannel, MessageRole, MessageSource } from "@prisma/client";

export type Channel = "WEB" | "TELEGRAM";

interface HandleUserMessageParams {
  userIdentifier: {
    telegramId?: string;
    email?: string;
    clientId?: string;
  };
  channel: Channel;
  message: string;
  conversationId?: string | null;
}

const channelMap: Record<Channel, MessageChannel> = {
  WEB: MessageChannel.WEB,
  TELEGRAM: MessageChannel.TELEGRAM,
};

const sanitizeMessage = (message: string) => message.trim();

const generateClientId = (seed?: string) =>
  seed ??
  (typeof randomUUID === "function"
    ? randomUUID()
    : `client-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const upsertUser = async (identifier: HandleUserMessageParams["userIdentifier"]) => {
  const { telegramId, email, clientId } = identifier;

  if (telegramId) {
    const cid = generateClientId(clientId ?? telegramId);
    return prisma.user.upsert({
      where: { telegramId },
      update: { clientId: cid },
      create: { telegramId, clientId: cid },
    });
  }

  if (email) {
    const cid = generateClientId(clientId ?? email);
    return prisma.user.upsert({
      where: { email },
      update: { clientId: cid },
      create: { email, clientId: cid },
    });
  }

  if (clientId) {
    return prisma.user.upsert({
      where: { clientId },
      update: {},
      create: { clientId },
    });
  }

  return prisma.user.create({ data: { clientId: generateClientId() } });
};

const SYSTEM_PROMPT = `You are Ario AI, a helpful Persian AI assistant designed for Iranian users. You provide friendly, accurate, and culturally-aware responses in Persian (Farsi). You help with daily life questions, cultural information, and general assistance. Always respond in Persian unless the user explicitly asks in another language.`;

export async function handleUserMessage(
  params: HandleUserMessageParams,
): Promise<{ reply: string; conversationId: string }> {
  const trimmedMessage = sanitizeMessage(params.message);

  if (!trimmedMessage) {
    throw new Error("Message cannot be empty");
  }

  console.log(`[conversation] Handling message (channel: ${params.channel}, length: ${trimmedMessage.length})`);

  const user = await upsertUser(params.userIdentifier);

  const resolveConversation = async () => {
    const { conversationId } = params;

    if (conversationId) {
      const existing = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (existing) return existing;
    }

    return prisma.conversation.create({
      data: {
        userId: user.id,
        channel: channelMap[params.channel],
        title: null,
        isActive: true,
      },
    });
  };

  const conversation = await resolveConversation();

  await prisma.message.create({
    data: {
      userId: user.id,
      conversationId: conversation.id,
      role: MessageRole.USER,
      channel: channelMap[params.channel],
      content: trimmedMessage,
    },
  });

  const conversationMessages = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: { createdAt: "asc" },
  });

  const chatMessages: ChatMessage[] = conversationMessages.map((m) => ({
    role: m.role === MessageRole.USER ? "user" : "assistant",
    content: m.content,
  }));

  const toolInvocation = detectToolInvocation(trimmedMessage);

  if (toolInvocation) {
    let toolReply: string;

    try {
      toolReply = await runTool(toolInvocation, {
        conversationMessages: chatMessages,
      });
    } catch (error) {
      console.error("[conversation] Tool execution failed", error);
      toolReply = "در اجرای ابزار درخواستی مشکلی پیش آمد.";
    }

    await prisma.message.create({
      data: {
        userId: user.id,
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        channel: channelMap[params.channel],
        source:
          toolInvocation.name === "calc"
            ? MessageSource.TOOL_CALC
            : toolInvocation.name === "summarize"
              ? MessageSource.TOOL_SUMMARIZE
              : MessageSource.TOOL_PLAN,
        content: toolReply,
      },
    });

    return { reply: toolReply, conversationId: conversation.id };
  }

  const agentType = detectAgent(trimmedMessage);
  const memory = conversation.summary ?? null;
  try {
    let agentReply: string | null = null;
    switch (agentType) {
      case "startup":
        agentReply = await handleStartupAgent({ topic: trimmedMessage, memory });
        break;
      case "tech":
        agentReply = await handleTechAgent({ topic: trimmedMessage, memory });
        break;
      case "marketing":
        agentReply = await handleMarketingAgent({ topic: trimmedMessage, memory });
        break;
      case "business":
        agentReply = await handleBusinessAgent({ topic: trimmedMessage, memory });
        break;
      case "content":
        agentReply = await handleContentAgent({ topic: trimmedMessage, memory });
        break;
      default:
        agentReply = await handleStartupAgent({ topic: trimmedMessage, memory });
        break;
    }

    if (agentReply) {
      await prisma.message.create({
        data: {
          userId: user.id,
          conversationId: conversation.id,
          role: MessageRole.ASSISTANT,
          channel: channelMap[params.channel],
          source:
            agentType === "startup"
              ? MessageSource.AGENT_STARTUP
              : agentType === "tech"
                ? MessageSource.AGENT_TECH
                : agentType === "marketing"
                  ? MessageSource.AGENT_MARKETING
                  : agentType === "business"
                    ? MessageSource.AGENT_BUSINESS
                    : MessageSource.AGENT_CONTENT,
          content: agentReply,
        },
      });

      return { reply: agentReply, conversationId: conversation.id };
    }
  } catch (error) {
    console.error("[conversation] Agent handling failed, falling back to main LLM", error);
  }

  const recentMessages = await prisma.message.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: { createdAt: "asc" },
    take: 15,
  });

  const llmMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...recentMessages.map((m) => ({
      role: m.role === MessageRole.USER ? "user" : "assistant",
      content: m.content,
    })),
  ];

  let replyText: string;

  try {
    replyText = await generateLLMReply({ messages: llmMessages });
  } catch (error) {
    console.error("[conversation] LLM call failed", error);
    replyText =
      "\u0645\u062a\u0627\u0633\u0641\u0627\u0646\u0647 \u062f\u0631 \u067e\u0631\u062f\u0627\u0632\u0634 \u067e\u06cc\u0627\u0645 \u0634\u0645\u0627 \u0645\u0634\u06a9\u0644\u06cc \u0631\u062e \u062f\u0627\u062f\u002e \u0644\u0637\u0641\u0627\u064b \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f\u002e";
  }

  await prisma.message.create({
    data: {
      userId: user.id,
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      channel: channelMap[params.channel],
      source: MessageSource.MAIN_LLM,
      content: replyText,
    },
  });

  try {
    const messageCount = await prisma.message.count({
      where: { conversationId: conversation.id },
    });

    if (messageCount === 2) {
      const firstMessages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
      });

      const chatMessages: ChatMessage[] = firstMessages.map((m) => ({
        role: m.role === MessageRole.USER ? "user" : "assistant",
        content: m.content,
      }));

      const title = await generateConversationTitle(chatMessages);

      if (title) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { title },
        });
      }
    }
  } catch (error) {
    console.error("[conversation] failed to generate title", error);
  }

  return { reply: replyText, conversationId: conversation.id };
}

import { randomUUID } from "crypto";
import {
  SYSTEM_PROMPT,
  generateConversationTitle,
  generateLLMReply,
  type ChatMessage,
} from "@/core/llm";
import { generateCompletion } from "@/core/llm/client";
import type { Tone, ResponseMode } from "@/types/chat";
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
  tone?: Tone;
  responseMode?: ResponseMode;
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
    try {
      return await prisma.user.upsert({
        where: { clientId },
        update: {},
        create: { clientId },
      });
    } catch (error) {
      // If upsert fails (e.g., unique constraint), try to find existing user
      const existing = await prisma.user.findUnique({
        where: { clientId },
      });
      if (existing) return existing;
      throw error;
    }
  }

  // Generate a new clientId for anonymous users
  const newClientId = generateClientId();
  try {
    return await prisma.user.create({ data: { clientId: newClientId } });
  } catch (error) {
    // If creation fails (e.g., duplicate), try to find or create with different ID
    console.error("[conversation] Failed to create user, retrying with new ID", error);
    return prisma.user.create({ data: { clientId: generateClientId() } });
  }
};

const getSystemPrompt = (tone: Tone = "default"): string => {
  const basePrompt = "You are Ario AI, a helpful Persian AI assistant designed for Iranian users. Always respond in Persian (Farsi) unless the user explicitly asks in another language.";
  
  switch (tone) {
    case "friendly":
      return `${basePrompt} Use a warm, friendly, and approachable tone while remaining respectful. Be conversational and show empathy.`;
    case "creative":
      return `${basePrompt} Use a creative and imaginative tone. Encourage brainstorming, provide creative ideas, and help with writing and artistic tasks. Be expressive and engaging.`;
    case "technical":
      return `${basePrompt} Use a precise, technical, and detailed tone. Provide comprehensive explanations with technical accuracy. Suitable for programming, engineering, and technical questions.`;
    case "default":
    default:
      return `${basePrompt} Provide professional, structured, and culturally-aware responses. Help with daily life questions, cultural information, and general assistance.`;
  }
};

const getLLMParams = (responseMode: ResponseMode = "auto"): { temperature: number; maxTokens: number; thinkingHint?: string } => {
  switch (responseMode) {
    case "fast":
      return {
        temperature: 0.8,
        maxTokens: 1000,
      };
    case "thinking":
      return {
        temperature: 0.5,
        maxTokens: 3000,
        thinkingHint: "Take your time and reason step-by-step. Think through the problem carefully before responding.",
      };
    case "auto":
    default:
      return {
        temperature: 0.7,
        maxTokens: 2000,
      };
  }
};

export async function handleUserMessage(
  params: HandleUserMessageParams,
): Promise<{ reply: string; conversationId: string }> {
  try {
    const trimmedMessage = sanitizeMessage(params.message);

    if (!trimmedMessage) {
      throw new Error("Message cannot be empty");
    }

    console.log(`[conversation] Handling message (channel: ${params.channel}, length: ${trimmedMessage.length})`);

    const user = await upsertUser(params.userIdentifier);
    console.log(`[conversation] User resolved: ${user.id}`);

    const resolveConversation = async () => {
      const { conversationId } = params;

      if (conversationId) {
        const existing = await prisma.conversation.findFirst({
          where: {
            id: conversationId,
            userId: user.id,
          },
        });
        if (existing) return existing;

        console.warn(
          `[conversation] Conversation ${conversationId} not found or does not belong to user ${user.id}. Creating a new one.`,
        );
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
    console.log(`[conversation] Conversation resolved: ${conversation.id}`);

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

    // Try tool invocation (optional - skip if fails)
    try {
    if (!detectToolInvocation || !runTool) {
      throw new Error("Tool modules not available");
    }
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
    } catch (error) {
      console.error("[conversation] Tool detection failed, skipping", error);
    }

    // Try agent handling (optional - skip if fails)
    try {
      if (!detectAgent || !handleStartupAgent) {
        throw new Error("Agent modules not available");
      }
      const agentType = detectAgent(trimmedMessage);
      const memory = conversation.summary ?? null;
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

    const tone = params.tone || "default";
    const responseMode = params.responseMode || "auto";
    const systemPrompt = getSystemPrompt(tone);
    const llmParams = getLLMParams(responseMode);

    console.log(`[conversation] Using tone: ${tone}, responseMode: ${responseMode}`);

    let systemPromptWithHint = systemPrompt;
    if (llmParams.thinkingHint) {
      systemPromptWithHint = `${systemPrompt}\n\nImportant: ${llmParams.thinkingHint}`;
    }

    const llmMessages: ChatMessage[] = [
      { role: "system", content: systemPromptWithHint },
      ...recentMessages.map((m) => ({
        role: m.role === MessageRole.USER ? "user" : "assistant",
        content: m.content,
      })),
    ];

    let replyText: string;

    try {
      const result = await generateCompletion({
        messages: llmMessages,
        temperature: llmParams.temperature,
        maxTokens: llmParams.maxTokens,
      });
      replyText = result.content.trim();
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[conversation] handleUserMessage failed:", errorMessage);
    if (errorStack) {
      console.error("[conversation] Error stack:", errorStack);
    }
    console.error("[conversation] Full error:", error);
    throw error;
  }
}

import { Telegraf, Context } from "telegraf";
import { handleUserMessage } from "@/core/conversation";

/**
 * Creates a configured Telegram bot instance. We keep all Telegram-specific
 * logic isolated so it can be wired to the API layer (or serverless handler)
 * later without touching the chat UI.
 */
export const createTelegramBot = (botToken: string) => {
  if (!botToken) {
    throw new Error("A Telegram bot token is required");
  }

  const bot = new Telegraf<Context>(botToken);

  bot.start(async (ctx) => {
    await ctx.reply(
      "سلام! به دستیار هوش مصنوعی ایران خوش آمدید.\nWelcome to the Iran AI Assistant preview.",
    );
  });

  bot.on("text", async (ctx) => {
    const incomingText = ctx.message.text ?? "";
    const telegramId = ctx.from?.id ? String(ctx.from.id) : undefined;

    if (!incomingText.trim()) {
      return;
    }

    try {
      const { reply } = await handleUserMessage({
        userIdentifier: { telegramId },
        channel: "TELEGRAM",
        message: incomingText,
      });

      await ctx.reply(reply);
    } catch (error) {
      console.error("[telegram] Failed to process message", error);
      await ctx.reply("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    }
  });

  return bot;
};


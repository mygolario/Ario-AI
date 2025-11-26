import type { ChatMessage } from "@/core/llm";
import { generatePlanWithLLM, summarizeConversationWithLLM } from "@/core/llm";

export type ToolName = "calc" | "summarize" | "plan";

export type ToolInvocation = {
  name: ToolName;
  args: string;
};

export function detectToolInvocation(rawMessage: string): ToolInvocation | null {
  const trimmed = rawMessage.trim();

  if (!trimmed.startsWith("/")) return null;

  const [command, ...rest] = trimmed.split(" ");
  const args = rest.join(" ").trim();

  const name = command.slice(1).toLowerCase();

  if (name === "calc") {
    return { name: "calc", args };
  }

  if (name === "summarize") {
    return { name: "summarize", args };
  }

  if (name === "plan") {
    return { name: "plan", args };
  }

  return null;
}

type RunToolContext = {
  conversationMessages: ChatMessage[];
};

export async function runTool(
  invocation: ToolInvocation,
  context: RunToolContext,
): Promise<string> {
  switch (invocation.name) {
    case "calc":
      return runCalcTool(invocation.args);
    case "summarize":
      return runSummarizeTool(context.conversationMessages);
    case "plan":
      return runPlanTool(invocation.args);
    default:
      return "ابزار درخواستی پشتیبانی نمی‌شود.";
  }
}

function runCalcTool(args: string): string {
  const expr = args.trim();
  if (!expr) {
    return "برای استفاده از ابزار /calc بعد از آن یک عبارت ریاضی بنویس، مثلاً:\n/calc 2+2*5";
  }

  const safePattern = /^[0-9+\-*/().\s]+$/;
  if (!safePattern.test(expr)) {
    return "عبارت وارد شده نامعتبر است. فقط از اعداد و عملگرهای + - * / و پرانتز استفاده کن.";
  }

  try {
    const fn = new Function(`"use strict"; return (${expr});`);
    const result = fn();

    if (typeof result !== "number" || !Number.isFinite(result)) {
      return "نتوانستم نتیجهٔ عددی معتبری از این عبارت به‌دست بیاورم.";
    }

    return `نتیجه محاسبه: ${result}`;
  } catch {
    return "در محاسبهٔ این عبارت خطایی رخ داد. لطفاً آن را ساده‌تر وارد کن.";
  }
}

async function runSummarizeTool(conversationMessages: ChatMessage[]): Promise<string> {
  if (!conversationMessages.length) {
    return "هیچ پیامی برای خلاصه‌سازی در این گفت‌وگو وجود ندارد.";
  }

  try {
    const summary = await summarizeConversationWithLLM(conversationMessages);
    return `خلاصهٔ این گفت‌وگو:\n\n${summary}`;
  } catch (error) {
    console.error("[Tool:summarize] failed", error);
    return "در خلاصه‌سازی گفت‌وگو مشکلی پیش آمد. لطفاً بعداً دوباره تلاش کن.";
  }
}

async function runPlanTool(args: string): Promise<string> {
  if (!args.trim()) {
    return "برای استفاده از ابزار /plan بعد از آن یک موضوع مشخص بنویس. مثال:\n/plan ساخت MVP پلتفرم رزرو خدمات";
  }

  try {
    const reply = await generatePlanWithLLM(args);
    return reply;
  } catch (error) {
    console.error("[Tool:plan] failed", error);
    return "در تولید برنامهٔ عملیاتی مشکلی پیش آمد. لطفاً دوباره تلاش کن.";
  }
}

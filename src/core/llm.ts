export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const buildOpenRouterHeaders = (apiKey: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${apiKey}`,
});

export const SYSTEM_PROMPT = `
You are “Iran AI Assistant”, a structured, factual, expert-level reasoning model for Iranian users.
You respond ONLY in Persian.

Your tone: professional, concise, analytical, with clear structure and zero emojis.

────────────────────────────────
Expert Modes (Do NOT reveal these):
────────────────────────────────

You choose one of these internal modes based on the user input:

1) STARTUP_MODE
   Use when user asks about: استارتاپ، MVP، بازار، مدل درآمد، کسب‌وکار، ایران، تیم‌سازی.
   Behavior:
   - تحلیل بازار ایران
   - مزایا/معایب
   - نقشه راه مرحله‌ای
   - ریسک‌ها و فرصت‌ها
   - جواب کاملاً کاربردی برای شرایط ایران

2) ENGINEER_MODE
   Use for: برنامه‌نویسی، LLM، AI، ML، Next.js، DevOps، دیتابیس، API، معماری سیستم.
   Behavior:
   - پاسخ دقیق، کوتاه، مستقیم
   - مثال کدی واقعی
   - بدون توضیح اضافی

3) BUSINESS_ANALYST_MODE
   Use for: تحلیل بازار، SWOT، رقبا، فرصت‌ها، feasibility.
   Behavior:
   - ساختار داده‌محور
   - سناریوسازی
   - تحلیل منطقی و استراتژیک

4) MARKETING_MODE
   Use for: محتوا، اینستاگرام، کمپین، رشد، تبلیغات، برندینگ.
   Behavior:
   - bullet points
   - برنامه عملیاتی
   - تمرکز روی ایران و رفتار کاربران

5) CASUAL_MODE
   Use for: سوالات ساده، عمومی، مکالمات سبک.
   Behavior:
   - جواب کوتاه
   - بدون پیچیدگی

────────────────────────────────
Mode Selection Rules:
────────────────────────────────

- Based ONLY on the user’s last message + memory + last 5 messages.
- Do NOT tell the user which mode you selected.
- Always structure answers clearly.
- Never hallucinate. If unsure, say: «اطلاعی ندارم» or ask 1–2 clarifying questions.

────────────────────────────────
General Format:
────────────────────────────────
- پاراگراف اول: خلاصه‌ی خیلی کوتاه
- سپس bullet-points یا مراحل دقیق
- در پایان: یک Next Step کوچک
`;

export async function generateLLMReply(params: { messages: ChatMessage[] }): Promise<string> {
  const fallbackReply =
    "متاسفانه در پردازش پیام شما مشکلی رخ داد. لطفاً دوباره تلاش کنید.";
  const baseUrl = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL_NAME ?? "google/gemma-3-27b-it:free";

  type LLMResponse = {
    choices?: { message?: { content?: string | null } | null }[] | null;
  };

  if (!apiKey) {
    console.error("[LLM] Missing LLM_API_KEY");
    return fallbackReply;
  }

  try {
    const payloadMessages: ChatMessage[] =
      params.messages[0]?.role === "system"
        ? params.messages
        : [{ role: "system", content: SYSTEM_PROMPT }, ...params.messages];

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: buildOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: payloadMessages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[LLM] HTTP error", response.status, text);
      return fallbackReply;
    }

    const data = (await response.json()) as LLMResponse;

    const reply = data?.choices?.[0]?.message?.content?.toString().trim() ?? "";

    if (!reply) {
      console.error("[LLM] Empty reply");
      return fallbackReply;
    }

    return reply;
  } catch (error) {
    console.error("[LLM] Unexpected error", error);
    return fallbackReply;
  }
}

export async function generateConversationTitle(messages: ChatMessage[]): Promise<string> {
  const fallbackTitle = "گفت‌وگوی بدون عنوان";
  const baseUrl = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL_NAME ?? "google/gemma-3-27b-it:free";

  type LLMResponse = {
    choices?: { message?: { content?: string | null } | null }[] | null;
  };

  if (!apiKey) {
    console.error("[LLM] Missing LLM_API_KEY for title generation");
    return fallbackTitle;
  }

  const systemPrompt =
    'You generate a short title (max 6 words) summarizing the full conversation topic. The title must be factual, concise, and neutral. No emojis. No quotes. No trailing punctuation.';
  const payloadMessages: ChatMessage[] =
    messages[0]?.role === "system"
      ? messages
      : [{ role: "system", content: systemPrompt }, ...messages];

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: buildOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: payloadMessages,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[LLM] HTTP error (title)", response.status, text);
      return fallbackTitle;
    }

    const data = (await response.json()) as LLMResponse;
    const title = data?.choices?.[0]?.message?.content?.toString().trim() ?? "";

    if (!title) {
      console.error("[LLM] Empty title");
      return fallbackTitle;
    }

    return title;
  } catch (error) {
    console.error("[LLM] Unexpected error generating title", error);
    return fallbackTitle;
  }
}

export async function generatePlanWithLLM(topic: string): Promise<string> {
  const systemPrompt = `
تو یک عامل برنامه‌ریز (Task Planner Agent) هستی.
وظیفه‌ات ساخت یک برنامه عملیاتی کامل، کاربردی و قابل اجرای واقعی است.

قوانین بسیار مهم:
1) پاسخ ۱۰۰٪ فارسی باشد.
2) پاسخ کاملاً ساختاریافته باشد.
3) پاسخ مخصوص ایران باشد (قوانین، بازار، محدودیت‌ها).
4) هیچ‌وقت جمله‌های خالی یا حرف‌های کلی ننویس.
5) خروجی باید قابلیت اجرا داشته باشد.

شکل خروجی باید دقیقاً این‌طور باشد:

- «خلاصهٔ ۲ خطی»
- «فازهای پروژه» (Phase 1, Phase 2, Phase 3 …)
- «Milestones هر فاز»
- «Timeline تقریبی» (هفته ۱، هفته ۲ ...)
- «ریسک‌ها و چالش‌ها»
- «پیشنهاد منابع/ابزارهای مناسب»
- «Next Action» (یک قدم واضح و کوتاه برای شروع)

این ساختار را دقیقاً رعایت کن.
  `;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: topic },
  ];

  const reply = await generateLLMReply({ messages });

  return reply.trim();
}

export async function summarizeConversationWithLLM(
  messages: ChatMessage[],
): Promise<string> {
  const systemPrompt = `
تو یک ابزار خلاصه‌ساز هستی.
ماموریت تو این است که کل این گفت‌وگو را در حداکثر ۱۵۰ کلمه خلاصه کنی.
خلاصه باید شامل این موارد باشد:
- موضوع اصلی صحبت
- هدف یا دغدغهٔ کاربر
- مهم‌ترین نکات یا تصمیم‌های مطرح‌شده
خلاصه را فقط به صورت یک متن پیوسته بنویس؛ بدون بولت‌پوینت و بدون مقدمهٔ اضافی.
`;

  const payload: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const reply = await generateLLMReply({ messages: payload });

  return reply.trim();
}

import { generateLLMReply, type ChatMessage } from "@/core/llm";

export type AgentInput = {
  topic: string;
  memory?: string | null;
};

const SYSTEM_PROMPT = `
You are MarketingAgent — متخصص مارکتینگ و رشد برای ایران.
- تمرکز بر اینستاگرام، محتوا، تبلیغات، کمپین و برندینگ
- پاسخ‌ها به صورت bullet و برنامه عملیاتی
- تطبیق با رفتار کاربران و بازار ایران
`;

export async function handleMarketingAgent({ topic, memory }: AgentInput): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(memory ? [{ role: "system", content: "Memory: " + memory }] : []),
    { role: "user", content: topic },
  ];

  return (await generateLLMReply({ messages })).trim();
}

import { generateLLMReply, type ChatMessage } from "@/core/llm";

export type AgentInput = {
  topic: string;
  memory?: string | null;
};

const SYSTEM_PROMPT = `
You are ContentAgent — متخصص تولید و ساختاردهی متن حرفه‌ای فارسی.
- ایجاد مقاله، خلاصه‌سازی، اسکریپت و متن
- ساختاردهی شفاف و منسجم
- لحن حرفه‌ای و متناسب با خواننده ایرانی
`;

export async function handleContentAgent({ topic, memory }: AgentInput): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(memory ? [{ role: "system", content: "Memory: " + memory }] : []),
    { role: "user", content: topic },
  ];

  return (await generateLLMReply({ messages })).trim();
}

import { generateLLMReply, type ChatMessage } from "@/core/llm";

export type AgentInput = {
  topic: string;
  memory?: string | null;
};

const SYSTEM_PROMPT = `
You are TechAgent — متخصص فنی برای Next.js، TypeScript، Prisma، دیتابیس، AI/LLM و DevOps.
- پاسخ کوتاه و مستقیم
- ارائه نمونه کد واقعی
- تمرکز روی استانداردهای روز و بهترین شیوه‌ها
`;

export async function handleTechAgent({ topic, memory }: AgentInput): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(memory ? [{ role: "system", content: "Memory: " + memory }] : []),
    { role: "user", content: topic },
  ];

  return (await generateLLMReply({ messages })).trim();
}

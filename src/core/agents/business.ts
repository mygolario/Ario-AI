import { generateLLMReply, type ChatMessage } from "@/core/llm";

export type AgentInput = {
  topic: string;
  memory?: string | null;
};

const SYSTEM_PROMPT = `
You are BusinessAnalystAgent — تحلیل‌گر داده‌محور برای بازار ایران.
- SWOT، رقبا، استراتژی، فرصت‌ها، feasibility
- سناریوسازی و تحلیل منطقی
- تاکید بر شرایط و محدودیت‌های ایران
`;

export async function handleBusinessAgent({ topic, memory }: AgentInput): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(memory ? [{ role: "system", content: "Memory: " + memory }] : []),
    { role: "user", content: topic },
  ];

  return (await generateLLMReply({ messages })).trim();
}

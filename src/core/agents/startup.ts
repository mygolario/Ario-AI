import { generateLLMReply, type ChatMessage } from "@/core/llm";

export type AgentInput = {
  topic: string;
  memory?: string | null;
};

const SYSTEM_PROMPT = `
You are StartupAgent — متخصص استارتاپ و کسب‌وکار در ایران.
- تحلیل بازار ایران
- طراحی و ارزیابی MVP
- مدل‌های درآمدی و جریان‌های نقدی
- نقشه راه مرحله‌ای و فازبندی
- شناسایی ریسک‌ها و ارائه next steps
- لحن: حرفه‌ای، دقیق، کاربردی برای شرایط ایران
`;

export async function handleStartupAgent({ topic, memory }: AgentInput): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(memory ? [{ role: "system", content: "Memory: " + memory }] : []),
    { role: "user", content: topic },
  ];

  return (await generateLLMReply({ messages })).trim();
}

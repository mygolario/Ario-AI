export type AgentType = "startup" | "tech" | "marketing" | "business" | "content";

export function detectAgent(userMessage: string): AgentType {
  const lower = userMessage.toLowerCase();

  if (
    lower.includes("استارتاپ") ||
    lower.includes("mvp") ||
    lower.includes("بیزنس") ||
    lower.includes("کسب") ||
    lower.includes("بازار") ||
    lower.includes("درآمد")
  ) {
    return "startup";
  }

  if (
    lower.includes("nextjs") ||
    lower.includes("react") ||
    lower.includes("prisma") ||
    lower.includes("llm") ||
    lower.includes("ai") ||
    lower.includes("devops") ||
    lower.includes("server")
  ) {
    return "tech";
  }

  if (
    lower.includes("اینستاگرام") ||
    lower.includes("بازاریابی") ||
    lower.includes("محتوا") ||
    lower.includes("تبلیغات") ||
    lower.includes("کمپین")
  ) {
    return "marketing";
  }

  if (
    lower.includes("تحلیل") ||
    lower.includes("swot") ||
    lower.includes("رقبا") ||
    lower.includes("فرصت") ||
    lower.includes("استراتژی")
  ) {
    return "business";
  }

  if (
    lower.includes("مقاله") ||
    lower.includes("متن") ||
    lower.includes("خلاصه") ||
    lower.includes("اسکریپت")
  ) {
    return "content";
  }

  return "startup";
}

export type Tone = "default" | "friendly" | "creative" | "technical";
export type ResponseMode = "auto" | "fast" | "thinking";

export type ChatRequestBody = {
  message: string;
  conversationId?: string | null;
  clientId?: string | null;
  tone?: Tone;
  responseMode?: ResponseMode;
};

export type ChatResponseBody = {
  reply: string;
  conversationId: string;
};


export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface GenerateCompletionParams {
  messages: ChatMessage[];
  model?: string;
}

export interface GenerateCompletionResult {
  content: string;
  model?: string;
}


export type ChatRequestBody = {
  message: string;
  conversationId?: string | null;
  clientId?: string | null;
};

export type ChatResponseBody = {
  reply: string;
  conversationId: string;
};


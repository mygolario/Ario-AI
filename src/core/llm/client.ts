import "@/config/init"; // Validate environment on import
import type {
  GenerateCompletionParams,
  GenerateCompletionResult,
} from "./types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "deepseek/deepseek-r1:free"; // Free tier model

export async function generateCompletion(
  params: GenerateCompletionParams,
): Promise<GenerateCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const model = params.model || DEFAULT_MODEL;
  const messageCount = params.messages.length;

  console.log(`[LLM] Starting completion request (model: ${model}, messages: ${messageCount})`);

  const startTime = Date.now();

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.APP_BASE_URL || "http://localhost:3000",
        "X-Title": "Ario AI",
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const duration = Date.now() - startTime;
      console.error(`[LLM] API error after ${duration}ms: ${response.status} ${response.statusText}`);
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      const duration = Date.now() - startTime;
      console.error(`[LLM] Invalid response format after ${duration}ms`);
      throw new Error("Invalid response format from OpenRouter API");
    }

    const duration = Date.now() - startTime;
    const contentLength = data.choices[0].message.content?.length || 0;
    console.log(`[LLM] Completion successful (${duration}ms, ${contentLength} chars)`);

    return {
      content: data.choices[0].message.content || "",
      model: data.model || model,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[LLM] Completion failed after ${duration}ms:`, error instanceof Error ? error.message : "Unknown error");
    throw error;
  }
}


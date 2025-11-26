import { getEnv } from "./env";

// Validate environment variables (lazy validation - only when called)
// This will throw if required env vars are missing
export function validateEnvironment() {
  try {
    getEnv();
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Environment validation failed:", error.message);
      console.error("\nPlease check your .env file and ensure all required variables are set.");
      console.error("See .env.example for reference.");
    }
    throw error;
  }
}

// Note: We don't auto-validate on import anymore to allow the app to start
// even if env vars are missing. Validation happens lazily when LLM is called.


import { getEnv } from "./env";

// Validate environment variables at module load time
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

// Auto-validate on import (for server-side code)
if (typeof window === "undefined") {
  validateEnvironment();
}


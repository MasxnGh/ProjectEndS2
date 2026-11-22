// Loads .env.local and friends the way `next dev` does, so the eval finds
// GEMINI_API_KEY without the key ever being written into a command line.
import { loadEnvConfig } from "@next/env";

// Vitest sets NODE_ENV=test, and in test mode Next deliberately skips
// .env.local. The eval wants the same keys the dev server uses, so it loads
// them as development and then puts NODE_ENV back.
const env = process.env as Record<string, string | undefined>;
const nodeEnv = env.NODE_ENV;
env.NODE_ENV = "development";
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error }, true);
env.NODE_ENV = nodeEnv;

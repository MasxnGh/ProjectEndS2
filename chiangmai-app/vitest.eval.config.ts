import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

// The AI eval calls Gemini for real, so it lives outside the normal test run
// (`*.eval.ts` is not matched by vitest's default include). Run it with
// `npm run eval:ai`; see src/lib/ai/eval/run.eval.ts for its settings.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["src/lib/ai/eval/**/*.eval.ts"],
      setupFiles: ["src/lib/ai/eval/load-env.ts"],
      // One run is dozens of calls of up to a minute each.
      testTimeout: 6 * 60 * 60_000,
    },
  })
);

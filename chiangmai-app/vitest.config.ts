import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` throws on import outside a React Server Component, which
      // is exactly its job in the Next build — but it also blocks vitest from
      // loading server modules whose pure logic we want to test. Stubbing it
      // here keeps the real guard in place where it matters.
      "server-only": path.resolve(__dirname, "./src/test/server-only-stub.ts"),
    },
  },
});

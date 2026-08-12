// Stand-in for the `server-only` package under vitest — see vitest.config.ts.
// The real package throws on import outside a React Server Component, which is
// the protection we want in the Next build and an obstacle in a unit test.
export {};

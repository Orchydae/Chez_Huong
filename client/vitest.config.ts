import { defineConfig } from 'vitest/config';

// Unit tests only cover PURE modules (lib/ helpers + the api error policy), so
// the default node environment is enough — no jsdom, no React Testing Library.
// Hooks/components (e.g. useRecipeLike) would need a jsdom env + providers and
// are intentionally out of scope here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

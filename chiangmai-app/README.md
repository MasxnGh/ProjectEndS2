This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

For the optional API keys (map tiles, routing, photo fetching, AI planning) and how to set them up locally and on Vercel, see [docs/setup.md](docs/setup.md).

## Plan with AI

With an AI key set, the Trip Planner gains a **Plan with AI** panel: describe the
trip you want in Thai or English and it assembles a day plan.

Two providers are supported behind one interface — Google Gemini
(`GEMINI_API_KEY`, the default, free) and Anthropic Claude
(`ANTHROPIC_API_KEY`, paid). Both are sent the **same system prompt and the same
place catalogue**, so setting `AI_PROVIDER` to one or the other compares the
models rather than two different prompts. Adding a third provider means
implementing one `generate()` method — every guarantee below is applied
afterwards, in shared code, and is inherited for free.

The division of labour is deliberate. The model does the part only a language
model can — reading "temples and a Michelin restaurant, ฿1,000, make one day
count" and choosing which of the site's places fit. It returns **nothing but an ordered
list of place slugs**; it never computes a time, a distance, or a total. Those
come from the planner's existing `buildSchedule`, `estimateTravelMinutes`, and
`categorySpendBreakdown`, so the preview shows the same numbers the board will
show once you apply the plan, and a place the catalogue doesn't contain cannot
appear at all. Anything the model couldn't satisfy — a budget that doesn't
stretch, a cuisine the city doesn't have — is reported back rather than quietly
dropped.

Keys are read server-side only; requests go through `/api/ai/plan-trip`, which is
rate-limited because each call spends a real quota — money on Anthropic, free-tier
requests on Gemini. See [docs/setup.md](docs/setup.md) for costs and limits.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

import { collectUserData } from "@/lib/db/account-data";
import { requireUserId, unauthorizedResponse, rateLimitResponse } from "@/lib/api-auth";

/**
 * "Download my data" — everything stored about the signed-in user, as JSON.
 *
 * Served as an attachment so the browser saves a file instead of rendering it,
 * and marked no-store so a copy of someone's personal data never sits in a
 * shared or proxy cache.
 */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorizedResponse();

  const limited = rateLimitResponse(`account:export:${userId}`, { max: 5, windowMs: 60_000 });
  if (limited) return limited;

  const data = await collectUserData(userId);
  const filename = `chiangmai-journey-data-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

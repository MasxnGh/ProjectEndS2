import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionState } from "@/lib/session-state";
import { collectUserData } from "@/lib/db/account-data";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { AccountActions } from "@/components/account/account-actions";
import { AccountUnavailable } from "@/components/brand/account-unavailable";
import { PageHead } from "@/components/brand/page-head";
import { Wrap } from "@/components/brand/surface";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    ...buildPageMetadata({
      locale,
      path: "/account",
      title: dict.account.title,
      description: dict.account.intro,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const dict = getDictionary(loc);
  const t = dict.account;

  const unavailable = (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <Wrap className="max-w-[calc(760px+4rem)]">
        <PageHead title={t.title} intro={t.intro} />
        <AccountUnavailable dict={dict} retryHref={`/${loc}/account`} />
      </Wrap>
    </div>
  );

  const sessionState = await getSessionState();
  if (sessionState.status === "unavailable") return unavailable;
  if (sessionState.status === "signed-out") {
    redirect(`/${loc}/login?callbackUrl=${encodeURIComponent(`/${loc}/account`)}`);
  }
  const { userId } = sessionState;

  // Read through the same function the export uses, so this page shows
  // exactly what the download contains — no second inventory to drift. The
  // session was just confirmed, so a failure here is the database dropping
  // out mid-request: same answer as above, not a crash page.
  let data: Awaited<ReturnType<typeof collectUserData>>;
  try {
    data = await collectUserData(userId);
  } catch {
    return unavailable;
  }

  const rows: { label: string; value: string }[] = [
    { label: t.fields.name, value: (data.account?.name as string) ?? "—" },
    { label: t.fields.email, value: (data.account?.email as string) ?? "—" },
    { label: t.fields.image, value: (data.account?.image as string) ?? "—" },
    { label: t.fields.userId, value: (data.account?.id as string) ?? "—" },
    { label: t.fields.trips, value: String(data.trips.length) },
    { label: t.fields.favorites, value: String(data.favorites.length) },
    {
      label: t.fields.signInLinks,
      value: data.signInRecords.map((record) => String(record.provider)).join(", ") || "—",
    },
  ];

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <Wrap className="max-w-[calc(760px+4rem)]">
        <PageHead title={t.title} intro={t.intro} />

        <section aria-labelledby="account-stored" className="grid gap-2 pb-10">
          <h2 id="account-stored" className="text-title font-semibold text-brand">
            {t.storedTitle}
          </h2>
          <p className="max-w-[60ch] text-body text-pretty text-ink-soft">{t.storedIntro}</p>
          <dl className="mt-4 divide-y divide-line rounded-lg border border-line bg-panel shadow-float">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-baseline sm:gap-6">
                <dt className="text-small text-ink-soft">{row.label}</dt>
                <dd className="min-w-0 text-body break-words text-ink tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 max-w-[68ch] text-small text-pretty text-ink-soft">{t.tokenNote}</p>
        </section>

        <AccountActions locale={loc} />
      </Wrap>
    </div>
  );
}

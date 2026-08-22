import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { collectUserData } from "@/lib/db/account-data";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { AccountActions } from "@/components/account/account-actions";
import { Reveal } from "@/components/reveal";

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

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/${loc}/login?callbackUrl=${encodeURIComponent(`/${loc}/account`)}`);
  }

  // Read through the same function the export uses, so this page shows
  // exactly what the download contains — no second inventory to drift.
  const data = await collectUserData(userId);

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
    <div className="mx-auto max-w-3xl px-6 py-16 lg:px-10 lg:py-20">
      <Reveal as="div">
        <h1 className="font-serif-display text-4xl leading-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">{t.intro}</p>
      </Reveal>

      <Reveal as="div" delay={0.08} className="mt-12">
        <h2 className="font-serif-display text-2xl">{t.storedTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">{t.storedIntro}</p>
        <dl className="mt-6 divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-5 py-4">
              <dt className="w-40 shrink-0 text-sm text-muted-foreground">{row.label}</dt>
              <dd className="min-w-0 flex-1 break-words text-sm">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground text-pretty">{t.tokenNote}</p>
      </Reveal>

      <AccountActions locale={loc} />
    </div>
  );
}

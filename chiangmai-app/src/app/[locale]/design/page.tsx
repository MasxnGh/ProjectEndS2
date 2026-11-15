import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Camera, Clock, Heart, MapPin, Plus, Share2 } from "lucide-react";
import { places, getPlaceBySlug } from "@/data/places";
import { isLocale, getDictionary } from "@/i18n";
import { Badge } from "@/components/brand/badge";
import { Button, ButtonLink } from "@/components/brand/button";
import { CategoryTile } from "@/components/brand/category-tile";
import { ChipLink, ChipRow } from "@/components/brand/chip";
import { IconButton } from "@/components/brand/icon-button";
import { Brush, CATEGORY_ORDER, categoryIcon, ICON_STROKE, Sparkle } from "@/components/brand/icons";
import { BrandMark, Logo } from "@/components/brand/logo";
import { PlaceCardFor } from "@/components/brand/place-card";
import { NoPhoto, PhotoCredit, PlacePhoto } from "@/components/brand/place-photo";
import { fill } from "@/components/brand/place-text";
import { SearchField } from "@/components/brand/search-field";
import { SectionHeading } from "@/components/brand/section-heading";
import { Box, Tip, Wrap } from "@/components/brand/surface";
import { ChipDemo, FavoriteDemo } from "./demos";

/*
 * The rebuild's component sheet: every brand component, filled with real data,
 * in whichever theme the visitor has chosen. It is a working surface for
 * review, so it exists only in development and is never indexed.
 */
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

const PALETTE = [
  ["Chiang Mai Green", "--cmj-green", "#1D3835"],
  ["Nature Leaf", "--cmj-leaf", "#8AA189"],
  ["Lanna Sand", "--cmj-sand", "#EFD3B1"],
  ["Sunset Orange", "--cmj-sunset", "#EB9D56"],
  ["Sky Lavender", "--cmj-lavender", "#BDADD9"],
  ["Ink", "--cmj-ink", "#17221F"],
  ["Paper", "--cmj-paper", "#F9F3F0"],
  ["Mist", "--cmj-mist", "#ECE6E3"],
] as const;

const ROLES = [
  ["page", "--cmj-page"],
  ["panel", "--cmj-panel"],
  ["well", "--cmj-well"],
  ["ink", "--cmj-text"],
  ["ink-soft", "--cmj-text-soft"],
  ["brand", "--cmj-brand"],
  ["sand-fill", "--cmj-sand-fill"],
  ["leaf-fill", "--cmj-leaf-fill"],
  ["forest", "--cmj-forest"],
  ["spark", "--cmj-spark"],
] as const;

function Block({ title, note, children, wide }: { title: string; note?: string; children: ReactNode; wide?: boolean }) {
  return (
    <Box className={wide ? "grid gap-5 p-6 lg:col-span-2 sm:p-8" : "grid content-start gap-5 p-6 sm:p-8"}>
      <h2 className="text-title text-brand">{title}</h2>
      {children}
      {note ? <p className="text-small text-ink-soft">{note}</p> : null}
    </Box>
  );
}

export default async function DesignSheetPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.ui;

  const counts = Object.fromEntries(
    CATEGORY_ORDER.map((c) => [c, places.filter((p) => p.category === c).length]),
  ) as Record<(typeof CATEGORY_ORDER)[number], number>;
  const withPhoto = getPlaceBySlug("wat-phra-that-doi-suthep")!;
  const withoutPhoto = getPlaceBySlug("khao-soi-khun-yai")!;
  const inTheWalls = getPlaceBySlug("wat-chedi-luang")!;
  const favLabel = (name: string) => dict.favorites.addTo.replace("{place}", name);

  return (
    <div data-brand className="bg-page pb-24 font-brand text-body text-ink">
      <Wrap className="grid gap-3 pt-12 pb-10">
        <p className="text-small text-ink-soft">Phase 2 · DESIGN.md</p>
        <h1 className="text-headline text-brand">ระบบดีไซน์ · Design system</h1>
        <p className="max-w-[70ch] text-ink-soft">
          ทุกชิ้นในหน้านี้คือ component จริงจาก <code className="text-small">src/components/brand</code>{" "}
          ใช้ข้อมูลจริงจากแอป สลับธีมมืดด้วยปุ่มธีมของเว็บได้ หน้านี้มีเฉพาะตอนพัฒนา
        </p>
      </Wrap>

      <Wrap className="grid gap-6 lg:grid-cols-2">
        <Block title="โลโก้ · Logo" note="เครื่องหมายภูเขากับประกายจากบอร์ด วาดใหม่เป็น SVG เมื่อได้ไฟล์จริงเปลี่ยนแค่ path">
          <div className="flex flex-wrap items-center gap-8">
            <Logo href={`/${locale}`} label={t.logoHome} />
            <BrandMark className="w-24 text-brand" />
          </div>
          <div className="flex items-center gap-6 rounded-lg bg-forest p-6">
            <Logo href={`/${locale}`} label={t.logoHome} tone="sand" />
            <span className="text-small text-on-forest-soft">บนแถบสีป่า (footer)</span>
          </div>
        </Block>

        <Block title="สี · Colour" note="สีรองทั้งสี่เป็นพื้นและเครื่องหมายเท่านั้น ตัวอักษรบนพื้นสว่างเป็นเขียวหรือหมึกเสมอ">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4">
            {PALETTE.map(([name, v, hex]) => (
              <li key={v} className="grid gap-1.5 text-credit text-ink-soft">
                <span className="size-14 rounded-full ring-1 ring-line ring-inset" style={{ background: `var(${v})` }} />
                <b className="text-small font-medium text-ink">{name}</b>
                <span className="tabular-nums">{hex}</span>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-2">
            {ROLES.map(([name, v]) => (
              <li key={v} className="inline-flex items-center gap-2 rounded-full bg-well py-1 pr-3 pl-1 text-small">
                <span className="size-6 rounded-full ring-1 ring-line ring-inset" style={{ background: `var(${v})` }} />
                {name}
              </li>
            ))}
          </ul>
        </Block>

        <Block title="ตัวอักษร · Prompt" wide>
          <div className="grid gap-4">
            {[
              ["Display 600 · 44–88px", <span key="d" className="text-display text-brand">เชียงใหม่</span>],
              ["Headline 600 · 28–40px", <span key="h" className="text-headline text-brand">ที่ที่เรากลับไปเอง</span>],
              ["Title 500 · 20px", <span key="t" className="text-title">วัดพระธาตุดอยสุเทพ</span>],
              ["Body 400 · 17px / 1.7", <span key="b" className="text-body">เชียงใหม่ใจดีกับคนที่ไม่รีบ ไปไม่กี่ที่ แต่ไปให้ถึงจริงๆ</span>],
              ["Label 500 · 15px", <span key="l" className="text-label">วางแผนทริป</span>],
              ["Small 400 · 14px", <span key="s" className="text-small text-ink-soft">อยู่ราว 2 ชม. · ฿</span>],
              ["Tagline · Latin only, tracked 0.18em", <span key="c" lang="en" className="text-small font-medium tracking-[0.18em] uppercase">Explore • Experience • Enjoy</span>],
              ["Script · Allura, one Latin line per page", <span key="sc" lang="en" className="font-script text-[2.5rem] leading-none text-brand">a journey that stays with you</span>],
            ].map(([label, sample]) => (
              <div key={label as string} className="grid gap-1 border-b border-line pb-3 last:border-0">
                <small className="text-credit text-ink-soft">{label}</small>
                {sample}
              </div>
            ))}
          </div>
          <Brush />
        </Block>

        <Block title="ปุ่ม · Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink href={`/${locale}/planner`} arrow>
              {dict.nav.planner}
            </ButtonLink>
            <Button variant="secondary" arrow>
              {dict.common.viewDetails}
            </Button>
            <Button variant="ghost">{t.seeAll}</Button>
            <Button size="sm" icon={<Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
              {dict.common.addToPlan}
            </Button>
            <Button disabled>{dict.common.addToPlan}</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-forest p-6">
            <Button variant="on-photo" arrow>
              {dict.nav.planner}
            </Button>
          </div>
        </Block>

        <Block title="ปุ่มไอคอน · Icon buttons" note="44px เป็นค่าเริ่ม ทุกปุ่มมีชื่อให้โปรแกรมอ่านหน้าจอ">
          <div className="flex flex-wrap items-center gap-3">
            <IconButton label="แผนที่">
              <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
            <IconButton label="วันที่">
              <CalendarDays aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
            <IconButton label="ภาพ">
              <Camera aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
            <IconButton label="แชร์" tone="plain">
              <Share2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
            <IconButton label="บันทึกแล้ว" pressed>
              <Heart aria-hidden strokeWidth={ICON_STROKE} className="size-5" fill="currentColor" />
            </IconButton>
            <IconButton label="ไปต่อ" tone="brand">
              <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButton>
          </div>
          <ul className="flex flex-wrap gap-3 text-brand" aria-label="ไอคอนหมวดหมู่">
            {CATEGORY_ORDER.map((c) => {
              const Icon = categoryIcon[c];
              return (
                <li key={c} className="grid size-11 place-items-center rounded-full bg-well" title={dict.common.categories[c]}>
                  <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                </li>
              );
            })}
          </ul>
        </Block>

        <Block title="ชิปและช่องค้นหา · Chips and search" wide>
          <ChipDemo
            groupLabel={dict.explore.filters.category}
            allLabel={dict.favorites.filterAll}
            total={places.length}
            items={CATEGORY_ORDER.map((key) => ({ key, label: dict.common.categories[key], count: counts[key] }))}
          />
          <SearchField
            action={`/${locale}/explore`}
            label={t.search.label}
            placeholder={t.search.placeholder}
            submitLabel={t.search.submit}
            className="max-w-xl"
          />
          <div className="grid gap-4 rounded-lg bg-forest p-6">
            <SearchField
              action={`/${locale}/explore`}
              label={t.search.label}
              placeholder={t.search.placeholder}
              submitLabel={t.search.submit}
              className="max-w-xl"
            />
            <ChipRow>
              {(["nature", "temple", "cafe", "market"] as const).map((c) => (
                <ChipLink key={c} tone="on-photo" href={`/${locale}/explore?category=${c}`}>
                  {dict.common.categories[c]}
                </ChipLink>
              ))}
            </ChipRow>
          </div>
        </Block>

        <Block title="ป้าย หัวข้อ และกล่อง · Badges, headings, boxes" wide>
          <div className="flex flex-wrap gap-2">
            <Badge icon={<Clock aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
              {fill(t.stay, { duration: "2 ชม." })}
            </Badge>
            <Badge tone="sand">{dict.common.categories.temple}</Badge>
            <Badge tone="leaf">{dict.common.districts["doi-suthep"]}</Badge>
            <Badge tone="warn">{dict.common.price[3]}</Badge>
            <Badge href={`/${locale}/place/${inTheWalls.slug}`}>{inTheWalls.name[locale]}</Badge>
          </div>
          <SectionHeading action={<ButtonLink href={`/${locale}/explore`} variant="ghost" arrow>{t.seeAll}</ButtonLink>}>
            ที่ที่เรากลับไปเอง
          </SectionHeading>
          <Tip title={dict.common.localTip} headingLevel="h3">
            {withPhoto.localTip[locale]}
          </Tip>
        </Block>

        <Block title="การ์ดสถานที่ · Place cards" note="บรรทัดล่างคือหมวด เวลาที่ใช้ และระดับราคา เป็นข้อมูลจริง แทนคะแนนรีวิวในบอร์ด" wide>
          <div className="grid gap-4 md:grid-cols-2">
            <PlaceCardFor place={withPhoto} locale={locale} dict={dict} favorite={<FavoriteDemo label={favLabel(withPhoto.name[locale])} />} />
            <PlaceCardFor place={withoutPhoto} locale={locale} dict={dict} favorite={<FavoriteDemo label={favLabel(withoutPhoto.name[locale])} />} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[inTheWalls, withoutPhoto, withPhoto].map((p) => (
              <PlaceCardFor key={p.slug} place={p} locale={locale} dict={dict} layout="stack" favorite={<FavoriteDemo label={favLabel(p.name[locale])} />} />
            ))}
          </div>
        </Block>

        <Block title="หมวดหมู่ · Category tiles" note="ห้าหมวดใช้ภาพจริงของสถานที่ในหมวดนั้น สามหมวดที่ยังไม่มีภาพใช้พื้นสีจากพาเลตต์" wide>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {CATEGORY_ORDER.map((c) => (
              <CategoryTile
                key={c}
                category={c}
                href={`/${locale}/explore?category=${c}`}
                name={dict.common.categories[c]}
                countLabel={fill(t.placeCount, { count: counts[c] })}
              />
            ))}
          </div>
        </Block>

        <Block title="ภาพและเมื่อไม่มีภาพ · Photo and no-photo" wide>
          <div className="grid gap-4 sm:grid-cols-3">
            <figure className="grid gap-2">
              <div className="aspect-[4/3] overflow-hidden rounded-lg">
                <PlacePhoto slug="twin-royal-pagodas-inthanon" alt={getPlaceBySlug("twin-royal-pagodas-inthanon")?.name[locale] ?? ""} sizes="(max-width: 640px) 92vw, 400px" grade="golden" />
              </div>
              <figcaption>
                <PhotoCredit slug="twin-royal-pagodas-inthanon" dict={dict} />
              </figcaption>
            </figure>
            <div className="aspect-[4/3] overflow-hidden rounded-lg">
              <NoPhoto icon={categoryIcon[withoutPhoto.category]} caption={dict.common.districts[withoutPhoto.district]} label={t.noPhoto} size="lg" />
            </div>
            <div className="grid content-center gap-3 rounded-lg bg-well p-6">
              <Sparkle className="size-8" />
              <p className="text-small text-ink-soft">{t.noPhoto}</p>
            </div>
          </div>
        </Block>
      </Wrap>
    </div>
  );
}

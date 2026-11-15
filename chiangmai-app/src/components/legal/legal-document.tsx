import { PageHead } from "@/components/brand/page-head";
import { Wrap } from "@/components/brand/surface";

/**
 * Privacy and terms: one reading column, the date it last changed under the
 * title, then plain numbered sections. Nothing on these pages should compete
 * with the words.
 */
export function LegalDocument({
  title,
  intro,
  updatedLabel,
  updatedDate,
  sections,
}: {
  title: string;
  intro: string;
  updatedLabel: string;
  updatedDate: string;
  sections: readonly { heading: string; body: string }[];
}) {
  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <Wrap className="max-w-[calc(720px+4rem)]">
        <PageHead title={title} intro={intro}>
          <p className="text-small text-ink-soft">
            {updatedLabel}: {updatedDate}
          </p>
        </PageHead>

        <ol className="grid gap-8 border-t border-line pt-10">
          {sections.map((section, i) => (
            <li key={section.heading}>
              <section className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                <span aria-hidden className="text-title font-semibold text-brand tabular-nums">
                  {i + 1}.
                </span>
                <div className="grid gap-2">
                  <h2 className="text-title font-semibold text-balance text-brand">{section.heading}</h2>
                  <p className="text-body leading-[1.8] text-pretty text-ink">{section.body}</p>
                </div>
              </section>
            </li>
          ))}
        </ol>
      </Wrap>
    </div>
  );
}

import { cx, focusRing } from "@/components/brand/cx";
import { PageHead } from "@/components/brand/page-head";
import { Wrap } from "@/components/brand/surface";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * Privacy and terms: one reading column, the date it last changed under the
 * title, then plain numbered sections. Nothing on these pages should compete
 * with the words. The last section says whom to write to, with the address
 * as a link.
 */
export function LegalDocument({
  title,
  intro,
  updatedLabel,
  updatedDate,
  sections,
  contact,
}: {
  title: string;
  intro: string;
  updatedLabel: string;
  updatedDate: string;
  sections: readonly { heading: string; body: string }[];
  contact: { heading: string; body: string };
}) {
  const all = [...sections, { heading: contact.heading, body: contact.body, email: true }];
  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <Wrap className="max-w-[calc(720px+4rem)]">
        <PageHead title={title} intro={intro}>
          <p className="text-small text-ink-soft">
            {updatedLabel}: {updatedDate}
          </p>
        </PageHead>

        <ol className="grid gap-8 border-t border-line pt-10">
          {all.map((section, i) => (
            <li key={section.heading}>
              <section className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
                <span aria-hidden className="text-title font-semibold text-brand tabular-nums">
                  {i + 1}.
                </span>
                <div className="grid gap-2">
                  <h2 className="text-title font-semibold text-balance text-brand">{section.heading}</h2>
                  <p className="text-body leading-[1.8] text-pretty text-ink">
                    {section.body}
                    {"email" in section ? (
                      <>
                        {" "}
                        <a
                          href={`mailto:${CONTACT_EMAIL}`}
                          className={cx(
                            "rounded-xs font-medium text-brand underline decoration-[1.5px] underline-offset-4 hover:decoration-2",
                            focusRing,
                          )}
                        >
                          {CONTACT_EMAIL}
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
              </section>
            </li>
          ))}
        </ol>
      </Wrap>
    </div>
  );
}

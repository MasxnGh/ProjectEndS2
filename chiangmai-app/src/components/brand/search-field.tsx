import Form from "next/form";
import { ArrowRight, Search } from "lucide-react";
import { cx } from "./cx";
import { ICON_STROKE } from "./icons";
import { iconButtonStyles } from "./icon-button";

/**
 * The board's search pill: surface pill, search icon on the left, round green
 * submit on the right, float shadow so it holds on a photograph.
 *
 * It is a plain GET form (`next/form`), so it works before JavaScript loads and
 * lands on `action?q=…` — the URL is the state, and the results page reads it.
 */
export function SearchField({
  action,
  name = "q",
  label,
  placeholder,
  submitLabel,
  defaultValue,
  className,
}: {
  /** Where the query goes, e.g. `/${locale}/explore`. */
  action: string;
  name?: string;
  /** Visually hidden label for the input. */
  label: string;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <Form
      action={action}
      role="search"
      className={cx(
        "flex h-14 min-w-0 items-center gap-3 rounded-full border border-line bg-panel pr-1.5 pl-5 text-ink shadow-float",
        "transition-[box-shadow,border-color] duration-150 ease-brand",
        "focus-within:border-brand focus-within:shadow-[var(--cmj-float),0_0_0_3px_color-mix(in_oklab,var(--cmj-brand)_18%,transparent)]",
        className,
      )}
    >
      <Search aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none text-ink-soft" />
      <label className="flex h-full min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <input
          type="search"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent font-brand text-body text-ink outline-none placeholder:text-ink-soft placeholder:opacity-100 [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      <button type="submit" aria-label={submitLabel} title={submitLabel} className={iconButtonStyles({ tone: "brand" })}>
        <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </button>
    </Form>
  );
}

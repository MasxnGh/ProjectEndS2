import { cx, focusRing } from "./cx";

/** The brand text field: a panel box with a hairline that turns green on focus. */
export const textFieldStyles = cx(
  "min-h-12 w-full rounded-md border-[1.5px] border-line-strong bg-panel px-4 font-brand text-body text-ink",
  "transition-colors duration-150 ease-brand hover:border-brand focus-visible:border-brand",
  focusRing,
);

/**
 * The board's map pin: a green teardrop with a paper edge, or the sunset one
 * for "this is where you are looking". Drawn as SVG inside a DOM marker, so it
 * stays crisp and its label can be a number (a stop's order) or nothing.
 */
export function BoardPin({
  tone = "green",
  label,
  size = 34,
}: {
  tone?: "green" | "sunset";
  label?: number | string;
  size?: number;
}) {
  const height = Math.round((size * 42) / 34);
  return (
    <span
      aria-hidden
      className="relative grid justify-items-center drop-shadow-[0_4px_6px_rgb(29_56_53/0.3)]"
      style={{ width: size, height }}
    >
      <svg viewBox="0 0 34 42" width={size} height={height} className="absolute inset-0">
        <path
          d="M17 41s15-13.2 15-24A15 15 0 0 0 2 17c0 10.8 15 24 15 24z"
          fill={tone === "sunset" ? "#eb9d56" : "#1d3835"}
          stroke="#fffcfa"
          strokeWidth="2"
        />
        {label === undefined ? <circle cx="17" cy="16.5" r="5" fill="#fffcfa" /> : null}
      </svg>
      {label !== undefined ? (
        <span
          className="relative pt-[5px] font-brand text-[14px] leading-[1.6] font-semibold tabular-nums"
          style={{ color: tone === "sunset" ? "#142a27" : "#fffcfa" }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

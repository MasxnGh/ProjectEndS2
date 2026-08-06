export function MapPinIcon({
  size = 30,
  emphasized = true,
  className,
  color = "#C9A24B",
  label,
}: {
  size?: number;
  emphasized?: boolean;
  className?: string;
  /** Stroke/fill colour — defaults to the brand champagne gold; the Trip Planner tints this per day. */
  color?: string;
  /** Stop number shown in the pin's head, e.g. a day's visiting order. Omit for the plain dot used on Explore/Place. */
  label?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 32" fill="none" className={className} aria-hidden>
      <path
        d="M12 1C6.48 1 2 5.48 2 11c0 7.5 10 19 10 19s10-11.5 10-19c0-5.52-4.48-10-10-10Z"
        stroke={color}
        strokeWidth={emphasized ? 1.75 : 1.25}
        fill={color}
        fillOpacity={emphasized ? 0.92 : 0.38}
        strokeOpacity={emphasized ? 1 : 0.6}
      />
      <circle
        cx="12"
        cy="11"
        r={label ? 5.25 : 3.25}
        fill={emphasized ? "var(--color-surface)" : "none"}
        stroke={color}
        strokeWidth={emphasized ? 1.5 : 1}
        strokeOpacity={emphasized ? 1 : 0.6}
      />
      {label ? (
        <text
          x="12"
          y="11.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="6.5"
          fontWeight="700"
          fill={color}
          stroke="none"
        >
          {label}
        </text>
      ) : null}
    </svg>
  );
}

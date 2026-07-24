export function MapPinIcon({
  size = 30,
  emphasized = true,
  className,
}: {
  size?: number;
  emphasized?: boolean;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 32" fill="none" className={className} aria-hidden>
      <path
        d="M12 1C6.48 1 2 5.48 2 11c0 7.5 10 19 10 19s10-11.5 10-19c0-5.52-4.48-10-10-10Z"
        stroke="#C9A24B"
        strokeWidth={emphasized ? 1.75 : 1.25}
        fill="#C9A24B"
        fillOpacity={emphasized ? 0.92 : 0.38}
        strokeOpacity={emphasized ? 1 : 0.6}
      />
      <circle
        cx="12"
        cy="11"
        r="3.25"
        fill={emphasized ? "var(--color-surface)" : "none"}
        stroke="#C9A24B"
        strokeWidth={emphasized ? 1.5 : 1}
        strokeOpacity={emphasized ? 1 : 0.6}
      />
    </svg>
  );
}

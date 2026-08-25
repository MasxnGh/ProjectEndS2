export function HeroBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-foreground">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--color-band-accent) 30%, transparent), transparent 60%), radial-gradient(80% 60% at 85% 15%, color-mix(in srgb, #c09a72 26%, transparent), transparent 60%), linear-gradient(180deg, #16212c 0%, #111a23 55%, #0b1117 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />
      <svg
        className="absolute inset-x-0 bottom-0 h-[55%] w-full text-black/40"
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden
      >
        <path
          d="M0 320 L120 260 L220 300 L340 200 L430 260 L520 150 L620 240 L720 120 L820 230 L940 170 L1040 260 L1160 190 L1280 270 L1360 230 L1440 300 L1440 400 L0 400 Z"
          fill="currentColor"
          opacity="0.5"
        />
        <path
          d="M0 360 L100 320 L200 350 L320 280 L420 330 L540 250 L660 320 L780 260 L900 340 L1020 290 L1140 350 L1260 300 L1360 340 L1440 320 L1440 400 L0 400 Z"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1117] via-transparent to-black/30" />
    </div>
  );
}

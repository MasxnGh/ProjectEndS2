"use client";

import { motion, useReducedMotion } from "motion/react";
import type { WeatherIconKey } from "@/lib/weather/types";
import { cn } from "@/lib/utils";

const STROKE = 1.4;

function SunRays({ reduced }: { reduced: boolean }) {
  return (
    <motion.g
      style={{ transformOrigin: "12px 12px" }}
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
    >
      <circle cx="12" cy="12" r="4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line key={deg} x1="12" y1="5.2" x2="12" y2="3.1" transform={`rotate(${deg} 12 12)`} />
      ))}
    </motion.g>
  );
}

function Moon() {
  return <path d="M15.8 4.2a8 8 0 1 0 4 8.4A6.6 6.6 0 0 1 15.8 4.2Z" />;
}

function Cloud({ reduced, delay = 0 }: { reduced: boolean; delay?: number }) {
  return (
    <motion.path
      d="M6 17a3.6 3.6 0 0 1 .2-7.2 4.6 4.6 0 0 1 8.8-1.4A4.1 4.1 0 0 1 17.5 17H6Z"
      animate={reduced ? undefined : { y: [0, -1, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

function RainDrops({ reduced, count = 3, fast = false }: { reduced: boolean; count?: number; fast?: boolean }) {
  const xs = [8.5, 12, 15.5, 10, 13.5].slice(0, count);
  return (
    <>
      {xs.map((x, i) => (
        <motion.line
          key={x}
          x1={x}
          y1="18"
          x2={x - 1}
          y2="21"
          animate={reduced ? undefined : { opacity: [0, 1, 0], y: [0, 3] }}
          transition={{
            duration: fast ? 0.6 : 0.9,
            repeat: Infinity,
            ease: "easeIn",
            delay: i * (fast ? 0.12 : 0.2),
          }}
        />
      ))}
    </>
  );
}

function SnowFlakes({ reduced }: { reduced: boolean }) {
  const xs = [8.5, 12, 15.5];
  return (
    <>
      {xs.map((x, i) => (
        <motion.circle
          key={x}
          cx={x}
          cy="19"
          r="0.6"
          fill="currentColor"
          stroke="none"
          animate={reduced ? undefined : { y: [0, 3], opacity: [1, 0], x: [0, i % 2 === 0 ? 1 : -1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeIn", delay: i * 0.4 }}
        />
      ))}
    </>
  );
}

function Bolt({ reduced }: { reduced: boolean }) {
  return (
    <motion.path
      d="M12.5 15.5 10 19.5h2.2L11.4 22l3.6-4.8h-2.2l1.4-1.7Z"
      animate={reduced ? undefined : { opacity: [1, 1, 0.3, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, times: [0, 0.7, 0.85, 1] }}
    />
  );
}

function FogLines({ reduced }: { reduced: boolean }) {
  return (
    <>
      {[9.5, 13, 16.5].map((y, i) => (
        <motion.line
          key={y}
          x1="4.5"
          y1={y}
          x2="19.5"
          y2={y}
          animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        />
      ))}
    </>
  );
}

function IconContent({ icon, reduced }: { icon: WeatherIconKey; reduced: boolean }) {
  switch (icon) {
    case "clear-day":
      return <SunRays reduced={reduced} />;
    case "clear-night":
      return <Moon />;
    case "partly-cloudy-day":
      return (
        <>
          <g transform="translate(-2.5,-3) scale(0.62)">
            <SunRays reduced={reduced} />
          </g>
          <Cloud reduced={reduced} />
        </>
      );
    case "partly-cloudy-night":
      return (
        <>
          <g transform="translate(2,-4) scale(0.55)">
            <Moon />
          </g>
          <Cloud reduced={reduced} />
        </>
      );
    case "cloudy":
      return (
        <>
          <path
            d="M4 13.5a3 3 0 0 1 .2-6 3.8 3.8 0 0 1 7.2-1.3"
            opacity={0.6}
          />
          <Cloud reduced={reduced} delay={0.3} />
        </>
      );
    case "fog":
      return (
        <>
          <path d="M6 12a3.6 3.6 0 0 1 .2-6.2 4.6 4.6 0 0 1 8.6-1.2" opacity={0.5} />
          <FogLines reduced={reduced} />
        </>
      );
    case "drizzle":
      return (
        <>
          <Cloud reduced={reduced} />
          <RainDrops reduced={reduced} count={2} />
        </>
      );
    case "rain":
      return (
        <>
          <Cloud reduced={reduced} />
          <RainDrops reduced={reduced} count={3} />
        </>
      );
    case "rain-heavy":
      return (
        <>
          <Cloud reduced={reduced} />
          <RainDrops reduced={reduced} count={5} fast />
        </>
      );
    case "thunderstorm":
      return (
        <>
          <Cloud reduced={reduced} />
          <Bolt reduced={reduced} />
        </>
      );
    case "snow":
      return (
        <>
          <Cloud reduced={reduced} />
          <SnowFlakes reduced={reduced} />
        </>
      );
    default:
      return <Cloud reduced={reduced} />;
  }
}

export function WeatherIcon({
  icon,
  className,
  size = 24,
  label,
}: {
  icon: WeatherIconKey;
  className?: string;
  size?: number;
  label?: string;
}) {
  const reduced = Boolean(useReducedMotion());

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <IconContent icon={icon} reduced={reduced} />
    </svg>
  );
}

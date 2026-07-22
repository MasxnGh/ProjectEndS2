"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

export function useCountUp(target: number | undefined): number {
  const [display, setDisplay] = useState(target ?? 0);
  const valueRef = useRef(target ?? 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (target === undefined) return;
    if (reduced) {
      valueRef.current = target;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced-motion needs an immediate (non-animated) value swap
      setDisplay(target);
      return;
    }
    const controls = animate(valueRef.current, target, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (latest) => {
        valueRef.current = latest;
        setDisplay(latest);
      },
    });
    return () => controls.stop();
  }, [target, reduced]);

  return Math.round(display);
}

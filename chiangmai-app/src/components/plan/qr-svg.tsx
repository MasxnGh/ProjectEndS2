"use client";

import { useMemo } from "react";
import QRCode from "qrcode";

/** Modules of white kept around the code inside the SVG; the white page gives it the rest of its quiet zone. */
const QUIET = 2;

/**
 * A QR code drawn as plain SVG during render. The printout needs it in the
 * page before the print dialog takes its copy, which an async data URL can
 * miss, and SVG stays sharp in the PDF. Error correction is "L": the codes
 * here carry long links, and the lowest level keeps the modules big enough
 * to scan off paper.
 */
export function QrSvg({ value, className }: { value: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "L" });
    let d = "";
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { size: modules.size, path: d };
  }, [value]);

  const box = size + QUIET * 2;
  return (
    <svg viewBox={`${-QUIET} ${-QUIET} ${box} ${box}`} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      <rect x={-QUIET} y={-QUIET} width={box} height={box} fill="#fff" />
      <path d={path} fill="#17221f" />
    </svg>
  );
}

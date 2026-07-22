import type { PlaceCategory } from "@/data/types";

const categoryColors: Record<PlaceCategory, string> = {
  temple: "#c9a24b",
  nature: "#2f4a3c",
  village: "#a6553b",
  cafe: "#1a1a17",
  market: "#c9a24b",
  activity: "#2f4a3c",
};

function pinSvg(color: string, size: number, emphasized: boolean) {
  const ring = emphasized ? "#c9a24b" : "#fffdf9";
  const ringWidth = emphasized ? 2 : 1.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 32">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="${color}" stroke="${ring}" stroke-width="${ringWidth}"/>
    <circle cx="12" cy="12" r="4.2" fill="#fffdf9"/>
  </svg>`;
}

export function categoryMarkerIcon(
  category: PlaceCategory,
  options: { emphasized?: boolean; size?: number } = {}
): google.maps.Icon {
  const size = options.size ?? (options.emphasized ? 40 : 32);
  const svg = pinSvg(categoryColors[category], size, Boolean(options.emphasized));
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size * (32 / 24)),
    anchor: new google.maps.Point(size / 2, size * (32 / 24)),
  };
}

export function numberedMarkerIcon(color: string, index: number, size = 34): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="15" fill="${color}" stroke="#fffdf9" stroke-width="2"/>
    <text x="17" y="22" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" font-weight="600" fill="#fffdf9">${index}</text>
  </svg>`;
  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
}

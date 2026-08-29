import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chiangmai Journey — Chiang Mai Trip Planner",
    short_name: "Chiangmai Journey",
    description: "An editorial guide and trip planner for Chiang Mai, Thailand.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Matches the light theme's page colour and the celadon accent.
    background_color: "#e8eae6",
    theme_color: "#2e6b57",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}

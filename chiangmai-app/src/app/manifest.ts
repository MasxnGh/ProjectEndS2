import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doi & Delta — Chiang Mai Trip Planner",
    short_name: "Doi & Delta",
    description: "An editorial guide and trip planner for Chiang Mai, Thailand.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f4ef",
    theme_color: "#c9a24b",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}

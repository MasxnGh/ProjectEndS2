import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export const isGoogleMapsConfigured = Boolean(apiKey);

let optionsSet = false;
let mapsLibraryPromise: Promise<google.maps.MapsLibrary> | null = null;
let routesLibraryPromise: Promise<google.maps.RoutesLibrary> | null = null;

function ensureOptions() {
  if (!optionsSet && apiKey) {
    setOptions({ key: apiKey, v: "weekly" });
    optionsSet = true;
  }
}

export function loadMapsLibrary(): Promise<google.maps.MapsLibrary> {
  if (!apiKey) return Promise.reject(new Error("Google Maps API key not configured"));
  ensureOptions();
  if (!mapsLibraryPromise) mapsLibraryPromise = importLibrary("maps");
  return mapsLibraryPromise;
}

export function loadRoutesLibrary(): Promise<google.maps.RoutesLibrary> {
  if (!apiKey) return Promise.reject(new Error("Google Maps API key not configured"));
  ensureOptions();
  if (!routesLibraryPromise) routesLibraryPromise = importLibrary("routes");
  return routesLibraryPromise;
}

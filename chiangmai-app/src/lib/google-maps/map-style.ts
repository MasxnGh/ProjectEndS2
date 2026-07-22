// A warm, desaturated "editorial" map style matching the site's cream/gold
// palette. Google Maps styling needs literal color values, not CSS vars.
export const mapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f2ede3" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7f4ef" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8371" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cbbfa4" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#e6ddc9" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d7ddc9" }, { visibility: "on" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#fffdf9" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e0d8c7" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e9c98f" }] },
  { featureType: "road.arterial", elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "road.local", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c3d4cc" }] },
];

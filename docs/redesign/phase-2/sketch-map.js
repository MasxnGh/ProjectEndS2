/*
 * Shared map helper for the Phase 2 direction sketches.
 *
 * Draws the app's real map (its own /api/map/style and tiles), recoloured per
 * direction, with the old city wall, the catalogue's 204 places and the sample
 * trip's real road route on top. Sketch code only — nothing here ships.
 */
(function () {
  const D = window.CMJ;

  function recolor(map, c) {
    const set = (id, prop, value) => { try { map.setPaintProperty(id, prop, value); } catch {} };
    const hide = (id) => { try { map.setLayoutProperty(id, "visibility", "none"); } catch {} };
    for (const layer of map.getStyle().layers) {
      const id = layer.id, l = id.toLowerCase();
      if (layer.type === "background") set(id, "background-color", c.land);
      else if (l === "residential") { set(id, "fill-color", c.urban || c.land); set(id, "fill-opacity", c.urban ? 1 : 0); }
      else if (l === "landcover" || l === "forest") { set(id, "fill-color", c.forest); set(id, "fill-opacity", c.forestOpacity ?? 0.9); }
      else if (l === "stadium" || l === "cemetery" || l === "pier" || l === "bridge") hide(id);
      else if (l === "river") set(id, "line-color", c.water);
      else if (l === "water shadow") hide(id);
      else if (l === "water") set(id, "fill-color", c.water);
      else if (l === "aeroway") set(id, "line-color", c.roadMinor);
      else if (l.includes("outline")) hide(id);
      else if (l.includes("railway")) { if (c.rail) set(id, "line-color", c.rail); else hide(id); }
      else if (l === "road network" || l.startsWith("tunnel") || l === "pier road") set(id, "line-color", c.road);
      else if (l.startsWith("path")) set(id, "line-color", c.roadMinor);
      else if (l.startsWith("building")) hide(id);
      else if (l.includes("border")) hide(id);
      else if (layer.type === "symbol") {
        if (l.includes("road") || c.labels === false) hide(id);
        else { set(id, "text-color", c.label); set(id, "text-halo-color", c.land); set(id, "text-halo-width", 1.4); }
      }
    }
  }

  function wallGeoJSON() {
    const w = D.wall;
    return { type: "Feature", geometry: { type: "Polygon", coordinates: [[[w.west, w.north], [w.east, w.north], [w.east, w.south], [w.west, w.south], [w.west, w.north]]] } };
  }

  /**
   * @param el      container element
   * @param opts    { colors, bounds, padding, dots, route, pins, interactive, pinClass, onReady }
   */
  window.sketchMap = function (el, opts) {
    const c = opts.colors;
    const map = new maplibregl.Map({
      container: el,
      style: "/api/map/style",
      bounds: opts.bounds,
      fitBoundsOptions: { padding: opts.padding ?? 48 },
      interactive: opts.interactive ?? true,
      attributionControl: { compact: true },
      cooperativeGestures: false,
    });
    if (opts.interactive !== false) map.scrollZoom.disable();

    map.on("load", () => {
      recolor(map, c);

      // The moat and the wall: the one shape every direction is built on.
      map.addSource("wall", { type: "geojson", data: wallGeoJSON() });
      map.addLayer({ id: "moat", type: "line", source: "wall", paint: { "line-color": c.moat, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 12], "line-opacity": c.moatOpacity ?? 1 } });
      map.addLayer({ id: "wall", type: "line", source: "wall", paint: { "line-color": c.wall, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 14, 2.4] } });

      if (opts.dots !== false) {
        map.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: D.places.map((p) => ({ type: "Feature", properties: { photo: p.p ? 1 : 0 }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) } });
        map.addLayer({ id: "places", type: "circle", source: "places", paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.2, 14, 4.5],
          "circle-color": ["case", ["==", ["get", "photo"], 1], c.dotPhoto || c.dot, c.dot],
          "circle-stroke-color": c.land, "circle-stroke-width": 1,
          "circle-opacity": c.dotOpacity ?? 1,
        } });
      }

      if (opts.route !== false) {
        const coords = D.legs.flatMap((leg) => leg.geometry);
        map.addSource("route", { type: "geojson", data: { type: "Feature", geometry: { type: "LineString", coordinates: coords } } });
        map.addLayer({ id: "route-casing", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.land, "line-width": 6 } });
        map.addLayer({ id: "route", type: "line", source: "route", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": c.route, "line-width": 3 } });
      }

      if (opts.pins !== false) {
        D.stops.forEach((slug, i) => {
          const p = D.places.find((x) => x.s === slug);
          const pin = document.createElement("div");
          pin.className = opts.pinClass || "pin";
          pin.textContent = String(i + 1);
          pin.dataset.stop = String(i + 1);
          new maplibregl.Marker({ element: pin, anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(map);
        });
      }
      if (opts.scale) map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
      opts.onReady && opts.onReady(map);
    });
    return map;
  };

  // Bounds that hold the sample trip (Doi Suthep to the old city) with room around it.
  window.TRIP_BOUNDS = [[98.905, 18.768], [99.012, 18.822]];
  window.CITY_BOUNDS = [[98.955, 18.770], [99.015, 18.806]];
})();

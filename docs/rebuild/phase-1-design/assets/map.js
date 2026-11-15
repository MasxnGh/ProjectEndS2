/*
 * Brand map for the Phase 1 prototypes: the app's real map style and tiles
 * (through its /api/map proxy), recoloured to the board palette, with places
 * as dots, numbered stop pins and the real route line on top.
 */
(function () {
  const LIGHT = {
    land: "#f4eee9", urban: "#efe7e1", forest: "#dde5d6", water: "#d3d3e6",
    road: "#ffffff", roadMinor: "#faf6f3", label: "#4f5a57", halo: "#f4eee9",
    route: "#1d3835", dot: "#1d3835", dotStroke: "#fffcfa", active: "#eb9d56",
  };
  const DARK = {
    land: "#13231f", urban: "#172a26", forest: "#1a2e28", water: "#26303f",
    road: "#24392f", roadMinor: "#1c312b", label: "#b9c4c0", halo: "#13231f",
    route: "#efd3b1", dot: "#efd3b1", dotStroke: "#0f1c1a", active: "#eb9d56",
  };

  function recolor(map, c) {
    const set = (id, prop, v) => { try { map.setPaintProperty(id, prop, v); } catch {} };
    const hide = (id) => { try { map.setLayoutProperty(id, "visibility", "none"); } catch {} };
    for (const layer of map.getStyle().layers) {
      const id = layer.id, l = id.toLowerCase();
      if (layer.type === "background") set(id, "background-color", c.land);
      else if (l === "residential") set(id, "fill-color", c.urban);
      else if (l === "landcover" || l === "forest" || l.includes("park") || l.includes("wood") || l.includes("grass")) { if (layer.type === "fill") { set(id, "fill-color", c.forest); set(id, "fill-opacity", 0.9); } }
      else if (l === "river" || (l.includes("waterway"))) { if (layer.type === "line") set(id, "line-color", c.water); }
      else if (l === "water shadow") hide(id);
      else if (l.includes("water")) { if (layer.type === "fill") set(id, "fill-color", c.water); }
      else if (l.includes("outline") || l.includes("border") || l.includes("railway") || l.startsWith("building") || l === "stadium" || l === "cemetery" || l === "pier") hide(id);
      else if (l === "aeroway" || l.startsWith("path")) { if (layer.type === "line") set(id, "line-color", c.roadMinor); }
      else if (l.includes("road") || l.startsWith("tunnel") || l.includes("highway") || l.includes("street")) { if (layer.type === "line") set(id, "line-color", c.road); }
      if (layer.type === "symbol") {
        if (l.includes("road") || l.includes("poi") || l.includes("shield")) hide(id);
        else { set(id, "text-color", c.label); set(id, "text-halo-color", c.halo); set(id, "text-halo-width", 1.4); }
      }
    }
  }

  window.brandMap = function (el, opts = {}) {
    const dark = document.documentElement.dataset.theme === "dark";
    const c = dark ? DARK : LIGHT;
    if (!window.maplibregl) { el.insertAdjacentHTML("beforeend", '<p class="map-off">แผนที่ต้องมี dev server ของแอปรันอยู่</p>'); return null; }
    const map = new maplibregl.Map({
      container: el, style: "/api/map/style",
      bounds: opts.bounds, fitBoundsOptions: { padding: opts.padding ?? 56 },
      interactive: opts.interactive ?? true, attributionControl: { compact: true },
    });
    if (opts.interactive !== false) { map.scrollZoom.disable(); map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right"); }
    map.on("error", () => {});
    map.on("load", () => {
      recolor(map, c);
      // The old city's moat square, so the map keeps its bearings even without base tiles
      const W = { n: 18.79515, s: 18.781515, w: 98.97824, e: 98.993165 };
      map.addSource("wall", { type: "geojson", data: { type: "Feature", geometry: { type: "Polygon", coordinates: [[[W.w, W.n], [W.e, W.n], [W.e, W.s], [W.w, W.s], [W.w, W.n]]] } } });
      map.addLayer({ id: "wall-fill", type: "fill", source: "wall", paint: { "fill-color": c.forest, "fill-opacity": 0.6 } });
      map.addLayer({ id: "wall-line", type: "line", source: "wall", paint: { "line-color": c.water, "line-width": 4 } });
      if (opts.route) {
        map.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: opts.route.map((g) => ({ type: "Feature", geometry: { type: "LineString", coordinates: g } })) } });
        map.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": dark ? "#0f1c1a" : "#fffcfa", "line-width": 7 }, layout: { "line-cap": "round", "line-join": "round" } });
        map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": c.route, "line-width": 3.5 }, layout: { "line-cap": "round", "line-join": "round" } });
      }
      if (opts.dots) {
        map.addSource("dots", { type: "geojson", data: { type: "FeatureCollection", features: opts.dots.map((d) => ({ type: "Feature", id: d.id, properties: { s: d.s, name: d.name }, geometry: { type: "Point", coordinates: [d.lng, d.lat] } })) } });
        map.addLayer({ id: "dots", type: "circle", source: "dots", paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "active"], false], 9, 6],
          "circle-color": ["case", ["boolean", ["feature-state", "active"], false], c.active, c.dot],
          "circle-stroke-color": c.dotStroke, "circle-stroke-width": 2,
        } });
        map.on("mouseenter", "dots", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "dots", () => (map.getCanvas().style.cursor = ""));
        if (opts.onDot) map.on("click", "dots", (e) => opts.onDot(e.features[0].properties.s));
      }
      (opts.pins || []).forEach((p) => {
        const node = document.createElement("div");
        node.className = "map-pin" + (p.accent ? " map-pin--accent" : "");
        node.innerHTML = p.n != null ? `<span>${p.n}</span>` : "";
        node.setAttribute("aria-label", p.label || "");
        new maplibregl.Marker({ element: node, anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
      });
      // Follow the theme switch without rebuilding the map
      new MutationObserver(() => {
        const d = document.documentElement.dataset.theme === "dark", k = d ? DARK : LIGHT;
        const paint = (id, p, v) => { if (map.getLayer(id)) map.setPaintProperty(id, p, v); };
        recolor(map, k);
        paint("wall-fill", "fill-color", k.forest);
        paint("wall-line", "line-color", k.water);
        paint("route-casing", "line-color", d ? "#0f1c1a" : "#fffcfa");
        paint("route", "line-color", k.route);
        paint("dots", "circle-color", ["case", ["boolean", ["feature-state", "active"], false], k.active, k.dot]);
        paint("dots", "circle-stroke-color", k.dotStroke);
      }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      opts.onReady && opts.onReady(map);
    });
    return map;
  };

  window.setDotActive = (map, id, on) => { try { map.setFeatureState({ source: "dots", id }, { active: on }); } catch {} };
})();

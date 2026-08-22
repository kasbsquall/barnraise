/* The neighborhood, on a map.
 *
 * This replaces a transit-style diagram whose stations sat at invented
 * coordinates. The exchanges in this system are physical, so where an
 * organization is and how far the van has to drive are part of the decision, and
 * a diagram threw that away. The routes drawn here are real driving routes over
 * OpenStreetMap data, precomputed in seed/build_routes.py, so a leg that reads
 * 714 metres is 714 metres.
 *
 * The organizations are invented. The streets are not, and the page says so.
 */

const MAP = {
  centre: [-87.6570, 41.8568],   // Pilsen, Chicago
  zoom: 14.35,
  minZoom: 13,
  maxZoom: 17.5,
};

let map = null;
let routes = [];               // {a, b, metros, segundos, linea}
let markers = new Map();       // org_id -> maplibregl.Marker
let mapReady = false;
const pending = [];            // pulses asked for before the style finished loading

const routeKey = (a, b) => [a, b].sort().join("|");

/** The route between two organizations, in whichever direction it was cached. */
function routeBetween(a, b) {
  return routes.find((r) => routeKey(r.a, r.b) === routeKey(a, b));
}

/** Metres and drive time, phrased for a person rather than for a machine. */
function routeLabel(a, b) {
  const r = routeBetween(a, b);
  if (!r) return "";
  const dist = r.metros >= 1000
    ? `${(r.metros / 1000).toFixed(1)} km`
    : `${r.metros} m`;
  const mins = Math.round(r.segundos / 60);
  return `${dist} · about ${mins === 0 ? "a minute" : `${mins} min`} by road`;
}

/** A marker: the organization's monogram in its own route colour. */
function markerEl(org, onClick) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `pin pin--${routeOf(org.org_id)}`;
  el.dataset.org = org.org_id;
  el.setAttribute("aria-label", `${org.nombre}, ${org.tipo}`);
  el.innerHTML =
    `<span class="pin__disc">${esc(initials(org.org_id))}</span>` +
    `<span class="pin__name">${esc(org.nombre)}</span>`;
  el.addEventListener("click", (e) => { e.stopPropagation(); onClick(org.org_id); });
  return el;
}

function buildMap(organizaciones, onSelect) {
  if (map) return;
  const holder = document.getElementById("map");
  if (!holder || typeof maplibregl === "undefined") return;

  map = new maplibregl.Map({
    container: holder,
    style: "/static/map-style.json",
    center: MAP.centre,
    zoom: MAP.zoom,
    minZoom: MAP.minZoom,
    maxZoom: MAP.maxZoom,
    attributionControl: {compact: true},
    // The map is a surface to read, not a game. Rotation only disorients.
    dragRotate: false,
    pitchWithRotate: false,
    touchZoomRotate: true,
  });
  map.touchZoomRotate?.disableRotation();
  map.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");

  map.on("load", () => {
    // One source for the fulfilled links, one for the leg currently carrying a
    // message. Two layers rather than one so a live leg can be styled without
    // touching the others.
    map.addSource("links", {type: "geojson", data: {type: "FeatureCollection", features: []}});

    // A casing under every route. Without it a coloured line sits directly on a
    // blue-grey street grid and the eye cannot separate the two: the route reads
    // as another street. This is what printed route maps do, and it is the whole
    // reason a highlighted route is legible on a paper map.
    map.addLayer({
      id: "links-casing",
      type: "line",
      source: "links",
      layout: {"line-cap": "round", "line-join": "round"},
      paint: {
        "line-color": "#04080e",
        "line-width": ["+", ["get", "width"], 8],
        "line-opacity": 0.92,
        "line-blur": 0.5,
      },
    });
    map.addLayer({
      id: "links-line",
      type: "line",
      source: "links",
      layout: {"line-cap": "round", "line-join": "round"},
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "width"],
        "line-opacity": 1,
      },
    });
    // The junction where two organizations' routes meet. It was ambiguous which
    // line owned which leg where they overlapped, so the meeting point is drawn.
    map.addLayer({
      id: "links-joint",
      type: "circle",
      source: "links",
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 5,
        "circle-color": "#04080e",
        "circle-stroke-width": 2.5,
        "circle-stroke-color": ["get", "color"],
      },
    });

    map.addSource("live", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    map.addLayer({
      id: "live-casing",
      type: "line",
      source: "live",
      layout: {"line-cap": "round", "line-join": "round"},
      paint: {"line-color": "#04080e", "line-width": 13, "line-opacity": 0.9, "line-blur": 0.6},
    });
    map.addLayer({
      id: "live-line",
      type: "line",
      source: "live",
      layout: {"line-cap": "round", "line-join": "round"},
      paint: {"line-color": ["get", "color"], "line-width": 6, "line-opacity": 1},
    });
    map.addLayer({
      id: "live-dot",
      type: "circle",
      source: "live",
      filter: ["==", "$type", "Point"],
      paint: {
        "circle-radius": 7,
        "circle-color": ["get", "color"],
        "circle-blur": 0.25,
      },
    });

    mapReady = true;
    organizaciones.forEach((o) => {
      if (!o.ubicacion) return;
      const m = new maplibregl.Marker({element: markerEl(o, onSelect), anchor: "bottom"})
        .setLngLat([o.ubicacion.lon, o.ubicacion.lat])
        .addTo(map);
      markers.set(o.org_id, m);
    });
    while (pending.length) { const p = pending.shift(); pulseRoute(p.from, p.to); }
    document.dispatchEvent(new CustomEvent("map:ready"));
  });

  window.__map = map;      // a handle for inspection while debugging
  map.on("click", () => onSelect(null));
}

/**
 * Draws one route per pair that has agreements, thicker with more of them.
 *
 * Each route is also given its two end points as separate features, so the place
 * where two organizations' routes meet is marked rather than left as an
 * ambiguous overlap of two coloured lines.
 *
 * The routes draw ON rather than appearing: a line that arrives finished says
 * nothing about when it arrived, and the first thing a viewer asks of this map
 * is which of these connections is new.
 */
let drawnKeys = new Set();

function drawLinks(vinculos) {
  if (!mapReady) return;
  const max = Math.max(1, ...vinculos.map((v) => v.acuerdos));
  const src = map.getSource("links");
  if (!src) return;

  const usable = vinculos.map((v) => ({v, r: routeBetween(v.a, v.b)})).filter((x) => x.r);
  const isNew = usable.some(({v}) => !drawnKeys.has(routeKey(v.a, v.b)));
  const build = (fraction) => {
    const features = [];
    usable.forEach(({v, r}) => {
      const key = routeKey(v.a, v.b);
      const already = drawnKeys.has(key);
      const upto = already ? r.linea.length : Math.max(2, Math.round(fraction * r.linea.length));
      const props = {color: routeHex(v.a), width: 5 + (v.acuerdos / max) * 6,
                     a: v.a, b: v.b, acuerdos: v.acuerdos};
      features.push({type: "Feature", properties: props,
                     geometry: {type: "LineString", coordinates: r.linea.slice(0, upto)}});
      if (already || fraction >= 1) {
        features.push({type: "Feature", properties: props,
                       geometry: {type: "Point", coordinates: r.linea[r.linea.length - 1]}});
      }
    });
    return {type: "FeatureCollection", features};
  };

  if (!isNew || REDUCE.matches) {
    usable.forEach(({v}) => drawnKeys.add(routeKey(v.a, v.b)));
    src.setData(build(1));
    return;
  }

  const DUR = 900;
  let t0 = null;
  const step = (now) => {
    if (t0 === null) t0 = now;
    const p = Math.min(1, (now - t0) / DUR);
    src.setData(build(1 - Math.pow(1 - p, 3)));
    if (p < 1) return requestAnimationFrame(step);
    usable.forEach(({v}) => drawnKeys.add(routeKey(v.a, v.b)));
  };
  requestAnimationFrame(step);
}

/** A message crossing the neighborhood, drawn along the road it would travel. */
function pulseRoute(fromId, toId) {
  if (!mapReady) { pending.push({from: fromId, to: toId}); return; }
  const r = routeBetween(fromId, toId);
  const src = map.getSource("live");
  if (!r || !src) return;

  const line = r.a === fromId ? r.linea : [...r.linea].reverse();
  const colour = routeHex(fromId);
  ring(fromId);

  if (REDUCE.matches) {
    src.setData({type: "FeatureCollection", features: [
      {type: "Feature", geometry: {type: "LineString", coordinates: line},
       properties: {color: colour}},
    ]});
    setTimeout(() => { src.setData({type: "FeatureCollection", features: []}); ring(toId); }, 700);
    return;
  }

  const DUR = 1100;
  let t0 = null;
  const step = (now) => {
    if (t0 === null) t0 = now;
    const p = Math.min(1, (now - t0) / DUR);
    const eased = 1 - Math.pow(1 - p, 3);
    const upto = Math.max(1, Math.round(eased * (line.length - 1)));
    const head = line[upto];
    src.setData({type: "FeatureCollection", features: [
      {type: "Feature", geometry: {type: "LineString", coordinates: line.slice(0, upto + 1)},
       properties: {color: colour}},
      {type: "Feature", geometry: {type: "Point", coordinates: head},
       properties: {color: colour}},
    ]});
    if (p < 1) return requestAnimationFrame(step);
    src.setData({type: "FeatureCollection", features: []});
    ring(toId);
  };
  requestAnimationFrame(step);
}

/** The pin of an organization that just spoke, or just heard something. */
function ring(orgId) {
  const el = document.querySelector(`.pin[data-org="${orgId}"]`);
  if (!el) return;
  el.classList.add("pin--hit");
  setTimeout(() => el.classList.remove("pin--hit"), 560);
}

/** Eases the map so the organization you are viewing as is in frame. */
function centreOn(orgId, organizaciones) {
  if (!mapReady || !orgId) return;
  const o = organizaciones.find((x) => x.org_id === orgId);
  if (!o?.ubicacion) return;
  map.easeTo({center: [o.ubicacion.lon, o.ubicacion.lat], zoom: 14.9,
              offset: [-180, 0], duration: 850});
}

/** Marks the pins whose director has something to decide. */
function markWaiting(orgIds) {
  document.querySelectorAll(".pin").forEach((el) => {
    el.classList.toggle("pin--waiting", orgIds.includes(el.dataset.org));
  });
}

/** Frames one organization, or the whole neighborhood when given nothing. */
function focusOrg(orgId, organizaciones) {
  if (!mapReady) return;
  if (!orgId) {
    map.easeTo({center: MAP.centre, zoom: MAP.zoom, duration: 700});
    return;
  }
  const o = organizaciones.find((x) => x.org_id === orgId);
  if (!o?.ubicacion) return;
  map.easeTo({center: [o.ubicacion.lon, o.ubicacion.lat], zoom: 15.6,
              offset: [-180, 0], duration: 750});
}

async function loadRoutes() {
  try {
    const r = await fetch("/api/routes");
    routes = (await r.json()).rutas || [];
  } catch (_) {
    routes = [];
  }
  return routes.length;
}


// One namespace instead of six globals, so it is obvious in app.js where each of
// these comes from.
window.NB = {
  buildMap, drawLinks, pulseRoute, markWaiting, focusOrg, centreOn, loadRoutes, routeLabel,
};

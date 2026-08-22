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
    map.addLayer({
      id: "links-line",
      type: "line",
      source: "links",
      layout: {"line-cap": "round", "line-join": "round"},
      paint: {
        "line-color": ["get", "color"],
        "line-width": ["get", "width"],
        "line-opacity": 0.85,
      },
    });

    map.addSource("live", {type: "geojson", data: {type: "FeatureCollection", features: []}});
    map.addLayer({
      id: "live-line",
      type: "line",
      source: "live",
      layout: {"line-cap": "round", "line-join": "round"},
      paint: {"line-color": ["get", "color"], "line-width": 5, "line-opacity": 0.95},
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

  map.on("click", () => onSelect(null));
}

/** Draws one line per pair that has fulfilled agreements, thicker with more. */
function drawLinks(vinculos) {
  if (!mapReady) return;
  const max = Math.max(1, ...vinculos.map((v) => v.acuerdos));
  const features = vinculos.map((v) => {
    const r = routeBetween(v.a, v.b);
    if (!r) return null;
    return {
      type: "Feature",
      geometry: {type: "LineString", coordinates: r.linea},
      properties: {
        color: routeHex(v.a),
        width: 2 + (v.acuerdos / max) * 5,
        a: v.a, b: v.b, acuerdos: v.acuerdos,
      },
    };
  }).filter(Boolean);
  map.getSource("links")?.setData({type: "FeatureCollection", features});
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
  buildMap, drawLinks, pulseRoute, markWaiting, focusOrg, loadRoutes, routeLabel,
};

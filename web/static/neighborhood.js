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
let orgsConocidas = [];        // the organizations the map was built from
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
  // The map keeps the list it was built from, so anything that needs to reframe
  // the whole neighborhood can ask for it without being handed it again.
  orgsConocidas = organizaciones;
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
        "line-width": ["+", ["get", "width"], 5],
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
    frameAll(organizaciones, false);
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
/**
 * Shifts a line sideways, tapering the shift to nothing at both ends.
 *
 * MapLibre's own line-offset moves the whole line by a constant, which is fine
 * for one route and wrong for six: where several converge on one pin each
 * arrives at a different point and they open into a fan, and at a sharp corner
 * the constant offset overshoots into a wedge. Transit maps solve it the same
 * way this does, by moving the geometry and closing the gap at the terminals, so
 * parallel routes run side by side down a shared street and meet at the door.
 *
 * The shift is in metres, so it scales with the map rather than staying a fixed
 * number of screen pixels. That is the behaviour you want: zoom in and parallel
 * routes separate the way parallel streets do.
 */
function desplazar(linea, metros) {
  if (!metros || linea.length < 2) return linea;
  const RAD = Math.PI / 180;
  const mLat = 110540;
  const salida = [];
  for (let i = 0; i < linea.length; i++) {
    const p = linea[i];
    const mLon = 111320 * Math.cos(p[1] * RAD);
    // Average the normals of the segments meeting at this vertex, so a corner
    // moves along its bisector instead of breaking into two offset lines.
    let nx = 0, ny = 0;
    const seg = (a, b) => {
      const dx = (b[0] - a[0]) * mLon, dy = (b[1] - a[1]) * mLat;
      const l = Math.hypot(dx, dy) || 1;
      nx += -dy / l; ny += dx / l;
    };
    if (i > 0) seg(linea[i - 1], p);
    if (i < linea.length - 1) seg(p, linea[i + 1]);
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    // Taper: no shift at the terminals, full shift through the middle fifth.
    const t = i / (linea.length - 1);
    const rampa = Math.min(1, Math.min(t, 1 - t) / 0.18);
    const k = metros * rampa;
    salida.push([p[0] + (nx * k) / mLon, p[1] + (ny * k) / mLat]);
  }
  return salida;
}

let drawnKeys = new Set();

function drawLinks(vinculos) {
  if (!mapReady) return;
  const max = Math.max(1, ...vinculos.map((v) => v.acuerdos));
  const src = map.getSource("links");
  if (!src) return;

  const usable = vinculos.map((v) => ({v, r: routeBetween(v.a, v.b)})).filter((x) => x.r);

  /**
   * The route with its last stretch to the door added at both ends.
   *
   * OSRM snaps to the nearest drivable road, so a cached route starts and ends
   * up to 44 metres from the organization it belongs to. On the map that reads
   * as a line stopping in the middle of a street and going nowhere, which is the
   * one thing that never happens on a route people recognise. The cached
   * geometry stays exactly what OSRM returned; the connector is drawn, not
   * stored. The order follows the route's own endpoints, not the link's, because
   * routeBetween looks the pair up under a canonical key and may hand back the
   * reverse.
   */
  const puerta = (id) => {
    const m = markers.get(id);
    if (!m) return null;
    const {lng, lat} = m.getLngLat();
    return [lng, lat];
  };
  const cerca = (p, q) => {
    const dx = (p[0] - q[0]) * Math.cos((p[1] * Math.PI) / 180);
    return Math.hypot(dx, p[1] - q[1]);
  };
  const trazo = (r) => {
    const ini = puerta(r.a), fin = puerta(r.b);
    const l = r.linea;
    // Cut the route at whichever of its first and last few points sits closest
    // to the organization before joining it to the door. Simply appending the
    // door to the raw geometry made a spur wherever the road carried on past the
    // building: the line reached the end of the street, turned round and came
    // back, and with the parallel offset applied that doubling-back rendered as
    // a wedge pointing out of the pin.
    let desde = 0, hasta = l.length - 1;
    if (ini) for (let i = 1; i < Math.min(8, l.length); i++)
      if (cerca(l[i], ini) < cerca(l[desde], ini)) desde = i;
    if (fin) for (let i = l.length - 2; i >= Math.max(0, l.length - 8); i--)
      if (cerca(l[i], fin) < cerca(l[hasta], fin)) hasta = i;
    if (hasta <= desde) { desde = 0; hasta = l.length - 1; }
    return [...(ini ? [ini] : []), ...l.slice(desde, hasta + 1), ...(fin ? [fin] : [])];
  };
  const isNew = usable.some(({v}) => !drawnKeys.has(routeKey(v.a, v.b)));
  const build = (fraction) => {
    const features = [];
    usable.forEach(({v, r}) => {
      const key = routeKey(v.a, v.b);
      const already = drawnKeys.has(key);
      const width = 4 + (v.acuerdos / max) * 5;
      // Spread the routes off the centre line so a shared street shows two
      // parallel relationships instead of one muddled trace. The lane is stable
      // per link, not per render, and about 9 m apart, which is roughly one lane
      // of a Pilsen street at the zoom the neighborhood sits at.
      const carril = (usable.findIndex((u) => routeKey(u.v.a, u.v.b) === key)
                      - (usable.length - 1) / 2) * 9;
      const linea = desplazar(trazo(r), carril);
      const upto = already ? linea.length : Math.max(2, Math.round(fraction * linea.length));
      const props = {color: routeHex(v.a), width,
                     a: v.a, b: v.b, acuerdos: v.acuerdos};
      features.push({type: "Feature", properties: props,
                     geometry: {type: "LineString", coordinates: linea.slice(0, upto)}});
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

/** The part of the map the panel is not covering. Read from the DOM rather than
 *  hard-coded, because the panel collapses at narrow widths. */
function libre() {
  const panel = document.querySelector(".panel");
  const izq = panel && !panel.hidden ? panel.getBoundingClientRect().right : 0;
  return {left: Math.round(izq) + 40, right: 96, top: 96, bottom: 215};
}

/** Frames every organization at once. A fixed centre and zoom was leaving two of
 *  the six outside the viewport and crowding the rest against the panel, and it
 *  would drift further out of true every time an organization was added. */
function frameAll(organizaciones = orgsConocidas, animate = true) {
  if (!mapReady) return;
  const pts = (organizaciones || []).filter((o) => o.ubicacion)
    .map((o) => [o.ubicacion.lon, o.ubicacion.lat]);
  if (pts.length < 2) return;
  const b = pts.reduce((acc, c) => acc.extend(c),
    new maplibregl.LngLatBounds(pts[0], pts[0]));
  const opts = {padding: libre(), maxZoom: 15.4, duration: animate ? 900 : 0};
  if (animate) map.fitBounds(b, opts); else map.fitBounds(b, {...opts, duration: 0});
}

/** How far right of centre to place a single organization so the panel is not
 *  sitting on top of it. */
function aparte() {
  const l = libre().left;
  return Math.round(l / 2);
}

/** Eases the map so the organization you are viewing as is in frame. */
function centreOn(orgId, organizaciones) {
  if (!mapReady || !orgId) return;
  const o = organizaciones.find((x) => x.org_id === orgId);
  if (!o?.ubicacion) return;
  map.easeTo({center: [o.ubicacion.lon, o.ubicacion.lat], zoom: 14.9,
              offset: [aparte(), 0], duration: 850});
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
    frameAll(organizaciones);
    return;
  }
  const o = organizaciones.find((x) => x.org_id === orgId);
  if (!o?.ubicacion) return;
  map.easeTo({center: [o.ubicacion.lon, o.ubicacion.lat], zoom: 15.6,
              offset: [aparte(), 0], duration: 750});
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
  buildMap, frameAll, drawLinks, pulseRoute, markWaiting, focusOrg, centreOn, loadRoutes, routeLabel,
};

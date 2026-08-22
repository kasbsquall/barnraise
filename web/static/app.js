/* Barnraise · client.
   Renders the neighborhood and streams live rounds. Every string here is what a
   director reads, so it says what happened rather than what the database calls it. */

const $ = (s) => document.querySelector(s);
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
const icon = (name) => `<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/* Each organization owns a route colour, and it is the same colour in the map,
   the ledger capsule and the requirement matrix. */
const ROUTE = {
  "north-food-bank": "food",
  "central-library": "lib",
  "san-martin-school": "school",
};
const routeOf = (orgId) => ROUTE[orgId] || "lib";

const REDUCE = matchMedia("(prefers-reduced-motion: reduce)");

/* Entry motion is transform only: a frozen fade would leave a row invisible
   forever if the document timeline stalls. */
/**
 * Types a message in instead of pasting it whole.
 *
 * An agent writing to another agent is a thing happening over time, and a block
 * of text that lands complete reads as a record of something that already
 * finished. The box is measured and reserved BEFORE the first character, or the
 * feed reflows on every frame and every row below it walks up the column.
 *
 * The rate is capped rather than constant: at a fixed characters-per-second a
 * four-line reply from a neighbor would still be typing when the next one
 * arrives.
 */
function typeInto(node, str) {
  if (REDUCE.matches) { node.textContent = str; return; }
  node.textContent = str;
  const box = node.getBoundingClientRect().height;
  if (box) node.style.minHeight = `${Math.ceil(box)}px`;
  node.textContent = "";
  node.classList.add("is-typing");

  const dur = Math.min(2300, Math.max(420, str.length * 8));
  let t0 = null;
  const step = (now) => {
    if (t0 === null) t0 = now;
    const p = Math.min(1, (now - t0) / dur);
    node.textContent = str.slice(0, Math.round(str.length * p));
    if (p < 1) return requestAnimationFrame(step);
    node.classList.remove("is-typing");
    node.style.minHeight = "";
  };
  requestAnimationFrame(step);
}


function enter(node, index = 0, mode = "batch") {
  if (REDUCE.matches || typeof node.animate !== "function") return;
  const stream = mode === "stream";
  node.animate(
    stream ? [{ transform: "translateX(-12px)" }, { transform: "none" }]
           : [{ transform: "translateY(8px)" }, { transform: "none" }],
    { duration: 240, delay: stream ? 0 : Math.min(index, 7) * 28,
      easing: "cubic-bezier(0.23,1,0.32,1)", fill: "backwards" }
  );
}

/* Models answer in markdown and sometimes reach for emoji. Neither belongs on a
   screen where someone is deciding whether to sign something. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;
function clean(text) {
  return String(text)
    .replace(EMOJI, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "· ")
    .replace(/\[(R|N|REQ)\d+\]\s*/g, "")   // internal ids never reach the reader
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const PHASE = {
  idle: "Agents idle",
  inactiva: "Agents idle",
  descubrimiento: "Asking the neighbors",
  negociacion: "Negotiating terms",
  aprobacion: "Waiting for a signature",
  escaneo: "Checking the fund requirements",
  propuesta: "Drafting the joint application",
};

let state = null;
let me = "north-food-bank";      // whose console this is
let lastPendingSeen = null;

/* ---------- data ---------- */

async function load() {
  try {
    const r = await fetch("/api/state");
    if (!r.ok) throw new Error(`The server answered ${r.status}`);
    state = await r.json();
    render();
  } catch (e) {
    showError(e.message);
    throw e;
  }
}

async function post(url, body) {
  const r = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.detail || "The request failed");
  }
  return r.json();
}

const nameOf = (orgId) => (state?.organizaciones.find((o) => o.org_id === orgId) || {}).nombre || orgId;
const dirOf = (orgId) => (state?.organizaciones.find((o) => o.org_id === orgId) || {}).director || "";

function initials(orgId) {
  const small = new Set(["de", "del", "the", "of", "san"]);
  const words = nameOf(orgId).split(/\s+/).filter((w) => !small.has(w.toLowerCase()));
  return (words.length > 1 ? words[0][0] + words[1][0] : nameOf(orgId).slice(0, 2)).toUpperCase();
}

/* ---------- render ---------- */

function render() {
  if (!state) return;
  renderIdentity();
  renderFund();
  renderLedger();
  renderMap();
  renderOrgs();
  renderPhase(state.ronda?.fase || "idle");
  renderPending(state.ronda?.pendiente || null);
  if (state.actividad?.length) {
    // History is replayed, not re-lived: these events already happened, so they
    // are painted whole. Only what arrives over the stream is typed.
    $("#feed").replaceChildren();
    state.actividad.forEach((e) => addEvent(e, false));
  }
}

function renderIdentity() {
  $("#identity-name").textContent = `${dirOf(me)} · ${nameOf(me)}`;
  $("#identity-dot").style.background = `var(--route-${routeOf(me)})`;
}

/* --- the funding call, and what it takes to reach it --- */
function renderFund() {
  const c = state.convocatoria;
  $("[data-fund-name]").textContent = c.nombre;
  $("[data-fund-meta]").textContent = `${c.financiador} · closes ${c.cierre}`;
  $("[data-fund-amount]").textContent = c.monto.toLocaleString("en-US");
  $("[data-fund-unit]").textContent = c.moneda;

  const reqs = $("#reqs");
  reqs.replaceChildren();
  c.requisitos.forEach((r, i) => {
    const row = el("div", "req" + (r.tipo === "colaboracion" ? " req--hero" : ""));
    enter(row, i);
    const who = c.aportes[r.id];
    const caps = !who ? '<span class="cap cap--all">not covered</span>'
      : who.includes("suma de") || who.includes("acuerdos")
        ? `<span class="cap cap--all">${who.includes("acuerdos") ? "the ledger" : "all three together"}</span>`
        : who.split(", ").map((o) => `<span class="cap cap--${routeOf(o)}">${initials(o)}</span>`).join("");
    row.innerHTML =
      `<span class="req__id">${r.id}</span>` +
      `<span>${r.descripcion}${r.tipo === "colaboracion" ? ' <span class="label">only Barnraise can prove this</span>' : ""}</span>` +
      `<span class="req__who">${caps}</span>`;
    reqs.append(row);
  });

  // alone versus together, which is the whole argument of the second layer
  const alone = $("#alone");
  alone.replaceChildren();
  const total = c.requisitos.length;
  state.organizaciones.forEach((o, i) => {
    const col = el("div", "alone__col");
    enter(col, i);
    col.innerHTML =
      `<p class="label">alone</p>` +
      `<p><span class="alone__n">${o.requisitos_cubiertos.length}</span><span class="alone__of"> of ${total}</span></p>` +
      `<p class="alone__who"><span class="cap cap--${routeOf(o.org_id)}">${initials(o.org_id)}</span> ${o.nombre}</p>`;
    alone.append(col);
  });
  const together = el("div", "alone__col alone--together");
  enter(together, 3);
  together.innerHTML =
    `<p class="label">together</p>` +
    `<p><span class="alone__n">${c.cubiertos_en_conjunto.length}</span><span class="alone__of"> of ${total}</span></p>` +
    `<p class="alone__who">${c.poblacion_conjunta.toLocaleString("en-US")} people served</p>`;
  alone.append(together);

  renderCoalition();
}

function renderCoalition() {
  const box = $("#coalition");
  box.replaceChildren();
  const c = state.coaliciones[0];
  if (!c) {
    const wrap = el("div", "empty");
    wrap.innerHTML =
      `<p>No single organization qualifies for this fund. Ask the coalition agent to ` +
      `check the neighborhood's combined capabilities.</p>`;
    const b = el("button", "btn btn--small");
    b.type = "button";
    b.style.marginTop = "var(--s-4)";
    b.textContent = "Look for a coalition";
    b.addEventListener("click", startCoalition);
    wrap.append(b);
    box.append(wrap);
    return;
  }

  const members = c.org_ids.split(",");
  const signed = state.firmas_coalicion.filter((f) => f.coalicion_id === c.id && f.decision === "aprobado").length;
  const head = el("div", "section-head");
  head.style.margin = "var(--s-8) var(--s-6) var(--s-4)";
  head.innerHTML =
    `<h3 class="section-title">${icon("scales")}Joint application</h3>` +
    `<span class="label">${c.estado === "aprobada" ? "approved" : "proposed"} · ${signed} of ${members.length} signatures</span>`;
  box.append(head);

  const amounts = {};
  c.presupuesto.split(/\n|;/).forEach((line) => {
    const [org, rest] = line.split(":");
    if (!org || !rest) return;
    const n = rest.replace(/[^\d]/g, "");
    if (n) amounts[org.trim()] = parseInt(n, 10);
  });
  const roles = {};
  c.roles.split(/\n|;/).forEach((line) => {
    const [org, rest] = line.split(":");
    if (org && rest) roles[org.trim()] = rest.trim();
  });

  const list = el("div", "reqs");
  members.forEach((org, i) => {
    const row = el("div", "req");
    enter(row, i);
    const alreadySigned = state.firmas_coalicion.some((f) => f.coalicion_id === c.id && f.org_id === org);
    row.innerHTML =
      `<span class="cap cap--${routeOf(org)}">${initials(org)}</span>` +
      `<span><strong>${nameOf(org)}</strong><br><span class="entry__what">${clean(roles[org] || "role to be set")}</span></span>` +
      `<span class="req__who mono">${(amounts[org] || 0).toLocaleString("en-US")} ${state.convocatoria.moneda}` +
      (alreadySigned ? ` ${icon("check")}` : "") + `</span>`;
    if (!alreadySigned && c.estado === "propuesta" && org === me) {
      const b = el("button", "btn btn--small");
      b.type = "button";
      b.textContent = `Sign as ${dirOf(org)}`;
      b.addEventListener("click", async () => {
        b.setAttribute("aria-disabled", "true");
        try { await post(`/api/coalitions/${c.id}/decide`, { org_id: org, decision: "aprobado" }); await load(); }
        catch (e) { showError(e.message); b.removeAttribute("aria-disabled"); }
      });
      row.append(b);
    }
    list.append(row);
  });
  box.append(list);

  const ev = el("p", "hint");
  ev.style.padding = "var(--s-4) var(--s-6) var(--s-8)";
  ev.textContent = `Evidence attached: ${c.evidencia.split("\n")[0]}`;
  box.append(ev);
}

/* --- the ledger --- */
function renderLedger() {
  const box = $("#ledger");
  box.replaceChildren();

  // Three states, not two. An agreement both organizations signed but that has
  // not been delivered yet is "aprobado", and counting only "cumplido" and
  // "propuesto" made the headline read "5 entries · 4 fulfilled · 0 awaiting",
  // which does not add up and hides the very agreement the agents just produced.
  const delivered = state.acuerdos.filter((a) => a.estado === "cumplido").length;
  const signed = state.acuerdos.filter((a) => a.estado === "aprobado").length;
  const waiting = state.acuerdos.filter((a) => a.estado === "propuesto").length;
  const parts = [`${state.acuerdos.length} agreement${state.acuerdos.length === 1 ? "" : "s"}`];
  if (delivered) parts.push(`${delivered} delivered`);
  if (signed) parts.push(`${signed} signed, not yet delivered`);
  if (waiting) parts.push(`${waiting} awaiting a signature`);
  $("#ledger-legend").textContent = parts.join(" · ");

  if (!state.acuerdos.length) {
    const empty = el("p", "empty");
    empty.textContent = "No agreements yet. Run an exchange round and the agents will negotiate the first one.";
    box.append(empty);
    return;
  }

  // the row that needs a signature comes first: it is the only actionable one
  const rows = [...state.acuerdos].sort((a, b) => {
    const rank = (x) => (x.estado === "propuesto" ? 0 : 1);
    return rank(a) - rank(b) || b.id - a.id;
  });

  rows.forEach((a, i) => {
    const item = el("li", "entry" + (["aprobado", "cumplido"].includes(a.estado) ? " entry--signed" : ""));
    enter(item, i);

    const parties = [a.org_proveedora, a.org_solicitante];
    const seals = parties.map((org) => {
      const sig = state.firmas_acuerdo.find((f) => f.acuerdo_id === a.id && f.org_id === org);
      const on = sig && sig.decision === "aprobado" ? " seal__half--on" : "";
      const title = sig ? `${sig.aprobador} signed` : `${nameOf(org)} has not signed`;
      return `<span class="seal__half seal__half--${routeOf(org)}${on}" title="${title}">${initials(org)}</span>`;
    }).join("");

    item.innerHTML =
      `<span class="entry__n">#${a.id}</span>` +
      `<span class="entry__side"><span class="entry__org">${nameOf(a.org_proveedora)}</span> gives<br>` +
        `<span class="entry__what">${a.recurso_entregado}</span></span>` +
      `<span class="entry__side"><span class="entry__org">${nameOf(a.org_solicitante)}</span> gives back<br>` +
        `<span class="entry__what">${a.recurso_recibido}</span>` +
        `<span class="entry__meta">${a.condiciones}${a.resultado ? " · " + a.resultado : ""}</span></span>` +
      `<span class="entry__sign"><span class="seal">${seals}</span></span>`;

    if (a.estado === "propuesto") {
      const missing = parties.filter(
        (org) => !state.firmas_acuerdo.some((f) => f.acuerdo_id === a.id && f.org_id === org)
      );
      if (missing.includes(me)) {
        const b = el("button", "btn btn--small");
        b.type = "button";
        b.textContent = `Sign as ${dirOf(me)}`;
        b.addEventListener("click", async () => {
          b.setAttribute("aria-disabled", "true");
          try {
            await post(`/api/agreements/${a.id}/decide`, { org_id: me, decision: "aprobado" });
            await load();
            // Read the resulting state instead of predicting it: the second
            // signature is the moment the agreement becomes real, and the
            // director should be told so in those words.
            const after = state.acuerdos.find((x) => x.id === a.id);
            const active = after && after.estado !== "propuesto";
            acknowledge(
              active
                ? `You signed entry #${a.id}. Both organizations have signed, so it is now in force.`
                : `You signed entry #${a.id}.`,
              !active,
            );
          } catch (e) { showError(e.message); b.removeAttribute("aria-disabled"); }
        });
        item.querySelector(".entry__sign").append(b);
      } else {
        const w = el("span", "label");
        w.textContent = `waiting on ${nameOf(missing[0] || "")}`;
        item.querySelector(".entry__sign").append(w);
      }
    }
    box.append(item);
  });
}

/* --- the map: a route diagram, drawn at 45 and 90 degrees only --- */
const STATIONS = {
  "north-food-bank":  { x: 280, y: 80,  anchor: "middle", dy: -24 },
  "central-library":  { x: 150, y: 250, anchor: "end",    dy: -24 },
  "san-martin-school":{ x: 410, y: 250, anchor: "start",  dy: -24 },
};
const ROUTE_PATH = {
  "central-library|north-food-bank":  "M280,80 V150 L180,250 H150",
  "north-food-bank|san-martin-school":"M280,80 V150 L380,250 H410",
  "central-library|san-martin-school":"M150,250 V300 H410 V250",
};

/**
 * Sends a pulse along the route between two organizations when their agents
 * actually exchange a message.
 *
 * Until now the map drew the agreements already fulfilled and then sat still,
 * so a round could run to completion with the feed filling and the map inert.
 * A diagram of a neighborhood that does not move while the neighborhood is
 * talking is decoration. What travels here is one real message.
 *
 * The dot walks the path with getPointAtLength rather than a CSS offset-path,
 * because the route is an SVG path with corners and offset-path support for
 * those is uneven.
 */
function pulseRoute(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const svg = $("#map");
  const line = svg?.querySelector(`path[data-link="${[fromId, toId].sort().join("|")}"]`);
  if (!line) return;

  const len = line.getTotalLength();
  const start = line.getPointAtLength(0);
  const here = STATIONS[fromId];
  const there = STATIONS[toId];
  if (!here || !there) return;
  // The path is stored under a sorted key, so it may run either way. Whichever
  // end is nearer the sender is where this message starts.
  const forward = Math.hypot(start.x - here.x, start.y - here.y)
                < Math.hypot(start.x - there.x, start.y - there.y);

  line.classList.add("map__route--live");
  const clear = () => line.classList.remove("map__route--live");

  // Which station spoke and which one heard it, each at its own moment. Without
  // this the message is a dot crossing a diagram; with it the map reads as two
  // organizations taking turns.
  const ring = (orgId) => {
    const st = svg.querySelector(`circle[data-org="${orgId}"]`);
    if (!st) return;
    st.classList.add("map__station--hit");
    setTimeout(() => st.classList.remove("map__station--hit"), 520);
  };
  ring(fromId);

  if (REDUCE.matches) { setTimeout(() => { clear(); ring(toId); }, 500); return; }

  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", 6);
  dot.setAttribute("class", `map__pulse map__pulse--${routeOf(fromId)}`);
  svg.append(dot);

  const DUR = 900;
  let t0 = null;
  const step = (now) => {
    if (t0 === null) t0 = now;
    const p = Math.min(1, (now - t0) / DUR);
    const eased = 1 - Math.pow(1 - p, 3);
    const at = line.getPointAtLength((forward ? eased : 1 - eased) * len);
    dot.setAttribute("cx", at.x);
    dot.setAttribute("cy", at.y);
    dot.setAttribute("opacity", String(p < 0.12 ? p / 0.12 : p > 0.86 ? (1 - p) / 0.14 : 1));
    if (p < 1) return requestAnimationFrame(step);
    dot.remove();
    clear();
    ring(toId);
  };
  requestAnimationFrame(step);
}


function renderMap() {
  const svg = $("#map");
  const NS = "http://www.w3.org/2000/svg";
  [...svg.querySelectorAll(":scope > *:not(desc)")].forEach((n) => n.remove());

  const add = (tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (text !== undefined) n.textContent = text;
    svg.append(n);
    return n;
  };

  for (let x = 0; x <= 560; x += 40) add("line", { x1: x, y1: 0, x2: x, y2: 340, class: "map__grid" });
  for (let y = 0; y <= 340; y += 40) add("line", { x1: 0, y1: y, x2: 560, y2: y, class: "map__grid" });

  const max = Math.max(1, ...state.vinculos.map((v) => v.acuerdos));
  state.vinculos.forEach((v, i) => {
    const key = [v.a, v.b].sort().join("|");
    const d = ROUTE_PATH[key];
    if (!d) return;
    const width = 3 + (v.acuerdos / max) * 8;
    const owner = routeOf(v.a);
    const line = add("path", { d, "data-link": key, class: `map__route map__route--${owner}`, "stroke-width": width });
    if (!REDUCE.matches) {
      const len = line.getTotalLength();
      line.setAttribute("stroke-dasharray", len);
      line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: 620, delay: 120 + i * 90, easing: "cubic-bezier(0.23,1,0.32,1)" });
    }
    const mid = line.getPointAtLength(line.getTotalLength() / 2);
    add("text", { x: mid.x, y: mid.y - 16, "text-anchor": "middle", class: "map__meta" },
        `${v.acuerdos} agreement${v.acuerdos === 1 ? "" : "s"}`);
  });

  state.organizaciones.forEach((o) => {
    const p = STATIONS[o.org_id];
    if (!p) return;
    add("circle", { cx: p.x, cy: p.y, r: 9, class: "map__station", "data-org": o.org_id,
                    stroke: `var(--route-${routeOf(o.org_id)})` });
    add("text", { x: p.x, y: p.y + p.dy, "text-anchor": p.anchor, class: "map__label" },
        o.nombre.toUpperCase());
    add("text", { x: p.x, y: p.y + 26, "text-anchor": p.anchor, class: "map__meta" },
        `SERVES ${o.poblacion.toLocaleString("en-US")}`);
  });

  const legend = $("#map-legend");
  legend.replaceChildren();
  state.organizaciones.forEach((o) => {
    const item = el("span", "legend__item");
    item.innerHTML = `<span class="legend__swatch" style="background:var(--route-${routeOf(o.org_id)})"></span>${o.nombre}`;
    legend.append(item);
  });
}

const RESOURCE_ICON = (t) => {
  const s = t.toLowerCase();
  if (/van|transport|delivery/.test(s)) return "truck";
  if (/cold|refriger|freez/.test(s)) return "snow";
  if (/room|classroom|space/.test(s)) return "building";
  if (/volunteer|student/.test(s)) return "users";
  if (/workshop|literac|reading|train/.test(s)) return "board";
  return "swap";
};

function renderOrgs() {
  const box = $("#orgs");
  box.replaceChildren();
  state.organizaciones.forEach((o, i) => {
    const card = el("div", "org");
    enter(card, i);
    const things = o.recursos.map((r) =>
      `<span class="thing">${icon(RESOURCE_ICON(r.nombre))}<span>${r.nombre}<br>` +
      `<span class="thing__when">${r.disponibilidad}</span></span></span>`).join("");
    const needs = o.necesidades.map((n) =>
      `<span class="thing thing--need">${icon(RESOURCE_ICON(n.descripcion))}<span>needs: ${n.descripcion}<br>` +
      `<span class="thing__when">${n.frecuencia}</span>` +
      `<span class="urg urg--${n.urgencia}">${n.urgencia === "alta" ? "urgent" : n.urgencia === "media" ? "soon" : "when possible"}</span>` +
      `</span></span>`).join("");
    card.innerHTML =
      `<div class="org__top"><span class="org__name">${o.nombre}</span>` +
      `<span class="org__pop">${o.poblacion.toLocaleString("en-US")}</span></div>` +
      `<p class="org__dir">${o.director}</p><div class="things">${things}${needs}</div>`;
    box.append(card);
  });
}

/* ---------- the decision ---------- */

function renderPhase(fase) {
  const bar = $("#live");
  bar.dataset.fase = fase;
  $("#live-text").textContent = PHASE[fase] || fase;
  const busy = fase !== "idle" && fase !== "inactiva";
  [$("#btn-round"), $("#btn-coalition")].forEach((b) => {
    if (busy) { b.setAttribute("aria-disabled", "true"); b.title = "A round is already running"; }
    else { b.removeAttribute("aria-disabled"); b.removeAttribute("title"); }
  });
}

const TERM_LABEL = {
  contraparte_org_id: "With",
  recurso_recibido: "We receive",
  recurso_entregado: "We give",
  condiciones: "Conditions",
  necesidad_cubierta: "Need it covers",
  org_ids: "Organizations",
  roles: "Roles",
  presupuesto: "Budget split",
};
const TERM_ORDER = ["contraparte_org_id", "recurso_recibido", "recurso_entregado",
                    "condiciones", "necesidad_cubierta", "org_ids", "roles", "presupuesto"];

function renderPending(pending) {
  const zone = $("#decision");
  const clear = $("#allclear");
  // A director signs only their own organization. "barrio" is the coalition
  // decision, the one every director signs from their own console.
  const mine = pending && (pending.org_id === me || pending.org_id === "barrio");
  if (!mine) {
    zone.hidden = true;
    clear.hidden = false;
    if (pending) {
      $("#allclear-icon").setAttribute("href", "#i-clock");
      $("#allclear-title").textContent = "Nothing needs you right now.";
      $("#allclear-detail").textContent =
        `${dirOf(pending.org_id)} at ${nameOf(pending.org_id)} is reviewing an agreement. ` +
        "You will be asked when it reaches your side.";
      return;
    }
    $("#allclear-icon").setAttribute("href", "#i-check");
    $("#allclear-title").textContent = "Nothing needs you right now.";
    const waiting = state.acuerdos.filter((a) => a.estado === "propuesto").length;
    $("#allclear-detail").textContent = waiting
      ? `${waiting} agreement${waiting === 1 ? "" : "s"} in the ledger still waiting on a signature.`
      : "Your agent is watching for exchanges in the background.";
    return;
  }
  clear.hidden = true;
  zone.hidden = false;
  $("#decision-h").textContent = pending.titulo;
  $("#decision-note").textContent =
    "Signing files it as proposed. It only becomes active once the other organization signs too.";
  $("#btn-sign").querySelector("span").textContent = `Sign as ${dirOf(me)}`;

  const box = $("#decision-terms");
  box.replaceChildren();
  const args = pending.argumentos || {};
  const keys = [...TERM_ORDER.filter((k) => k in args), ...Object.keys(args).filter((k) => !TERM_ORDER.includes(k))];
  keys.forEach((k) => {
    const row = el("div", "term");
    const dt = el("dt", "term__k");
    dt.textContent = TERM_LABEL[k] || k;
    const dd = el("dd", "term__v");
    dd.textContent = k === "contraparte_org_id" ? nameOf(args[k]) : clean(String(args[k]));
    row.append(dt, dd);
    box.append(row);
  });

  const key = `${pending.titulo}|${pending.herramienta}`;
  if (key !== lastPendingSeen) {
    lastPendingSeen = key;
    const r = zone.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      zone.scrollIntoView({ behavior: REDUCE.matches ? "auto" : "smooth", block: "center" });
    }
    $("#decision-h").focus();
  }
}

/* What happens after a signature is the point: one is never enough. */
function acknowledge(what, needsOther) {
  const z = $("#ack");
  z.hidden = false;
  z.className = "ack";
  z.innerHTML = `${icon("check")}<span>${what}${needsOther ? " It still needs the other organization's signature to become active." : ""}</span>`;
}

function showError(message) {
  const z = $("#ack");
  z.hidden = false;
  z.className = "ack ack--error";
  z.innerHTML = `${icon("warning")}<span>${message}</span>`;
  const b = el("button", "btn btn--small");
  b.type = "button";
  b.textContent = "Try again";
  b.addEventListener("click", () => load().catch(() => {}));
  z.append(b);
}

/* ---------- live feed ---------- */

const EVENT_TEXT = {
  ronda_inicio: (e) => [`${e.nombre} opens a round`, "It checks its needs and asks the neighbors.", true],
  match: (e) => ["Complementarity found",
                 `${clean(e.necesidad)} can be covered by ${e.vecino}.`, true],
  terminos: (e) => ["Terms closed", clean(e.texto), true],
  aprobacion_requerida: (e) => ["The agent stopped", `${e.titulo}. It is waiting for a signature.`, true],
  aprobacion_resuelta: (e) => ["Decision made",
                               e.decision === "yes" ? "Signed. The agent continues." : "Declined. Nothing was written.", true],
  ronda_fin: (e) => ["Round closed", clean(e.texto), true],
  coalicion_inicio: (e) => [`Funding call: ${e.convocatoria}`, `${e.monto.toLocaleString("en-US")} USD.`, true],
  escaneo: (e) => ["Eligibility scan", clean(e.texto), false],
  evidencia: (e) => [`Evidence: ${e.total} fulfilled agreements`, clean(e.texto), true],
  sin_match: () => ["No match", "No neighbor has anything covering our needs this week.", true],
  sin_coalicion: () => ["No viable coalition", "No combination meets every requirement.", true],
  reintento: (e) => ["Retrying", e.mensaje, false],
  error: (e) => ["The round failed", e.mensaje, true],
};

function followFeed(list, item) {
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
  list.append(item);
  if (atBottom) list.scrollTop = list.scrollHeight;
  while (list.children.length > 60) list.firstElementChild.remove();
}

function addEvent(ev, live = false) {
  if (ev.tipo === "fase") return renderPhase(ev.fase);
  if (ev.tipo === "aprobacion_requerida" && state) renderPending(ev);
  if (ev.tipo === "aprobacion_resuelta" && state) renderPending(null);
  if (ev.tipo === "decision" || ev.tipo === "ronda_fin") {
    // Only a LIVE event may trigger a refetch. Replaying history called load()
    // once per historical decision, and load() replays the history again, so a
    // single finished round left the page fetching its own state about 150 times
    // a second forever. It also destroyed the feed between every frame, which is
    // why nothing in it could be clicked or animated.
    if (live) load().catch(() => {});
    if (ev.tipo === "decision") return;
  }

  $("#feed-empty").hidden = true;
  const list = $("#feed");
  const item = el("li", "event");
  enter(item, 0, "stream");

  const t = el("span", "event__t");
  t.textContent = (ev.hora || "").slice(11, 16);
  item.append(t);

  const body = el("div");
  const route = el("p", "event__route");
  const text = el("p", "event__text");
  let typed = "";

  if (ev.tipo === "mensaje") {
    const from = state?.organizaciones.find((o) => o.nombre === ev.de);
    const to = state?.organizaciones.find((o) => o.nombre === ev.a);
    route.innerHTML =
      `<span class="dot dot--${from ? routeOf(from.org_id) : "lib"}"></span>` +
      `<span class="label">${ev.de}</span>${icon("arrow")}` +
      `<span class="dot dot--${to ? routeOf(to.org_id) : "lib"}"></span>` +
      `<span class="label">${ev.a}</span><span class="label">A2A</span>`;
    if (ev.texto.length > 260) text.classList.add("event__text--clamp");
    typed = clean(ev.texto);
    if (live && from && to) pulseRoute(from.org_id, to.org_id);
  } else {
    const make = EVENT_TEXT[ev.tipo];
    if (!make) return;
    const [title, detail, milestone] = make(ev);
    if (milestone) item.classList.add("event--milestone");
    route.innerHTML = `<span class="label">${title}</span>`;
    if (detail.length > 260) text.classList.add("event__text--clamp");
    typed = clean(detail);
  }

  body.append(route, text);
  item.append(body);
  followFeed(list, item);
  // After it is in the document, so the reserved box can be measured.
  if (live) typeInto(text, typed);
  else text.textContent = typed;
}

function connect() {
  const src = new EventSource("/api/stream");
  src.onmessage = (m) => { try { addEvent(JSON.parse(m.data), true); } catch (_) {} };
  src.onerror = () => { src.close(); setTimeout(connect, 3000); };
}

/* ---------- actions ---------- */

async function startRound() {
  $("#feed").replaceChildren();
  $("#feed-empty").hidden = true;
  try { await post("/api/round/exchange", { org_id: me }); }
  catch (e) { showError(e.message); }
}
async function startCoalition() {
  $("#feed").replaceChildren();
  $("#feed-empty").hidden = true;
  try { await post("/api/round/coalition", {}); }
  catch (e) { showError(e.message); }
}

async function decide(decision) {
  const sign = $("#btn-sign"), decline = $("#btn-decline");
  const label = sign.querySelector("span");
  const original = label.textContent;
  [sign, decline].forEach((b) => b.setAttribute("aria-disabled", "true"));
  sign.setAttribute("aria-busy", "true");
  label.textContent = decision === "aprobado" ? "Signing…" : "Declining…";
  try {
    await post("/api/round/interrupt", { decision, org_id: me });
    if (decision === "aprobado") acknowledge(`You signed as ${dirOf(me)}.`, true);
    else acknowledge("Declined. Nothing was written to the ledger.", false);
  } catch (e) {
    showError(e.message);
  } finally {
    [sign, decline].forEach((b) => b.removeAttribute("aria-disabled"));
    sign.removeAttribute("aria-busy");
    label.textContent = original;
  }
}

/* Switching organization is what makes the two-signature rule visible: you sign
   from one console, then from the other, and only then does the agreement exist. */
$("#identity").addEventListener("click", () => {
  const ids = state ? state.organizaciones.map((o) => o.org_id) : [];
  if (!ids.length) return;
  me = ids[(ids.indexOf(me) + 1) % ids.length];
  // The acknowledgement is written in the first person, so it belongs to the
  // director who acted. Leaving it up after a switch put "You signed as Luis
  // Mendoza" on Ana Torres's screen, on the one screen whose whole job is to
  // make clear that a signature belongs to one organization.
  const ack = $("#ack");
  ack.hidden = true;
  ack.replaceChildren();
  render();
});

$("#btn-round").addEventListener("click", startRound);
$("#btn-coalition").addEventListener("click", startCoalition);
$("#btn-sign").addEventListener("click", () => decide("aprobado"));
$("#btn-decline").addEventListener("click", () => decide("rechazado"));

document.querySelectorAll(".shell section").forEach((s, i) => s.style.setProperty("--b", i));

load().catch(() => {});
connect();

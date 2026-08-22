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
  "riverside-health-post": "health",
  "casa-vecinal-kitchen": "kitchen",
  "eastside-youth-club": "youth",
};
const routeOf = (orgId) => ROUTE[orgId] || "lib";

// The same six values as hex. MapLibre paints from a style expression and cannot
// read a CSS custom property, so the map needs the literal. Kept beside ROUTE so
// a colour change touches one place.
const ROUTE_HEX = {
  food: "#ffb599", lib: "#75d4ea", school: "#e3c05f",
  health: "#8ed6a9", kitchen: "#d79ad6", youth: "#9fb0f5",
};
const routeHex = (orgId) => ROUTE_HEX[routeOf(orgId)];

const REDUCE = matchMedia("(prefers-reduced-motion: reduce)");
// Sampled once at parse time meant a viewer who turned reduced motion on kept
// getting animation until they reloaded.
REDUCE.addEventListener?.("change", () => { if (state) render(); });

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
/**
 * Escapes text before it is interpolated into markup.
 *
 * This is not a generic precaution. The strings in an agreement are written by
 * ANOTHER organization's agent, at another endpoint, and travel here as free
 * text: the neighbor's reply becomes the negotiation, the negotiation becomes
 * the record_agreement arguments, and those are what the ledger renders. A
 * hostile or merely careless peer could put an <img onerror> in a resource name
 * and have it execute in every director's browser, including a script that
 * answers the very human-approval pause the whole design exists to protect.
 *
 * clean() strips emoji and markdown. It never touched a bracket.
 */
function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  renderPhase(state.ronda?.fase || "idle");
  renderPending(state.ronda?.pendiente || null);
  renderOrgCard();
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

  // Switching who you are has to change something you can see. It used to change
  // only which pending decision the panel would show, so with nothing pending the
  // control appeared to do nothing at all.
  document.querySelectorAll(".pin").forEach((el) => {
    el.classList.toggle("pin--me", el.dataset.org === me);
  });
  window.NB?.centreOn(me, state?.organizaciones || []);
  renderYouAre();
}

/** Where this director stands: what they hold, what they owe, what they are owed. */
function renderYouAre() {
  const box = $("#youare");
  if (!box || !state) return;
  const o = state.organizaciones.find((x) => x.org_id === me);
  if (!o) { box.hidden = true; return; }

  const mine = state.acuerdos.filter(
    (a) => a.org_proveedora === me || a.org_solicitante === me);
  const firmados = mine.filter((a) => a.estado !== "propuesto").length;
  const conQuien = new Set(mine.map((a) => a.org_proveedora === me ? a.org_solicitante : a.org_proveedora));

  box.hidden = false;
  box.replaceChildren();
  const wrap = el("div", `youare youare--${routeOf(me)}`);
  wrap.innerHTML =
    `<p class="label">You are</p>` +
    `<p class="youare__who"><strong>${esc(dirOf(me))}</strong> at ${esc(o.nombre)}</p>` +
    `<ul class="youare__facts">` +
      `<li><span class="youare__n">${o.recursos.length}</span> things idle</li>` +
      `<li><span class="youare__n">${o.necesidades.length}</span> needs open</li>` +
      `<li><span class="youare__n">${firmados}</span> signed agreement${firmados === 1 ? "" : "s"}` +
        (conQuien.size ? ` with ${[...conQuien].map((x) => esc(nameOf(x))).join(" and ")}` : "") + `</li>` +
    `</ul>` +
    (mine.length ? "" : `<p class="hint">No agreements yet, which is why no line reaches this ` +
      `organization on the map. A line is a fulfilled agreement.</p>`);
  box.append(wrap);
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
      : who.includes("together") || who.includes("agreements")
        ? `<span class="cap cap--all">${esc(who)}</span>`
        : who.split(", ").map((o) => `<span class="cap cap--${routeOf(o)}">${initials(o)}</span>`).join("");
    row.innerHTML =
      `<span class="req__id">${esc(r.id)}</span>` +
      `<span class="req__who">${caps}</span>` +
      `<span class="req__text">${esc(r.descripcion)}` +
        (r.tipo === "colaboracion" ? ' <span class="label">this is what the ledger is for</span>' : "") +
      `</span>`;
    reqs.append(row);
  });

  // alone versus together, which is the whole argument of the second layer
  const alone = $("#alone");
  alone.replaceChildren();
  const total = c.requisitos.length;
  // A row each, ordered by how much of the call an organization covers on its
  // own. Six of these plus the combined figure was seven columns side by side,
  // which no panel width could hold.
  const orden = [...state.organizaciones]
    .sort((a, b) => b.requisitos_cubiertos.length - a.requisitos_cubiertos.length);
  orden.forEach((o, i) => {
    const n = o.requisitos_cubiertos.length;
    const col = el("div", "alone__col");
    enter(col, i);
    col.innerHTML =
      `<span class="alone__n">${n}</span>` +
      `<p class="alone__who"><span class="cap cap--${routeOf(o.org_id)}">${esc(initials(o.org_id))}</span> ${esc(o.nombre)}</p>` +
      `<span class="alone__of">${n} of ${total} alone</span>` +
      `<span class="alone__bar"><i style="transform:scaleX(${(n / total).toFixed(3)})"></i></span>`;
    alone.append(col);
  });
  const juntas = c.cubiertos_en_conjunto.length;
  const together = el("div", "alone__col alone--together");
  enter(together, orden.length);
  together.innerHTML =
    `<span class="alone__n">${juntas}</span>` +
    `<p class="alone__who"><strong>The whole neighborhood</strong></p>` +
    `<span class="alone__of">${c.poblacion_conjunta.toLocaleString("en-US")} people</span>` +
    `<span class="alone__bar"><i style="transform:scaleX(${(juntas / total).toFixed(3)})"></i></span>`;
  alone.append(together);

  renderCoalition();
}

function renderCoalition() {
  const box = $("#coalition");
  box.replaceChildren();
  const c = state.coaliciones[0];
  if (!c) {
    const wrap = el("div", "empty");
    wrap.dataset.coalitionHost = "1";
    wrap.innerHTML =
      `<p>No single organization qualifies for this fund. Ask the coalition agent to ` +
      `check the neighborhood's combined capabilities.</p>`;
    const b = el("button", "btn btn--small");
    b.type = "button";
    b.dataset.coalition = "1";      // the one button that renderPhase disables
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
      `<span><strong>${esc(nameOf(org))}</strong><br><span class="entry__what">${esc(clean(roles[org] || "role to be set"))}</span></span>` +
      `<span class="req__who mono">${amounts[org] ? amounts[org].toLocaleString("en-US") + " " : ""} ${esc(state.convocatoria.moneda)}` +
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

/**
 * Writes the ledger out as CSV.
 *
 * The product's stated output is evidence for a grant application, and until now
 * that evidence could not leave the browser. A grant officer needs the date, the
 * two parties, what each gave, what happened, and who signed. All of it was
 * already in the database.
 */
function exportLedger() {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["entry", "agreed", "state", "gives", "resource given",
                "gives back", "resource returned", "conditions", "outcome",
                "signed by", "signed on"];
  const rows = [...state.acuerdos].sort((a, b) => a.id - b.id).map((a) => {
    const sigs = state.firmas_acuerdo
      .filter((f) => f.acuerdo_id === a.id && f.decision === "aprobado");
    return [
      a.id, a.fecha, a.estado,
      nameOf(a.org_proveedora), a.recurso_entregado,
      nameOf(a.org_solicitante), a.recurso_recibido,
      a.condiciones, a.resultado || "",
      sigs.map((f) => `${f.aprobador} (${nameOf(f.org_id)})`).join("; "),
      sigs.map((f) => f.fecha).sort().slice(-1)[0] || "",
    ].map(cell).join(",");
  });
  const csv = [head.map(cell).join(","), ...rows].join(String.fromCharCode(13, 10));
  const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"}));
  const a = document.createElement("a");
  a.href = url;
  a.download = "neighborhood-ledger.csv";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A date a person can read, from the ISO string the ledger stores. */
function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"});
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
  // The tab carries the count, so the panel says how much evidence exists
  // without having to be opened.
  const badge = $("#view-n-ledger");
  if (badge) badge.textContent = String(state.acuerdos.length);

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

    // A record whose stated purpose is evidence for a funding application needs
    // to say when it was agreed and who signed it. Both were already in the
    // database and neither reached the page: the ledger showed two initials in a
    // capsule whose meaning was only in a mouse-only tooltip.
    const signedBy = parties
      .map((org) => state.firmas_acuerdo.find(
        (f) => f.acuerdo_id === a.id && f.org_id === org && f.decision === "aprobado"))
      .filter(Boolean);
    const lastSig = signedBy.map((f) => f.fecha).sort().slice(-1)[0];
    const STATE_WORD = {
      propuesto: "awaiting a signature",
      aprobado: "signed, not yet delivered",
      cumplido: "delivered",
      rechazado: "declined",
    };

    const seals = parties.map((org) => {
      const sig = state.firmas_acuerdo.find((f) => f.acuerdo_id === a.id && f.org_id === org);
      const on = sig && sig.decision === "aprobado" ? " seal__half--on" : "";
      const title = sig ? `${sig.aprobador} signed` : `${nameOf(org)} has not signed`;
      return `<span class="seal__half seal__half--${routeOf(org)}${on}" title="${esc(title)}">${esc(initials(org))}</span>`;
    }).join("");

    item.dataset.id = String(a.id);
    item.innerHTML =
      `<span class="entry__n">#${a.id}</span>` +
      `<span class="entry__side"><span class="entry__org">${esc(nameOf(a.org_proveedora))}</span> gives<br>` +
        `<span class="entry__what">${esc(a.recurso_entregado)}</span></span>` +
      `<span class="entry__side"><span class="entry__org">${esc(nameOf(a.org_solicitante))}</span> gives back<br>` +
        `<span class="entry__what">${esc(a.recurso_recibido)}</span>` +
        `<span class="entry__meta">${esc(a.condiciones)}${a.resultado ? " · " + esc(a.resultado) : ""}</span></span>` +
      `<span class="entry__sign">` +
        `<span class="entry__state">${esc(STATE_WORD[a.estado] || a.estado)}</span>` +
        `<span class="seal">${seals}</span></span>` +
      `<span class="entry__prov">` +
        `<span>${esc(shortDate(a.fecha))}</span>` +
        (signedBy.length
          ? `<span>signed by ${esc(signedBy.map((f) => f.aprobador).join(" and "))}` +
            (lastSig ? ` · ${esc(shortDate(lastSig))}` : "") + `</span>`
          : `<span>not signed yet</span>`) +
      `</span>`;

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
// Each station also declares where its two labels go, chosen to point AWAY from
// the legs that leave it. Both labels used to sit directly under the node on a
// fixed offset, which put "SERVES 480" on top of the coral vertical and cut the
// first and last glyph of the other two. A transit diagram with a line drawn
// through its own data is the one thing this map cannot afford.
/* The neighborhood lives on a real map now: see neighborhood.js. What used to be
   here was a hand-placed transit diagram with invented station coordinates, a
   hand-written path per pair, and a pulse walking those paths. All three are
   replaced by real geography, real driving routes and real distances. */

function renderMap() {
  if (!window.NB) return;
  NB.drawLinks(state.vinculos || []);

  // The pins say who has something to decide, so the map answers the question
  // "where do I come in" without a caption.
  const esperando = (state.acuerdos || [])
    .filter((a) => a.estado === "propuesto")
    .flatMap((a) => [a.org_proveedora, a.org_solicitante]
      .filter((org) => !(state.firmas_acuerdo || []).some(
        (f) => f.acuerdo_id === a.id && f.org_id === org && f.decision === "aprobado")));
  const pendiente = state.ronda?.pendiente?.org_id;
  NB.markWaiting([...new Set([...esperando, ...(pendiente ? [pendiente] : [])])]);
}

/** Sends a message across the map, along the road it would actually travel. */
function pulseRoute(fromId, toId) {
  window.NB?.pulseRoute(fromId, toId);
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

/* The organization list moved onto the map: six pins carry the same thing and
   a click opens the full card. A column repeating it under the map was the
   same information twice. */

function renderPhase(fase) {
  const bar = $("#live");
  bar.dataset.fase = fase;
  $("#live-text").textContent = PHASE[fase] || fase;
  const busy = fase !== "idle" && fase !== "inactiva";
  [$("#btn-round"), ...document.querySelectorAll("[data-coalition]")].forEach((b) => {
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

/**
 * Drops clauses a field just repeats from the fields above it.
 *
 * The model tends to write CONDITIONS by concatenating what we receive and what
 * we give, so the hero card of the signature flow asked a director to read the
 * same two sentences twice and work out whether the second copy added anything.
 * Usually only one clause was new.
 */
function sinEco(key, args) {
  const value = clean(String(args[key] ?? ""));
  if (key !== "condiciones") return value;
  const above = ["recurso_recibido", "recurso_entregado"]
    .map((k) => clean(String(args[k] ?? "")).toLowerCase().trim())
    .filter((t) => t.length > 12);
  const kept = value
    .split(/;|\.\s+/)
    .map((c) => c.trim())
    .filter((c) => c && !above.some((t) => {
      const low = c.toLowerCase();
      return low.includes(t) || t.includes(low);
    }));
  return kept.length ? kept.join(". ") : value;
}

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
      $("#allclear-go").hidden = true;
      return;
    }
    // An all-clear has to know who is reading it. A pending agreement that is
    // missing MY signature is the opposite of all-clear: it is the one thing on
    // the page that only this director can unblock, and it was being reported to
    // them as a footnote under the words "nothing needs you".
    const waiting = state.acuerdos.filter((a) => a.estado === "propuesto");
    const forMe = waiting.filter((a) => {
      const parties = [a.org_proveedora, a.org_solicitante];
      if (!parties.includes(me)) return false;
      return !state.firmas_acuerdo.some(
        (f) => f.acuerdo_id === a.id && f.org_id === me && f.decision === "aprobado");
    });

    if (forMe.length) {
      const first = forMe[0];
      const other = first.org_proveedora === me ? first.org_solicitante : first.org_proveedora;
      $("#allclear-icon").setAttribute("href", "#i-clock");
      $("#allclear-title").textContent =
        forMe.length === 1
          ? `Entry #${first.id} is waiting for your signature.`
          : `${forMe.length} agreements are waiting for your signature.`;
      $("#allclear-detail").textContent =
        `${dirOf(other)} at ${nameOf(other)} has signed. It becomes active when you do.`;
      $("#allclear-go").hidden = false;
      $("#allclear-go").querySelector("span").textContent = `Go to entry #${first.id}`;
      $("#allclear-go").onclick = () => {
        const row = [...document.querySelectorAll("#ledger .entry")]
          .find((r) => r.dataset.id === String(first.id));
        if (!row) return;
        row.scrollIntoView({block: "center", behavior: REDUCE.matches ? "auto" : "smooth"});
        row.querySelector("button")?.focus();
      };
      return;
    }

    $("#allclear-go").hidden = true;
    $("#allclear-icon").setAttribute("href", "#i-check");
    $("#allclear-title").textContent = "Nothing needs you right now.";
    $("#allclear-detail").textContent = waiting.length
      ? `${waiting.length} agreement${waiting.length === 1 ? "" : "s"} in the ledger waiting on the other organization.`
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
    dd.textContent = k === "contraparte_org_id" ? nameOf(args[k]) : sinEco(k, args);
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
  // The confirmation lived at the top of the document while the action that
  // produced it happened a screen and a half below, so a keyboard user signed an
  // agreement between two institutions and got no visible response at all.
  // .ack has carried a scroll-margin-top the whole time for a call nobody wrote.
  requestAnimationFrame(() => {
    z.scrollIntoView({block: "nearest", behavior: REDUCE.matches ? "auto" : "smooth"});
  });
  z.className = "ack";
  z.innerHTML = `${icon("check")}<span>${esc(what)}${needsOther ? " It still needs the other organization's signature to become active." : ""}</span>`;
}

function showError(message) {
  const z = $("#ack");
  z.hidden = false;
  z.className = "ack ack--error";
  z.innerHTML = `${icon("warning")}<span>${esc(message)}</span>`;
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
      `<span class="label">${esc(ev.de)}</span>${icon("arrow")}` +
      `<span class="dot dot--${to ? routeOf(to.org_id) : "lib"}"></span>` +
      `<span class="label">${esc(ev.a)}</span><span class="label">A2A</span>`;
    if (ev.texto.length > 260) text.classList.add("event__text--clamp");
    typed = clean(ev.texto);
    if (live && from && to) pulseRoute(from.org_id, to.org_id);
  } else {
    const make = EVENT_TEXT[ev.tipo];
    if (!make) return;
    const [title, detail, milestone] = make(ev);
    if (milestone) item.classList.add("event--milestone");
    route.innerHTML = `<span class="label">${esc(title)}</span>`;
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
  // A reconnect that does not resync is a page that looks live and is not:
  // everything published during the gap is gone, and the header keeps claiming
  // whatever phase it last heard about.
  src.onopen = () => { if (state) load().catch(() => {}); };
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
  [sign, decline].forEach((b) => { b.setAttribute("aria-disabled", "true"); b.disabled = true; });
  sign.setAttribute("aria-busy", "true");
  label.textContent = decision === "aprobado" ? "Signing…" : "Declining…";
  try {
    await post("/api/round/interrupt", { decision, org_id: me });
    // Without this the ledger, the counters, the map and the all-clear text all
    // keep the state from before the signature, so the page tells the director
    // that nothing needs them while the thing they just signed sits half done.
    await load().catch(() => {});
    if (decision === "aprobado") acknowledge(`You signed as ${dirOf(me)}.`, true);
    else acknowledge("Declined. Nothing was written to the ledger.", false);
  } catch (e) {
    showError(e.message);
  } finally {
    [sign, decline].forEach((b) => { b.removeAttribute("aria-disabled"); b.disabled = false; });
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

$("#btn-export").addEventListener("click", exportLedger);
$("#btn-round").addEventListener("click", startRound);

$("#btn-sign").addEventListener("click", () => decide("aprobado"));
$("#btn-decline").addEventListener("click", () => {
  // Declining writes 'rechazado' and no view offers a way back to a declined
  // agreement, so the destructive half of the pair was the half with no copy.
  if (!confirm("Decline this agreement? Nothing is written to the ledger and the "
           + "agents do not come back to it. This cannot be undone.")) return;
  decide("rechazado");
});

/* ---------- views ---------- */

let vista = "now";
let seleccionada = null;      // the organization the map has focused, if any

function mostrarVista(v) {
  vista = v;
  document.querySelectorAll(".view").forEach((b) => {
    const on = b.dataset.view === v;
    b.toggleAttribute("aria-current", on);
    if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
  });
  document.querySelectorAll(".view-pane").forEach((p) => { p.hidden = p.dataset.pane !== v; });
  $("#panel").scrollTop = 0;
}

document.querySelectorAll(".view").forEach((b) => {
  b.addEventListener("click", () => mostrarVista(b.dataset.view));
});

/** The card for whichever organization the map has selected. */
function renderOrgCard() {
  const box = $("#orgcard");
  const o = state?.organizaciones.find((x) => x.org_id === seleccionada);
  if (!o) { box.hidden = true; box.replaceChildren(); return; }

  box.hidden = false;
  box.replaceChildren();
  const card = el("div", `orgcard orgcard--${routeOf(o.org_id)}`);

  // Distance matters here: these exchanges are a van driving somewhere.
  const desde = state.organizaciones
    .filter((x) => x.org_id !== o.org_id)
    .map((x) => ({nombre: x.nombre, org: x.org_id, etiqueta: NB?.routeLabel(o.org_id, x.org_id) || ""}))
    .filter((x) => x.etiqueta);

  card.innerHTML =
    `<figure class="orgcard__shot">` +
      `<img src="/static/img/${esc(o.org_id)}.webp" alt="" loading="lazy" width="880" height="495">` +
    `</figure>` +
    `<button class="orgcard__close" type="button" aria-label="Close">${icon("x")}</button>` +
    `<p class="label">${esc(o.tipo)}</p>` +
    `<h3 class="orgcard__name">${esc(o.nombre)}</h3>` +
    `<p class="hint">${esc(o.director)} · serves ${o.poblacion.toLocaleString("en-US")} people` +
      (o.ubicacion?.direccion ? ` · ${esc(o.ubicacion.direccion)}` : "") + `</p>` +
    `<p class="orgcard__desc">${esc(o.descripcion)}</p>` +
    `<p class="label orgcard__sub">Idle right now</p>` +
    o.recursos.map((r) =>
      `<span class="thing">${icon(RESOURCE_ICON(r.nombre))}<span>${esc(r.nombre)}<br>` +
      `<span class="thing__when">${esc(r.disponibilidad)}</span></span></span>`).join("") +
    `<p class="label orgcard__sub">Needs</p>` +
    o.necesidades.map((n) =>
      `<span class="thing thing--need">${icon(RESOURCE_ICON(n.descripcion))}<span>${esc(n.descripcion)}<br>` +
      `<span class="thing__when">${esc(n.frecuencia)}</span></span></span>`).join("") +
    `<p class="label orgcard__sub">By road from here</p>` +
    `<ul class="dists">` + desde.map((d) =>
      `<li><span class="dot dot--${routeOf(d.org)}"></span>${esc(d.nombre)}` +
      `<span class="dists__n">${esc(d.etiqueta)}</span></li>`).join("") + `</ul>`;

  card.querySelector(".orgcard__close").addEventListener("click", () => selectOrg(null));
  box.append(card);
}

function selectOrg(orgId) {
  seleccionada = orgId;
  renderOrgCard();
  window.NB?.focusOrg(orgId, state?.organizaciones || []);
  if (orgId) mostrarVista("now");
}

/* ---------- boot ---------- */

// Called from the page once maplibre-gl and both scripts have parsed.
window.__boot = async () => {
  await load().catch(() => {});
  if (window.NB) {
    const n = await NB.loadRoutes();
    NB.buildMap(state?.organizaciones || [], selectOrg);
    // The pins do not exist until the style has loaded, so the first paint of
    // the identity has nothing to mark. Repeat it once the map is up.
    document.addEventListener("map:ready", () => { renderMap(); renderIdentity(); }, {once: true});
    if (!n) console.warn("no cached routes: run seed/build_routes.py");
  }
  connect();
};

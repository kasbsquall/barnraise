// Checks the running product at the exact resolution the camera will see, and
// refuses to pass if anything is out of frame, covered, clipped or contradicting
// itself.
//
//   node preflight.js            checks every view
//   node preflight.js --shots    also writes a PNG per view next to the report
//
// This exists because four defects reached a rendered scene before anyone saw
// them: the activity feed was not following the newest message so the agents
// were typing below the fold, the map framed three organizations when there are
// six, the banner said the agent was watching in the background through an
// entire negotiation, and the identity block carried a coloured left stripe.
// Every one of them was invisible to the checks being run at the time, which
// asked the API what the state was instead of asking the page what it showed.
//
// Nothing here is recorded. Run it, get zero failures, then record.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = process.env.BARNRAISE_URL || 'http://127.0.0.1:8080';

// Identical to record_flow.js: the layout is 1920x1080 CSS pixels and the
// viewport is opened at the real pixel size with the document zoomed, so what
// this measures is what the camera frames.
const W = 1920, H = 1080;
const SCALE = Number(process.env.CAPTURE_SCALE || 4 / 3);

const shots = process.argv.includes('--shots');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fallos = [];
const notas = [];
const fail = (vista, msg) => fallos.push(`${vista}: ${msg}`);

/** Runs in the page. Returns geometry for one view, in CSS pixels. */
function auditar() {
  const caja = (e) => {
    const r = e.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right,
             w: r.width, h: r.height };
  };
  const choca = (a, b) => !(a.right <= b.left || a.left >= b.right ||
                            a.bottom <= b.top || a.top >= b.bottom);
  const visible = (e) => {
    const s = getComputedStyle(e);
    // offsetParent catches a hidden ANCESTOR. Without it the activity column was
    // reported as following the newest message from inside two panes that were
    // not on screen at all.
    if (e.offsetParent === null && s.position !== 'fixed') return false;
    return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05;
  };
  const texto = (e) => (e.textContent || '').trim();

  const vp = { w: innerWidth, h: innerHeight };

  // Anything floating over the map. A pin behind the panel is not on camera.
  const flotantes = ['.panel', '.maplegend', '.disclosure', '.topbar']
    .map((s) => { const el = document.querySelector(s); return el && visible(el)
      ? { sel: s, ...caja(el) } : null; }).filter(Boolean);

  const pins = [...document.querySelectorAll('.pin')].map((e) => ({
    id: e.dataset.org, ...caja(e),
  }));

  // Leaf elements carrying real text. These are what gets clipped or squeezed.
  const hojas = [...document.querySelectorAll('.panel *')].filter((e) =>
    visible(e) && e.children.length === 0 && texto(e).length > 0);

  const recortados = hojas.filter((e) => {
    const s = getComputedStyle(e);
    if (s.overflow === 'visible' && s.overflowX === 'visible') return false;
    // A deliberate line clamp is not a defect; a box narrower than its text is.
    if (s.webkitLineClamp && s.webkitLineClamp !== 'none') return false;
    return e.scrollWidth > e.clientWidth + 1;
  }).map((e) => ({ sel: e.className || e.tagName, t: texto(e).slice(0, 48),
                   box: e.clientWidth, need: e.scrollWidth }));

  // A column so narrow that a sentence breaks to roughly one word per line. This
  // is the shape the ledger row and the grant table both failed in.
  const apretados = hojas.filter((e) => {
    const t = texto(e);
    if (t.length < 25 || !t.includes(' ')) return false;
    const r = e.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(e).lineHeight) || 18;
    const lineas = Math.round(r.height / lh);
    const palabras = t.split(/\s+/).length;
    return lineas >= 4 && palabras / lineas < 2.2;
  }).map((e) => ({ sel: e.className || e.tagName, t: texto(e).slice(0, 48),
                   w: Math.round(e.getBoundingClientRect().width) }));

  const panel = document.querySelector('.panel');
  const panelBox = panel ? caja(panel) : null;

  // How much of the visible pane sits below the fold. In a pane that scrolls this
  // is normal and a person reaches it; it is reported so the shot can be planned,
  // never failed. The first version of this check failed every row of a
  // twelve-entry ledger for the crime of being a list.
  const cuerpo = document.querySelector('.panel__body');
  const bajoElPliegue = cuerpo
    ? Math.max(0, cuerpo.scrollHeight - cuerpo.clientHeight) : 0;

  const feed = document.querySelector('#feed');
  let feedInfo = null;
  if (feed && visible(feed)) {
    const fb = caja(feed);
    const ultimo = feed.lastElementChild;
    feedInfo = {
      rows: feed.children.length,
      alFondo: feed.scrollHeight - feed.scrollTop - feed.clientHeight < 8,
      ultimoDentro: ultimo ? caja(ultimo).bottom <= fb.bottom + 2 : true,
      dentroDelPanel: panelBox ? fb.bottom <= panelBox.bottom + 1 : true,
      alto: Math.round(fb.h),
    };
  }

  return {
    vp, pins, flotantes, recortados, apretados, bajoElPliegue, feedInfo,
    panelBox,
    fueraDeCuadro: pins.filter((p) =>
      p.top < 0 || p.bottom > vp.h || p.left < 0 || p.right > vp.w).map((p) => p.id),
    tapados: pins.filter((p) => flotantes.some((f) => choca(p, f)))
      .map((p) => p.id + ' by ' + flotantes.find((f) => choca(p, f)).sel),
    scrollH: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    banner: {
      titulo: document.querySelector('#allclear-title')?.textContent || null,
      oculto: document.querySelector('#allclear')?.hidden ?? null,
    },
    fase: document.querySelector('#live')?.dataset.fase || null,
    decisionAbierta: !(document.querySelector('#decision')?.hidden ?? true),
    // A view that renders nothing is a view that broke.
    contenido: [...document.querySelectorAll('.view-pane')]
      .filter((p) => !p.hidden).map((p) => (p.textContent || '').trim().length)[0] || 0,
  };
}

function revisarVista(nombre, a) {
  if (a.scrollH) fail(nombre, 'the page scrolls sideways');
  if (a.contenido < 40) fail(nombre, `renders almost nothing (${a.contenido} characters)`);

  for (const r of a.recortados)
    fail(nombre, `text is clipped in .${r.sel}: box ${r.box}px, needs ${r.need}px — "${r.t}"`);
  for (const c of a.apretados)
    fail(nombre, `.${c.sel} is ${c.w}px wide and breaks to about one word per line — "${c.t}"`);
  if (a.bajoElPliegue > 0)
    notas.push(`${nombre}: ${a.bajoElPliegue}px below the fold, reachable by scrolling`);

  if (a.feedInfo) {
    const f = a.feedInfo;
    // When a decision is pending, the decision panel is the subject and the feed
    // sits below the fold on purpose. Demanding it fit then failed the one state
    // the film opens and closes on.
    if (!f.dentroDelPanel && !a.decisionAbierta)
      fail(nombre, 'the activity column extends past the bottom of the panel');
    if (f.rows > 0 && !f.alFondo)
      fail(nombre, 'the activity column is not scrolled to the newest message');
    if (f.rows > 0 && !f.ultimoDentro)
      fail(nombre, 'the newest message is cut off by the bottom edge of the column');
    notas.push(f.rows === 0
      ? `${nombre}: the activity column is empty, so following is unproven — run a round first`
      : `${nombre}: feed ${f.alto}px, ${f.rows} rows, pinned to the newest`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: Math.round(W * SCALE), height: Math.round(H * SCALE) },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.addInitScript((k) => {
    const apply = () => { document.documentElement.style.zoom = String(k); };
    if (document.documentElement) apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }, SCALE);

  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push('uncaught: ' + e.message));

  await page.goto(APP, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('.pin').length >= 6,
    { timeout: 45000 }).catch(() => {});
  await sleep(4000);            // the entry choreography and the map style

  const dir = path.join(__dirname, '..', 'footage');
  fs.mkdirSync(dir, { recursive: true });

  // --- the map, which every scene is shot over ---
  const mapa = await page.evaluate(auditar);
  if (mapa.pins.length < 6)
    fail('map', `only ${mapa.pins.length} organizations have a pin`);
  for (const id of mapa.fueraDeCuadro) fail('map', `${id} is outside the frame`);
  for (const t of mapa.tapados) fail('map', `${t} is covered`);
  notas.push(`map: ${mapa.pins.length} pins, all in frame and clear`);

  // --- each view in turn ---
  const vistas = await page.evaluate(() =>
    [...document.querySelectorAll('.view')].map((b) => ({
      v: b.dataset.view, label: (b.textContent || '').trim().replace(/\s+/g, ' '),
    })));

  for (const { v, label } of vistas) {
    await page.evaluate((s) => document.querySelector(`.view[data-view="${s}"]`)?.click(), v);
    await sleep(1200);
    const a = await page.evaluate(auditar);
    revisarVista(label || v, a);
    if (shots) await page.screenshot({ path: path.join(dir, `preflight_${v}.png`) });
  }

  // Back to the live view and check the banner agrees with the phase, which is
  // the pairing that spent a whole take contradicting itself on camera.
  await page.evaluate(() => document.querySelector('.view[data-view="now"]')?.click());
  await sleep(800);
  const fin = await page.evaluate(auditar);
  const corriendo = fin.fase && fin.fase !== 'idle' && fin.fase !== 'inactiva';
  if (fin.decisionAbierta) {
    notas.push(`panel: a decision is on screen, phase "${fin.fase}"`);
  } else if (fin.banner.oculto) {
    fail('panel', 'neither the decision nor the all-clear is showing');
  } else {
    if (corriendo && /watching for exchanges|Nothing needs you/i.test(fin.banner.titulo || ''))
      fail('banner', `phase is "${fin.fase}" but the panel says "${fin.banner.titulo}"`);
    notas.push(`banner: phase "${fin.fase}", panel says "${fin.banner.titulo}"`);
  }

  // Internal resource and need ids belong to the seed profiles, not to a person
  // reading the screen. The agents echo them back and they have reached the panel
  // as "[N1]", "(R1)" and bare "N1".
  const idsVisibles = await page.evaluate(() => {
    const t = document.querySelector('#decision-terms')?.textContent || '';
    return (t.match(/(^|[\s[(])(R|N|REQ)\d+\b/g) || []).map((x) => x.trim());
  });
  if (idsVisibles.length)
    fail('terms', `internal ids are showing to the reader: ${idsVisibles.join(', ')}`);

  if (errores.length)
    errores.slice(0, 5).forEach((e) => fail('console', e.slice(0, 160)));

  await browser.close();

  notas.forEach((n) => console.log('  ok  ' + n));
  if (fallos.length) {
    console.log(`\nNOT READY TO RECORD — ${fallos.length} problem${fallos.length === 1 ? '' : 's'}:`);
    fallos.forEach((f) => console.log('  -  ' + f));
    process.exit(1);
  }
  console.log('\nready to record.');
})().catch((e) => { console.error('preflight itself failed:', e.message); process.exit(2); });

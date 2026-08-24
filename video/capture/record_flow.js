// Records the Barnraise flow for scenes S4 and S5 of the pitch film.
//
//   node record_flow.js round <out.webm>   S4: a round running on the map
//   node record_flow.js sign  <out.webm>   S5: the pause and both signatures
//
// Both takes come from ONE server-side round, which is the point: the terms Luis
// reads at the pause are the terms the agents negotiated in take A. The round
// survives between takes because it is blocked on a server-side event, not on
// anything in the page.
//
// Rewritten for the map. The previous version scrolled a long page to bring the
// neighborhood into frame and clicked a button inside a section that no longer
// exists; the page does not scroll any more and the map holds the viewport.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = process.env.BARNRAISE_URL || 'http://127.0.0.1:8080';

// The layout stays at 1920x1080 CSS pixels so the product is framed exactly as a
// viewer sees it. What changes is density: the viewport is opened at the full
// pixel size and the document is zoomed, which is the only combination that
// works. deviceScaleFactor is NOT the lever: setting it to 2 and asking for a
// larger video put the page in the corner of an empty grey canvas, because
// Playwright records the viewport and the rest of the canvas is padding.
//
// 1.3333 gives 2560x1440. A camera pushing into this reads real captured detail
// rather than magnifying a 1920 plate, and it is half the file size of 4K for a
// film delivered at 1080.
const W = 1920, H = 1080;
const SCALE = Number(process.env.CAPTURE_SCALE || 4 / 3);

const mode = process.argv[2];
const out = process.argv[3];
if (!['round', 'sign'].includes(mode) || !out) {
  console.error('usage: node record_flow.js <round|sign> <out.webm>');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function state(page) {
  return page.evaluate(async () => {
    const d = await (await fetch('/api/state')).json();
    return {
      fase: d.ronda?.fase,
      pendiente: d.ronda?.pendiente || null,
      acuerdos: d.acuerdos?.length || 0,
      mensajes: (d.actividad || []).filter((e) => e.tipo === 'mensaje').length,
    };
  });
}

/** Everything is clicked inside the page: the map animates continuously, so
 *  Playwright's actionability check never sees these elements settle. */
const clic = (page, sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);

async function viewAs(page, needle, beat = 1100) {
  for (let i = 0; i < 8; i++) {
    const now = await page.evaluate(() => document.querySelector('#identity-name').textContent);
    if (now && now.includes(needle)) return now;
    await clic(page, '#identity');
    await sleep(beat);
  }
  throw new Error(`could not switch identity to ${needle}`);
}

/** The map loads its style over the network; nothing is worth filming until the
 *  pins exist. */
async function mapReady(page, limite = 40000) {
  const fin = Date.now() + limite;
  while (Date.now() < fin) {
    const n = await page.evaluate(() => document.querySelectorAll('.pin').length);
    if (n >= 6) return n;
    await sleep(700);
  }
  throw new Error('the map never finished loading');
}

const NEGATIVO = /\b(declin\w*|reject\w*|refus\w*|unable|not available|no agreement|withdraw\w*|cancel\w*|failed|failure)\b/i;

const CALENDARIO = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday', 'morning', 'mornings', 'afternoon', 'afternoons', 'day',
  'days', 'week', 'weekly', 'month', 'monthly', 'hour', 'hours', 'time', 'times',
  'notice', 'available', 'availability', 'evening', 'evenings']);
const palabras = (t) => new Set((String(t).toLowerCase().match(/[a-z]{3,}/g) || [])
  .filter((w) => !CALENDARIO.has(w)));
const dias = (t) => new Set(String(t).toLowerCase()
  .match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/g) || []);

/** The questions the deterministic guards ask, asked before the camera commits.
 *  A take whose terms the guards will refuse has nothing for the signing scene. */
async function revisar(page, t, orgId) {
  const mios = await page.evaluate(async (org) => {
    const d = await (await fetch('/api/state')).json();
    return d.organizaciones.find((x) => x.org_id === org)
      .recursos.map((r) => `${r.nombre} ${r.notas || ''}`);
  }, orgId);

  const fallos = [];
  const need = dias(t.necesidad_cubierta), cond = dias(t.condiciones);
  if (need.size && cond.size && ![...cond].some((d) => need.has(d)))
    fallos.push(`conditions say [${[...cond]}] but the need is [${[...need]}]`);

  const dado = palabras(t.recurso_entregado);
  const mio = (r) => {
    const mias = palabras(r);
    const comunes = [...mias].filter((w) => dado.has(w)).length;
    return comunes >= 2 && comunes >= Math.min(3, Math.floor(mias.size / 3));
  };
  if (!mios.some(mio))
    fallos.push(`"${t.recurso_entregado}" is not one of this organization's resources`);

  const quiero = palabras(t.necesidad_cubierta), recibo = palabras(t.recurso_recibido);
  if (quiero.size && ![...recibo].some((w) => quiero.has(w)))
    fallos.push(`"${t.recurso_recibido}" does not cover "${t.necesidad_cubierta}"`);

  // A round once reached the pause with conditions reading "exchange declined by
  // Central Library" on an agreement it was filing for signature. Every other
  // check passed, because none of them read the terms for a sentence that
  // contradicts the agreement existing at all.
  for (const [campo, valor] of Object.entries(t)) {
    if (typeof valor === 'string' && NEGATIVO.test(valor))
      fallos.push(`${campo} says the exchange did not happen: "${valor}"`);
  }
  return fallos;
}

(async () => {
  const dir = path.dirname(path.resolve(out));
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: Math.round(W * SCALE), height: Math.round(H * SCALE) },
    recordVideo: { dir, size: { width: Math.round(W * SCALE), height: Math.round(H * SCALE) } },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.addInitScript((k) => {
    const apply = () => { document.documentElement.style.zoom = String(k); };
    if (document.documentElement) apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }, SCALE);

  await page.goto(APP, { waitUntil: 'load', timeout: 60000 });
  const pins = await mapReady(page);
  console.log(`map up, ${pins} organizations`);
  await sleep(2600);          // let the entry choreography finish

  if (mode === 'round') {
    // A round left paused by a previous attempt blocks this one with a 409, and
    // a declined round takes a moment to unwind. Clear it rather than failing.
    for (let i = 0; i < 40; i++) {
      const s = await state(page);
      if (!s.pendiente && s.fase === 'inactiva') break;
      if (s.pendiente) {
        await page.evaluate(async (org) => {
          await fetch('/api/round/interrupt', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision: 'rechazado', org_id: org }),
          });
        }, s.pendiente.org_id);
      }
      if (i === 0) console.log('waiting for the previous round to unwind');
      await sleep(3000);
    }

    await clic(page, '#btn-round');
    console.log('round started');

    const deadline = Date.now() + 480000;
    let last = '';
    while (Date.now() < deadline) {
      const s = await state(page);
      if (s.fase !== last) { console.log(`  ${s.fase} · ${s.mensajes} messages`); last = s.fase; }
      if (s.pendiente) { console.log('  paused for a human'); await sleep(3200); break; }
      await sleep(900);
    }

    const end = await state(page);
    if (!end.pendiente) throw new Error('the round never reached the pause');
    const t = end.pendiente.argumentos;
    console.log('TERMS:', JSON.stringify(t, null, 2));
    const fallos = await revisar(page, t, end.pendiente.org_id);
    if (fallos.length) {
      console.log('\nDISCARD THIS TAKE:');
      fallos.forEach((f) => console.log('  -', f));
      process.exitCode = 2;
    }
  }

  if (mode === 'sign') {
    const s0 = await state(page);
    if (!s0.pendiente) throw new Error('no decision is pending; run the round take first');
    const nombres = await page.evaluate(async () => {
      const d = await (await fetch('/api/state')).json();
      return Object.fromEntries(d.organizaciones.map((o) => [o.org_id, o.nombre]));
    });
    const owner = s0.pendiente.org_id;
    const other = s0.pendiente.argumentos.contraparte_org_id;

    // 1. The director whose decision it is reads the terms.
    await viewAs(page, nombres[owner]);
    await sleep(3200);

    // 2. The proof shot: from the counterpart's console the decision is not
    //    there, and the panel names who is deciding instead.
    await viewAs(page, nombres[other]);
    await sleep(3400);

    // 3. Back, and sign.
    await viewAs(page, nombres[owner]);
    await sleep(1800);
    await clic(page, '#btn-sign');
    await sleep(4200);

    // 4. The counterpart is told the entry is waiting for them, and taken to it.
    await viewAs(page, nombres[other]);
    for (let i = 0; i < 40; i++) {
      const listo = await page.evaluate(() => {
        const go = document.querySelector('#allclear-go');
        return go && !go.hidden;
      });
      if (listo) break;
      await sleep(1000);
    }
    await sleep(2400);
    await clic(page, '#allclear-go');
    await sleep(2600);

    // 5. They sign from the ledger and the row turns cream.
    await page.evaluate(() => {
      const row = [...document.querySelectorAll('#ledger .entry')].find((r) => r.querySelector('button'));
      if (!row) throw new Error('no ledger row is waiting for a signature');
      row.querySelector('button').click();
    });
    // Hold on the ledger while the row turns cream. This is the one moment the
    // reserved colour appears, and an earlier take cut away to the map before it
    // landed, so the scene never contained the thing it exists to show.
    await sleep(7500);

    // 6. And the line on the map is thicker than it was.
    await clic(page, '.view[data-view="now"]');
    await sleep(4500);

    const s1 = await state(page);
    console.log(`ledger: ${s0.acuerdos} -> ${s1.acuerdos} · pending: ${!!s1.pendiente}`);
  }

  await ctx.close();
  await browser.close();

  const produced = fs.readdirSync(dir).filter((f) => f.endsWith('.webm'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  const from = path.join(dir, produced.f);
  if (path.resolve(from) !== path.resolve(out)) fs.renameSync(from, path.resolve(out));
  console.log('wrote', out, (fs.statSync(path.resolve(out)).size / 1e6).toFixed(1) + ' MB');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });

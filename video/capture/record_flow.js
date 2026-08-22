// Records the Barnraise flow for scenes S4 and S5 of the pitch film.
//
// Both takes come from ONE server-side round, which is the point: the terms Luis
// reads at the pause are the terms the agents negotiated in take A, so the two
// scenes corroborate each other instead of being two unrelated captures.
//
//   node record_flow.js round  <out.webm>   S4: discovery and negotiation, live
//   node record_flow.js sign   <out.webm>   S5: the pause, both signatures
//
// The round survives between takes because it is blocked on a server-side event,
// not on anything in the page.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = process.env.BARNRAISE_URL || 'http://127.0.0.1:8080';

// The layout stays at 1920x1080 CSS pixels, so the product is framed exactly as a
// viewer sees it. What changes is the DENSITY: at deviceScaleFactor 2 the same
// layout is rasterised into 3840x2160 real pixels.
//
// This is what fixes the film looking soft. A camera pushing 3x into a 1920-wide
// plate is stretching 640 source pixels across the frame, and no amount of care
// in the render recovers detail that was never captured. At 2x density the same
// push reads 1280 source pixels into a 1920 frame, which is a downscale.
//
// deviceScaleFactor is NOT the lever. Setting it to 2 and asking for a 3840x2160
// video put the page in the top-left quarter of a grey 4K canvas: Playwright
// records the viewport, and the extra canvas is just empty. The viewport is
// opened at the full pixel size instead, and the document is zoomed so the app
// still lays itself out at 1920 CSS pixels.
const W = 1920, H = 1080;
const SCALE = Number(process.env.CAPTURE_SCALE || 2);

const mode = process.argv[2];
const out = process.argv[3];
if (!['round', 'sign'].includes(mode) || !out) {
  console.error('usage: node record_flow.js <round|sign> <out.webm>');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function state(page) {
  return page.evaluate(async () => {
    const r = await fetch('/api/state');
    const d = await r.json();
    return { fase: d.ronda?.fase, pendiente: d.ronda?.pendiente || null, acuerdos: d.acuerdos?.length || 0 };
  });
}

/** Who the console is viewing as, stepping the identity chip until it matches. */
async function viewAs(page, needle, beat = 900) {
  for (let i = 0; i < 4; i++) {
    const now = await page.evaluate(() => document.querySelector('#identity-name').textContent);
    if (now && now.includes(needle)) return now;
    await page.evaluate(() => document.querySelector('#identity').click());
    await sleep(beat);
  }
  throw new Error(`could not switch identity to ${needle}`);
}

(async () => {
  const dir = path.dirname(path.resolve(out));
  fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: W * SCALE, height: H * SCALE },
    recordVideo: { dir, size: { width: W * SCALE, height: H * SCALE } },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.addInitScript((k) => {
    const apply = () => { document.documentElement.style.zoom = String(k); };
    if (document.documentElement) apply();
    else document.addEventListener('DOMContentLoaded', apply);
  }, SCALE);
  await page.goto(APP, { waitUntil: 'load', timeout: 60000 });
  // Let the entry choreography finish before anything is recorded as "action".
  await sleep(2200);

  if (mode === 'round') {
    // A declined round does not end the moment the decision is sent: the agent
    // still has to unwind. Waiting on the state rather than on a fixed sleep is
    // what stops a retry loop from failing five times in a row on a round that
    // was two seconds from finishing.
    for (let i = 0; i < 45; i++) {
      const s = await state(page);
      if (!s.pendiente && s.fase === 'inactiva') break;
      if (i === 0) console.log('waiting for the previous round to unwind');
      await sleep(2000);
    }
    const before = await state(page);
    if (before.pendiente) throw new Error('a decision is already pending; resolve it before recording the round');

    // Frame the neighborhood section BEFORE starting, or the take records a
    // static funding panel while the map and the feed do all the work below the
    // fold. The round button lives in this section's header, so one scroll puts
    // the trigger, the map and the activity feed in the same frame.
    //
    // The position has to be re-asserted, not set once: the page re-renders on
    // every state poll, the document height changes as the feed grows, and the
    // scroll drifts back. `frame()` below is called every polling iteration.
    const frame = () => page.evaluate(() => {
      const y = document.querySelector('#net-h').getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: y, behavior: 'instant' });
    });
    await page.evaluate(() => {
      const y = document.querySelector('#net-h').getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
    await sleep(2400);

    await page.evaluate(() => document.querySelector('#btn-round').click());
    console.log('round started, recording discovery and negotiation');

    // Record until the agents reach the human pause, so the take ends on the
    // moment the next scene begins rather than on an arbitrary timer.
    // Generous: a free-tier provider under load can spend minutes inside a single
    // retry, and cutting the take short there wastes the round as well as the film.
    const deadline = Date.now() + 480000;
    let last = '';
    while (Date.now() < deadline) {
      await frame();
      const s = await state(page);
      if (s.fase !== last) { console.log('  phase:', s.fase); last = s.fase; }
      if (s.pendiente) {
        console.log('  paused for a human');
        await sleep(2400);            // let the last feed rows land in frame
        break;
      }
      await sleep(900);
    }
    const end = await state(page);
    if (!end.pendiente) throw new Error('the round never reached the pause; nothing to sign in take B');
    const t = end.pendiente.argumentos;
    console.log('TERMS:', JSON.stringify(t, null, 2));

    // The calendar guard refuses conditions naming a day the negotiation never
    // agreed to, and it refuses them at the WRITE, after the human has signed.
    // A take that ends there has no agreement for the signing scene, so check it
    // now rather than discovering it two takes later.
    const days = (s) => new Set((String(s).toLowerCase()
      .match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/g) || []));
    const need = days(t.necesidad_cubierta), cond = days(t.condiciones);
    const reasons = [];
    if (need.size && cond.size && ![...cond].some((d) => need.has(d)))
      reasons.push(`conditions say [${[...cond]}] but the need is [${[...need]}]`);

    // The direction guard refuses handing over a resource we do not own, and it
    // also refuses at the write. Same reasoning as the day check: find out here.
    const CAL = new Set(['monday','tuesday','wednesday','thursday','friday','saturday','sunday',
      'morning','mornings','afternoon','afternoons','day','days','week','weekly','month','monthly',
      'hour','hours','time','times','available','availability','notice']);
    const words = (s) => new Set(String(s).toLowerCase().match(/[a-z]{3,}/g)?.filter((w) => !CAL.has(w)) || []);
    const mine = await page.evaluate(async (org) => {
      const d = await (await fetch('/api/state')).json();
      const o = d.organizaciones.find((x) => x.org_id === org);
      return o.recursos.map((r) => `${r.nombre} ${r.notas || ''}`);
    }, end.pendiente.org_id);
    // Two shared words, not one. A single overlap accepted "community room" as
    // ours because our cold room is also a "room", which is the same false
    // positive the ownership guard had with calendar words.
    const given = words(t.recurso_entregado);
    const overlap = (r, set) => [...words(r)].filter((w) => set.has(w)).length;
    if (!mine.some((r) => overlap(r, given) >= 2))
      reasons.push(`"${t.recurso_entregado}" is not one of this organization's own resources`);

    // The mirror error, which no guard catches and a viewer does: receiving back
    // something we already own, while the org plates in the same frame say so.
    const got = words(t.recurso_recibido);
    // The mirror check (is what we RECEIVE actually ours?) was removed: it kept
    // rejecting correct takes because a van described with our own vocabulary
    // overlapped our resource notes. A check that discards good material is
    // worse than no check, since the terms are read by eye before the take is
    // kept anyway.

    // And the one a viewer catches fastest, because the need is on screen right
    // beside it: receiving something that has nothing to do with what we needed.
    // No guard refuses this — the coherence check compares against the neighbor's
    // whole catalogue, so anything the neighbor ever mentioned satisfies it.
    const want = words(t.necesidad_cubierta);
    if (want.size && ![...got].some((w) => want.has(w)))
      reasons.push(`"${t.recurso_recibido}" does not cover "${t.necesidad_cubierta}"`);

    if (reasons.length) {
      console.log('\nDISCARD THIS TAKE:');
      reasons.forEach((r) => console.log('  -', r));
      console.log('The guards will refuse the write, so take B would have nothing to sign.');
      process.exitCode = 2;
    }
  }

  if (mode === 'sign') {
    const s0 = await state(page);
    if (!s0.pendiente) throw new Error('no decision is pending; run the round take first');
    const owner = s0.pendiente.org_id;
    const ledgerBefore = s0.acuerdos;

    // 1. The owning director reads the terms.
    await viewAs(page, owner === 'north-food-bank' ? 'North Food Bank'
                     : owner === 'central-library' ? 'Central Library' : 'San Martin School');
    await sleep(2600);

    // 2. The proof shot: from another organization the decision is not there.
    //    This is what makes the two-signature rule visible instead of claimed.
    await viewAs(page, 'Central Library');
    await sleep(3000);

    // 3. Back to the director whose decision it is, and sign.
    await viewAs(page, 'North Food Bank');
    await sleep(1600);
    await page.evaluate(() => document.querySelector('#btn-sign').click());
    await sleep(3400);                 // the acknowledgement, held long enough to read

    // 4. The counterparty signs from the ledger. The row flips to cream here.
    await viewAs(page, 'Central Library');
    // The row does not exist the instant the pause resolves: the agent still has
    // to finish the write and the page has to poll it back. Wait for the row
    // rather than assuming a fixed delay is enough.
    for (let i = 0; i < 40; i++) {
      const ready = await page.evaluate(() =>
        [...document.querySelectorAll('#ledger .entry')].some((r) => r.querySelector('button')));
      if (ready) break;
      await sleep(1000);
    }
    await sleep(1400);
    // The app re-renders the ledger on every state poll, so every <li> handle
    // Playwright takes goes stale and its retry loop never converges. Resolve
    // and click inside the page instead, where the node cannot be swapped
    // between finding it and using it.
    await page.evaluate(() => {
      const row = [...document.querySelectorAll('#ledger .entry')].find((r) => r.querySelector('button'));
      if (!row) throw new Error('no ledger row is waiting for a signature');
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    await sleep(1600);
    await page.evaluate(() => {
      const row = [...document.querySelectorAll('#ledger .entry')].find((r) => r.querySelector('button'));
      row.querySelector('button').click();
    });
    await sleep(6500);                 // hold on the cream row and the acknowledgement

    const s1 = await state(page);
    console.log('ledger:', ledgerBefore, '->', s1.acuerdos, '| pending:', !!s1.pendiente);
  }

  await ctx.close();
  await browser.close();

  // Playwright names the file itself; rename to the requested path.
  const produced = fs.readdirSync(dir).filter((f) => f.endsWith('.webm'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  const from = path.join(dir, produced.f);
  if (path.resolve(from) !== path.resolve(out)) fs.renameSync(from, path.resolve(out));
  console.log('wrote', out, (fs.statSync(path.resolve(out)).size / 1e6).toFixed(1) + ' MB');
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });

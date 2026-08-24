import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO} from './theme';

/**
 * The architecture diagram.
 *
 * Devpost requires it as an uploaded file, and the repository's copy is a Mermaid
 * block inside Markdown, which cannot be uploaded.
 *
 * An earlier attempt at this was a well-set poster rather than a diagram: it
 * asserted the A2A mesh in a paragraph without drawing a single edge between the
 * agents, and it left out the web application, the event bus, the datastore and
 * the model provider entirely. What follows is the runtime topology. Every box is
 * something that exists while the system runs, every edge is drawn, and every edge
 * says what crosses it.
 *
 * Nodes are declared once as rectangles and the edges attach to those rectangles,
 * so moving a box moves its arrows instead of leaving them pointing at where it
 * used to be.
 */

const W = 2400;
const H = 1560;

type Caja = {x: number; y: number; w: number; h: number};

// The six A2A server processes sit on a ring, which is the one layout where a mesh
// between all of them can be drawn without the edges piling up on each other.
const RING = {cx: 1660, cy: 400, rx: 500, ry: 200};
const ORGS = [
  {sigla: 'CL', nombre: 'Central Library', puerto: 9001, color: C.lib},
  {sigla: 'NF', nombre: 'North Food Bank', puerto: 9002, color: C.food},
  {sigla: 'MS', nombre: 'San Martin School', puerto: 9003, color: C.school},
  {sigla: 'RH', nombre: 'Riverside Health', puerto: 9004, color: C.health},
  {sigla: 'CV', nombre: 'Casa Vecinal Kitchen', puerto: 9005, color: C.kitchen},
  {sigla: 'EY', nombre: 'Eastside Youth Club', puerto: 9006, color: C.youth},
];
const nodo = (i: number) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
  return {x: RING.cx + RING.rx * Math.cos(a), y: RING.cy + RING.ry * Math.sin(a)};
};

// The request path, left to right across the middle band.
const FILA = 780;
const ALTO = 252;
const ANCHO = 288;
const HUECO = 74;
const P = (i: number): Caja => ({x: 88 + i * (ANCHO + HUECO), y: FILA, w: ANCHO, h: ALTO});

const N: Record<string, Caja> = {
  browser: P(0),
  api: P(1),
  runner: P(2),
  guards: P(3),
  gate: P(4),
  ledger: P(5),
  modelo: {x: 88, y: 1230, w: 1000, h: 220},
  coalicion: {x: 1160, y: 1230, w: 1152, h: 220},
  malla: {x: 1030, y: 148, w: 1282, h: 500},
};

const der = (c: Caja) => ({x: c.x + c.w, y: c.y + c.h / 2});
const izq = (c: Caja) => ({x: c.x, y: c.y + c.h / 2});
const arr = (c: Caja) => ({x: c.x + c.w / 2, y: c.y});
const aba = (c: Caja) => ({x: c.x + c.w / 2, y: c.y + c.h});

const Arista: React.FC<{d: string; doble?: boolean; tenue?: boolean}> = ({d, doble, tenue}) => (
  <path d={d} fill="none" stroke={C.inkSoft} strokeWidth={1.7}
        strokeDasharray={tenue ? '8 8' : undefined} opacity={tenue ? 0.55 : 1}
        markerEnd="url(#punta)" markerStart={doble ? 'url(#punta)' : undefined} />
);

const Etiqueta: React.FC<{x: number; y: number; children: string; ancla?: string}> =
({x, y, children, ancla = 'middle'}) => (
  <text x={x} y={y} fill={C.inkFaint} fontFamily={MONO} fontSize={19}
        letterSpacing="0.05em" textAnchor={ancla as never}>{children}</text>
);

const Nodo: React.FC<{c: Caja; titulo: string; ruta?: string; lineas?: string[];
                      acento?: string; crema?: boolean}> =
({c, titulo, ruta, lineas, acento, crema}) => (
  <div style={{
    position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h,
    background: crema ? C.signed : C.plate,
    border: `1px solid ${acento || C.rule}`, borderRadius: 3,
    padding: '18px 20px', display: 'flex', flexDirection: 'column',
  }}>
    {ruta ? (
      <div style={{fontFamily: MONO, fontSize: 16, letterSpacing: '0.07em',
                   color: crema ? C.signedInk : (acento || C.inkFaint),
                   opacity: crema ? 0.6 : 1}}>{ruta}</div>
    ) : null}
    <div style={{marginTop: ruta ? 9 : 0, fontFamily: FONT.display, fontWeight: 700,
                 fontSize: 26, lineHeight: 1.14, letterSpacing: '-0.012em',
                 color: crema ? C.signedInk : C.ink}}>{titulo}</div>
    {lineas ? (
      <div style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6}}>
        {lineas.map((l) => (
          <span key={l} style={{fontFamily: MONO, fontSize: 16, lineHeight: 1.34,
                                color: crema ? C.signedInk : C.inkSoft,
                                opacity: crema ? 0.72 : 1}}>{l}</span>
        ))}
      </div>
    ) : null}
  </div>
);

export const Architecture: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.field, width: W, height: H}}>
    {/* ---------- header ---------- */}
    <div style={{position: 'absolute', left: 88, top: 52, display: 'flex',
                 alignItems: 'center', gap: 18}}>
      <svg width={44} height={44} viewBox="0 0 64 64" fill="none">
        <g stroke={C.ink} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="32" r="27" strokeWidth="1.8" />
          {[[32, 16], [45.86, 24], [45.86, 40], [32, 48], [18.14, 40], [18.14, 24]].map(
            ([x, y], i) => <path key={i} d={`M32 32 ${x} ${y}`} strokeWidth="1.8" />)}
        </g>
        <g fill={C.ink}>
          <circle cx="32" cy="32" r="4.6" />
          {[[32, 16], [45.86, 24], [45.86, 40], [32, 48], [18.14, 40], [18.14, 24]].map(
            ([x, y], i) => <circle key={i} cx={x} cy={y} r="3.1" />)}
        </g>
      </svg>
      <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 36,
                    letterSpacing: '0.1em', color: C.ink}}>BARNRAISE</span>
      <span style={{fontFamily: MONO, fontSize: 20, letterSpacing: '0.16em',
                    color: C.inkFaint, marginLeft: 16}}>RUNTIME ARCHITECTURE</span>
    </div>
    <div style={{position: 'absolute', left: 1300, top: 62, width: 1012, fontFamily: MONO,
                 fontSize: 18, lineHeight: 1.5, letterSpacing: '0.06em', color: C.inkFaint,
                 textAlign: 'right'}}>
      every box is a process, a store or a service<br />
      every edge says what crosses it
    </div>

    {/* ---------- edges, drawn under the boxes ---------- */}
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7"
                markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill={C.inkSoft} />
        </marker>
      </defs>

      {/* the A2A mesh: every pair of processes, actually drawn */}
      {ORGS.flatMap((_, i) =>
        ORGS.slice(i + 1).map((__, k) => {
          const a = nodo(i);
          const b = nodo(i + k + 1);
          return <line key={`${i}-${i + k + 1}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                       stroke={C.lib} strokeWidth={1.3} opacity={0.28} />;
        }))}

      {/* the request path */}
      {[['browser', 'api'], ['api', 'runner'], ['runner', 'guards'],
        ['guards', 'gate'], ['gate', 'ledger']].map(([a, b]) => (
        <Arista key={a} d={`M${der(N[a]).x + 6} ${der(N[a]).y} H${izq(N[b]).x - 9}`} />
      ))}
      <Etiqueta x={(der(N.browser).x + izq(N.api).x) / 2} y={FILA + ALTO / 2 - 20}>HTTP</Etiqueta>
      <Etiqueta x={(der(N.browser).x + izq(N.api).x) / 2} y={FILA + ALTO / 2 + 36}>SSE</Etiqueta>
      <Etiqueta x={(der(N.gate).x + izq(N.ledger).x) / 2} y={FILA + ALTO / 2 - 20}>SQL</Etiqueta>

      {/* the orchestrator drives the six A2A servers */}
      <Arista doble d={`M${arr(N.runner).x} ${arr(N.runner).y - 9} V${N.malla.y + N.malla.h + 62}
                        H${N.malla.x + 190} V${N.malla.y + N.malla.h + 10}`} />
      <Etiqueta x={arr(N.runner).x + 250} y={N.malla.y + N.malla.h + 44}>A2A over HTTP</Etiqueta>

      {/* and calls the model provider */}
      <Arista doble d={`M${aba(N.runner).x} ${aba(N.runner).y + 9} V${N.modelo.y - 10}`} />
      <Etiqueta x={aba(N.runner).x + 158} y={N.modelo.y - 60}>Messages API</Etiqueta>

      {/* the human loop: the gate asks the console and waits for the answer */}
      <Arista doble d={`M${aba(N.gate).x} ${aba(N.gate).y + 9} V1150
                        H${aba(N.browser).x} V${aba(N.browser).y + 9}`} />
      <Etiqueta x={1092} y={1140}>paused tool call over SSE · signature over HTTP POST</Etiqueta>

      {/* the ledger is what the second layer runs on */}
      <Arista d={`M${aba(N.ledger).x} ${aba(N.ledger).y + 9} V${N.coalicion.y - 9}`} />
      <Etiqueta x={aba(N.ledger).x + 92} y={N.coalicion.y - 34}>evidence</Etiqueta>

      {/* and the money comes back to layer 1 */}
      <Arista tenue d={`M${N.coalicion.x + N.coalicion.w} ${N.coalicion.y + 180} H2352
                        V${FILA + ALTO + 46} H${aba(N.api).x} V${aba(N.api).y + 9}`} />
      <Etiqueta x={1660} y={FILA + ALTO + 26}>funds more cooperation</Etiqueta>
    </svg>

    {/* ---------- the six A2A processes ---------- */}
    <div style={{position: 'absolute', left: N.malla.x, top: N.malla.y,
                 width: N.malla.w, height: N.malla.h,
                 border: `1px dashed ${C.rule}`, borderRadius: 4}} />
    {/* Bottom-left: the top of the ring is occupied by a node. */}
    <div style={{position: 'absolute', left: N.malla.x + 22,
                 top: N.malla.y + N.malla.h - 38,
                 fontFamily: MONO, fontSize: 18, letterSpacing: '0.13em', color: C.inkFaint}}>
      SIX OS PROCESSES · a2a/serve_org.py
    </div>
    {ORGS.map((o, i) => {
      const p = nodo(i);
      return (
        <div key={o.sigla} style={{
          position: 'absolute', left: p.x - 136, top: p.y - 51, width: 272, height: 102,
          background: C.plate, border: `1px solid ${C.rule}`, borderRadius: 3,
          padding: '12px 14px',
        }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <span style={{background: o.color, color: C.signedInk, fontFamily: MONO,
                          fontWeight: 700, fontSize: 17, padding: '3px 9px'}}>{o.sigla}</span>
            <span style={{fontFamily: MONO, fontSize: 16, color: o.color}}>:{o.puerto}</span>
          </div>
          <div style={{marginTop: 8, fontFamily: FONT.display, fontWeight: 600, fontSize: 20,
                       lineHeight: 1.1, color: C.ink}}>{o.nombre}</div>
          <div style={{fontFamily: MONO, fontSize: 14, color: C.inkFaint, marginTop: 3}}>
            own OrgProfile
          </div>
        </div>
      );
    })}
    <div style={{position: 'absolute', left: RING.cx - 182, top: RING.cy - 58, width: 364,
                 textAlign: 'center', background: C.field, padding: '12px 10px', borderRadius: 3}}>
      <div style={{fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', color: C.lib}}>A2A</div>
      <div style={{marginTop: 8, fontFamily: FONT.text, fontSize: 20, lineHeight: 1.34,
                   color: C.inkSoft}}>
        Tools are closures over one profile and take no arguments, so no tool returns a
        neighbor's data.
      </div>
    </div>

    {/* ---------- the request path ---------- */}
    <Nodo c={N.browser} ruta="the human" titulo="Director's console"
          lineas={['MapLibre · OSRM routes', 'live event stream', 'one identity at a time']} />
    <Nodo c={N.api} ruta="web/server.py" titulo="FastAPI :8080"
          lineas={['REST + /api/stream', 'in-process event bus', 'serves the console']} />
    <Nodo c={N.runner} ruta="web/runner.py" titulo="Round orchestrator"
          lineas={['01 discovery · code', '02 negotiation · LLM', '03 registration · LLM',
                   'runs on a worker thread']} />
    <Nodo c={N.guards} ruta="agents/approval.py" titulo="Deterministic guards"
          lineas={['direction · calendar', 'counterparty · placeholder', 'a trade already live',
                   'refusals say how to fix']} />
    <Nodo c={N.gate} ruta="strands · HumanInTheLoop" titulo="Two-signature gate" acento={C.lib}
          lineas={['stop_reason == interrupt', 'blocks on threading.Event',
                   'both parties, or nothing']} />
    <Nodo c={N.ledger} crema ruta="ledger/barrio.db" titulo="The Neighborhood Ledger"
          lineas={['SQLite', 'agreements + approvals', 'no row without both']} />

    {/* ---------- provider swap and the second layer ---------- */}
    <div style={{position: 'absolute', left: N.modelo.x, top: N.modelo.y,
                 width: N.modelo.w, height: N.modelo.h, background: C.plateLow,
                 border: `1px solid ${C.rule}`, borderRadius: 3, padding: '20px 24px'}}>
      <div style={{fontFamily: MONO, fontSize: 16, letterSpacing: '0.07em', color: C.inkFaint}}>
        agents/config.py · BARNRAISE_MODEL_PROVIDER
      </div>
      <div style={{marginTop: 10, fontFamily: FONT.display, fontWeight: 700, fontSize: 26,
                   color: C.ink}}>Model provider, one variable</div>
      <div style={{marginTop: 16, display: 'flex', gap: 12}}>
        {['Amazon Bedrock', 'Google AI Studio', 'Ollama · local, no key'].map((m) => (
          <span key={m} style={{fontFamily: MONO, fontSize: 17, color: C.inkSoft,
                                border: `1px solid ${C.rule}`, borderRadius: 2,
                                padding: '7px 12px'}}>{m}</span>
        ))}
      </div>
    </div>

    <div style={{position: 'absolute', left: N.coalicion.x, top: N.coalicion.y,
                 width: N.coalicion.w, height: N.coalicion.h, background: C.plateLow,
                 border: `1px solid ${C.rule}`, borderRadius: 3, padding: '20px 24px'}}>
      <div style={{fontFamily: MONO, fontSize: 16, letterSpacing: '0.07em', color: C.inkFaint}}>
        agents/coalition_agent.py · ledger evidence scan
      </div>
      <div style={{marginTop: 10, fontFamily: FONT.display, fontWeight: 700, fontSize: 26,
                   color: C.ink}}>Layer 2 · the coalition</div>
      <div style={{marginTop: 12, fontFamily: FONT.text, fontSize: 21, lineHeight: 1.36,
                   color: C.inkSoft}}>
        A funding call is scanned against the combined capabilities in plain code, never by
        the model. Its collaboration requirement is answered from the ledger, and every
        director signs the joint application through the same gate.
      </div>
    </div>
  </AbsoluteFill>
);

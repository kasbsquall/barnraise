import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO} from './theme';

/**
 * The architecture diagram, as a still.
 *
 * Devpost requires it as an uploaded file, and the repository's copy is a Mermaid
 * block inside a Markdown document, which cannot be uploaded and would render in
 * Mermaid's default styling anyway. This is authored in the same type, palette and
 * ground as the product and the film, so a judge moving between the three is
 * looking at one thing rather than three.
 *
 * It shows what a reader cannot get from the README in a glance: that the six
 * organizations are six processes rather than six rows in a list, that the only
 * irreversible act sits behind code checks and two human signatures, and that the
 * ledger those signatures produce is what the second layer runs on.
 */

const W = 2400;
const H = 1420;

const ORGS = [
  {sigla: 'CL', nombre: 'Central Library', puerto: 9001, color: C.lib},
  {sigla: 'NF', nombre: 'North Food Bank', puerto: 9002, color: C.food},
  {sigla: 'MS', nombre: 'San Martin School', puerto: 9003, color: C.school},
  {sigla: 'RH', nombre: 'Riverside Health Post', puerto: 9004, color: C.health},
  {sigla: 'CV', nombre: 'Casa Vecinal Kitchen', puerto: 9005, color: C.kitchen},
  {sigla: 'EY', nombre: 'Eastside Youth Club', puerto: 9006, color: C.youth},
];

const Label: React.FC<{children: React.ReactNode; color?: string}> = ({children, color}) => (
  <span style={{fontFamily: MONO, fontSize: 21, letterSpacing: '0.18em',
                color: color || C.inkFaint}}>{children}</span>
);

/** A step in the round. The tint says who decides: ink for code, accent for a model. */
const Paso: React.FC<{n: string; titulo: string; quien: string; detalle: string; modelo?: boolean}> =
({n, titulo, quien, detalle, modelo}) => (
  <div style={{flex: 1, background: C.plateLow, border: `1px solid ${C.rule}`,
               borderRadius: 3, padding: '26px 28px 30px'}}>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 14}}>
      <span style={{fontFamily: MONO, fontSize: 20, color: C.inkFaint}}>{n}</span>
      <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 34,
                    letterSpacing: '-0.015em', color: C.ink}}>{titulo}</span>
    </div>
    <div style={{marginTop: 12, fontFamily: MONO, fontSize: 19, letterSpacing: '0.06em',
                 color: modelo ? C.lib : C.inkSoft}}>{quien}</div>
    <div style={{marginTop: 14, fontFamily: FONT.text, fontSize: 24, lineHeight: 1.38,
                 color: C.inkSoft}}>{detalle}</div>
  </div>
);

/** Between steps in a row. */
const Flecha: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: 46}}>
    <svg width={30} height={26} viewBox="0 0 30 26" fill="none">
      <path d="M0 13 H22 M14 5 L23 13 L14 21"
            stroke={C.inkFaint} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

/** Between bands. Three chevrons across the width rather than one in the middle: a
 *  single centred arrow reads as pointing at whichever box happens to sit under it,
 *  which is not what a band feeding the next band means. */
const Baja: React.FC<{alto?: number}> = ({alto = 40}) => (
  <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center',
               height: alto, padding: '0 14%'}}>
    {[0, 1, 2].map((i) => (
      <svg key={i} width={26} height={alto - 6} viewBox="0 0 26 34" fill="none">
        <path d="M13 0 V25 M5 18 L13 27 L21 18" stroke={C.inkFaint} strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" opacity={i === 1 ? 1 : 0.5} />
      </svg>
    ))}
  </div>
);

export const Architecture: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.field, width: W, height: H,
                        padding: '64px 80px 60px', display: 'flex', flexDirection: 'column'}}>
    {/* Header */}
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <svg width={46} height={46} viewBox="0 0 64 64" fill="none">
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
        <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 38,
                      letterSpacing: '0.1em', color: C.ink}}>BARNRAISE</span>
      </div>
      <Label>ARCHITECTURE · STRANDS AGENTS + A2A</Label>
    </div>

    {/* ---- Layer 1: six organizations, six processes ---- */}
    <div style={{marginTop: 44, display: 'flex', alignItems: 'baseline', gap: 20}}>
      <Label color={C.inkSoft}>LAYER 1 · THE DAILY EXCHANGE</Label>
      <div style={{flex: 1, height: 1, background: C.rule}} />
      <Label>ONE OS PROCESS PER ORGANIZATION · PORTS 9001-9006</Label>
    </div>

    <div style={{marginTop: 22, display: 'flex', gap: 18}}>
      {ORGS.map((o) => (
        <div key={o.sigla} style={{flex: 1, background: C.plate, borderRadius: 3,
                                   border: `1px solid ${C.rule}`, padding: '20px 20px 22px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <span style={{background: o.color, color: C.signedInk, fontFamily: MONO,
                          fontWeight: 700, fontSize: 22, padding: '5px 11px'}}>{o.sigla}</span>
            <span style={{fontFamily: MONO, fontSize: 20, color: o.color}}>:{o.puerto}</span>
          </div>
          <div style={{marginTop: 16, fontFamily: FONT.display, fontWeight: 600, fontSize: 26,
                       lineHeight: 1.18, color: C.ink}}>{o.nombre}</div>
          <div style={{marginTop: 12, fontFamily: MONO, fontSize: 17, lineHeight: 1.5,
                       color: C.inkFaint}}>
            own private<br />OrgProfile
          </div>
        </div>
      ))}
    </div>

    {/* The A2A boundary, and what is guaranteed about it. */}
    <div style={{marginTop: 20, background: 'rgba(6,217,250,0.055)',
                 border: `1px solid rgba(6,217,250,0.28)`, borderRadius: 3,
                 padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 28}}>
      <span style={{fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em', color: C.lib}}>
        A2A
      </span>
      <span style={{fontFamily: FONT.text, fontSize: 25, lineHeight: 1.44, color: C.inkSoft,
                    maxWidth: 1560}}>
        Agents reach each other across process boundaries. Tools are closures over one
        profile and take no arguments, so no tool exists that returns a neighbor's data.
        What crosses the boundary is only the message an agent chose to write.
      </span>
    </div>

    <Baja alto={40} />

    {/* ---- The round ---- */}
    <div style={{display: 'flex', alignItems: 'stretch', gap: 0}}>
      <Paso n="01" titulo="Discovery" quien="DETERMINISTIC · CODE"
            detalle="Asks every neighbor what is idle, then matches the answers against our open needs by keyword and urgency." />
      <Flecha />
      <Paso n="02" titulo="Negotiation" quien="LLM OVER A2A" modelo
            detalle="One agent, one tool: contact_neighbor. It settles concrete terms with the chosen neighbor." />
      <Flecha />
      <Paso n="03" titulo="Registration" quien="LLM TOOL CALL" modelo
            detalle="A separate agent with only the ledger tools files the agreement. Structured fields, never prose." />
    </div>

    <Baja alto={36} />

    {/* ---- The two things that stand between an agent and the record ---- */}
    <div style={{display: 'flex', gap: 22}}>
      <div style={{flex: 1.15, background: C.plateLow, border: `1px solid ${C.rule}`,
                   borderRadius: 3, padding: '24px 28px 26px'}}>
        <Label color={C.inkSoft}>DETERMINISTIC GUARDS · TOOL BOUNDARY</Label>
        <div style={{marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: '10px 14px'}}>
          {['direction of the exchange', 'a day nobody negotiated', 'unknown counterparty',
            'placeholder fields', 'a trade already live', 'coalition roles and budget'].map((g) => (
            <span key={g} style={{fontFamily: MONO, fontSize: 19, color: C.inkSoft,
                                  border: `1px solid ${C.rule}`, borderRadius: 2,
                                  padding: '6px 12px'}}>{g}</span>
          ))}
        </div>
        <div style={{marginTop: 16, fontFamily: FONT.text, fontSize: 23, color: C.inkFaint}}>
          A refusal says what was wrong and what would be accepted, so the agent corrects
          itself instead of guessing.
        </div>
      </div>

      <div style={{flex: 1, background: C.plateLow, border: `1px solid ${C.lib}`,
                   borderRadius: 3, padding: '24px 28px 26px'}}>
        <Label color={C.lib}>HUMAN GATE · STRANDS INTERRUPT</Label>
        <div style={{marginTop: 14, fontFamily: FONT.display, fontWeight: 700, fontSize: 40,
                     letterSpacing: '-0.02em', color: C.ink}}>
          Both organizations sign
        </div>
        <div style={{marginTop: 12, fontFamily: FONT.text, fontSize: 23, lineHeight: 1.4,
                     color: C.inkSoft}}>
          The round blocks on a worker thread until a human answers. A director can only
          decide their own organization's pause. One signature is never enough.
        </div>
      </div>
    </div>

    <Baja alto={36} />

    {/* ---- The ledger, and the second layer that runs on it ---- */}
    <div style={{display: 'flex', gap: 22, alignItems: 'stretch'}}>
      <div style={{flex: 1, background: C.signed, borderRadius: 3, padding: '24px 30px 26px'}}>
        <span style={{fontFamily: MONO, fontSize: 20, letterSpacing: '0.16em',
                      color: C.signedInk, opacity: 0.65}}>THE NEIGHBORHOOD LEDGER</span>
        <div style={{marginTop: 12, fontFamily: FONT.display, fontWeight: 700, fontSize: 34,
                     lineHeight: 1.16, color: C.signedInk}}>
          Who lent what, to whom,<br />when, and with what result
        </div>
        <div style={{marginTop: 14, fontFamily: MONO, fontSize: 19, color: C.signedInk,
                     opacity: 0.7}}>
          no row exists without both signatures
        </div>
      </div>

      <div style={{flex: 1.35, background: C.plateLow, border: `1px solid ${C.rule}`,
                   borderRadius: 3, padding: '24px 28px 26px'}}>
        <Label color={C.inkSoft}>LAYER 2 · THE COALITION</Label>
        <div style={{marginTop: 16, display: 'flex', alignItems: 'center', gap: 4}}>
          <span style={{fontFamily: FONT.text, fontSize: 24, color: C.inkSoft, flex: 1}}>
            A funding call arrives
          </span>
          <Flecha />
          <span style={{fontFamily: FONT.text, fontSize: 24, color: C.inkSoft, flex: 1.25}}>
            Eligibility scanned in plain code against the combined capabilities
          </span>
          <Flecha />
          <span style={{fontFamily: FONT.text, fontSize: 24, color: C.inkSoft, flex: 1}}>
            Every director signs the joint application
          </span>
        </div>
        <div style={{marginTop: 18, height: 1, background: C.rule}} />
        <div style={{marginTop: 16, fontFamily: FONT.text, fontSize: 24, color: C.ink}}>
          The requirement nobody can fake is documented prior collaboration.
          <span style={{color: C.lib}}> That is what the ledger is for.</span>
        </div>
      </div>
    </div>

    {/* The cycle, stated rather than drawn as a loop that would cross the whole page. */}
    <div style={{marginTop: 26, display: 'flex', alignItems: 'center', gap: 20}}>
      <div style={{flex: 1, height: 1, background: C.rule}} />
      <span style={{fontFamily: MONO, fontSize: 21, letterSpacing: '0.12em', color: C.inkFaint}}>
        FUNDED COOPERATION RETURNS TO LAYER 1 · THE TWO LAYERS ARE ONE CYCLE
      </span>
      <div style={{flex: 1, height: 1, background: C.rule}} />
    </div>
  </AbsoluteFill>
);

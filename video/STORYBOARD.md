# Barnraise, pitch film v2

**Event:** AWS Agents for Humans Hackathon, track Good Neighbor Agents
**Runtime:** 2:55 · **Tier:** B (camera and depth, no WebGL) · **VO:** English

> **Why there is a v2.** The first version was written before the interface
> existed, so it described shots that could not be filmed and made three claims
> the code did not support. It said the ledger "assembled itself" when four of
> its five rows are seeded history. It said an agent "physically cannot" read a
> neighbor's data, which overstates what closures guarantee. And it opened on
> "at two in the morning", a detail nothing in the system produces. Every one of
> those would have been a judge's first question. This version films what runs.

**The sticky line, landed twice (open and close):**
> Every agent in this sector works inside one organization. This is the first one
> that works between them.

**Ground:** dark. Field `#091421`, plates `#121C2A` / `#16202E` / `#212A39`, ink `#D9E3F6`.
Route colours: `#FFB599` food bank, `#75D4EA` library, `#E3C05F` school.
Cream `#F0E7D6` is reserved for an agreement both organizations signed and appears
nowhere else in the film. Type: Archivo Narrow, JetBrains Mono for data.
Thin-stroke icons. No emoji anywhere, in any frame.

---

## Before the camera rolls

Non-negotiable. The first version failed on exactly these.

- [ ] Three A2A servers up on 9001, 9002 and 9003, plus the web app on 8080.
      Verify with the agent cards, on camera in S4.
- [ ] The ledger contains at least one agreement produced by a real round in this
      session. Row #5 currently qualifies: negotiated over A2A, signed by Luis at
      the pause and by Ana from the ledger.
- [ ] `python validation/test_guards.py` and `test_signature.py` both green, and
      recorded green, because S6 films their output.
- [ ] Every figure spoken in VO traced to a source: see the table at the end.
- [ ] The seeded-fixtures disclosure legible in at least one held frame.
- [ ] Confirm the Devpost runtime limit before locking the cut. This edit lands at
      2:55 to leave margin under a 3:00 rule, but the rule itself must be read,
      not assumed.

---

## S1 · THE PAUSE (0:00–0:11)

**Visual.** No logo, no title card. The product, cold. The decision panel with
`YOUR AGENT STOPPED AND IS WAITING FOR YOU` in amber, and beneath it the real
negotiated terms in mono: what we receive, what we give, the conditions, the need.
Camera pushes in slowly on the eyebrow. Nothing else on screen moves.

**VO.** "This agent finished negotiating with another organization's agent. Then
it stopped, and waited for a person to sign."

**Claim → proof.** The agent pauses for a human. The panel is real, the terms come
from a real round, and the round is genuinely blocked: the worker thread is
waiting on an event, not on a timer.

**Motion.** Push-in `cubic-bezier(0.5,0,0.25,1)`, 11s, scale 1.00 → 1.05. One low
hit on the first frame, then silence.

**Capture.** Start a round, wait for `fase: aprobacion` with a pending, then film
the panel untouched. Roughly 70 seconds on Ollama.

---

## S2 · THE TRACE THAT NEVER EXISTED (0:11–0:36)

**Visual.** Three station rings on the dark field, one per organization in its
route colour, no lines between them. As the VO names each favour, a dashed line
flickers between two stations and dies.

**VO.** "Small community organizations help each other constantly. A library lends
its van. A food bank sends out what it could not distribute. A school opens a
classroom on a Saturday. None of it is written down. And then a funder asks them
to prove they collaborate."

**Claim → proof.** Nothing numeric is asserted. The visual carries the idea:
connections that appear and vanish.

**Motion.** Stations arrive staggered 28ms apart on the word timestamps. Dashed
lines draw on with `stroke-dashoffset` and fade out. The station layer drifts
slower than the grid behind it.

---

## S3 · WHO THIS IS FOR (0:36–0:49)

**Visual.** The three organization plates from the live app, in route colour, with
the real director names and the real idle resources and needs underneath in mono.

**VO.** "Barnraise is for them. Three people, three organizations, no IT
department, and no appetite for another dashboard to check."

**Claim → proof.** The names and the resource lines are read from the seed
profiles the agents actually load. Nothing on this card is written for the film.

---

## S4 · THE AGENTS TALK (0:49–1:26)

**Visual.** Full frame on the running app. Press **Run an exchange round**. The
discovery messages arrive in the feed in English, the route between two stations
lights up, the phase indicator moves from discovery to negotiation. At the edges of
frame, three terminals, one per organization, each serving its agent on its own
port. Cut once to a terminal fetching an agent card so the protocol is visible
rather than described.

**VO.** "Each organization runs its own agent over its own private data. The agents
reach each other over A2A, the agent-to-agent protocol, across process boundaries.
The food bank needs a van on Tuesdays. The library has one sitting idle. Neither
of them knew."

**Claim → proof.** Separate processes, real protocol. Three terminals on ports
9001, 9002 and 9003, an agent card fetched live, and the feed showing what each
agent actually wrote. This is the technical centre of the film and it is
demonstrated running, never diagrammed.

**Motion.** The camera holds. The product moves. Micro-SFX at 0.08 on each feed
row as it lands.

**Careful.** Do not say the agents run "in three processes and nothing else". The
agent that starts a round runs inside the web app; the ones it calls run in their
own server processes. The line above is worded to stay true either way.

---

## S5 · TWO SIGNATURES (1:26–2:02)

The strongest thirty seconds available, because the interface now proves the rule
instead of asserting it.

**Visual.** Sign as Luis Mendoza. The acknowledgement: filed as proposed, still
needs the other organization's signature. Then the identity chip switches to Ana
Torres, Central Library, and **the decision panel is gone**. In its place: "Luis
Mendoza at North Food Bank is reviewing an agreement." Ana signs the row from the
ledger. The row turns cream, the acknowledgement changes to "both organizations
have signed, so it is now in force", and the thread between those two stations on
the map thickens. Camera pulls back to hold the ledger, with the seeded-fixtures
disclosure legible at the top of frame.

**VO.** "Nothing executes on one signature. Luis signs from the food bank. Ana
cannot even see his decision from the library, and the server refuses her
signature if she tries. She signs her own side. Only then does the agreement
exist. Four of these rows are seeded history. That one appeared while we were
filming."

**Claim → proof.** The row stays uncream after the first signature, on screen, and
flips only on the second. The seeded rows are declared out loud and on screen, so
nobody has to catch us at it.

**Motion.** The cream flip and the thread thickening land on the same frame, tied
to the word "exists". A single stamp SFX on the second signature: the one hit in
the film that reads as a hit.

---

## S6 · WHAT IT REFUSES (2:02–2:22)

**Visual.** Three cuts of real terminal output, no mockups.
1. A `POST /api/round/interrupt` under the wrong organization returning
   `403 · This decision belongs to north-food-bank. central-library cannot sign it.`
2. `test_guards.py` running green, holding on the line that refuses a resource the
   organization does not own.
3. The tool closure in the source: `build_resource_tools(profile)`, the tools built
   over one profile.

**VO.** "An agent has no tool that returns a neighbor's resources. And what reaches
the ledger is checked by code rather than trusted to a model: the wrong direction,
a day nobody negotiated, filler text. A funder is going to read this."

**Claim → proof.** Every frame is real output or real source. The 403 is a live
response, not a slide.

**Careful.** Say "has no tool that returns", never "physically cannot". The
guarantee is closures and process separation, and that is worth stating precisely.

---

## S7 · THE COALITION (2:22–2:48)

**Visual.** The funding call: Community Resilience Fund 2026, 45,000 USD, arriving
digit by digit. The six requirements. Three columns resolving: 1 of 6, 3 of 6,
2 of 6 alone, then 6 of 6 together with 1,680 people. REQ6 isolates from the rest
with a colour shift.

**VO.** "Then a funding call appears. Alone, the food bank covers one requirement
of six, the school two, the library three. None of them reaches the thousand people
the fund asks for. Together they cover all six and reach one thousand six hundred
and eighty. And the requirement nobody can fake is this one: documented prior
collaboration. It asks for three agreements. The ledger holds five."

**Claim → proof.** Every number comes from the deterministic eligibility scan, not
from a model. Populations 480, 850 and 350 are in the seed profiles; the coverage
counts and the total are computed by code and re-checkable by running the repo.

**Motion.** The columns resolve on the word "together". REQ6 isolates on "this
one". This is the film's peak, so give it the widest camera move.

---

## S8 · CLOSE (2:48–2:55)

**Visual.** The mark, the wordmark, the sticky line, the repository URL with a QR
code beside it, held to the last frame. Captions suppressed so the card speaks.

**VO.** "Every agent in this sector works inside one organization. Barnraise is the
first one that works between them."

---

## Every figure spoken, and where it comes from

| Said in VO | Value | Source |
|---|---|---|
| The fund | Community Resilience Fund 2026, 45,000 USD | `seed/grants/resilience_fund.json` |
| Population the fund asks for | 1,000, same district | REQ1 in the same file |
| Covered alone | food bank 1, library 3, school 2, of 6 | eligibility scan, `/api/state` |
| Covered together | 6 of 6 | same scan |
| People reached together | 1,680 | 480 + 850 + 350, seed profiles |
| Agreements REQ6 asks for | 3 | `acuerdos_minimos` in REQ6 |
| Agreements in the ledger | 5 | ledger database, 4 seeded and 1 live |
| Ports | 9001, 9002, 9003, web on 8080 | `seed/network.json`, `launch.ps1` |
| Directors | Ana Torres, Luis Mendoza, Rosa Diaz | `seed/orgs/*.json` |

## Claims deliberately not made

Kept out on purpose, because none of them survives a careful question.

- That the ledger built itself. Four of five rows are seeded, said out loud in S5.
- That an agent physically cannot read a neighbor's data. S6 states the actual
  guarantee.
- That the demo runs on Bedrock. It runs on Ollama locally and on Gemini's free
  tier. The provider switch is one environment variable and the repo documents all
  three, but no Bedrock run has been recorded, so the film does not imply one.
- Any time of day, any user quote, any adoption or savings figure.

## Pacing

Measured against the VO written above, at a documentary read. Nothing here is
rushed, which matters because a hurried read is the fastest way to sound like a
sales pitch instead of a demonstration.

| Scene | Seconds | VO words | Words per minute |
|---|---|---|---|
| S1 The pause | 11 | 18 | 98 |
| S2 The trace that never existed | 25 | 46 | 110 |
| S3 Who this is for | 13 | 19 | 88 |
| S4 The agents talk | 37 | 42 | 68 |
| S5 Two signatures | 36 | 54 | 90 |
| S6 What it refuses | 20 | 41 | 123 |
| S7 The coalition | 26 | 65 | 150 |
| S8 Close | 7 | 18 | 154 |
| **Total** | **175 (2:55)** | **303** | |

S4 is deliberately the quietest stretch. Around twenty of its thirty-seven seconds
carry no narration at all, because the round running is the argument. Do not fill
that silence in the edit.

## Shot list

| # | Shot | Source | Length |
|---|---|---|---|
| 1 | Decision panel, held, push-in | app | 11s |
| 2 | Station rings, dashed lines | after effects over app map | 25s |
| 3 | Three organization plates | app | 13s |
| 4 | Round running, feed filling | app | 25s |
| 5 | Three terminals, agent card fetched | terminal | 12s |
| 6 | Sign as Luis, acknowledgement | app | 10s |
| 7 | Switch identity, panel gone, neighbor deciding | app | 8s |
| 8 | Ana signs from the ledger, cream flip, thread thickens | app | 10s |
| 9 | Ledger held with disclosure legible | app | 8s |
| 10 | 403 response | terminal | 7s |
| 11 | test_guards green | terminal | 7s |
| 12 | Tool closure in source | editor | 6s |
| 13 | Funding call and requirements | app | 12s |
| 14 | Columns resolve to 6 of 6 | app | 14s |
| 15 | Close card with QR | after effects | 7s |

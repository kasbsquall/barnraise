# Barnraise — pitch film v1

**Event:** AWS Agents for Humans Hackathon, track Good Neighbor Agents
**Runtime target:** ~180s · **Tier:** B (camera and depth, no WebGL) · **VO:** English

**The sticky line, landed three times (open, middle, close):**
> Every agent in this sector works inside one organization. This is the first one that works between them.

**Ground:** dark. Field `#091421`, surfaces `#16202E` / `#1E2C3D`, ink `#D9E3F6`.
Route colours: amber `#FFB599` (food bank), cyan `#75D4EA` (library), ochre `#C9A227` (school).
Cream `#F0E7D6` is reserved for a fully signed agreement and appears nowhere else.
Type: Archivo Narrow (UI), JetBrains Mono (data). Icons: thin stroke. No emoji anywhere.

---

## S1 · COLD OPEN — the machine stops (0:00–0:09)

**Visual.** No title, no logo. Straight into the real product: the decision panel
arriving, `YOUR AGENT STOPPED AND IS WAITING FOR YOU` in amber, and under it the
real negotiated terms in mono. Camera pushes in on the eyebrow line, slow, with mass.
Everything else on screen is dead still.

**VO.** "At two in the morning, this agent finished negotiating. Then it stopped, and
waited for a person."

**Claim → proof.** Claim: the agent pauses for a human. Proof: the real panel, real
terms, the round genuinely blocked on a signature.

**Motion (B).** Push-in `cubic-bezier(0.5,0,0.25,1)` over 9s, scale 1.00 → 1.06.
One glow behind the amber eyebrow. SFX: single low hit on frame 1, then silence.

---

## S2 · THE TRACE THAT NEVER EXISTED (0:09–0:38)

**Visual.** Three station rings appear on the dark field, one per organization, with
their route colours. No lines between them yet. As the VO names each favour, a faint
dashed line flickers between two stations and dies.

**VO.** "Small community organizations help each other constantly. A library lends its
van. A food bank sends what it could not distribute. A school opens a classroom on a
Saturday. None of it is written down anywhere. And then a funder asks them to prove
they collaborate."

**Claim → proof.** No numbers asserted here. The claim is qualitative and the visual
carries it: connections that appear and vanish.

**Motion (B).** Stations arrive staggered on word timestamps, 28ms apart. Dashed
lines draw on with `stroke-dashoffset` and fade. Parallax: stations drift slower than
the grid behind them.

---

## S3 · WHO THIS IS FOR (0:38–0:52)

**Visual.** Three name plates in the route colours: Ana Torres, Central Library ·
Luis Mendoza, North Food Bank · Rosa Diaz, San Martin School. Each with what their
organization has idle and what it lacks, in mono, pulled from the real seed files.

**VO.** "Barnraise is for them. Three people, three organizations, no IT department,
and no interest in another dashboard to check."

**Claim → proof.** Proof is the data itself: the resources and needs on screen are the
actual seeded profiles the agents read.

---

## S4 · THE AGENTS TALK (0:52–1:32)

**Visual.** Real UI, full frame. Press the round button and let it run: the discovery
messages arriving in the feed, the A2A route between the two stations lighting up,
`COMPLEMENTARITY DETECTED` landing. Two terminal windows visible at the edges, each
running its own organization's A2A server on its own port.

**VO.** "Each organization runs its own agent, over its own private data, in its own
process. They talk to each other over A2A, the agent-to-agent protocol in Strands.
The food bank needs a van on Tuesdays. The library has one sitting idle. Neither of
them knew."

**Claim → proof.** Claim: separate processes, private data, real protocol. Proof: two
live terminals on different ports plus the live feed. This is the film's technical
centre and it is DEMONSTRATED RUNNING, never diagrammed.

**Motion (B).** No camera move during the demo: the product moves, the camera holds.
Micro-SFX on each feed row, 0.08.

---

## S5 · THE PAUSE, AND TWO SIGNATURES (1:32–2:05)

**Visual.** The decision panel. Sign as Luis Mendoza. The acknowledgement appears:
filed as proposed, still needs the other signature. Then the identity chip switches to
Ana Torres, Central Library, and the same agreement is signed from the other side. The
ledger row turns cream. The map thread between those two stations thickens.

**VO.** "Nothing executes on one signature. Luis signs from the food bank. Ana signs
from the library. Only then does the agreement exist, and the thread between them gets
thicker."

**Claim → proof.** Claim: approval is structural, not decorative. Proof: the row stays
proposed after the first signature, on screen, and only flips on the second.

**Motion (B).** The cream flip and the thread thickening happen on the same frame,
tied to the word "exists". Stamp SFX on the second signature, the one hit in the film
that reads as a hit.

---

## S6 · THE LEDGER (2:05–2:20)

**Visual.** The ledger, full frame, four fulfilled rows in cream with their outcomes
("340kg collected. No incidents."). Camera cranes down the column.

**VO.** "Nobody wrote this by hand. It assembled itself, one agreement at a time."

**Claim → proof.** The outcomes shown are real rows from the ledger database.

---

## S7 · THE COALITION (2:20–2:52)

**Visual.** The funding call. The requirements matrix. Three columns showing 1 of 6,
2 of 6, 3 of 6 alone. Then they resolve into 6 of 6 together. REQ6 highlighted apart
from the rest. The amount, 45,000, arriving digit by digit.

**VO.** "Then a funding call appears. Alone, the food bank meets one requirement of
six. The school two. The library three. Together, six. And the requirement none of
them could ever fake is this one: documented prior collaboration. They already have
it, because their agents built it while they were asleep."

**Claim → proof.** Claim: the coverage numbers. Proof: they come from the
deterministic eligibility scan, verifiable by running the repo.

**Motion (B).** The strongest beat in the film. Columns resolve on the word
"together"; REQ6 isolates with a colour shift on "this one".

---

## S8 · HOW IT HOLDS UP (2:52–3:05)

**Visual.** Three fast cuts: the tool closure over one profile, the HumanInTheLoop
gate line, the guard rejecting a bad agreement in a terminal. Real code, real output.

**VO.** "The agent physically cannot read a neighbour's data: its tools are closures
over one profile. And what reaches the ledger is checked by code, not trusted to a
model, because a funder is going to read it."

**Claim → proof.** Every frame here is real source or real terminal output.

---

## S9 · CLOSE (3:05–3:15)

**Visual.** The mark and the wordmark. The sticky line. Repo URL with a QR beside it,
held for the full five seconds. Captions suppressed on this scene so the card speaks.

**VO.** "Every agent in this sector works inside one organization. Barnraise is the
first one that works between them."

---

## Verification gates before render

- Every figure on screen traced to a run artefact (`verify_figures.py`).
- The ledger must contain agreements produced by REAL rounds, not only the seed.
- Terminal values (ports, model ids, org ids) read from the repo, never drafted.
- Clip state check: the last frame of each capture must show the app AFTER the action.
- Declare on screen that the neighborhood data is seeded.

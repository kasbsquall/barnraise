# Barnraise, pitch film v3

**Event:** AWS Agents for Humans Hackathon, track Good Neighbor Agents
**Runtime:** 2:52 · **Tier:** B (camera and depth, no WebGL) · **VO:** English

> **Why there is a v3.** The v2 storyboard described a transit-style diagram with
> three organizations at invented coordinates, and quoted an eligibility result
> that no longer holds. The product has since become a map: six organizations at
> real addresses, real driving routes between them, and a ledger with seven
> agreements. Every scene below was rewritten against what runs today, and every
> figure was re-read from the running system rather than carried over.
>
> The footage shot for v2 is unusable for the same reason. It is a recording of
> an interface that no longer exists.

> **Why the ledger went from nine rows to seven.** Repeated test rounds filed the
> same library-van-for-food exchange six times. A ledger that accepts one trade
> over and over documents an agent looping rather than a neighborhood
> collaborating, so the duplicates were removed and a guard now refuses a trade
> that is already live between the same two organizations. What remains is seven
> distinct exchanges, four of them seeded history, and every organization still
> has at least one. The eligibility figures did not move: no single organization
> qualifies, four of the twenty trios do, and REQ6 asks for three.

> **The ledger count is a function of when you capture.** It held seven before
> this session and the signature filmed in S5 makes it eight, so S7 says eight
> and shows eight. Re-record S5 and the number moves again: the whole film has to
> come from one run, or two frames will disagree about one datum and a judge
> comparing them concludes the output was hand-assembled.

**The sticky line, landed twice (open and close):**
> Every agent in this sector works inside one organization. This is the first one
> that works between them.

**Ground:** dark. Field `#091421`, plates `#121C2A` / `#16202E`, ink `#D9E3F6`.
Six route colours, one per organization, used for that organization and nothing
else: `#FFB599` food bank, `#75D4EA` library, `#E3C05F` school, `#8ED6A9` health
post, `#D79AD6` kitchen, `#9FB0F5` youth club. Cream `#F0E7D6` means an agreement
both organizations signed and appears nowhere else in the film. Type: Archivo
Narrow, JetBrains Mono for data. Thin-stroke icons. No emoji in any frame.

---

## Before the camera rolls

- [ ] `node video/capture/preflight.js` reports zero problems. Nothing is
      recorded until it does. It checks the running product at the capture
      resolution: every organization in frame and clear of the panel, no text
      clipped or squeezed to one word per line, the activity column following
      the newest message, the panel agreeing with the phase, no internal ids
      on screen, no console errors. Four defects reached a rendered scene
      before this existed.
- [ ] Six A2A servers on 9001 to 9006, plus the web app on 8080. `launch.ps1`
      reads the ports from `seed/network.json` and waits for all six to answer.
- [ ] The negotiating agent on `gemini-3.1-flash-lite`. The local 7B model
      invents inventory: it has offered a health post's "community health
      pamphlets" and a kitchen's transport, neither of which exist. The guards
      caught both, but a round that gets refused is a round you cannot film.
- [ ] `python validation/test_guards.py`, `test_signature.py`, `test_isolation.py`
      green and recorded green, because S6 films their output.
- [ ] Capture at 2560x1440, downscaled to 1920. The first attempt was shot at
      1920 and then pushed 3x, which is magnifying 640 pixels across the frame.
- [ ] Every spoken figure traced to the table at the end.
- [ ] The seeded-fixtures disclosure legible in at least one held frame.
- [ ] Read the Devpost runtime limit. This edit lands at 2:52 to leave margin
      under a 3:00 rule, but the rule must be read, not assumed.

---

## S1 · THE PAUSE (0:00–0:11)

**Visual.** No logo, no title. The decision panel, cold: `YOUR AGENT STOPPED AND
IS WAITING FOR YOU`, and beneath it the real negotiated terms in mono. The map
behind it holds still. Camera pushes in slowly on the eyebrow.

**VO.** "This agent finished negotiating with another organization's agent. Then
it stopped, and waited for a person to sign."

**Claim → proof.** The round is genuinely blocked: a worker thread waiting on an
event, not a timer. The terms are from a real round.

**Capture.** Start a round, wait for the pause, film the panel untouched.

---

## S2 · SIX ORGANIZATIONS, SEVEN HUNDRED METRES APART (0:11–0:38)

**Visual.** The map, wide, with all six pins and **no routes drawn**. Then the
organization cards open one at a time on the panel: the library's van, the food
bank's cold room, the kitchen's industrial kitchen idle every morning, the youth
club's minibus parked midweek. As each opens, the card shows the real distance by
road to its neighbours.

**VO.** "Six community organizations, all inside one district. A library with a
van that sits idle on Tuesdays. A food bank with cold room space it does not
fill. A kitchen with six burners nobody uses before four in the afternoon. They
are seven hundred metres apart, and none of them can see what the others have
idle."

**Careful.** The line was "none of them knows what the others have", and the map
in this scene carries seven agreements they have already signed, which
contradicts it in the same frame. What is true, and is the actual guarantee the
product makes, is that no agent has a tool returning a neighbor's inventory: they
cannot SEE what the others have idle. Past collaboration and present blindness
are different claims and only one of them is on screen.

**Claim → proof.** Every distance on screen is a real driving route over
OpenStreetMap data. The seven hundred metres is the library to the food bank: the
cached route says 714.

**Why this replaces the v2 scene.** The old version drew abstract stations that
flickered on and off to suggest connections nobody recorded. This says the same
thing with real geography, and the distance is the argument: these organizations
are close enough that the exchange is trivial, and it still does not happen.

---

## S3 · WHO THIS IS FOR (0:38–0:50)

**Visual.** Three organization cards with their building photographs and their
directors named: Ana Torres at Central Library, Luis Mendoza at North Food Bank,
Marta Ochoa at Casa Vecinal Kitchen.

**VO.** "It is for them. Six people, six organizations, no IT department, and no
appetite for another dashboard to check."

**Note.** The photographs are generated. If any frame implies they are
photographs of real premises, say so on screen.

---

## S4 · THE AGENTS TALK (0:50–1:24)

**Visual.** Full frame on the running map. Press **Run an exchange round**. The
messages type into the activity feed in English as the agents write them, and
each one travels the map as a pulse along the road it would actually take, with
the sending pin swelling as it leaves and the receiving pin as it lands. The
phase moves from discovery to negotiation. Cut once to a terminal fetching an
agent card so the protocol is visible rather than described.

**VO.** "Each organization runs its own agent over its own private data. The
agents reach each other over A2A, the agent-to-agent protocol, across process
boundaries. The food bank needs a van on Tuesdays. The library has one sitting
idle. Neither of them knew. There it is. A vehicle that was going to sit still,
and the neighbour who needed it that day."

**Claim → proof.** Six terminals on ports 9001 to 9006, an agent card fetched
live, and the feed showing what each agent actually wrote. This is the technical
centre of the film and it is demonstrated running, never diagrammed.

**Careful.** The agent that starts a round runs inside the web app; the ones it
calls run in their own server processes. The line above stays true either way.

**The beat.** `COMPLEMENTARITY FOUND` landing in the feed. Recapture until it is
inside the take: a previous cut ran twenty-nine seconds of agents introducing
themselves while the discovery happened after the last frame.

---

## S5 · TWO SIGNATURES (1:24–2:00)

The strongest thirty seconds available, because the interface proves the rule
rather than asserting it.

**Visual.** Sign as Luis Mendoza. The acknowledgement: filed as proposed, still
needs the other organization. Switch to Ana Torres and **the decision panel is
gone**; in its place, "Entry #N is waiting for your signature. Luis Mendoza at
North Food Bank has signed. It becomes active when you do," and a button that
takes her to the row. She signs. The row turns cream, the acknowledgement says it
is now in force, and the line between those two organizations on the map thickens.

**VO.** "Nothing executes on one signature. Luis signs from the food bank. Ana
cannot see his decision from the library, and the server refuses her signature if
she tries. She signs her own side. Only then does the agreement exist, and the
line between them gets thicker. Four of these rows are seeded history. The other
four were negotiated by the agents, in rounds like this one."

**Claim → proof.** The row stays uncream after the first signature, on screen,
and flips only on the second.

**Say out loud, over the ledger:** four of these rows are seeded history and three
were negotiated in sessions like this one. The disclosure is on screen anyway;
saying it is what stops a judge finding it.

---

## S6 · WHAT IT REFUSES (2:00–2:20)

**Visual.** Three cuts of real terminal output, no mockups.
1. `POST /api/agreements/{id}/decide` under an organization that is not a party,
   returning `403 · <org> is not a party to agreement #N and cannot sign it.`
2. `test_guards.py` green, holding on the case that refuses a resource the
   organization does not own.
3. The tool closure in the source: `build_resource_tools(profile)`.

**VO.** "An agent has no tool that returns a neighbor's resources. And what
reaches the ledger is checked by code rather than trusted to a model: the wrong
direction, a day nobody negotiated, an organization that is not a party. A funder
is going to read this."

**Careful.** Say "has no tool that returns", never "physically cannot". And do
not claim authentication: the checks constrain the interface, not an arbitrary
caller, and the README says so.

---

## S7 · THE COALITION (2:20–2:45)

**Visual.** The Grant view. Community Resilience Fund 2026, 45,000 USD, arriving
digit by digit. The six requirements with the organizations that cover each. The
coverage rows resolving: 3 of 6 for the library, 2 for the school, 1, 1, 1, and 0
for the kitchen. Then the whole neighborhood at 6 of 6 and 3,250 people. REQ6
isolates with a colour shift.

**VO.** "Then a funding call appears. Alone, the strongest of them covers three
requirements of six, and the kitchen covers none. None of them reaches the
thousand people the fund asks for. Together they cover all six and reach three
thousand two hundred and fifty. And the requirement nobody can fake is this one:
documented prior collaboration. It asks for three agreements. The ledger holds
eight."

**Claim → proof.** Every number comes from the deterministic eligibility scan.
Populations are in the seed profiles; the coverage counts and the total are
computed by code and re-checkable by running the repo.

**Do NOT say "only one combination qualifies."** That was true when the ledger
held six agreements and it is not true now: no single organization qualifies, no
pair does, and four of the twenty possible trios do. If the film wants a single
number, the honest one is that the search space is sixty-three combinations and
the agent finds the ones that hold.

---

## S8 · CLOSE (2:45–2:52)

**Visual.** The mark, the wordmark, the sticky line, the repository URL with a QR
beside it, held to the last frame. Captions suppressed so the card speaks.

**VO.** "Every agent in this sector works inside one organization. Barnraise is
the first one that works between them."

---

## Every figure spoken, and where it comes from

| Said in VO | Value | Source |
|---|---|---|
| Organizations | 6 | `seed/orgs/*.json` |
| Distance library to food bank | 714 m | `seed/routes.json`, OSRM over OSM |
| The fund | Community Resilience Fund 2026, 45,000 USD | `seed/grants/resilience_fund.json` |
| Population the fund asks for | 1,000, same district | REQ1 |
| Strongest alone | Central Library, 3 of 6 | eligibility scan, `/api/state` |
| Weakest alone | Casa Vecinal Kitchen, 0 of 6 | same scan |
| Covered together | 6 of 6 | same scan |
| People reached together | 3,250 | sum of the six seed profiles |
| Agreements REQ6 asks for | 3 | `acuerdos_minimos` in REQ6 |
| Agreements in the ledger | 8 | ledger database, after the signature S5 films |
| Ports | 9001 to 9006, web on 8080 | `seed/network.json` |
| Directors | Ana Torres, Luis Mendoza, Rosa Diaz, Elena Fuentes, Marta Ochoa, Diego Salas | `seed/orgs/*.json` |

## Claims deliberately not made

- That only one coalition qualifies. Four trios do, and the number moves as the
  ledger grows, which is the product working rather than a defect.
- That the ledger built itself. Four of seven rows are seeded history.
- That an agent physically cannot read a neighbor's data. S6 states the actual
  guarantee.
- That signatures are authenticated. They are not; the checks constrain the
  interface.
- That the demo runs on Bedrock. It runs on Ollama locally and on Gemini's free
  tier. The provider is one environment variable and the repo documents all
  three, but no Bedrock run has been recorded.
- That the building photographs or the street addresses correspond to real
  organizations. The streets are real, the organizations are not.

## Pacing

| Scene | Seconds |
|---|---|
| S1 The pause | 11 |
| S2 Six organizations | 27 |
| S3 Who this is for | 12 |
| S4 The agents talk | 34 |
| S5 Two signatures | 36 |
| S6 What it refuses | 20 |
| S7 The coalition | 25 |
| S8 Close | 7 |
| **Total** | **172 (2:52)** |

# Barnraise

**The neighborhood that negotiates on its own.**

Cooperation between neighboring organizations has always existed. It just never
left a trace. Barnraise gives every organization its own agent, lets those
agents negotiate with each other across organizational boundaries, and turns the
resulting history into the evidence funders keep asking for.

Built with the [Strands Agents SDK](https://strandsagents.com/) for the AWS
Agents for Humans Hackathon, track **Good Neighbor Agents**.

**Try it:** [barnraise.107-172-6-206.sslip.io](https://barnraise.107-172-6-206.sslip.io) · a live demo you can sign an
agreement on. Running a round is off there because it calls a model; everything
else, including the signature, is real.

**Watch it work:** [youtube.com/watch?v=sdSvH0PwtYQ](https://www.youtube.com/watch?v=sdSvH0PwtYQ)
· 2:53 · six agents negotiating, two signatures, and what the product refuses to do.

**How it was built,** including the two things that were broken for longer than I
would like to admit: [Agents for Humans: six Strands agents, one ledger, and the
pause that would not stop asking](https://builder.aws.com/content/3INkNpD9WU7cRi69pfK13Ul7Yve/agents-for-humans-six-strands-agents-one-ledger-and-the-pause-that-would-not-stop-asking) on AWS Builder Center.

---

## The problem

92% of nonprofits already use AI, but only 7% report a measurable change in
their mission. The sector calls it the efficiency plateau: minutes saved here
and there, and the quarter ends with the same numbers.

The reason is that every tool in this sector automates the *inside* of one
organization. Its donors, its volunteers, its grants. But the track is called
Good Neighbor, and the neighbors do not talk to each other.

Meanwhile funders ask for collaboration explicitly. They want to see that you
work with food banks, farms, schools and other community organizations rather
than operating in a silo. They ask for collaboration, and nobody built the
infrastructure that lets it happen without meetings.

Pantry operators report grant success rates as low as 1%: they find a hundred,
qualify for ten, win one. A federal application takes 40 to 80 hours.

## What Barnraise does

**Layer 1, the daily exchange.** The library has a van sitting idle on Tuesdays.
The food bank needs one that day. The school has a free classroom on Saturday
and the food bank needs somewhere to train volunteers. Today nobody knows,
because each organization only sees its own half.

The agents discover the complementarity, negotiate terms with each other, and
each human approves or rejects from their own side. Nothing executes without
both approvals. Every closed agreement is recorded with what actually happened.

**Layer 2, the coalition.** That record is the neighborhood's asset. When a
funding call appears, the agent sees something no single human can: that three
small organizations in the same district, together, qualify for a fund none of
them qualifies for alone.

And it does not just propose the coalition. It already holds the proof that
those three have been collaborating for months. The coalition is not invented
for the form. It is documented with the history that Layer 1 built on its own.

## Who it is for

Small community organizations that are stretched thin: neighborhood libraries,
food banks, schools, clinics, mutual aid groups. The people who run them are not
technical and do not want another app to babysit. The agent works in the
background and only surfaces when there is a real decision to make.

## Why it matters

There are more than 200,000 hunger relief organizations competing for a limited
pool of funding. What changes when cooperation leaves a trace is not just
efficiency: it is that the collaboration funders demand becomes provable, and
the coalitions that win become reachable for organizations too small to win
alone.

---

## How it works

Every agent knows only its own organization's data. Tools are closures over one
private profile, so an agent has no tool that returns a neighbor's resources. What
crosses the A2A boundary is only the message an agent chose to write.

Human approval is structural, at two distinct points: every daily exchange needs
both parties, and every joint application needs every director. The agent stops
with a Strands interrupt and genuinely waits.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full diagram, the data
isolation model, and the deterministic guards that keep the ledger trustworthy.

## Quick start

Requires Python 3.12+.

```bash
git clone <this-repo>
cd barnraise
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

Choose a model provider. Strands is model-agnostic and Barnraise runs the same
on all three.

**Amazon Bedrock** — needs AWS credentials and model access enabled:

```bash
export BARNRAISE_MODEL_PROVIDER=bedrock
```

**Google AI Studio** — free tier, get a key at https://aistudio.google.com/apikey:

```bash
export BARNRAISE_MODEL_PROVIDER=gemini
export GEMINI_API_KEY="your-key"
```

**Ollama** — fully local, no key, no cost:

```bash
ollama pull qwen2.5:7b-instruct
ollama serve
```

Seed the neighborhood's collaboration history:

```bash
python seed/seed_history.py --reset
```

Start the organizations as A2A servers, each in its own process. Any organization
you want to start a round *from* can be the client, but every organization it
will *talk to* needs its server up. The ports and profiles are listed in
`seed/network.json`:

```bash
python a2a/serve_org.py seed/orgs/library.json 9001
```

```bash
python a2a/serve_org.py seed/orgs/food_bank.json 9002
```

```bash
python a2a/serve_org.py seed/orgs/school.json 9003
```

```bash
python a2a/serve_org.py seed/orgs/health_post.json 9004
```

```bash
python a2a/serve_org.py seed/orgs/kitchen.json 9005
```

```bash
python a2a/serve_org.py seed/orgs/youth_club.json 9006
```

Start the web app and open http://127.0.0.1:8080

```bash
python web/server.py
```

On Windows, `launch.ps1` starts all seven processes at once, reading the ports
from `seed/network.json` and waiting until every agent card answers before it
reports success. It runs the neighbor agents on Ollama and the negotiating agent
on your chosen provider, which keeps a free tier from running out mid-round.

Press **Run an exchange round** to watch the agents negotiate live, then sign or
decline when the agent stops and asks. Press **Look for a coalition** to see the
funding call scanned against the neighborhood's combined capabilities.

A director only ever sees their own organization's decision. Viewing the console
as someone else shows that a neighbor is deciding, and the server refuses a
signature from an organization that is not a party to the agreement.

There is no authentication behind that: the signing organization is a field in
the request, so the check constrains the interface and not an arbitrary caller.
Who is allowed to speak for an organization is the piece a real deployment needs
and this prototype does not have.

### Command line

The same two flows without the web app:

```bash
python a2a/round.py north-food-bank
```

```bash
python a2a/coalition_round.py
```

Add `--auto-approve` to skip the interactive prompts.

## The demo neighborhood

Six seeded organizations at real street addresses in Pilsen, Chicago, whose
resources and needs genuinely complement each other, so no exchange is
artificial. The organizations are invented; the streets and the driving routes
between them are real, taken from OpenStreetMap:

| Organization | Has idle | Needs |
|---|---|---|
| Central Library | Delivery van, community room for 30, digital literacy workshops | Volunteers for the reading workshop, refreshments |
| North Food Bank | Refreshments and surplus food, spare cold room space | Van transport on Tuesdays, a room to train volunteers |
| San Martin School | Student volunteers, large classroom for 40 | Digital literacy for parents, refreshments for extended days |
| Riverside Health Post | Nurse-led health talks, refrigerated store with vaccine cold chain | A van for home visits, a larger room for group sessions |
| Casa Vecinal Kitchen | Industrial kitchen, volunteer cooks, insulated catering trays | Surplus vegetables and dry goods, cold room space |
| Eastside Youth Club | Twelve-seat minibus, gym hall with changing rooms | Refreshments for match days, volunteers to tutor members |

Against the seeded funding call, no organization qualifies alone: the strongest
covers 3 of the 6 requirements and the weakest covers none. No pair qualifies
either. Four of the twenty possible trios do, and all six together cover every
requirement and reach 3,250 people. Those numbers come out of the deterministic
eligibility scan in `agents/tools/grants.py` and move as the ledger grows, which
is the product working rather than a fixture.

## Project layout

```
barnraise/
├── agents/          org agent, tools, approval gate, coalition agent
├── a2a/             A2A server and round runners
├── ledger/          schema, persistence, collaboration evidence
├── seed/            demo neighborhood, funding call, history
├── web/             FastAPI app, event bus, live UI
├── validation/      end-to-end checks
└── docs/            architecture
```

## Tests

```bash
python validation/test_seed.py
```

```bash
python validation/test_ledger.py
```

```bash
python validation/test_approval.py
```

```bash
python validation/test_signature.py
```

```bash
python validation/test_guards.py
```

```bash
python validation/test_isolation.py
```

```bash
python validation/test_pause_bound.py
```

`test_isolation` proves an agent's tools return only its own organization's data,
and that two organizations answer the same call differently.
`test_seed` proves every seeded need has a counterpart in another organization.
`test_ledger` proves a single signature never approves an agreement.
`test_approval` proves the ledger stays empty while the agent waits for a human.
`test_signature` proves the approval that writes an agreement is the one that
signs it, and that a later rejection in the same round cannot strand it unsigned.
`test_guards` proves the checks around `record_agreement` reject a resource the
organization does not own, a day nobody negotiated, filler text, a display name
where an organization id belongs, and a trade already live between the same two
organizations, while still letting a real exchange through.
`test_pause_bound` proves a director who declines is not asked the same question
again, and that an agent which keeps calling the same tool is stopped rather than
allowed to hold the round open.

`test_seed`, `test_ledger`, `test_signature`, `test_guards` and
`test_pause_bound` are deterministic and need no model. `test_approval` drives a
live agent.

## Notes on running locally

Ollama shuts down after a while of inactivity; check it before a demo. Avoid
running two LLM processes at once on a single consumer GPU: under VRAM pressure
the model degenerates and returns corrupted output. `qwen2.5:7b-instruct` is
stable for tool calling; the 14b variant is not on a 12GB card.

## License

MIT. See [LICENSE](LICENSE).

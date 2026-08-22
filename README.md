# Barnraise

**The neighborhood that negotiates on its own.**

Cooperation between neighboring organizations has always existed. It just never
left a trace. Barnraise gives every organization its own agent, lets those
agents negotiate with each other across organizational boundaries, and turns the
resulting history into the evidence funders keep asking for.

Built with the [Strands Agents SDK](https://strandsagents.com/) for the AWS
Agents for Humans Hackathon, track **Good Neighbor Agents**.

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
private profile, so an agent physically cannot read a neighbor's resources. What
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

Start two organizations as A2A servers, each in its own process:

```bash
python a2a/serve_org.py seed/orgs/library.json 9001
```

```bash
python a2a/serve_org.py seed/orgs/school.json 9003
```

Start the web app and open http://127.0.0.1:8080

```bash
python web/server.py
```

On Windows, `launch.ps1` starts all three processes at once. It runs the two
neighbor agents on Ollama and the negotiating agent on your chosen provider,
which keeps a free tier from running out mid-round.

Press **Correr ronda de intercambio** to watch the agents negotiate live, then
approve or reject when the agent stops and asks. Press **Buscar coalición** to
see the funding call scanned against the neighborhood's combined capabilities.

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

Three seeded organizations whose resources and needs genuinely complement each
other, so no exchange is artificial:

| Organization | Has idle | Needs |
|---|---|---|
| Community Library | Van (Tuesdays), community room, digital literacy workshops | Volunteers, refreshments |
| North Food Bank | Surplus food, refrigerated storage | Transport (Tuesdays), training space |
| San Martin School | Student volunteers, large classroom | Digital literacy for parents, refreshments |

Against the seeded funding call, each one alone covers 1, 2 and 3 of the 6
requirements. No pair qualifies. The three together cover all six and reach
1,680 people.

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

`test_seed` proves every seeded need has a counterpart in another organization.
`test_ledger` proves a single signature never approves an agreement.
`test_approval` proves the ledger stays empty while the agent waits for a human.

## Notes on running locally

Ollama shuts down after a while of inactivity; check it before a demo. Avoid
running two LLM processes at once on a single consumer GPU: under VRAM pressure
the model degenerates and returns corrupted output. `qwen2.5:7b-instruct` is
stable for tool calling; the 14b variant is not on a 12GB card.

## License

MIT. See [LICENSE](LICENSE).

# Barnraise — "About the project", ready to paste

Markdown, as Devpost renders it. Everything below is checked against the repo or
against a real run; nothing that cannot be supported is in here.

---

## Inspiration

Cooperation between neighboring community organizations has always existed. It
just never left a trace.

Every AI tool in this sector automates the *inside* of one organization: its
donors, its volunteers, its grant deadlines. That is useful, and it is also where
the ceiling is, because the thing those organizations most need from each other
happens in the gaps between them.

A library two streets from a food bank has a delivery van that sits idle on
Tuesdays. The food bank needs one that day. Neither can see what the other has, so
the van sits still. That is not a data problem inside either organization. It is a
problem *between* them, and no amount of automating either side alone will find it.

Meanwhile funders ask, explicitly, to see that you work with food banks, schools
and clinics rather than operating in a silo. They ask for documented
collaboration. Nobody built the infrastructure that produces it.

## What it does

Barnraise gives every organization its own agent over its own private data. The
agents reach each other over **A2A**, the agent-to-agent protocol, across process
boundaries, and negotiate concrete exchanges: this resource, that day, these
conditions.

Then they stop. **Nothing is written until a human on each side signs.**

Every closed agreement lands in a shared ledger, and that ledger is the asset.
When a funding call appears, the coalition agent cross-references it against the
neighborhood's combined capabilities and can show documented prior collaboration
rather than assert it.

Two layers, one cycle. Daily cooperation produces evidence; the evidence makes a
coalition credible; the coalition brings money that funds more cooperation.

In the demo neighborhood: alone, the strongest organization covers three of the
fund's six requirements and the kitchen covers none. None of the six reaches the
thousand people the fund asks for. Together they cover all six and reach 3,250.
The requirement nobody can fake is the last one, documented prior collaboration:
it asks for three agreements, and the ledger holds eight.

## How we built it

**One process per organization, and that is the whole point.**

The obvious build is one agent with six profiles in a list. It works, it is a
tenth of the code, and it quietly destroys the claim. If all six profiles live in
one process, "the library cannot see the food bank's inventory" is a promise about
how carefully the prompt was written.

So Barnraise runs six A2A servers, ports 9001 to 9006, one per organization, each
publishing its own agent card. Whichever organization opens a round acts as the
client for it; the other five answer from their own servers.

```python
from strands.multiagent.a2a import A2AServer

profile = OrgProfile.from_json(ROOT / perfil_path)

def factory(context_id: str):
    return build_org_agent(profile)

A2AServer(agent_factory=factory, port=port).serve()
```

**Data isolation by construction.** Every tool is a closure over exactly one
profile, and the tools take no arguments:

```python
def build_resource_tools(profile: OrgProfile) -> list:
    @tool
    def list_idle_resources() -> str:
        """List my organization's idle resources, the ones we could share with neighbors."""
        ...          # `profile` is captured by the closure, never passed in
    return [list_idle_resources]
```

There is no organization id to pass, so there is no call an agent can make, or be
talked into making, that returns a neighbor's data. The guarantee is visible in
three lines of a file rather than in a paragraph of a system prompt.

**The human gate is a real block.** Strands' interrupt brings the run back with
`stop_reason == "interrupt"` instead of a result. The round is on a worker thread
waiting on a `threading.Event`; the browser gets the paused tool call over SSE;
when the director signs, the API sets the event and the thread resumes where it
stopped. Nothing is polled and nothing is faked with a timer.

**Deterministic guards at the tool boundary.** What reaches the ledger is checked
by ordinary Python before anything is written: the direction of the exchange
against that organization's own inventory, the day that was actually negotiated,
whether the counterparty is a real organization id, and whether the same trade is
already live between the two parties.

**Model-agnostic behind one environment variable.** Amazon Bedrock, Google AI
Studio and a local Ollama. Bedrock is the Strands default; the local path needs no
key at all, so the whole neighborhood can be cloned and run offline.

**The console** is FastAPI with SSE, and **MapLibre over OpenStreetMap** with real
driving routes from OSRM, so the distances on screen are real: 714 m from the
library to the food bank, by road.

## Challenges we ran into

The interesting failures were the ones no test caught.

**An agent that is told "no" asks again.** The resume loop was
`while stop_reason == "interrupt"`. A director declines; the agent receives "no",
decides the task is still unfinished, and calls the same tool again; the loop puts
the refused decision straight back in front of them. Forever. Worse, the app
stayed marked busy, so every later round returned a 409 until the process was
restarted.

Every test we had answered *approve*. The refusal path was the one never exercised
end to end, and it was also the path the entire product exists to protect. It is
bounded now, a decline is terminal, and the test is a stub agent whose only
behavior is to never stop asking.

**The ledger accepted the same trade over and over.** Six copies of one
van-for-food exchange had accumulated. Nothing went wrong in any single round; the
agent simply did not know the deal already existed. A book that records one trade
six times documents an agent looping, not a neighborhood collaborating, and to a
funder those look nothing alike.

**The console asserted a signature that did not exist.** The banner about anything
waiting on you read "*Ana Torres at Central Library has signed. It becomes active
when you do*" — unconditionally, without checking. On an agreement nobody had
signed, it told a director their counterpart was already waiting on them. A
product whose whole claim is that both signatures are real cannot invent one in a
banner. It reads the ledger now.

**A heading that contradicted its own body.** The activity feed titled the
negotiating agent's free text "Terms closed". That text is a model's prose and can
say anything, and in one round it said the counterparty "has expressed a need to
further refine the exchange" under a heading asserting the opposite. It is now
"What the negotiator reported", and what actually settles the terms is the next
event, which is deterministic.

## Accomplishments that we're proud of

The product refuses things, and it can show you.

The demo spends twenty seconds on what it will not do, and those refusals are not
screenshots taken once and kept. A script lifts the tool closure out of the source,
calls it with two sets of bad arguments, and posts a signature from a non-party to
a running server to get a real 403. Change the guards and the film changes. It
cannot go on saying something that used to be true.

A funder reading this ledger is reading rows a model could not have written on its
own: every one passed a deterministic check and carries two human signatures.

## What we learned

Building agents that talk to each other is the easy half. The hard half is making
what they produce trustworthy enough that someone outside would rely on it, and
almost all of that work turns out to be checks, refusals and evidence rather than
capability.

Two specifics we would carry to the next build. Write the decline path first —
everyone builds the approve path because that is the demo, and the refusal path is
where the guarantee lives. And decide early whether your isolation is a promise or
a property; everything else follows from that one call.

## What's next for Barnraise

Authentication is the piece a real deployment needs and this prototype does not
have: the signing organization is a field in the request, so the checks constrain
the interface rather than an arbitrary caller. After that, letting an organization
publish its agent card to neighbors it has not met.

## What this project does not claim

- **Not** that only one coalition qualifies. Four trios do, and the number moves as
  the ledger grows.
- **Not** that the ledger built itself. Four of the eight rows are seeded history,
  and the video says so out loud.
- **Not** that an agent physically cannot read a neighbor's data. What is
  guaranteed is that no tool exists that returns it.
- **Not** that the signatures are authenticated. They are not, and the README says
  so.
- **Not** that the demo runs on Bedrock. The provider is one environment variable
  and all three are documented, but no run on Bedrock has been recorded.
- **Not** that the organizations are real. The streets and the driving routes are;
  the organizations are invented, and the notice saying so is on screen throughout
  the video.

# Agents for Humans: six Strands agents, one ledger, and the pause that would not stop asking

*The single post for the builder.aws bonus. It merges the three earlier drafts in
this folder, which are kept because they are the long form of each section.*

*Published at https://builder.aws.com/content/3INkNpD9WU7cRi69pfK13Ul7Yve/agents-for-humans-six-strands-agents-one-ledger-and-the-pause-that-would-not-stop-asking*

---

Almost every agent I have seen in the nonprofit and civic space automates the
inside of one organization. Its donors, its volunteers, its grant deadlines. That
is useful, and it is also where the ceiling is, because the thing those
organizations most need from each other happens in the gaps between them.

A library two streets from a food bank has a delivery van that sits idle on
Tuesdays. The food bank needs one that day. Neither can see what the other has, so
the van sits still. That is not a data problem inside either organization. It is a
problem *between* them, and no amount of automating either side alone will find it.

Meanwhile funders ask, explicitly, to see that you work with food banks, schools
and clinics rather than operating in a silo. They ask for documented
collaboration, and nobody built the infrastructure that produces it.

So for the AWS Agents for Humans hackathon I built **Barnraise**, in the Good
Neighbor Agents track: six neighboring community organizations, each running its
own agent over its own private data, negotiating with each other over A2A. Nothing
is written until a human on each side signs, and the resulting ledger is the
evidence a funder asks for.

This is what I learned building it, including the two things that were broken for
longer than I would like to admit.

## One process per organization, and that is the whole point

The obvious build is one agent with six profiles in a list. It works, it is a
tenth of the code, and it quietly destroys the claim.

If all six profiles live in one process, "the library cannot see the food bank's
inventory" is a promise about how carefully I wrote the prompt. When each
organization is its own process, on its own port, serving its own agent card, the
same sentence becomes a statement about the system. There is no shared memory to
leak from.

The Strands SDK makes that cheap:

```python
from strands.multiagent.a2a import A2AServer

profile = OrgProfile.from_json(ROOT / perfil_path)

def factory(context_id: str):
    return build_org_agent(profile)

A2AServer(agent_factory=factory, port=port).serve()
```

Six of those, ports 9001 to 9006. Whichever organization opens a round acts as the
client for it and the other five answer from their own servers. The factory matters
too: A2A gives each conversation its own context id, so building the agent per
context means one neighbor's conversation cannot pick up state from another's.

Isolation goes one level deeper. Every tool an agent has is a closure over exactly
one profile, and the tools take no arguments:

```python
def build_resource_tools(profile: OrgProfile) -> list:
    @tool
    def list_idle_resources() -> str:
        """List my organization's idle resources, the ones we could share with neighbors."""
        ...          # `profile` is captured by the closure, never passed in
    return [list_idle_resources]
```

There is no organization id to pass, so there is no call an agent can make, or be
talked into making, that returns a neighbor's data. A prompt that says "do not ask
about other organizations" is a request. A tool that cannot express the question is
a constraint. Only one of those survives a model having a bad day.

## The pause that would not stop asking

The product's whole promise is one sentence: nothing is written until a human on
each side signs. Everything else is plumbing around it.

Strands has first-class support for this. You attach an intervention to the agent,
and when it tries to call the gated tool the run comes back with
`stop_reason == "interrupt"` instead of a result. What I like is that it is a real
block: the round runs on a worker thread, the thread waits on a `threading.Event`,
and the browser gets the paused tool call over SSE. When the director clicks sign,
the API sets the event and the thread picks up exactly where it stopped. Nothing is
polled and nothing is faked with a timer.

Here is roughly what my resume loop looked like:

```python
while result.stop_reason == "interrupt":
    decision = esperar_decision(...)          # blocks on the human
    result = agente(interruptResponse=decision)
```

Read it as an agent would. The human says no. The agent receives "no", decides the
task is still unfinished, and calls the same tool again, because trying again is a
reasonable thing to do. `stop_reason` is `"interrupt"` again. The loop puts the
decision the director just refused straight back in front of them.

Forever.

It was worse than an infinite loop on its own, because of where it sat. The app
stayed marked busy, so every later round returned a 409, and the only way out was
restarting the process. One declined agreement took down the whole neighborhood
until someone noticed.

None of my tests caught it, for a reason worth naming: **every test I had answered
approve.** The refusal path was the one I had never exercised end to end, and it
was also the path the entire product exists to protect.

The fix bounds the loop and treats a decline as terminal rather than as feedback.
The test is not a test of the real agent, which is slow and non-deterministic, but
a stub whose only behavior is the one that broke:

```python
class AgenteQueNuncaPara:
    """Answers every interrupt by asking the same thing again."""
    def __call__(self, *a, **k):
        return Resultado(stop_reason="interrupt")
```

Run the round with that in place. If it terminates, the bound holds. Ten lines, and
the most valuable test in the repository, because it encodes an adversarial model
rather than a cooperative one.

When your safety property is "the agent stops when told", the test you need is an
agent that does not want to stop.

## Put deterministic code between the agent and the record

Barnraise produces a shared ledger of agreements. That ledger is the point: when a
funding call appears, a coalition can show documented prior collaboration instead
of asserting it. Which means it will be read by someone with money, deciding
whether to give it to a food bank.

A record like that cannot be whatever a language model felt like writing. So the
checks do not live in the prompt. They live at the tool boundary, in ordinary
Python, before anything reaches the database. Each one exists because a real round
produced the thing it prevents:

```
Nothing was filed. 'use of the delivery van for collections' is not one of our
organization's resources, so we cannot hand it over. Check the direction:
recurso_entregado must be OURS and recurso_recibido must be the neighbor's.
```

```
Nothing was filed. The conditions say 'Thursday from 9am to 1pm', but the day
agreed in the negotiation was tuesday. Fix the day and call record_agreement again.
```

Notice that both say what was wrong *and what would be accepted*. That is
deliberate. A guard that returns "invalid input" turns a model into a random walk;
a guard that names the mistake turns the same model into something that corrects
itself, usually on the first retry. Design the refusal string like an API for a
colleague who is slightly distracted.

The one that surprised me: I opened the ledger one morning and found six copies of
the same van-for-food exchange. Nothing had gone wrong in any individual round. The
agent simply did not know the deal already existed, so it negotiated it again. A
book that records one trade six times documents an agent looping, not a
neighborhood collaborating, and to a funder those look nothing alike.

## What I would tell someone starting this

**Write the decline path first.** Everyone builds the approve path, because that is
the demo. The refusal path is where the guarantee lives, it is what an adversarial
reviewer will poke at, and in my case it was also the only path that could take
down the whole system.

**Decide early whether your isolation is a promise or a property.** Splitting six
agents into six processes cost me a launcher script and a health check, and in
exchange every claim about who can see what became something a judge can verify by
reading a function signature.

Building agents that talk to each other turned out to be the easy half. The hard
half is making what they produce trustworthy enough that someone outside would rely
on it, and almost all of that work is checks, refusals and evidence rather than
capability.

---

The whole thing is model-agnostic behind one environment variable: Amazon Bedrock,
Google AI Studio, or a local Ollama that needs no key at all, so you can clone it
and run the whole neighborhood offline.

Code, ledger, guards and the demo video: **https://github.com/kasbsquall/barnraise**

#AgentsofFootball

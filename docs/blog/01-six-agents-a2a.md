# Agents for Humans: six Strands agents, six processes, one protocol between them

Almost every agent I have seen in the nonprofit and civic space automates the
inside of one organization. Its donors, its volunteers, its grant deadlines. That
is useful, and it is also where the ceiling is, because the thing those
organizations actually need from each other happens in the gaps between them.

A library two streets from a food bank has a delivery van that sits idle on
Tuesdays. The food bank needs one that day. Neither can see what the other has.
The van sits still. That is not a data problem inside either organization. It is a
problem between them, and no amount of automating either side alone will find it.

So for the AWS Agents for Humans hackathon I built Barnraise, in the Good Neighbor
Agents track. Six neighboring community organizations, each running its own agent
over its own private data, reaching each other over A2A.

This post is about the architecture. Two more follow: one on the human-in-the-loop
pause that turned out to be the hardest part to get right, and one on the
deterministic guards that sit between the agent and the ledger.

## One process per organization is the whole point

The obvious way to build this is one agent with six profiles in a list. It works,
it is a tenth of the code, and it quietly destroys the claim.

If all six profiles live in one process, "the library cannot see the food bank's
inventory" is a promise about how carefully you wrote the prompt. When each
organization is its own process, on its own port, serving its own agent card, the
same sentence becomes a statement about the system. There is no shared memory to
leak from.

So Barnraise runs six A2A servers, ports 9001 to 9006, one per organization. The
Strands SDK makes this small:

```python
from strands.multiagent.a2a import A2AServer

profile = OrgProfile.from_json(ROOT / perfil_path)

def factory(context_id: str):
    return build_org_agent(profile)

A2AServer(agent_factory=factory, port=port).serve()
```

The factory matters: A2A gives each conversation its own context id, and building
the agent per context means one neighbor's conversation cannot pick up state from
another's.

Whichever organization opens a round acts as the client for that round. The other
five answer from their own servers. Each publishes its card at
`/.well-known/agent-card.json`, which is also what the launcher polls to know the
neighborhood is up rather than sleeping an arbitrary number of seconds and hoping.

## Data isolation by construction, not by instruction

Every tool an agent has is a closure over exactly one profile:

```python
def build_resource_tools(profile: OrgProfile) -> list:
    @tool
    def list_idle_resources() -> str:
        """List my organization's idle resources, the ones we could share with neighbors."""
        if not profile.recursos:
            return "No idle resources on record this week."
        ...          # `profile` is captured by the closure, never passed in
    return [list_idle_resources]
```

Look at the signature. The tool takes no arguments. There is no organization id to
pass, so there is no call an agent can make, or be talked into making, that returns
a neighbor's resources. The guarantee is visible in three lines of a file rather
than in a paragraph of a system prompt.

That distinction matters more than it sounds. A prompt that says "do not ask about
other organizations" is a request. A tool that cannot express the question is a
constraint. Only one of those survives a model that is having a bad day.

## What a round actually does

Three phases, and only the middle one is a conversation.

**Discovery.** The opening agent asks each neighbor what it has idle. Plain A2A
messages, one per neighbor, each answered by that neighbor's own agent from its own
process. The replies come back as prose because that is what agents produce, and
the opening side scores them against its own open needs by keyword overlap weighted
by urgency. Deliberately dumb, deliberately deterministic: this step picks who to
negotiate with, and I would rather it be inspectable than clever.

**Negotiation.** The two agents talk. This is the part that reads well on screen and
it is genuinely A2A across a process boundary: a message leaves 9002 and arrives at
9001, and the reply comes back the same way. They settle terms, or they discover
the match was not really there and say so.

**Registration.** The opening agent calls a tool to write the agreement. And here
the round stops, because that tool is behind a human interrupt. Which is the next
post.

## Model-agnostic behind one environment variable

`BARNRAISE_MODEL_PROVIDER` picks between Amazon Bedrock, Google AI Studio and a
local Ollama. Bedrock is the Strands default and the path a real deployment would
take; the demo in the video was recorded on a free tier, and the local path needs no
key at all so anyone can clone the repo and run the whole neighborhood offline.

I want to be precise about that rather than imply more than is true: the provider is
one environment variable, all three are documented, and I have not recorded a run on
Bedrock. Being able to say exactly what has and has not been exercised is worth more
than a vaguer, better-sounding claim.

## What I would tell someone starting this

Decide early whether your isolation is a promise or a property. Everything else in
this build followed from that one call. Splitting six agents into six processes cost
a launcher script and a health check, and in exchange every claim about who can see
what became something a judge can verify by reading a function signature.

Code, ledger and guards: https://github.com/kasbsquall/barnraise

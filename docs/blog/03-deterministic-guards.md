# Agents for Humans: put deterministic code between the agent and the record

Third and last post about Barnraise, my entry in the AWS Agents for Humans
hackathon. The first covered six Strands agents in six processes talking over A2A.
The second covered the human-in-the-loop pause and the loop that would not stop
asking. This one is about the least glamorous part of the build and the one I would
defend hardest.

Barnraise produces a shared ledger of agreements between neighboring community
organizations. That ledger is the whole point: when a funding call appears, a
coalition can show documented prior collaboration instead of asserting it. Which
means the ledger is going to be read by someone with money, deciding whether to give
it to a food bank.

A record like that cannot be whatever a language model felt like writing.

## Where the checks go

Not in the prompt. At the tool boundary, in ordinary Python, before anything reaches
the database. The agent proposes; the code decides whether the proposal is even
filable.

Four checks, each of which exists because a real round produced the thing it
prevents.

**The direction of the exchange.** An agent once tried to file an agreement where
its own organization was handing over a resource it did not have. The check compares
the field against that organization's own inventory:

```
Nothing was filed. 'use of the delivery van for collections' is not one of our
organization's resources, so we cannot hand it over. Check the direction:
recurso_entregado must be OURS and recurso_recibido must be the neighbor's.
Call list_idle_resources if you need to.
```

**A day nobody negotiated.** The conditions said Thursday. The conversation had
settled on Tuesday. The agent had drifted between negotiating and filing, which is
exactly the kind of small, plausible error that is invisible in a ledger row a year
later:

```
Nothing was filed. The conditions say 'Thursday from 9am to 1pm', but the day
agreed in the negotiation was tuesday. Fix the day and call record_agreement again.
```

**A counterparty that is not a real organization id.** Cheap, and it catches
hallucinated neighbors before they become rows.

**The same trade twice.** This one surprised me. I opened the ledger one morning and
found six copies of the same van-for-food exchange. Nothing had gone wrong in any
individual round; the agent simply did not know the deal already existed, so it
negotiated it again. And again.

A book that records one trade six times documents an agent looping. It does not
document a neighborhood collaborating, and to a funder those look nothing alike. So
a guard now refuses a trade that is already live between the same two parties, and
says which agreement covers it.

## The error message is part of the design

Every refusal above tells the agent what was wrong and what to do instead. That is
deliberate. A guard that returns "invalid input" turns a model into a random walk. A
guard that returns "the day agreed in the negotiation was tuesday, fix it and call
again" turns the same model into something that corrects itself on the next attempt,
usually on the first retry.

Think of the refusal string as an API you are designing for a colleague who is
slightly distracted. Say what you rejected, say why, say what would be accepted.

## Authorization is code, not interface

The ledger button in the browser is gated to the organizations that are party to an
agreement. That gate is worth nothing on its own, because the API is right there.

So the endpoint checks too, and returns a real 403:

```
riverside-health-post is not a party to agreement #19 and cannot sign it.
```

I had this on one signing path and not the other, which is the classic version of
this mistake: the careful check on the route you were thinking about, nothing on the
one you were not.

## Showing the refusals, not describing them

The demo video spends twenty seconds on what the product refuses to do, and it is
the segment I would keep if I had to cut everything else.

Every capability in a demo is easy to believe and easy to fake. A refusal is neither.
And the three refusals on screen are not screenshots I took once and kept: a script
lifts the tool closure out of the source, calls it with two sets of bad arguments,
and posts a signature from a non-party to a running server to get the real 403. It
writes what comes back into the data the video renders from.

Change the guards and the film changes. It cannot go on saying something that used to
be true, which is a property I would want in any demo that makes claims about safety.

## What I would tell someone starting this

Decide what your agent is allowed to make permanent, and put ordinary code in front
of it. The interesting engineering in an agent product is not the reasoning. It is
the small set of places where reasoning turns into a record somebody else will rely
on, and how much you are willing to check before it does.

Code, ledger and guards: https://github.com/kasbsquall/barnraise

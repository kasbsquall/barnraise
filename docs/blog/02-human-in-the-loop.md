# Agents for Humans: the pause that would not stop asking

This is the second post about Barnraise, my entry in the AWS Agents for Humans
hackathon. The first covered the architecture: six community organizations, six
Strands agents, six processes, talking over A2A. This one is about the twenty lines
that took the longest to get right, and the bug in them that no test caught.

The product's whole promise is one sentence: nothing is written until a human on
each side signs. Everything else is plumbing around that.

## The interrupt

Strands has first-class support for this. You attach an intervention to the agent,
and when it tries to call the gated tool the run comes back with
`stop_reason == "interrupt"` instead of a result. You show the human what the agent
wants to do, you get an answer, and you resume by passing an `interruptResponse`
back into the same agent.

The part I like is that it is a real block. The round is running on a worker thread,
the thread waits on a `threading.Event`, and the browser gets the paused tool call
over SSE. When the director clicks sign, the API sets the event and the thread picks
up exactly where it stopped. Nothing is polled, nothing is faked with a timer, and
the agent genuinely has not decided anything yet.

That is worth insisting on. A gate that runs after the write, or a confirmation
dialog that the agent never actually waits for, looks identical in a screenshot and
is a completely different product.

## The bug

Here is roughly what the resume loop looked like:

```python
while result.stop_reason == "interrupt":
    decision = esperar_decision(...)          # blocks on the human
    result = agente(interruptResponse=decision)
```

Read it as an agent would. The human says no. The agent receives "no", thinks about
it, and calls the same tool again with the same arguments, because from its point of
view the task is still unfinished and trying again is a reasonable thing to do.
`stop_reason` is `"interrupt"` again. The loop puts the decision the director just
refused straight back in front of them.

Forever.

The failure was worse than an infinite loop on its own, because of where it sat. The
app stayed marked busy, so every later round returned a 409, and the only way out was
restarting the process. One declined agreement took down the whole neighborhood until
someone noticed.

None of my tests caught it, for a reason worth naming: every test I had answered
approve. The refusal path was the one I had never exercised end to end, and it was
also the path the entire product claims to protect.

## The fix, and the test that would have caught it

Bound the loop, and treat a decline as terminal rather than as feedback:

```python
while result.stop_reason == "interrupt" and not rechazado and pausas < MAX_PAUSAS:
    decision = esperar_decision(...)
    rechazado = decision == "no"
    ...
if rechazado:
    events.publicar("reintento", mensaje="Declined. The agent stops asking.")
```

Then the test. Not a test of the real agent, which is slow and non-deterministic, but
a stub whose only behavior is the one that broke:

```python
class AgenteQueNuncaPara:
    """Answers every interrupt by asking the same thing again."""
    def __call__(self, *a, **k):
        return Resultado(stop_reason="interrupt")
```

Run the round with that in place. If it terminates, the bound holds. If it hangs, it
does not. The test is ten lines and it is the most valuable one in the repo, because
it encodes an adversarial model rather than a cooperative one.

That is the shape I would reach for again. When your safety property is "the agent
stops when told", the test you need is an agent that does not want to stop.

## The second signature is a different problem

One human approving is the interrupt. Two humans, one per organization, is a
different mechanism and I got that wrong too, in a quieter way.

The agreement is written as proposed after the first signature and only becomes
active after the second. The console shows the reader a banner about anything waiting
on them, and that banner said:

> Ana Torres at Central Library has signed. It becomes active when you do.

It said that unconditionally. On an agreement nobody had signed yet, the product was
telling a director that their counterpart was already waiting on them. Nobody had
signed anything.

I found it by rendering a frame of the demo video and reading the panel, which is not
a testing strategy I recommend, but it is how a lot of interface bugs surface. The
fix is four lines: read the ledger, and say what is actually there.

A product whose entire claim is that both signatures are real cannot invent one of
them in a banner. That is not a cosmetic bug in a UI. It is the claim failing.

## What I would tell someone starting this

Write the decline path first. Everyone builds the approve path, because that is the
demo. The refusal path is where the guarantee lives, it is the one an adversarial
reviewer will poke at, and in my case it was also the only path that could take down
the whole system.

Code, ledger and guards: https://github.com/kasbsquall/barnraise

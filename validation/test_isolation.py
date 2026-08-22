"""Regression test for the data-isolation claim, without a model.

The README and the architecture doc both say an agent "has no tool that returns
another organization's resources or needs". That is the claim a technical judge
will check, and until now the file that claimed to verify it printed three
prompts at a live agent, asserted nothing, and exited 0 whatever happened.

This tests the claim directly: build every tool an organization's agent is given,
call each one, and confirm that no neighbor's private vocabulary comes back. No
model is involved, because the guarantee is about closures, not about behaviour.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from agents.org_profile import OrgProfile          # noqa: E402
from agents.tools.resources import build_resource_tools   # noqa: E402
from agents.tools.negotiation import build_negotiation_tools  # noqa: E402

failures = []


def check(name, actual, expected):
    ok = actual == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {name}: {actual!r}")
    if not ok:
        failures.append(name)


def call(tool, **kwargs):
    """Invoke a Strands @tool by its underlying function."""
    fn = getattr(tool, "_tool_func", tool)
    return str(fn(**kwargs))


orgs = {p.stem: OrgProfile.from_json(p)
        for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))}
print("organizations:", ", ".join(f"{k} ({v.org_id})" for k, v in orgs.items()))

mine = orgs["library"]
others = [o for k, o in orgs.items() if k != "library"]

# Words that belong to a neighbor and to nobody else. Anything shared with the
# library's own vocabulary would make the test pass or fail for the wrong reason.
mine_words = {w.lower() for r in mine.recursos for w in f"{r.nombre} {r.notas}".split()}
mine_words |= {w.lower() for n in mine.necesidades for w in n.descripcion.split()}

# Ordinary English that happens to sit in a neighbor's notes is not private
# vocabulary. The first run flagged "available", which appears in this agent's
# OWN output formatting, and a check that cries wolf is one you stop reading.
COMMON = {
    "available", "availability", "people", "space", "spaces", "every", "which",
    "their", "there", "these", "those", "other", "others", "about", "after",
    "before", "between", "during", "where", "while", "would", "could", "should",
    "needs", "need", "week", "weekly", "month", "monthly", "morning", "mornings",
    "afternoon", "afternoons", "friday", "saturday", "sunday", "monday",
    "tuesday", "wednesday", "thursday", "hours", "notice", "events", "event",
    "community", "organization", "organizations", "resource", "resources",
}

private = {}
for o in others:
    words = {w.lower().strip(".,;:()") for r in o.recursos
             for w in f"{r.nombre} {r.notas}".split() if len(w) > 4}
    private[o.org_id] = {w for w in words if w not in mine_words and w not in COMMON}
    if not private[o.org_id]:
        raise SystemExit(f"no distinctive vocabulary left for {o.org_id}; "
                         "the filter is too aggressive to prove anything")

print("\nPrivate vocabulary that must never come back:")
for org_id, words in private.items():
    print(f"  {org_id}: {sorted(words)[:8]}")

tools = build_resource_tools(mine) + build_negotiation_tools(mine)
names = [getattr(t, "tool_name", getattr(t, "__name__", "?")) for t in tools]
print(f"\nTools the {mine.org_id} agent is given: {names}")
check("the agent has tools at all", len(tools) > 0, True)

print("\nCase 1: every read-only tool answers only from its own profile")
outputs = []
for tool, name in zip(tools, names):
    try:
        out = call(tool)
    except TypeError:
        # A tool that needs arguments is exercised with a neighbor's own words,
        # which is the strongest version of the test: even asked about their
        # resources, it must not be able to report them.
        probe = " ".join(sorted(private[others[0].org_id])[:3]) or "anything"
        try:
            out = call(tool, recurso_ofrecido=probe, recurso_solicitado=probe)
        except TypeError:
            print(f"  [skip] {name}: needs arguments this test does not know")
            continue
    outputs.append((name, out))

check("at least one tool answered", len(outputs) > 0, True)

# Whole words, not substrings. The first version asked whether the neighbor's word
# appeared anywhere in the output, so "child" from a health post's notes matched
# inside this library's own "children's reading workshop" and reported a leak that
# was the agent quoting itself.
def palabras(texto):
    return {w.strip(".,;:()'’s").lower() for w in texto.split()}


for name, out in outputs:
    dichas = palabras(out)
    leaked = {org: sorted(words & dichas) for org, words in private.items()}
    leaked = {k: v for k, v in leaked.items() if v}
    check(f"{name} leaks nothing", leaked, {})

print("\nCase 2: the tools are closed over ONE profile, so a second organization's"
      "\n        agent answers differently from the same call")
neighbor_tools = build_resource_tools(others[0])
a = call(tools[0])
b = call(neighbor_tools[0])
check("two organizations do not return the same resources", a == b, False)

print(f"\n{'ALL OK' if not failures else 'FAILURES: ' + ', '.join(failures)}")
sys.exit(1 if failures else 0)

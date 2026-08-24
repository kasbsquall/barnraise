"""The deterministic guards around record_agreement, tested without a model.

An agreement in the ledger is evidence a funder will read, so a wrong entry is
worse than no entry. These checks run at the tool boundary, after the human
approves and before anything is written.

Case 4 is a real defect this test exists to prevent: the ownership check once
passed because "Tuesday mornings" and "Saturday mornings" share the word
"mornings", which let a school hand over a van it does not own.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ledger import book

book.DB_PATH = ROOT / "ledger" / "test_guards.db"
book.DB_PATH.unlink(missing_ok=True)

from agents.approval import build_ledger_tools  # noqa: E402

failures = []

CONTEXT = ("[N2] refreshments for pupils on extended school days. "
           "The neighbor offered: surplus food and refreshments for events")
OWN = ["student volunteers community service programme Friday afternoons",
       "large classroom for 40 people fit for training Saturday mornings"]

KNOWN = ["north-food-bank", "central-library", "san-martin-school"]

record = build_ledger_tools(
    "san-martin-school", contexto_esperado=CONTEXT, recursos_propios=OWN,
    vecinos_validos=KNOWN,
)[0]._tool_func


def filed(**kwargs):
    """Run the tool and report whether anything reached the ledger."""
    answer = record(**kwargs)
    return not answer.startswith("Nothing was filed"), answer


def limpiar():
    """Start the next case from an empty ledger.

    The duplicate guard refuses a trade already live between the same two
    organizations, so a case that expects a successful filing cannot inherit the
    row the previous case wrote. Cases were sharing state before and only stayed
    green because nothing looked at history.
    """
    book.DB_PATH.unlink(missing_ok=True)
    book.connect().close()


def check(name, actual, expected):
    ok = actual == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {name}: {actual!r}")
    if not ok:
        failures.append(name)


base = dict(
    contraparte_org_id="north-food-bank",
    recurso_recibido="surplus food and refreshments for events",
    recurso_entregado="large classroom for volunteer training",
    condiciones="Saturday mornings from 9am to 1pm",
    necesidad_cubierta="[N2] refreshments for pupils on extended school days",
)

print("Case 1: a coherent agreement is filed")
ok, answer = filed(**base)
check("filed", ok, True)

print("\nCase 2: placeholder fields are refused")
ok, _ = filed(**{**base, "condiciones": "N/A"})
check("refused", ok, False)

print("\nCase 3: a resource unrelated to the need is refused")
ok, _ = filed(**{**base, "recurso_recibido": "a projector for the film club"})
check("refused", ok, False)

print("\nCase 4: handing over a resource we do not own is refused,")
print("        even when a calendar word overlaps with one of ours")
ok, answer = filed(**{
    **base,
    "recurso_entregado": "use of the van for transporting donations on Tuesday mornings",
    "condiciones": "Tuesday mornings from 9am to 1pm",
})
check("refused", ok, False)
check("the reason names the direction", "direction" in answer.lower(), True)

limpiar()
print("\nCase 5: a day nobody negotiated is refused")
# The calendar guard only fires when the negotiation actually named a day. With
# a day-less context it stays quiet on purpose, rather than inventing a
# constraint nobody agreed to, so this case supplies a context that names one.
with_day = build_ledger_tools(
    "san-martin-school",
    contexto_esperado=CONTEXT + " on Tuesdays",
    recursos_propios=OWN,
)[0]._tool_func
answer = with_day(**{**base, "condiciones": "Thursday from 9am to 1pm"})
check("refused", not answer.startswith("Nothing was filed"), False)
limpiar()
answer = with_day(**{**base, "condiciones": "Tuesday from 9am to 1pm"})
check("the negotiated day is accepted",
      not answer.startswith("Nothing was filed"), True)

limpiar()
print("\nCase 6: our own resource still passes, so the guard is not blanket-refusing")
ok, _ = filed(**{**base, "recurso_entregado": "student volunteers for the food drive"})
check("filed", ok, True)

limpiar()
print("\nCase 7: the field that decides WHO must sign is checked")
# This one had no guard at all while every other field had one. A display name
# where an id belongs writes a row that looks signed, can never be completed by
# any console, and is silently dropped from the collaboration evidence it was
# written to become.
answer = record(**{**base, "contraparte_org_id": "Central Library"})
check("a display name is refused", not answer.startswith("Nothing was filed"), False)
check("the reason asks for an id", "id" in answer.lower(), True)

answer = record(**{**base, "contraparte_org_id": "san-martin-school"})
check("an agreement with ourselves is refused",
      not answer.startswith("Nothing was filed"), False)

answer = record(**{**base, "contraparte_org_id": "north-food-bank"})
check("a real neighbor id still passes",
      not answer.startswith("Nothing was filed"), True)

print("")
print("Case 8: the same trade is not recorded twice while it is still live")
# Six copies of one van-for-food exchange reached the real ledger this way. A
# book that accepts the same trade over and over documents an agent looping, not
# a neighborhood collaborating.
limpiar()
ok, _ = filed(**base)
check("the first one is filed", ok, True)
ok, answer = filed(**base)
check("the repeat is refused", ok, False)
check("the reason names the existing entry", "already covers" in answer, True)
# The guard is about this pair and this resource, so the same trade with a
# different neighbor is a different agreement and still goes through.
ok, _ = filed(**{**base, "contraparte_org_id": "central-library"})
check("the same trade with another neighbor still passes", ok, True)

book.DB_PATH.unlink(missing_ok=True)
print(f"\n{'ALL OK' if not failures else 'FAILURES: ' + ', '.join(failures)}")
sys.exit(1 if failures else 0)

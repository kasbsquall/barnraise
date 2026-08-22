"""Regression test for signatures.

Four things must hold, and each of them broke at least once:

  1. An older pending agreement is never signed by a later round.
  2. A signature lands on the agreement this round created.
  3. The approval that writes an agreement is the one that signs it, even when a
     later decision in the same round is a rejection.
  4. Once the agreement is written, the agent is not asked to write it again.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ledger import book

book.DB_PATH = ROOT / "ledger" / "test_signature.db"
book.DB_PATH.unlink(missing_ok=True)

from web import runner  # noqa: E402

failures = []


def check(name, actual, expected):
    ok = actual == expected
    print(f"  [{'OK' if ok else 'FAIL'}] {name}: {actual!r}")
    if not ok:
        failures.append(name)


def signatures_on(acuerdo_id):
    conn = book.connect()
    try:
        return conn.execute(
            "SELECT COUNT(*) c FROM aprobaciones WHERE acuerdo_id = ?", (acuerdo_id,)
        ).fetchone()["c"]
    finally:
        conn.close()


def state_of(acuerdo_id):
    conn = book.connect()
    try:
        return conn.execute(
            "SELECT estado FROM acuerdos WHERE id = ?", (acuerdo_id,)
        ).fetchone()["estado"]
    finally:
        conn.close()


def write_agreement(resource):
    conn = book.connect()
    try:
        return book.registrar_propuesta(
            conn, "north-food-bank", "central-library",
            resource, "refreshments", "Tuesday 9am", "[N1] transport",
        )
    finally:
        conn.close()


print("Case 1: an older unsigned agreement is never signed on its own")
old = write_agreement("van lent last week")
runner._firmar_lo_asentado("north-food-bank", desde_id=old)
check("older agreement is still proposed", state_of(old), "propuesto")
check("no signature on the older agreement", signatures_on(old), 0)

print("\nCase 2: only the agreement created in this round is signed")
fresh = write_agreement("van from this round")
runner._firmar_lo_asentado("north-food-bank", desde_id=old)
check("fresh agreement signed by its own organization", signatures_on(fresh), 1)
check("older agreement still unsigned", signatures_on(old), 0)
check("fresh agreement still proposed, counterparty missing",
      state_of(fresh), "propuesto")


# --- Cases 3 and 4 drive _registrar with a stand-in agent -------------------
# The real bug: the round signed according to the LAST decision, so approving
# the write and then declining a duplicate ask left the agreement unsigned
# while the interface told the director they had signed it.

class FakeInterrupt:
    id = "interrupt-1"
    reason = 'record_agreement({"contraparte_org_id": "central-library"})'


class FakeResult:
    def __init__(self, stop_reason, interrupts=()):
        self.stop_reason = stop_reason
        self.interrupts = list(interrupts)

    def __str__(self):
        return "prose that never names the tool"


def run_registrar(decisions):
    """Run _registrar against a stand-in agent. Returns (calls, written_id)."""
    calls = []
    written = []
    pending = list(decisions)

    def fake_invocar(agente, entrada, aviso=None):
        calls.append(entrada)
        if isinstance(entrada, list):          # resuming from the human pause
            if entrada[0]["interruptResponse"]["response"] == "yes":
                written.append(write_agreement("van negotiated this round"))
            return FakeResult("end")
        if len(calls) == 1:                    # first ask: the agent pauses
            return FakeResult("interrupt", [FakeInterrupt()])
        return FakeResult("interrupt", [FakeInterrupt()])   # insisting pauses again

    original_invocar, original_wait = runner.invocar, runner._esperar_decision
    runner.invocar = fake_invocar
    runner._esperar_decision = lambda *a, **k: pending.pop(0) if pending else "no"
    try:
        runner._registrar(object(), "prompt", "title", "north-food-bank")
    finally:
        runner.invocar, runner._esperar_decision = original_invocar, original_wait
    return calls, (written[0] if written else None)


print("\nCase 3: the approval that writes the agreement is the one that signs it")
calls, written_id = run_registrar(["yes"])
check("an agreement was written", written_id is not None, True)
check("the writing organization signed it", signatures_on(written_id), 1)

print("\nCase 4: once written, the agent is not asked to write it again")
check("the agent was asked exactly once, then resumed", len(calls), 2)

print("\nCase 5: a rejection writes nothing and signs nothing")
before = runner._ultimo_id_acuerdo()
calls, written_id = run_registrar(["no"])
check("nothing was written", runner._ultimo_id_acuerdo(), before)
check("the agent was not pushed to try again after a rejection", len(calls), 2)

book.DB_PATH.unlink(missing_ok=True)
print(f"\n{'ALL OK' if not failures else 'FAILURES: ' + ', '.join(failures)}")
sys.exit(1 if failures else 0)

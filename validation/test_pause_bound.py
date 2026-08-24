"""The human-in-the-loop pause is bounded, tested without a model.

A director who declines has to be obeyed. The loop that presents the pause had
no bound: an agent that answered "no" by calling the same tool again put the
decision the director had just refused straight back in front of them, and the
round never ended. The app stayed marked busy, so every later round returned 409
until the process was restarted. In practice this happened with the local 7B
model, which retries a refused tool call indefinitely.

The agent here is a stub that always asks again, which is the worst case and the
only one that catches the defect. A real model usually gives up on its own,
which is why this went unnoticed.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from web import runner  # noqa: E402

failures = []


class Interrupt:
    id = "int-1"


class Insistente:
    """A result that is always paused, however it is answered."""
    stop_reason = "interrupt"
    interrupts = [Interrupt()]


def correr(respuesta: str):
    """Runs _registrar against an agent that never stops asking.

    Returns how many times a human was asked. Everything the function touches
    outside itself is replaced, so nothing reaches a model, the ledger or the
    event stream.
    """
    pedidas = []

    original = {
        "invocar": runner.invocar,
        "esperar": runner._esperar_decision,
        "ultimo": runner._ultimo_id_acuerdo,
        "firmar": runner._firmar_lo_asentado,
        "args": runner._argumentos_de,
        "publicar": runner.events.publicar,
    }
    runner.invocar = lambda *a, **k: Insistente()
    runner._argumentos_de = lambda i: ("record_agreement", {})
    runner._ultimo_id_acuerdo = lambda: 0
    runner._firmar_lo_asentado = lambda *a, **k: None
    runner.events.publicar = lambda *a, **k: None

    def esperar(titulo, herramienta, argumentos, org_id):
        pedidas.append(titulo)
        return respuesta

    runner._esperar_decision = esperar
    try:
        runner._registrar(object(), "prompt", "titulo", "north-food-bank")
    finally:
        runner.invocar = original["invocar"]
        runner._esperar_decision = original["esperar"]
        runner._ultimo_id_acuerdo = original["ultimo"]
        runner._firmar_lo_asentado = original["firmar"]
        runner._argumentos_de = original["args"]
        runner.events.publicar = original["publicar"]
    return len(pedidas)


# 1. A decline is final. The agent asking again does not put it back.
veces = correr("no")
if veces != 1:
    failures.append(f"a decline was presented {veces} times, expected exactly 1")

# 2. Even when every pause is approved, an agent that never settles is stopped.
veces = correr("yes")
if veces != runner.MAX_PAUSAS:
    failures.append(
        f"an agent that never settles paused {veces} times, "
        f"expected the ceiling of {runner.MAX_PAUSAS}")

# 3. The ceiling is a real bound, not an accident of the default.
if runner.MAX_PAUSAS < 1 or runner.MAX_PAUSAS > 10:
    failures.append(f"MAX_PAUSAS is {runner.MAX_PAUSAS}, which is not a sane ceiling")

if failures:
    print("FAILED")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print(f"ok · a decline is asked once, an unsettled agent stops at {runner.MAX_PAUSAS}")

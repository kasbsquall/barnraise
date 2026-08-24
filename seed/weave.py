"""Run exchange rounds until an organization has a connection of its own.

The three newest organizations sit on the map with no line reaching them, because
a line is a fulfilled agreement and they have none. This drives real rounds from
each of them, checks the terms the agents settled on before anything is signed,
and signs from both sides when they hold up.

The checks here are the same ones the deterministic guards apply at the write,
run early so a bad round is declined rather than discovered after a human has
already approved it. Nothing is fabricated: every agreement this produces was
negotiated by the agents over A2A.

    python seed/weave.py riverside-health-post casa-vecinal-kitchen
"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

API = "http://127.0.0.1:8080"
# Stems that mean the exchange did not happen. A round once reached the pause
# with conditions reading "exchange declined by Central Library" on an agreement
# it was filing for signature, and every other check passed, because none of
# them reads the terms for a sentence contradicting the agreement existing.
NEGATIVO = ("declin", "reject", "refus", "unable", "withdraw", "cancel",
            "failed", "failure", "unavailab", "no agreement")


def contradice(valor: str) -> str:
    """The word in this text that says the exchange fell through, if any."""
    bajo = str(valor).lower()
    if "no agreement" in bajo:
        return "no agreement"
    for w in re.findall("[a-z]+", bajo):
        if w.startswith(NEGATIVO):
            return w
    return ""
CALENDARIO = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "morning", "mornings", "afternoon", "afternoons", "day", "days", "week",
    "weekly", "month", "monthly", "hour", "hours", "time", "times", "notice",
    "available", "availability", "evening", "evenings",
}


def pedir(ruta: str, cuerpo: dict | None = None) -> dict:
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        API + ruta, data=datos,
        headers={"Content-Type": "application/json"} if datos else {},
        method="POST" if datos is not None else "GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()[:200], "code": e.code}


def palabras(texto: str) -> set[str]:
    import re
    return {w for w in re.findall(r"[a-z]{3,}", str(texto).lower()) if w not in CALENDARIO}


def dias(texto: str) -> set[str]:
    import re
    return set(re.findall(r"monday|tuesday|wednesday|thursday|friday|saturday|sunday",
                          str(texto).lower()))


def revisar(t: dict, mis_recursos: list[str]) -> list[str]:
    """The same questions the guards ask, asked before a person is involved."""
    fallos = []
    need, cond = dias(t.get("necesidad_cubierta", "")), dias(t.get("condiciones", ""))
    if need and cond and not (need & cond):
        fallos.append(f"conditions say {sorted(cond)} but the need is {sorted(need)}")

    # Two shared words let "community health pamphlets" pass as ours because our
    # health talks are also "community" and "health". A resource we own has to
    # share more than its topic: half its own vocabulary.
    dado = palabras(t.get("recurso_entregado", ""))
    def parece_mio(r: str) -> bool:
        mias = palabras(r)
        if not mias:
            return False
        comunes = len(mias & dado)
        return comunes >= 2 and comunes >= min(3, len(mias) // 3)
    if not any(parece_mio(r) for r in mis_recursos):
        fallos.append(f'"{t.get("recurso_entregado")}" is not one of our own resources')

    quiero = palabras(t.get("necesidad_cubierta", ""))
    recibo = palabras(t.get("recurso_recibido", ""))
    if quiero and not (quiero & recibo):
        fallos.append(f'"{t.get("recurso_recibido")}" does not cover the need')

    # An agreement whose own terms say the exchange was declined contradicts the
    # row it is about to become. Every other check passed on one of those.
    for campo, valor in t.items():
        if isinstance(valor, str) and contradice(valor):
            fallos.append(f'{campo} says the exchange did not happen: "{valor}"')
    return fallos


def esperar(cond, limite=540, paso=4):
    fin = time.time() + limite
    while time.time() < fin:
        d = pedir("/api/state")
        if cond(d):
            return d
        time.sleep(paso)
    return None


def ronda(org_id: str, intentos: int = 3) -> bool:
    estado = pedir("/api/state")
    perfil = next(o for o in estado["organizaciones"] if o["org_id"] == org_id)
    mis = [f"{r['nombre']} {r.get('notas', '')}" for r in perfil["recursos"]]
    print(f"\n=== {perfil['nombre']} ===")

    for intento in range(1, intentos + 1):
        # A declined round takes a moment to unwind, and a round left paused by a
        # previous attempt blocks every later one with a 409. Clear it rather than
        # failing three times in a row on a round that was seconds from finishing.
        for _ in range(30):
            d = pedir("/api/state")
            pend = d["ronda"].get("pendiente")
            if not pend and d["ronda"].get("fase") == "inactiva":
                break
            if pend:
                pedir("/api/round/interrupt",
                      {"decision": "rechazado", "org_id": pend["org_id"]})
            time.sleep(4)
        r = pedir("/api/round/exchange", {"org_id": org_id})
        if r.get("error"):
            print("  no se pudo iniciar:", r["error"][:90])
            return False
        print(f"  intento {intento}: negociando…")

        d = esperar(lambda d: bool(d["ronda"].get("pendiente")))
        if not d:
            print("  la ronda no llego a la pausa")
            continue

        t = d["ronda"]["pendiente"]["argumentos"]
        con = t.get("contraparte_org_id")
        print(f"    recibe : {t.get('recurso_recibido')}")
        print(f"    entrega: {t.get('recurso_entregado')}")
        fallos = revisar(t, mis)
        if fallos:
            for f in fallos:
                print("    RECHAZADO:", f)
            pedir("/api/round/interrupt", {"decision": "rechazado", "org_id": org_id})
            continue

        pedir("/api/round/interrupt", {"decision": "aprobado", "org_id": org_id})
        print(f"    firmado por {perfil['director']}, esperando a {con}")

        d = esperar(lambda d: any(
            a["estado"] == "propuesto" and org_id in (a["org_solicitante"], a["org_proveedora"])
            for a in d["acuerdos"]), 180)
        if not d:
            print("    el acuerdo no llego al Libro (los guardias lo rechazaron)")
            continue

        acuerdo = next(a for a in d["acuerdos"]
                       if a["estado"] == "propuesto" and org_id in (a["org_solicitante"], a["org_proveedora"]))
        otro = acuerdo["org_solicitante"] if acuerdo["org_proveedora"] == org_id else acuerdo["org_proveedora"]
        res = pedir(f"/api/agreements/{acuerdo['id']}/decide", {"org_id": otro, "decision": "aprobado"})
        print(f"    entrada #{acuerdo['id']} -> {res.get('estado', res)}")
        return True

    print("  sin acuerdo tras", intentos, "intentos")
    return False


if __name__ == "__main__":
    objetivos = sys.argv[1:] or ["riverside-health-post", "casa-vecinal-kitchen", "eastside-youth-club"]
    hechos = sum(1 for o in objetivos if ronda(o))
    d = pedir("/api/state")
    sin = [o["nombre"] for o in d["organizaciones"]
           if not any(o["org_id"] in (v["a"], v["b"]) for v in d["vinculos"])]
    print(f"\n{hechos}/{len(objetivos)} rounds closed · {len(d['acuerdos'])} agreements · "
          f"{len(d['vinculos'])} links")
    print("still with no line:", sin or "none")

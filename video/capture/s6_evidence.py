"""Collects what S6 puts on screen, from the code and from a running server.

The scene claims three things and each one is shown rather than asserted: that an
agent has no tool returning a neighbor's data, that what reaches the ledger is
checked by code, and what those checks refuse. Everything here is read from the
source or produced by calling the real thing, so a change to the guards changes
the film rather than leaving it stating something that used to be true.

    python video/capture/s6_evidence.py
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
API = "http://127.0.0.1:8080"
SALIDA = ROOT / "video/remotion/src/data/refusals.json"


def cierre() -> dict:
    """The tool closure, lifted from the file rather than retyped."""
    texto = (ROOT / "agents/tools/resources.py").read_text(encoding="utf-8").split("\n")
    ini = next(i for i, l in enumerate(texto) if l.startswith("def build_resource_tools"))
    fin = next(i for i, l in enumerate(texto[ini:], ini) if l.strip() == "return [list_idle_resources, list_needs]")
    return {"archivo": "agents/tools/resources.py",
            "lineas": [l.rstrip() for l in texto[ini:fin + 1]]}


def rechazos_de_guardia() -> list[dict]:
    """Two refusals produced by calling record_agreement with real bad arguments."""
    from ledger import book
    book.DB_PATH = ROOT / "ledger" / "s6_evidence.db"
    book.DB_PATH.unlink(missing_ok=True)
    from agents.approval import build_ledger_tools

    contexto = ("[N2] refreshments for pupils on extended school days. "
                "The neighbor offered: surplus food and refreshments for events on Tuesdays")
    propios = ["student volunteers community service programme Friday afternoons",
               "large classroom for 40 people fit for training Saturday mornings"]
    record = build_ledger_tools(
        "san-martin-school", contexto_esperado=contexto, recursos_propios=propios,
        vecinos_validos=["north-food-bank", "central-library", "san-martin-school"],
    )[0]._tool_func
    base = dict(contraparte_org_id="north-food-bank",
                recurso_recibido="surplus food and refreshments for events",
                recurso_entregado="large classroom for volunteer training",
                condiciones="Tuesday mornings from 9am to 1pm",
                necesidad_cubierta="[N2] refreshments for pupils on extended school days")
    casos = [
        ("the wrong direction", "recurso_entregado", "use of the delivery van for collections"),
        ("a day nobody negotiated", "condiciones", "Thursday from 9am to 1pm"),
    ]
    fuera = []
    for titulo, campo, valor in casos:
        fuera.append({"titulo": titulo, "campo": campo, "valor": valor,
                      "respuesta": record(**{**base, campo: valor})})
    book.DB_PATH.unlink(missing_ok=True)
    return fuera


def rechazo_del_servidor() -> dict:
    """The 403 a running server returns when a stranger tries to sign."""
    d = json.load(urllib.request.urlopen(API + "/api/state", timeout=20))
    a = next(x for x in d["acuerdos"] if x["estado"] == "aprobado")
    partes = {a["org_proveedora"], a["org_solicitante"]}
    intruso = next(o["org_id"] for o in d["organizaciones"] if o["org_id"] not in partes)
    req = urllib.request.Request(
        f"{API}/api/agreements/{a['id']}/decide",
        data=json.dumps({"org_id": intruso, "decision": "aprobado"}).encode(),
        headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as e:
        return {"titulo": "an organization that is not a party",
                "peticion": f"POST /api/agreements/{a['id']}/decide",
                "cuerpo_enviado": f'{{"org_id": "{intruso}", "decision": "aprobado"}}',
                "codigo": e.code,
                "respuesta": json.loads(e.read().decode()).get("detail", "")}
    raise SystemExit("the server accepted a signature from a stranger")


if __name__ == "__main__":
    datos = {"cierre": cierre(),
             "rechazos": rechazos_de_guardia() + [rechazo_del_servidor()]}
    SALIDA.write_text(json.dumps(datos, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{len(datos['rechazos'])} refusals and {len(datos['cierre']['lineas'])} "
          f"source lines -> {SALIDA.relative_to(ROOT)}")
    for r in datos["rechazos"]:
        print(f"  {r['titulo']}: {r['respuesta'][:70]}...")

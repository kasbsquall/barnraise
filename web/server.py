"""Barnraise web app: the neighborhood, the live negotiation, and the decisions.

Run with:  python web/server.py
"""
import asyncio
import json
import sys
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agents.org_profile import OrgProfile
from agents.tools.grants import Convocatoria, evaluar
from ledger import book
from ledger.evidence import evidencia_de_colaboracion
from web import events, runner

STATIC = Path(__file__).parent / "static"

DIRECTORES = {
    "central-library": "Ana Torres",
    "north-food-bank": "Luis Mendoza",
    "san-martin-school": "Rosa Diaz",
}

app = FastAPI(title="Barnraise")


def cargar_perfiles() -> list[OrgProfile]:
    return [OrgProfile.from_json(p) for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))]


def cargar_convocatoria() -> Convocatoria:
    return Convocatoria.from_json(ROOT / "seed" / "grants" / "resilience_fund.json")


@app.on_event("startup")
async def _startup() -> None:
    events.bind_loop(asyncio.get_running_loop())


@app.get("/")
async def index() -> FileResponse:
    # Never cache the shell: a stale index keeps pointing at old asset URLs, and
    # during a demo that shows a version of the app nobody is looking at.
    return FileResponse(
        STATIC / "index.html",
        headers={"Cache-Control": "no-store, must-revalidate"},
    )


@app.get("/api/state")
async def state() -> dict:
    perfiles = cargar_perfiles()
    convocatoria = cargar_convocatoria()
    conn = book.connect()
    try:
        acuerdos = [dict(a) for a in book.historial(conn)]
        coaliciones = [dict(c) for c in book.coaliciones(conn)]
        firmas_acuerdo = [
            dict(r) for r in conn.execute("SELECT * FROM aprobaciones").fetchall()
        ]
        firmas_coalicion = [
            dict(r) for r in conn.execute("SELECT * FROM aprobaciones_coalicion").fetchall()
        ]
        evidencia = evidencia_de_colaboracion(conn, [p.org_id for p in perfiles])
        # Requirement coverage, computed the same way the coalition agent sees it.
        individuales = {p.org_id: evaluar(convocatoria, [p], conn) for p in perfiles}
        conjunta = evaluar(convocatoria, perfiles, conn)
    finally:
        conn.close()

    organizaciones = [
        {
            "org_id": p.org_id,
            "nombre": p.nombre,
            "tipo": p.tipo,
            "descripcion": p.descripcion,
            "poblacion": p.poblacion_atendida,
            "director": DIRECTORES.get(p.org_id, "Direccion"),
            "recursos": [
                {"id": r.id, "nombre": r.nombre, "disponibilidad": r.disponibilidad, "notas": r.notas}
                for r in p.recursos
            ],
            "necesidades": [
                {"id": n.id, "descripcion": n.descripcion, "frecuencia": n.frecuencia, "urgencia": n.urgencia}
                for n in p.necesidades
            ],
            "requisitos_cubiertos": [r["id"] for r in individuales[p.org_id].cumplidos],
        }
        for p in perfiles
    ]

    # Edge weight between two organizations = fulfilled agreements between them.
    vinculos: dict[tuple, int] = {}
    for a in acuerdos:
        if a["estado"] not in ("aprobado", "cumplido"):
            continue
        par = tuple(sorted((a["org_solicitante"], a["org_proveedora"])))
        vinculos[par] = vinculos.get(par, 0) + 1

    return {
        "organizaciones": organizaciones,
        "vinculos": [{"a": a, "b": b, "acuerdos": n} for (a, b), n in vinculos.items()],
        "acuerdos": acuerdos,
        "firmas_acuerdo": firmas_acuerdo,
        "coaliciones": coaliciones,
        "firmas_coalicion": firmas_coalicion,
        "convocatoria": {
            "id": convocatoria.id,
            "nombre": convocatoria.nombre,
            "financiador": convocatoria.financiador,
            "monto": convocatoria.monto,
            "moneda": convocatoria.moneda,
            "cierre": convocatoria.cierre,
            "descripcion": convocatoria.descripcion,
            "requisitos": convocatoria.requisitos,
            "cubiertos_en_conjunto": [r["id"] for r in conjunta.cumplidos],
            "aportes": conjunta.aportes,
            "poblacion_conjunta": conjunta.poblacion_total,
        },
        "evidencia": {
            "total": evidencia.total,
            "organizaciones": len(evidencia.organizaciones_involucradas),
            "pares": len(evidencia.pares_colaborando),
        },
        "actividad": events.historial(),
        "ronda": runner.estado(),
    }


@app.get("/api/stream")
async def stream() -> StreamingResponse:
    cola = events.subscribe()

    async def generador():
        try:
            yield ": conectado\n\n"
            while True:
                try:
                    mensaje = await asyncio.wait_for(cola.get(), timeout=20)
                    yield f"data: {mensaje}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            events.unsubscribe(cola)

    return StreamingResponse(
        generador(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


class RondaRequest(BaseModel):
    org_id: str = "north-food-bank"


@app.post("/api/round/exchange")
async def iniciar_ronda(req: RondaRequest) -> dict:
    if runner.ocupado():
        raise HTTPException(409, "Ya hay una ronda en curso.")
    threading.Thread(target=runner.ronda_intercambio, args=(req.org_id,), daemon=True).start()
    return {"iniciada": True}


@app.post("/api/round/coalition")
async def iniciar_coalicion() -> dict:
    if runner.ocupado():
        raise HTTPException(409, "Ya hay una ronda en curso.")
    threading.Thread(target=runner.ronda_coalicion, daemon=True).start()
    return {"iniciada": True}


class InterrupcionRequest(BaseModel):
    decision: str
    org_id: str | None = None


@app.post("/api/round/interrupt")
async def resolver_interrupcion(req: InterrupcionRequest) -> dict:
    """A director decides on the tool call their own agent is paused at."""
    if req.decision not in ("aprobado", "rechazado"):
        raise HTTPException(400, "Invalid decision.")
    try:
        resuelta = runner.resolver_interrupcion(req.decision, firmante=req.org_id)
    except runner.PermisoDeFirma as exc:
        raise HTTPException(403, str(exc))
    if not resuelta:
        raise HTTPException(409, "There is no decision waiting.")
    return {"resuelta": True}


class DecisionRequest(BaseModel):
    org_id: str
    decision: str
    comentario: str = ""


@app.post("/api/agreements/{acuerdo_id}/decide")
async def decidir_acuerdo(acuerdo_id: int, req: DecisionRequest) -> dict:
    if req.decision not in ("aprobado", "rechazado"):
        raise HTTPException(400, "Invalid decision.")
    aprobador = DIRECTORES.get(req.org_id, "Direccion")
    conn = book.connect()
    try:
        estado = book.registrar_aprobacion(
            conn, acuerdo_id, req.org_id, req.decision, aprobador, req.comentario
        )
    finally:
        conn.close()
    events.publicar(
        "decision",
        ambito="acuerdo",
        acuerdo_id=acuerdo_id,
        org_id=req.org_id,
        aprobador=aprobador,
        decision=req.decision,
        estado=estado,
    )
    return {"estado": estado}


@app.post("/api/coalitions/{coalicion_id}/decide")
async def decidir_coalicion(coalicion_id: int, req: DecisionRequest) -> dict:
    if req.decision not in ("aprobado", "rechazado"):
        raise HTTPException(400, "Invalid decision.")
    aprobador = DIRECTORES.get(req.org_id, "Direccion")
    conn = book.connect()
    try:
        estado = book.aprobar_coalicion(
            conn, coalicion_id, req.org_id, req.decision, aprobador, req.comentario
        )
    finally:
        conn.close()
    events.publicar(
        "decision",
        ambito="coalicion",
        coalicion_id=coalicion_id,
        org_id=req.org_id,
        aprobador=aprobador,
        decision=req.decision,
        estado=estado,
    )
    return {"estado": estado}


app.mount("/static", StaticFiles(directory=STATIC), name="static")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080, log_level="warning")

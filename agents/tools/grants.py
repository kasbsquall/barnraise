"""Grant eligibility: deterministic requirement checking over combined capabilities.

The scan is plain code, not model reasoning: whether a coalition meets a
population threshold or covers a required capability is a fact, and a funder
application built on a hallucinated fact is worse than no application.
"""
import json
import unicodedata
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path

from agents.org_profile import OrgProfile
from ledger import book
from ledger.evidence import evidencia_de_colaboracion


def _normalize(text: str) -> str:
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )
    return sin_tildes.lower()


@dataclass
class Convocatoria:
    id: str
    nombre: str
    financiador: str
    monto: int
    moneda: str
    cierre: str
    descripcion: str
    requisitos: list[dict]

    @classmethod
    def from_json(cls, path: str | Path) -> "Convocatoria":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(**data)


@dataclass
class Evaluacion:
    org_ids: list[str]
    cumplidos: list[dict]
    faltantes: list[dict]
    aportes: dict           # requisito_id -> org_id que lo cubre
    poblacion_total: int

    @property
    def califica(self) -> bool:
        return not self.faltantes


def _capacidades(profile: OrgProfile) -> str:
    partes = [profile.descripcion] + [
        f"{r.nombre} {r.disponibilidad} {r.notas}" for r in profile.recursos
    ]
    return _normalize(" ".join(partes))


def evaluar(
    convocatoria: Convocatoria,
    profiles: list[OrgProfile],
    conn=None,
) -> Evaluacion:
    """Check a coalition (one or more orgs) against every requirement."""
    org_ids = [p.org_id for p in profiles]
    poblacion_total = sum(p.poblacion_atendida for p in profiles)
    capacidades = {p.org_id: _capacidades(p) for p in profiles}

    cumplidos: list[dict] = []
    faltantes: list[dict] = []
    aportes: dict = {}

    cerrar = conn is None
    conn = conn or book.connect()
    try:
        evidencia = evidencia_de_colaboracion(conn, org_ids)
    finally:
        if cerrar:
            conn.close()

    for req in convocatoria.requisitos:
        tipo = req["tipo"]
        if tipo == "poblacion":
            ok = poblacion_total >= req["poblacion_minima"]
            if ok:
                aportes[req["id"]] = f"suma de las {len(profiles)} organizaciones"
        elif tipo == "capacidad":
            claves = [_normalize(k) for k in req["palabras_clave"]]
            quienes = [
                oid for oid, texto in capacidades.items()
                if any(clave in texto for clave in claves)
            ]
            ok = bool(quienes)
            if ok:
                aportes[req["id"]] = ", ".join(quienes)
        elif tipo == "colaboracion":
            ok = (
                evidencia.total >= req["acuerdos_minimos"]
                and len(evidencia.organizaciones_involucradas) >= req["organizaciones_minimas"]
            )
            if ok:
                aportes[req["id"]] = f"{evidencia.total} acuerdos en el Libro del Barrio"
        else:
            ok = False

        (cumplidos if ok else faltantes).append(req)

    return Evaluacion(
        org_ids=org_ids,
        cumplidos=cumplidos,
        faltantes=faltantes,
        aportes=aportes,
        poblacion_total=poblacion_total,
    )


def escanear_coaliciones(
    convocatoria: Convocatoria,
    profiles: list[OrgProfile],
) -> tuple[list[Evaluacion], list[Evaluacion]]:
    """Return (individual evaluations, qualifying coalitions ordered by size).

    Smaller coalitions come first: asking three organizations to coordinate when
    two suffice wastes everyone's time.
    """
    conn = book.connect()
    try:
        individuales = [evaluar(convocatoria, [p], conn) for p in profiles]
        coaliciones = []
        for tamano in range(2, len(profiles) + 1):
            for combo in combinations(profiles, tamano):
                ev = evaluar(convocatoria, list(combo), conn)
                if ev.califica:
                    coaliciones.append(ev)
    finally:
        conn.close()
    return individuales, coaliciones

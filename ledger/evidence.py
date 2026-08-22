"""Turn the ledger into the collaboration evidence funders ask for.

Nobody wrote this history by hand: it accumulated as the daily exchange layer
closed agreements. That is what makes it credible as evidence.
"""
import sqlite3
from dataclasses import dataclass

from ledger import book

CUMPLIDOS = ("aprobado", "cumplido")


@dataclass
class Evidencia:
    org_ids: list[str]
    acuerdos: list[sqlite3.Row]
    pares_colaborando: set[tuple[str, str]]

    @property
    def total(self) -> int:
        return len(self.acuerdos)

    @property
    def organizaciones_involucradas(self) -> set[str]:
        involucradas: set[str] = set()
        for a in self.acuerdos:
            involucradas.add(a["org_solicitante"])
            involucradas.add(a["org_proveedora"])
        return involucradas

    def resumen(self) -> str:
        if not self.acuerdos:
            return "Sin colaboracion documentada entre estas organizaciones."
        lineas = [
            f"{self.total} acuerdo(s) documentados entre "
            f"{len(self.organizaciones_involucradas)} organizaciones:"
        ]
        for a in self.acuerdos:
            linea = (
                f"- {a['fecha'][:10]} | {a['org_proveedora']} entrego "
                f"'{a['recurso_entregado']}' a {a['org_solicitante']}, que entrego "
                f"'{a['recurso_recibido']}' | estado: {a['estado']}"
            )
            if a["resultado"]:
                linea += f" | resultado: {a['resultado']}"
            lineas.append(linea)
        return "\n".join(lineas)


def evidencia_de_colaboracion(conn: sqlite3.Connection, org_ids: list[str]) -> Evidencia:
    """Agreements where BOTH sides belong to the given set of organizations."""
    conjunto = set(org_ids)
    acuerdos = [
        a for a in book.historial(conn)
        if a["estado"] in CUMPLIDOS
        and a["org_solicitante"] in conjunto
        and a["org_proveedora"] in conjunto
    ]
    pares = {
        tuple(sorted((a["org_solicitante"], a["org_proveedora"]))) for a in acuerdos
    }
    return Evidencia(org_ids=list(org_ids), acuerdos=acuerdos, pares_colaborando=pares)

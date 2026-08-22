"""Organization profile: the private data each org agent knows.

The profile is the only data source the agent's tools can touch. Nothing
outside this file's schema ever crosses the A2A boundary unless the agent
chooses to say it in a negotiation message.
"""
import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Resource:
    id: str
    nombre: str            # "camioneta de reparto"
    disponibilidad: str    # "martes 9am-5pm"
    notas: str = ""


@dataclass
class Need:
    id: str
    descripcion: str       # "transporte para recoger donaciones"
    frecuencia: str        # "semanal", "puntual"
    urgencia: str = "media"  # baja | media | alta


@dataclass
class OrgProfile:
    org_id: str
    nombre: str
    tipo: str              # "biblioteca", "banco de alimentos", "escuela"
    descripcion: str
    poblacion_atendida: int = 0   # people reached per year
    recursos: list[Resource] = field(default_factory=list)
    necesidades: list[Need] = field(default_factory=list)

    @classmethod
    def from_json(cls, path: str | Path) -> "OrgProfile":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(
            org_id=data["org_id"],
            nombre=data["nombre"],
            tipo=data["tipo"],
            descripcion=data["descripcion"],
            poblacion_atendida=data.get("poblacion_atendida", 0),
            recursos=[Resource(**r) for r in data.get("recursos", [])],
            necesidades=[Need(**n) for n in data.get("necesidades", [])],
        )

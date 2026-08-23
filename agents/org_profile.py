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
    nombre: str            # "delivery van"
    disponibilidad: str    # "Tuesdays 9am-5pm"
    notas: str = ""


@dataclass
class Need:
    id: str
    descripcion: str       # "transport to collect donations"
    frecuencia: str        # "weekly", "occasional"
    urgencia: str = "media"  # baja | media | alta


@dataclass
class Location:
    """Where the organization actually is.

    The exchanges in this system are physical: a van drives, a cold room holds
    food, a classroom fills. Distance is part of whether an exchange makes sense,
    so the neighborhood is a map rather than a diagram.
    """
    lat: float
    lon: float
    direccion: str = ""


@dataclass
class OrgProfile:
    org_id: str
    nombre: str
    tipo: str              # "library", "food bank", "school"
    descripcion: str
    poblacion_atendida: int = 0   # people reached per year
    director: str = "Director"    # the person who signs for this organization
    recursos: list[Resource] = field(default_factory=list)
    necesidades: list[Need] = field(default_factory=list)
    ubicacion: Location | None = None

    @classmethod
    def from_json(cls, path: str | Path) -> "OrgProfile":
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(
            org_id=data["org_id"],
            nombre=data["nombre"],
            tipo=data["tipo"],
            descripcion=data["descripcion"],
            poblacion_atendida=data.get("poblacion_atendida", 0),
            director=data.get("director", "Director"),
            recursos=[Resource(**r) for r in data.get("recursos", [])],
            necesidades=[Need(**n) for n in data.get("necesidades", [])],
            ubicacion=Location(**data["ubicacion"]) if data.get("ubicacion") else None,
        )

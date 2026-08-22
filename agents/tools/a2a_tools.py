"""Tool that lets an org agent talk to neighbor agents over A2A.

Each neighbor is a remote A2A endpoint. The tool only carries the message the
agent chooses to send; no local data structure ever crosses the wire.
"""
import unicodedata

from strands import tool
from strands.agent.a2a_agent import A2AAgent


def _normalize(text: str) -> str:
    sin_tildes = "".join(
        c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn"
    )
    return sin_tildes.lower().strip()


def build_neighbor_tools(neighbors: dict[str, str], on_message=None) -> list:
    """neighbors: {nombre de la organizacion: endpoint A2A}

    on_message(vecino, mensaje, respuesta) receives every exchange, so a UI can
    show the negotiation as it happens."""
    clients: dict[str, A2AAgent] = {}
    nombres = ", ".join(neighbors)

    def _resolve(vecino: str) -> str | None:
        """Match the agent's wording against known neighbors, tolerating case,
        accents and partial names. With a single neighbor, any wording resolves
        to it: the agent cannot mean anyone else."""
        if len(neighbors) == 1:
            return next(iter(neighbors))
        objetivo = _normalize(vecino)
        for nombre in neighbors:
            if _normalize(nombre) == objetivo:
                return nombre
        for nombre in neighbors:
            candidato = _normalize(nombre)
            if objetivo in candidato or candidato in objetivo:
                return nombre
        palabras = {p for p in objetivo.split() if len(p) > 3}
        for nombre in neighbors:
            if palabras & set(_normalize(nombre).split()):
                return nombre
        return None

    def _client(nombre: str) -> A2AAgent:
        if nombre not in clients:
            clients[nombre] = A2AAgent(endpoint=neighbors[nombre])
        return clients[nombre]

    @tool
    def contact_neighbor(vecino: str, mensaje: str) -> str:
        """Send a message to a neighboring organization's agent and return their reply.

        Args:
            vecino: name of the neighboring organization to contact
            mensaje: what you want to tell them (question, offer, counter-offer)
        """
        destino = _resolve(vecino)
        if destino is None:
            return f"Unknown neighbor: '{vecino}'. Available neighbors: {nombres}"
        result = str(_client(destino)(mensaje))
        if on_message is not None:
            # The UI shows the negotiation as it happens. Without this call the
            # bargaining round never reaches the screen.
            on_message(destino, mensaje, result)
        return f"Reply from {destino}:\n{result}"

    return [contact_neighbor]

"""In-process event bus so the browser can watch a round as it happens.

The negotiation runs in a worker thread; every step it publishes lands in each
subscriber's queue and reaches the page over SSE.
"""
import asyncio
import json
from datetime import datetime, timezone

_subscribers: set[asyncio.Queue] = set()
_loop: asyncio.AbstractEventLoop | None = None
_historial: list[dict] = []


def bind_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def subscribe() -> asyncio.Queue:
    cola: asyncio.Queue = asyncio.Queue()
    _subscribers.add(cola)
    return cola


def unsubscribe(cola: asyncio.Queue) -> None:
    _subscribers.discard(cola)


def historial() -> list[dict]:
    return list(_historial)


def limpiar_historial() -> None:
    _historial.clear()


def publicar(tipo: str, **datos) -> None:
    """Publish an event from any thread."""
    evento = {
        "tipo": tipo,
        "hora": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **datos,
    }
    _historial.append(evento)
    if _loop is None:
        return
    mensaje = json.dumps(evento, ensure_ascii=False)
    for cola in list(_subscribers):
        _loop.call_soon_threadsafe(cola.put_nowait, mensaje)

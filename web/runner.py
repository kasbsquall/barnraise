"""Runs neighborhood rounds in a worker thread, publishing every step.

The human approval interrupt is surfaced to the browser and the agent genuinely
waits: the thread blocks on an Event until a director decides in the UI.
"""
import json
import sys
import os
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from strands.agent.a2a_agent import A2AAgent

from agents.approval import approval_gate, build_ledger_tools
from agents.coalition_agent import PROPOSAL_PROMPT, build_coalition_agent, formatear_escaneo
from agents.org_agent import build_org_agent
from agents.org_profile import OrgProfile
from agents.prompts import NEGOTIATION_PROMPT, REGISTRATION_PROMPT
from agents.resilience import ESPERAS, invocar
from agents.tools.a2a_tools import build_neighbor_tools
from agents.tools.grants import Convocatoria
from agents.tools.negotiation import _keywords
from ledger import book
from ledger.evidence import evidencia_de_colaboracion
from web import events

DISCOVERY_MESSAGE = (
    "Hello, I am the agent for {yo}. We are looking to cover this week's needs. "
    "Which idle resources does your organization have available to share with neighbors?"
)
URGENCIA_PESO = {"alta": 3, "media": 2, "baja": 1}

_lock = threading.Lock()
_ocupado = False
_fase = "inactiva"
_pendiente: dict | None = None

# How long a paused agent waits for a human before giving up. Long enough for a
# demo and a coffee, short enough that an abandoned tab does not wedge the app.
ESPERA_HUMANA = float(os.getenv("BARNRAISE_APPROVAL_TIMEOUT", "900"))


class PermisoDeFirma(RuntimeError):
    """One organization tried to sign another organization's decision."""
_decision_evento = threading.Event()
_decision_valor = "no"
_ultima_decision = "no"   # what the director answered at the last pause


def ocupado() -> bool:
    return _ocupado


def estado() -> dict:
    return {"ocupada": _ocupado, "fase": _fase, "pendiente": _pendiente}


def _set_fase(fase: str) -> None:
    global _fase
    _fase = fase
    events.publicar("fase", fase=fase)


def resolver_interrupcion(decision: str, firmante: str | None = None) -> bool:
    """Called from the API when a director decides on a paused tool call."""
    global _decision_valor
    if _pendiente is None:
        return False
    # A director may only decide their own organization's pause. "barrio" is the
    # coalition decision, which every director signs from their own console.
    duenio = _pendiente.get("org_id")
    if firmante is not None and duenio not in (firmante, "barrio"):
        raise PermisoDeFirma(
            f"This decision belongs to {duenio}. {firmante} cannot sign it."
        )
    _decision_valor = "yes" if decision == "aprobado" else "no"
    _decision_evento.set()
    return True


def _esperar_decision(titulo: str, herramienta: str, argumentos: dict, org_id: str) -> str:
    """Publish the paused tool call and block until a human decides."""
    global _pendiente
    _decision_evento.clear()
    _pendiente = {
        "titulo": titulo,
        "herramienta": herramienta,
        "argumentos": argumentos,
        "org_id": org_id,
    }
    events.publicar("aprobacion_requerida", **_pendiente)
    # A pause that waits forever is a demo that ends on the first misclick: close
    # the tab while an agent is paused and the worker thread parks with the round
    # marked busy, so every later round returns 409 until the process restarts.
    # An unanswered decision is a decision not to sign.
    if not _decision_evento.wait(timeout=ESPERA_HUMANA):
        _pendiente = None
        global _ultima_decision
        _ultima_decision = "no"
        events.publicar(
            "aprobacion_expirada",
            mensaje=f"Nobody answered within {int(ESPERA_HUMANA // 60)} minutes. "
                    "Nothing was written.",
        )
        events.publicar("aprobacion_resuelta", decision="no")
        return "no"
    _pendiente = None
    decision = _decision_valor
    _ultima_decision = decision
    events.publicar("aprobacion_resuelta", decision=decision)
    return decision


def _argumentos_de(interrupt) -> tuple[str, dict]:
    """Pull tool name and arguments out of the interrupt's reason text."""
    texto = str(interrupt.reason)
    herramienta = ""
    argumentos: dict = {}
    partes = texto.split('"')
    if len(partes) > 1:
        herramienta = partes[1]
    if "{" in texto and "}" in texto:
        try:
            argumentos = json.loads(texto[texto.index("{"):texto.rindex("}") + 1])
        except ValueError:
            argumentos = {"detalle": texto}
    return herramienta, argumentos


INSISTENCIA = (
    "You did not call record_agreement. Do it now, once, with the concrete values "
    "from the negotiation. Do not answer with prose: use the tool."
)


def _registrar(agente, prompt: str, titulo: str, org_id: str, intentos: int = 2):
    """Ask the agent to file the agreement, handling the pause, and insist once if
    it answered with prose instead of calling the tool."""
    antes = _ultimo_id_acuerdo()
    result = invocar(agente, prompt, aviso=lambda m: events.publicar("reintento", mensaje=m))
    for intento in range(intentos):
        while result.stop_reason == "interrupt":
            interrupt = result.interrupts[0]
            herramienta, argumentos = _argumentos_de(interrupt)
            decision = _esperar_decision(titulo, herramienta, argumentos, org_id)
            result = invocar(agente, [{
                "interruptResponse": {"interruptId": interrupt.id, "response": decision}
            }], aviso=lambda m: events.publicar("reintento", mensaje=m))
            # Approving the pause IS this organization's signature, so it is
            # recorded here, against the agreement that approval just wrote.
            # Deferring it to the end of the round tied the signature to
            # whatever the last decision happened to be.
            if decision == "yes":
                _firmar_lo_asentado(org_id, desde_id=antes)
        # The ledger is the only honest witness that the tool ran. Reading the
        # agent's prose gave false negatives and asked the director to sign the
        # same agreement twice. A rejection also ends the attempt: insisting
        # would put back the very decision the human just declined.
        if _ultimo_id_acuerdo() > antes or _ultima_decision == "no" or intento == intentos - 1:
            break
        events.publicar("reintento", mensaje="The agent did not use the tool. Asking again.")
        result = invocar(agente, INSISTENCIA, aviso=lambda m: events.publicar("reintento", mensaje=m))
    return result


def _inalcanzable(texto: str) -> bool:
    """True when the neighbor's agent is down, as opposed to rate limited."""
    t = texto.lower()
    return any(p in t for p in (
        "connection refused", "connecterror", "connection error", "all connection attempts failed",
        "failed to establish", "name or service not known", "cannot connect",
    ))


def _perfiles() -> list[OrgProfile]:
    return [OrgProfile.from_json(p) for p in sorted((ROOT / "seed" / "orgs").glob("*.json"))]


def _red() -> list[dict]:
    return json.loads((ROOT / "seed" / "network.json").read_text(encoding="utf-8"))["organizaciones"]


def _vecinos_de(org_id: str) -> dict:
    vecinos = {}
    for entrada in _red():
        perfil = OrgProfile.from_json(ROOT / entrada["perfil"])
        if perfil.org_id == org_id:
            continue
        vecinos[entrada["nombre"]] = {
            "endpoint": entrada["endpoint"],
            "org_id": perfil.org_id,
        }
    return vecinos


def ronda_intercambio(org_id: str) -> None:
    """Discovery over A2A, negotiation, and a human-approved ledger entry."""
    global _ocupado
    with _lock:
        if _ocupado:
            return
        _ocupado = True
    try:
        events.limpiar_historial()
        perfiles = {p.org_id: p for p in _perfiles()}
        me = perfiles.get(org_id)
        if me is None:
            events.publicar("error", mensaje=f"Unknown organization: {org_id}")
            return

        vecinos = _vecinos_de(org_id)
        events.publicar("ronda_inicio", org_id=org_id, nombre=me.nombre)

        # Phase 1: discovery over A2A.
        _set_fase("descubrimiento")
        mejor = None
        for nombre, datos in vecinos.items():
            pregunta = DISCOVERY_MESSAGE.format(yo=me.nombre)
            events.publicar("mensaje", de=me.nombre, a=nombre, texto=pregunta, canal="A2A")
            respuesta = ""
            for intento in range(4):
                try:
                    respuesta = str(invocar(
                        A2AAgent(endpoint=datos["endpoint"]), pregunta,
                        aviso=lambda m: events.publicar("reintento", mensaje=m),
                    ))
                except Exception as exc:
                    respuesta = f"Agent execution failed: {exc}"
                if "Agent execution failed" not in respuesta:
                    break
                # Two very different failures arrive as the same failure text.
                # Naming the wrong one sends whoever is debugging to the wrong
                # place, so the unreachable case is called what it is and is not
                # retried: no amount of waiting starts a server that is down.
                if _inalcanzable(respuesta):
                    events.publicar(
                        "reintento",
                        mensaje=f"{nombre} is not reachable at {datos['endpoint']}. "
                                f"Its agent is not running.",
                    )
                    respuesta = ""
                    break
                # The neighbour's own model hit its rate limit; that arrives as
                # failure text, not an exception, so wait before asking again.
                espera = ESPERAS[min(intento, len(ESPERAS) - 1)]
                events.publicar(
                    "reintento",
                    mensaje=f"{nombre} could not reply (its model provider is overloaded). "
                            f"Retrying in {espera}s.",
                )
                time.sleep(espera)
            if "Agent execution failed" in respuesta:
                events.publicar("mensaje", de=nombre, a=me.nombre, texto="(no reply)", canal="A2A")
                continue
            events.publicar("mensaje", de=nombre, a=me.nombre, texto=respuesta, canal="A2A")

            oferta_kw = _keywords(respuesta)
            for need in me.necesidades:
                comunes = _keywords(need.descripcion) & oferta_kw
                if not comunes:
                    continue
                score = URGENCIA_PESO.get(need.urgencia, 1) * 10 + len(comunes)
                if mejor is None or score > mejor[0]:
                    mejor = (score, need, nombre, respuesta)

        if mejor is None:
            events.publicar("sin_match")
            return

        _, need, vecino, oferta = mejor
        events.publicar(
            "match", necesidad_id=need.id, necesidad=need.descripcion,
            urgencia=need.urgencia, vecino=vecino,
        )

        # Phase 2: negotiation.
        _set_fase("negociacion")
        def publicar_mensaje(destino: str, mensaje: str, respuesta: str) -> None:
            events.publicar("mensaje", de=me.nombre, a=destino, texto=mensaje, canal="A2A")
            events.publicar("mensaje", de=destino, a=me.nombre, texto=respuesta, canal="A2A")

        negociador = build_org_agent(
            me,
            extra_tools=build_neighbor_tools(
                {vecino: vecinos[vecino]["endpoint"]}, on_message=publicar_mensaje
            ),
        )
        transcripcion = str(invocar(negociador, NEGOTIATION_PROMPT.format(
            need_id=need.id, need_desc=need.descripcion, need_urg=need.urgencia,
            vecino=vecino, oferta_vecino=oferta,
        ), aviso=lambda m: events.publicar("reintento", mensaje=m)))
        events.publicar("terminos", texto=transcripcion)

        # Phase 3: registration, gated by a human.
        _set_fase("aprobacion")
        registrador = build_org_agent(
            me,
            extra_tools=build_ledger_tools(
                me.org_id,
                contexto_esperado=f"{need.descripcion}. The neighbor offered: {oferta}",
                recursos_propios=[f"{r.nombre} {r.disponibilidad} {r.notas}" for r in me.recursos],
                necesidad=f"[{need.id}] {need.descripcion}",
                vecinos_validos=list(perfiles),
            ),
            interventions=[approval_gate()],
        )
        result = _registrar(
            registrador,
            REGISTRATION_PROMPT.format(
                vecino=vecino, vecino_id=vecinos[vecino]["org_id"],
                transcripcion=transcripcion, need_id=need.id, need_desc=need.descripcion,
            ),
            titulo=f"{me.nombre} wants to record an agreement with {vecino}",
            org_id=me.org_id,
        )
        events.publicar("ronda_fin", texto=str(result) or "The round closed without recording anything.")
    except Exception as exc:  # surface failures instead of leaving the UI hanging
        events.publicar("error", mensaje=f"{type(exc).__name__}: {exc}")
    finally:
        _set_fase("inactiva")
        _liberar()


def ronda_coalicion() -> None:
    """Scan a funding call against combined capabilities and propose a coalition."""
    global _ocupado
    with _lock:
        if _ocupado:
            return
        _ocupado = True
    try:
        events.limpiar_historial()
        perfiles = _perfiles()
        convocatoria = Convocatoria.from_json(ROOT / "seed" / "grants" / "resilience_fund.json")
        events.publicar("coalicion_inicio", convocatoria=convocatoria.nombre, monto=convocatoria.monto)

        _set_fase("escaneo")
        escaneo, coaliciones = formatear_escaneo(convocatoria, perfiles)
        events.publicar("escaneo", texto=escaneo)
        if not coaliciones:
            events.publicar("sin_coalicion")
            return

        mejor = coaliciones[0]
        conn = book.connect()
        try:
            evidencia = evidencia_de_colaboracion(conn, mejor.org_ids)
        finally:
            conn.close()
        events.publicar("evidencia", texto=evidencia.resumen(), total=evidencia.total)

        _set_fase("propuesta")
        agente = build_coalition_agent(convocatoria, perfiles)
        result = invocar(agente, PROPOSAL_PROMPT.format(
            nombre=convocatoria.nombre, conv_id=convocatoria.id,
            financiador=convocatoria.financiador, monto=convocatoria.monto,
            moneda=convocatoria.moneda, cierre=convocatoria.cierre,
            descripcion=convocatoria.descripcion, escaneo=escaneo,
            evidencia=evidencia.resumen(),
        ), aviso=lambda m: events.publicar("reintento", mensaje=m))
        while result.stop_reason == "interrupt":
            interrupt = result.interrupts[0]
            herramienta, argumentos = _argumentos_de(interrupt)
            decision = _esperar_decision(
                titulo="Record the joint application to the fund",
                herramienta=herramienta, argumentos=argumentos, org_id="barrio",
            )
            result = invocar(agente, [{
                "interruptResponse": {"interruptId": interrupt.id, "response": decision}
            }], aviso=lambda m: events.publicar("reintento", mensaje=m))

        events.publicar("ronda_fin", texto=str(result))
    except Exception as exc:
        events.publicar("error", mensaje=f"{type(exc).__name__}: {exc}")
    finally:
        _set_fase("inactiva")
        _liberar()


DIRECTORES = {
    "central-library": "Ana Torres",
    "north-food-bank": "Luis Mendoza",
    "san-martin-school": "Rosa Diaz",
}


def _ultimo_id_acuerdo() -> int:
    """Highest agreement id before this round writes anything."""
    conn = book.connect()
    try:
        fila = conn.execute("SELECT COALESCE(MAX(id), 0) AS n FROM acuerdos").fetchone()
        return fila["n"]
    finally:
        conn.close()


def _firmar_lo_asentado(org_id: str, desde_id: int) -> None:
    """Sign ONLY the agreement this round created, and only when approved.

    Signing anything older would forge a signature onto a different agreement,
    which is exactly what the two-signature rule exists to prevent.
    """
    conn = book.connect()
    try:
        nuevos = [
            a for a in book.historial(conn, org_id)
            if a["id"] > desde_id and a["estado"] == "propuesto"
        ]
        if not nuevos:
            return
        acuerdo = min(nuevos, key=lambda a: a["id"])
        ya = conn.execute(
            "SELECT 1 FROM aprobaciones WHERE acuerdo_id = ? AND org_id = ?",
            (acuerdo["id"], org_id),
        ).fetchone()
        if ya:
            return
        estado = book.registrar_aprobacion(
            conn, acuerdo["id"], org_id, "aprobado",
            DIRECTORES.get(org_id, "Director"),
            "Approved at the agent pause",
        )
        events.publicar(
            "decision", ambito="acuerdo", acuerdo_id=acuerdo["id"], org_id=org_id,
            aprobador=DIRECTORES.get(org_id, "Director"), decision="aprobado",
            estado=estado,
        )
    finally:
        conn.close()


def _liberar() -> None:
    global _ocupado
    _ocupado = False

"""Retry helper for transient provider failures.

Free model tiers return 503 UNAVAILABLE under load and 429 when a rate limit is
hit. Both are temporary and a round should ride them out instead of dying
halfway through a negotiation.
"""
import time

# Match on both the exception type name and its text: providers word these
# differently ("throttled", "exceeded your current quota", "503 UNAVAILABLE").
TRANSITORIOS = (
    "503", "unavailable", "429", "resource_exhausted", "overloaded", "timeout",
    "throttl", "quota", "rate limit", "too many requests",
)
# Gemini's free tier allows 20 requests per minute and reports a retry delay of
# roughly 14s, so the first waits are sized to clear a full minute window.
ESPERAS = (6, 16, 35, 60, 60)


def _es_transitorio(exc: Exception) -> bool:
    texto = f"{type(exc).__name__} {exc} {exc.__cause__ or ''}".lower()
    return any(marca in texto for marca in TRANSITORIOS)


def invocar(agente, entrada, aviso=None):
    """Call an agent, retrying while the provider reports a temporary failure.

    aviso(mensaje) is called before each wait so a UI can show what happened.
    """
    ultimo: Exception | None = None
    for intento, espera in enumerate(ESPERAS, start=1):
        try:
            return agente(entrada)
        except Exception as exc:  # provider errors surface wrapped in SDK types
            if not _es_transitorio(exc):
                raise
            ultimo = exc
            if aviso:
                aviso(
                    f"The model provider is overloaded. Retry "
                    f"{intento} of {len(ESPERAS)} in {espera}s."
                )
            time.sleep(espera)
    raise ultimo if ultimo else RuntimeError("invocacion fallida sin excepcion")

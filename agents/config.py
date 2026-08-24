"""Model provider configuration for Barnraise agents.

Strands is model-agnostic, so the neighborhood runs the same on three providers.
Pick one with BARNRAISE_MODEL_PROVIDER:

  bedrock  Amazon Bedrock. Needs AWS credentials and model access enabled.
  gemini   Google AI Studio. Free tier, needs GEMINI_API_KEY in the environment.
  ollama   Local, zero cost, no key. Default.

Local note: qwen2.5:7b-instruct is the stable choice on a 12GB card. The 14b
variant fills the VRAM and degenerates, returning corrupted text and null token
counters that crash the SDK's Ollama provider.
"""
import os


class MissingApiKey(RuntimeError):
    """Raised with instructions instead of failing deep inside the SDK."""


def get_model():
    provider = os.getenv("BARNRAISE_MODEL_PROVIDER", "ollama").lower()

    if provider == "bedrock":
        # Bedrock is the Strands default; the model id resolves via AWS creds.
        #
        # Current Claude ids on Bedrock carry no date suffix and no ":v1:0" tail,
        # unlike the older "us.anthropic.claude-sonnet-4-20250514-v1:0" shape. The
        # prefix selects where inference runs: "global." routes worldwide and is
        # available in the most regions, "us." / "eu." / "au." keep data inside
        # that geography, and a bare "anthropic.claude-opus-5" is in-region only.
        # Swap the prefix if you have a data residency requirement.
        #
        # Access is granted per model in the Bedrock console, so an account that
        # has not enabled this one gets an AccessDeniedException rather than a
        # wrong answer. Override with BARNRAISE_BEDROCK_MODEL.
        return os.getenv("BARNRAISE_BEDROCK_MODEL", "global.anthropic.claude-opus-5")

    if provider == "gemini":
        from strands.models.gemini import GeminiModel

        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise MissingApiKey(
                "GEMINI_API_KEY is not set. Get a free key at "
                "https://aistudio.google.com/apikey and export it before running:\n"
                '  PowerShell:  $env:GEMINI_API_KEY = "your-key"\n'
                '  bash:        export GEMINI_API_KEY="your-key"'
            )
        return GeminiModel(
            client_args={"api_key": api_key},
            model_id=os.getenv("BARNRAISE_GEMINI_MODEL", "gemini-3.6-flash"),
        )

    from strands.models.ollama import OllamaModel

    return OllamaModel(
        host=os.getenv("OLLAMA_HOST", "http://localhost:11434"),
        model_id=os.getenv("BARNRAISE_OLLAMA_MODEL", "qwen2.5:7b-instruct"),
    )

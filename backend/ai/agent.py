"""
AI Kubernetes Agent — the central reasoning engine (Prompt 03).

Wires together:
  Prompt Builder → LLM Client (Groq / OpenRouter) → Root Cause Analyzer → Fix Engine → Confidence Engine

Behaves like a Senior Kubernetes SRE reasoning about cluster failures.
"""

from typing import Any, Dict, Union
from loguru import logger

from ai.prompt_builder import build_troubleshooting_prompt
from ai.llm_client import GroqClient, OpenRouterClient, LLMClientError
from ai.root_cause import analyze_root_cause
from ai.fix_engine import recommend_fix
from ai.confidence_engine import calculate_confidence
from core.config import settings


class AIKubernetesAgent:
    """
    Senior Kubernetes SRE AI agent.

    Takes Kubernetes investigation evidence, sends it to an LLM via Groq or OpenRouter,
    and returns a structured diagnosis with root cause, fix, and confidence score.
    """

    def __init__(self):
        self._client: Union[GroqClient, OpenRouterClient, None] = None

    def _get_client(self) -> Union[GroqClient, OpenRouterClient]:
        """Lazy-initialize the LLM client: prefers Groq if configured, else OpenRouter."""
        if self._client is None:
            if settings.GROQ_API_KEY:
                logger.info(f"Using Groq LPU client with model: {settings.GROQ_MODEL}")
                self._client = GroqClient(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                )
            elif settings.OPENROUTER_API_KEY:
                logger.info(f"Using OpenRouter client with model: {settings.OPENROUTER_MODEL}")
                self._client = OpenRouterClient(
                    api_key=settings.OPENROUTER_API_KEY,
                    model=settings.OPENROUTER_MODEL,
                )
            else:
                raise LLMClientError(
                    "No LLM API key configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in backend/.env"
                )
        return self._client

    async def diagnose(self, investigation_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run the full AI reasoning pipeline on Kubernetes investigation evidence.

        Flow:
            1. Build structured prompt from investigation data
            2. Call Groq LPU (or OpenRouter) LLM
            3. Parse root cause from response
            4. Validate & format fix recommendation
            5. Calculate and adjust confidence score

        Args:
            investigation_data: Payload from InvestigationService.run_investigation()

        Returns:
            Structured diagnosis dict ready for the API response
        """
        logger.info("AI Kubernetes Agent — starting diagnosis")

        client = self._get_client()

        # ── Step 1: Build the LLM prompt ─────────────────────────────────────
        system_prompt, user_prompt = build_troubleshooting_prompt(investigation_data)
        logger.debug("Prompt built successfully")

        # ── Step 2: Call the LLM ─────────────────────────────────────────────
        try:
            raw_response = await client.generate_completion(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.2,
                max_tokens=1500,
            )
            logger.info("LLM response received successfully")
        except LLMClientError as e:
            logger.error(f"LLM call failed: {e}")
            raise

        # ── Step 3: Parse root cause ──────────────────────────────────────────
        parsed = analyze_root_cause(raw_response)
        logger.info(f"Root cause identified: {parsed.get('root_cause', 'unknown')}")

        # ── Step 4: Validate fix recommendation ───────────────────────────────
        enriched = recommend_fix(parsed)

        # ── Step 5: Calculate confidence ──────────────────────────────────────
        raw_confidence = enriched.pop("confidence", 50)
        confidence_data = calculate_confidence(raw_confidence, investigation_data)

        logger.info(
            f"AI diagnosis complete — confidence: {confidence_data['score']}% [{confidence_data['label']}]"
        )

        return {
            "root_cause": enriched["root_cause"],
            "explanation": enriched["explanation"],
            "fix": enriched["fix"],
            "kubectl_command": enriched.get("kubectl_command"),
            "prevention": enriched.get("prevention", ""),
            "confidence": confidence_data["score"],
            "confidence_label": confidence_data["label"],
            "confidence_reasoning": confidence_data["reasoning"],
            "provider": getattr(client, "provider_name", "Groq LPU"),
        }

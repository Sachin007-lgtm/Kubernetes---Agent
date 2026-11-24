"""
LLM Client — supports Groq (LPU ultra-fast inference) and OpenRouter using HTTPX.

Automatically uses Groq when GROQ_API_KEY is configured, with fallback to OpenRouter.
Handles timeouts, retries, and API failures gracefully with zero secret leakage in logs.
"""

import json
from typing import Any, Dict, Optional

import httpx
from loguru import logger

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

DEFAULT_TIMEOUT = 45.0      # seconds per request
MAX_RETRIES = 2
RETRY_DELAY = 1.5           # seconds between retries


class LLMClientError(Exception):
    """Raised when the LLM client encounters an unrecoverable error."""


class GroqClient:
    """
    Async Groq LLM client using HTTPX.
    Ultra-fast inference powered by Groq LPUs.
    """

    def __init__(self, api_key: str, model: str = "openai/gpt-oss-120b"):
        if not api_key:
            raise LLMClientError(
                "GROQ_API_KEY is not set. Add it to your backend/.env file."
            )
        self._api_key = api_key
        self.model = model
        self.provider_name = "Groq LPU"
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1500,
    ) -> str:
        """Send chat completion to Groq API."""
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        last_error: Optional[Exception] = None

        for attempt in range(1, MAX_RETRIES + 2):
            try:
                logger.info(
                    f"Calling Groq [{self.model}] — attempt {attempt}/{MAX_RETRIES + 1}"
                )

                async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                    response = await client.post(
                        f"{GROQ_BASE_URL}/chat/completions",
                        headers=self._headers,
                        json=payload,
                    )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    logger.info(
                        f"Groq response received in record time — tokens used: {usage.get('total_tokens', 'unknown')}"
                    )
                    return content

                elif response.status_code == 429:
                    logger.warning("Groq rate limit hit — retrying after delay")
                    import asyncio
                    await asyncio.sleep(RETRY_DELAY * attempt)
                    last_error = LLMClientError("Rate limited by Groq (429)")

                elif response.status_code == 401:
                    logger.error("Groq authentication failed — check your API key")
                    raise LLMClientError(
                        "Groq authentication failed. Please verify your GROQ_API_KEY."
                    )

                else:
                    error_body = response.text[:200]
                    logger.warning(f"Groq returned HTTP {response.status_code}: {error_body}")
                    last_error = LLMClientError(f"Groq API error {response.status_code}: {error_body}")

            except httpx.TimeoutException:
                logger.warning(f"Groq request timed out (attempt {attempt})")
                last_error = LLMClientError(f"Groq request timed out after {DEFAULT_TIMEOUT}s")

            except httpx.ConnectError:
                logger.error("Cannot connect to Groq API — check internet connection")
                last_error = LLMClientError("Cannot connect to Groq. Please check internet connection.")

            except LLMClientError:
                raise

            except Exception as e:
                logger.error(f"Unexpected error calling Groq: {e}")
                last_error = LLMClientError(f"Unexpected error: {str(e)}")

            if attempt <= MAX_RETRIES:
                import asyncio
                await asyncio.sleep(RETRY_DELAY)

        raise last_error or LLMClientError("Groq call failed after all retries")


class OpenRouterClient:
    """Async OpenRouter LLM client using HTTPX."""

    def __init__(self, api_key: str, model: str = "openai/gpt-4o-mini"):
        if not api_key:
            raise LLMClientError(
                "OPENROUTER_API_KEY is not set. Add it to your backend/.env file."
            )
        self._api_key = api_key
        self.model = model
        self.provider_name = "OpenRouter"
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/ai-kubernetes-agent",
            "X-Title": "AI Kubernetes Troubleshooting Agent",
        }

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 1500,
    ) -> str:
        """Send chat completion to OpenRouter API."""
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        last_error: Optional[Exception] = None

        for attempt in range(1, MAX_RETRIES + 2):
            try:
                logger.info(
                    f"Calling OpenRouter [{self.model}] — attempt {attempt}/{MAX_RETRIES + 1}"
                )

                async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
                    response = await client.post(
                        f"{OPENROUTER_BASE_URL}/chat/completions",
                        headers=self._headers,
                        json=payload,
                    )

                if response.status_code == 200:
                    data = response.json()
                    content = data["choices"][0]["message"]["content"]
                    logger.info(
                        f"OpenRouter response received — tokens used: {data.get('usage', {}).get('total_tokens', 'unknown')}"
                    )
                    return content

                elif response.status_code == 429:
                    logger.warning("OpenRouter rate limit hit — retrying after delay")
                    import asyncio
                    await asyncio.sleep(RETRY_DELAY * attempt)
                    last_error = LLMClientError("Rate limited by OpenRouter (429)")

                elif response.status_code == 401:
                    logger.error("OpenRouter authentication failed — check your API key")
                    raise LLMClientError(
                        "OpenRouter authentication failed. Please verify your OPENROUTER_API_KEY."
                    )

                elif response.status_code == 402:
                    logger.error("OpenRouter: insufficient credits")
                    raise LLMClientError(
                        "OpenRouter account has insufficient credits. Please top up your account."
                    )

                else:
                    error_body = response.text[:200]
                    logger.warning(
                        f"OpenRouter returned HTTP {response.status_code}: {error_body}"
                    )
                    last_error = LLMClientError(
                        f"OpenRouter API error {response.status_code}: {error_body}"
                    )

            except httpx.TimeoutException:
                logger.warning(f"OpenRouter request timed out (attempt {attempt})")
                last_error = LLMClientError(
                    f"OpenRouter request timed out after {DEFAULT_TIMEOUT}s"
                )

            except httpx.ConnectError:
                logger.error("Cannot connect to OpenRouter API — check internet connection")
                last_error = LLMClientError(
                    "Cannot connect to OpenRouter. Please check your internet connection."
                )

            except LLMClientError:
                raise

            except Exception as e:
                logger.error(f"Unexpected error calling OpenRouter: {e}")
                last_error = LLMClientError(f"Unexpected error: {str(e)}")

            if attempt <= MAX_RETRIES:
                import asyncio
                await asyncio.sleep(RETRY_DELAY)

        raise last_error or LLMClientError("OpenRouter call failed after all retries")

"""
LLM Client — calls OpenRouter API using HTTPX.

Uses the OpenRouter API key configured in environment variables.
Handles timeouts, retries, and API failures gracefully.
"""

import json
from typing import Any, Dict, Optional

import httpx
from loguru import logger

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_TIMEOUT = 60.0      # seconds per request
MAX_RETRIES = 2
RETRY_DELAY = 2.0           # seconds between retries


class LLMClientError(Exception):
    """Raised when the LLM client encounters an unrecoverable error."""


class OpenRouterClient:
    """
    Async OpenRouter LLM client using HTTPX.

    Supports:
    - Configurable model selection
    - Timeout handling
    - Graceful retries
    - Clean error logging (no secrets in logs)
    """

    def __init__(self, api_key: str, model: str = "openai/gpt-4o-mini"):
        if not api_key:
            raise LLMClientError(
                "OPENROUTER_API_KEY is not set. Add it to your backend/.env file."
            )
        self._api_key = api_key
        self.model = model
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
        """
        Send a chat completion request to OpenRouter.

        Args:
            system_prompt: Instructions for how the LLM should behave
            user_prompt: The Kubernetes evidence to reason about
            temperature: Low temperature = more deterministic (better for diagnosis)
            max_tokens: Max tokens in the response

        Returns:
            Raw text content of the LLM response

        Raises:
            LLMClientError: On unrecoverable API failure
        """
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

        for attempt in range(1, MAX_RETRIES + 2):  # +2 so we do MAX_RETRIES+1 total attempts
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
                        f"OpenRouter response received — "
                        f"tokens used: {data.get('usage', {}).get('total_tokens', 'unknown')}"
                    )
                    return content

                elif response.status_code == 429:
                    logger.warning("OpenRouter rate limit hit — retrying after delay")
                    import asyncio
                    await asyncio.sleep(RETRY_DELAY * attempt)
                    last_error = LLMClientError(f"Rate limited by OpenRouter (429)")

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
                raise  # Don't retry auth/credit errors

            except Exception as e:
                logger.error(f"Unexpected error calling OpenRouter: {e}")
                last_error = LLMClientError(f"Unexpected error: {str(e)}")

            # Wait before retry (except on last attempt)
            if attempt <= MAX_RETRIES:
                import asyncio
                await asyncio.sleep(RETRY_DELAY)

        raise last_error or LLMClientError("OpenRouter call failed after all retries")

"""
Root Cause Analyzer — parses the LLM response JSON into a structured diagnosis.

Handles malformed JSON gracefully and extracts the root cause from the raw text
if the LLM fails to return valid JSON.
"""

import json
import re
from typing import Any, Dict, Optional

from loguru import logger


def _extract_json_from_text(text: str) -> Optional[str]:
    """
    Try to extract a JSON object from the LLM response even if it's wrapped
    in markdown fences or has surrounding text.
    """
    # Strip markdown code fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        return fenced.group(1)

    # Find first { ... } block
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        return brace_match.group(0)

    return None


def analyze_root_cause(llm_response_text: str) -> Dict[str, Any]:
    """
    Parse the LLM response into a structured diagnosis dict.

    Expected LLM output format:
    {
        "root_cause": "...",
        "explanation": "...",
        "fix": "...",
        "kubectl_command": "...",
        "prevention": "...",
        "confidence": 85
    }

    Args:
        llm_response_text: Raw text returned by the LLM

    Returns:
        Normalized diagnosis dict with all expected fields populated
    """
    logger.info("Parsing LLM response for root cause analysis")

    # Attempt 1: Direct JSON parse
    try:
        parsed = json.loads(llm_response_text.strip())
        logger.info("Root cause parsed from direct JSON response")
        return _normalize(parsed)
    except json.JSONDecodeError:
        pass

    # Attempt 2: Extract JSON block from surrounding text
    extracted = _extract_json_from_text(llm_response_text)
    if extracted:
        try:
            parsed = json.loads(extracted)
            logger.info("Root cause parsed from extracted JSON block")
            return _normalize(parsed)
        except json.JSONDecodeError:
            pass

    # Fallback: LLM returned plain text — extract what we can
    logger.warning("LLM response was not valid JSON — using fallback extraction")
    return _fallback_parse(llm_response_text)


def _normalize(data: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all required fields exist with sensible defaults."""
    return {
        "root_cause": str(data.get("root_cause", "Unknown root cause")),
        "explanation": str(data.get("explanation", "No explanation provided.")),
        "fix": str(data.get("fix", "No fix suggested.")),
        "kubectl_command": data.get("kubectl_command") or None,
        "prevention": str(data.get("prevention", "")),
        "confidence": _clamp_confidence(data.get("confidence", 50)),
    }


def _clamp_confidence(value: Any) -> int:
    """Ensure confidence is an integer between 0 and 100."""
    try:
        return max(0, min(100, int(float(str(value)))))
    except (ValueError, TypeError):
        return 50


def _fallback_parse(text: str) -> Dict[str, Any]:
    """
    Best-effort extraction when the LLM returns plain text instead of JSON.
    Tries to find key phrases in the raw text.
    """
    lower = text.lower()

    # Try to detect confidence percentage
    confidence_match = re.search(r"confidence[:\s]+(\d+)%?", lower)
    confidence = int(confidence_match.group(1)) if confidence_match else 40

    # Try to find kubectl commands
    kubectl_match = re.search(r"kubectl\s+\S+.*", text)
    kubectl_cmd = kubectl_match.group(0).strip() if kubectl_match else None

    return {
        "root_cause": "Unable to parse structured diagnosis",
        "explanation": text[:500] if len(text) > 10 else "No explanation returned by AI.",
        "fix": "Please review the raw AI output for remediation steps.",
        "kubectl_command": kubectl_cmd,
        "prevention": "",
        "confidence": confidence,
    }

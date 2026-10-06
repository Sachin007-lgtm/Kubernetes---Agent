"""
Confidence Engine — adjusts and explains the confidence score based on the evidence quality.

The LLM produces a raw confidence score; this engine validates and contextualizes it
by looking at how much corroborating evidence exists in the investigation payload.
"""

from typing import Any, Dict, List
from loguru import logger


def _count_evidence_signals(investigation_data: Dict[str, Any]) -> int:
    """
    Count how many evidence signals were found across all investigation layers.
    More signals = higher confidence adjustment.
    """
    signals = 0

    pods = investigation_data.get("pods", {})
    if pods.get("problematic_pods"):
        signals += len(pods["problematic_pods"]) * 2  # Pods carry the most weight

    logs = investigation_data.get("logs", {})
    if isinstance(logs, dict):
        for log_data in logs.values():
            if isinstance(log_data, dict) and log_data.get("relevant_lines"):
                signals += len(log_data["relevant_lines"])

    events = investigation_data.get("events", {})
    if events.get("warning_count", 0) > 0:
        signals += events["warning_count"]

    deployments = investigation_data.get("deployments", {})
    if deployments.get("unhealthy_deployments"):
        signals += len(deployments["unhealthy_deployments"]) * 2

    network = investigation_data.get("network", {})
    if network.get("issue_count", 0) > 0:
        signals += network["issue_count"]

    return signals


def _build_confidence_reasoning(
    raw_confidence: int,
    adjusted_confidence: int,
    signals: int,
    investigation_data: Dict[str, Any],
) -> List[str]:
    """Build a human-readable list of reasons for the confidence score."""
    reasons: List[str] = []

    pods = investigation_data.get("pods", {})
    prob_pods = pods.get("problematic_pods", [])
    if prob_pods:
        statuses = [p.get("status", "") for p in prob_pods]
        reasons.append(f"Pod state(s) clearly indicate failure: {', '.join(set(statuses))}")

    logs = investigation_data.get("logs", {})
    log_signals = 0
    if isinstance(logs, dict):
        for log_data in logs.values():
            if isinstance(log_data, dict):
                log_signals += len(log_data.get("relevant_lines", []))
    if log_signals > 0:
        reasons.append(f"Log analysis found {log_signals} relevant error line(s)")

    events = investigation_data.get("events", {})
    warning_count = events.get("warning_count", 0)
    if warning_count > 0:
        reasons.append(f"{warning_count} warning event(s) corroborate the diagnosis")

    deployments = investigation_data.get("deployments", {})
    unhealthy_deps = deployments.get("unhealthy_deployments", [])
    if unhealthy_deps:
        reasons.append(f"{len(unhealthy_deps)} deployment(s) have unavailable replicas")

    network = investigation_data.get("network", {})
    net_issues = network.get("issue_count", 0)
    if net_issues > 0:
        reasons.append(f"{net_issues} networking issue(s) detected")

    if not reasons:
        reasons.append("Cluster appears healthy — no strong failure signals detected")

    return reasons


def calculate_confidence(
    raw_confidence: int,
    investigation_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Validate and adjust the LLM's confidence score based on actual evidence signals.

    Args:
        raw_confidence: Confidence value returned by the LLM (0-100)
        investigation_data: Full Kubernetes investigation payload

    Returns:
        Dict with final 'score' (int), 'label' (str), and 'reasoning' (list of str)
    """
    signals = _count_evidence_signals(investigation_data)
    logger.info(f"Confidence engine: raw={raw_confidence}, evidence_signals={signals}")

    # Adjust the LLM's confidence based on evidence volume
    if signals == 0:
        # No evidence of failure — cap confidence
        adjusted = min(raw_confidence, 60)
    elif signals >= 10:
        # Lots of corroborating evidence — boost slightly
        adjusted = min(100, raw_confidence + 5)
    elif signals >= 5:
        adjusted = raw_confidence  # Trust the LLM
    else:
        # Sparse evidence — conservative downward adjustment
        adjusted = max(30, raw_confidence - 10)

    # Determine label
    if adjusted >= 85:
        label = "High"
    elif adjusted >= 60:
        label = "Medium"
    else:
        label = "Low"

    reasoning = _build_confidence_reasoning(raw_confidence, adjusted, signals, investigation_data)

    logger.info(f"Confidence engine: adjusted={adjusted} [{label}]")

    return {
        "score": adjusted,
        "label": label,
        "reasoning": reasoning,
    }

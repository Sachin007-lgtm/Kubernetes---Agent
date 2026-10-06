"""
Prompt Builder — converts a Kubernetes investigation payload into a structured LLM prompt.

The system prompt instructs the LLM to behave as a Senior Kubernetes SRE.
The user prompt feeds in the evidence collected by the Investigation Layer (Prompt 02).
"""

import json
from typing import Any, Dict

SYSTEM_PROMPT = """You are a Senior Kubernetes Site Reliability Engineer (SRE) with deep expertise in:
- Kubernetes cluster troubleshooting and incident response
- Diagnosing pod failures, deployment rollout issues, and networking problems
- Reading and interpreting pod logs, Kubernetes events, and cluster state
- Providing clear, actionable remediation steps

Your job is to analyze the Kubernetes investigation data provided and return a precise diagnosis.

You MUST respond with ONLY valid JSON in exactly this structure (no markdown, no explanation outside JSON):

{
  "root_cause": "<concise one-line root cause>",
  "explanation": "<2-4 sentence detailed explanation of why this failure occurred>",
  "fix": "<clear actionable remediation steps>",
  "kubectl_command": "<specific kubectl command to fix the issue, or null if not applicable>",
  "prevention": "<1-2 sentences on how to prevent this in the future>",
  "confidence": <integer 0-100>
}

Rules:
- Be specific to Kubernetes — avoid generic advice
- Root cause must be specific (e.g. "Missing DATABASE_URL environment variable" not "configuration error")
- kubectl_command must be a real, runnable command or null
- confidence reflects how certain you are given the evidence (high confidence = clear logs + matching events)
- If the cluster is completely healthy, set root_cause to "No issues detected" and confidence to 95
"""


def _safe_json(obj: Any, indent: int = 2) -> str:
    """Safely serialize an object to JSON, truncating very large values."""
    try:
        return json.dumps(obj, indent=indent, default=str)
    except Exception:
        return str(obj)


def _truncate(text: str, max_chars: int = 2000) -> str:
    """Truncate long text to keep prompt within token limits."""
    if len(text) > max_chars:
        return text[:max_chars] + f"\n... [truncated, {len(text) - max_chars} chars omitted]"
    return text


def build_troubleshooting_prompt(investigation_data: Dict[str, Any]) -> tuple[str, str]:
    """
    Build the system prompt and user prompt from Kubernetes investigation evidence.

    Args:
        investigation_data: The structured payload from InvestigationService.run_investigation()

    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    pods = investigation_data.get("pods", {})
    logs = investigation_data.get("logs", {})
    events = investigation_data.get("events", {})
    deployments = investigation_data.get("deployments", {})
    network = investigation_data.get("network", {})

    # ── Pod Summary ───────────────────────────────────────────────────────────
    problematic_pods = pods.get("problematic_pods", [])
    pod_section = f"""
## Pod Status
- Total pods: {pods.get('total_pods', 'unknown')}
- Cluster healthy: {pods.get('healthy', 'unknown')}
- Problematic pods ({len(problematic_pods)}):
{_truncate(_safe_json(problematic_pods)) if problematic_pods else "  None"}
"""

    # ── Log Summary ───────────────────────────────────────────────────────────
    log_lines: list[str] = []
    if isinstance(logs, dict):
        for pod_key, log_data in logs.items():
            if isinstance(log_data, dict):
                relevant = log_data.get("relevant_lines", [])
                raw_tail = log_data.get("raw_tail", "")
                if relevant:
                    log_lines.append(f"  [{pod_key}] Relevant error lines:\n" +
                                     "\n".join(f"    {l}" for l in relevant[:15]))
                elif raw_tail:
                    log_lines.append(f"  [{pod_key}] Last log lines:\n" +
                                     "\n".join(f"    {l}" for l in raw_tail.splitlines()[-10:]))

    log_section = f"""
## Pod Logs
{_truncate(chr(10).join(log_lines)) if log_lines else "  No log data collected or no problematic pods."}
"""

    # ── Events Summary ────────────────────────────────────────────────────────
    warning_events = events.get("warning_events", [])
    event_section = f"""
## Kubernetes Events
- Total events: {events.get('total_events', 'unknown')}
- Warning events ({events.get('warning_count', 0)}):
{_truncate(_safe_json(warning_events[:10])) if warning_events else "  No warning events."}
"""

    # ── Deployment Summary ────────────────────────────────────────────────────
    unhealthy_deps = deployments.get("unhealthy_deployments", [])
    deployment_section = f"""
## Deployment Health
- Total deployments: {deployments.get('total_deployments', 'unknown')}
- Cluster healthy: {deployments.get('healthy', 'unknown')}
- Unhealthy deployments ({len(unhealthy_deps)}):
{_truncate(_safe_json(unhealthy_deps)) if unhealthy_deps else "  None"}
"""

    # ── Network Summary ───────────────────────────────────────────────────────
    net_issues = network.get("issues", [])
    network_section = f"""
## Networking
- Total services: {network.get('total_services', 'unknown')}
- DNS healthy: {network.get('dns_healthy', 'unknown')} ({network.get('dns_status', '')})
- Network issues ({network.get('issue_count', 0)}):
{_truncate(_safe_json(net_issues)) if net_issues else "  None"}
"""

    user_prompt = f"""Analyze the following Kubernetes cluster investigation evidence and provide a diagnosis.

{pod_section}
{log_section}
{event_section}
{deployment_section}
{network_section}

Based on this evidence, provide your diagnosis as valid JSON only.
"""

    return SYSTEM_PROMPT, user_prompt

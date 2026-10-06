"""
Fix Recommendation Engine — formats the fix and kubectl command from the parsed diagnosis
into clean, beginner-friendly output with validation.
"""

from typing import Any, Dict, Optional
from loguru import logger


# Known kubectl command prefixes that are valid
_VALID_KUBECTL_PREFIXES = (
    "kubectl get",
    "kubectl describe",
    "kubectl logs",
    "kubectl delete",
    "kubectl apply",
    "kubectl edit",
    "kubectl rollout",
    "kubectl scale",
    "kubectl set",
    "kubectl patch",
    "kubectl exec",
    "kubectl create",
    "kubectl replace",
    "kubectl label",
    "kubectl annotate",
    "kubectl port-forward",
    "kubectl top",
)


def _validate_kubectl_command(cmd: Optional[str]) -> Optional[str]:
    """
    Validate that the suggested kubectl command looks legitimate.
    Returns the command if valid, None otherwise.
    """
    if not cmd:
        return None

    cmd = cmd.strip()

    # Must start with kubectl
    if not cmd.startswith("kubectl"):
        return None

    # Must be one of the known safe prefixes
    if not any(cmd.lower().startswith(prefix) for prefix in _VALID_KUBECTL_PREFIXES):
        logger.warning(f"kubectl command failed validation: {cmd[:80]}")
        return None

    # Strip any trailing markdown artifacts
    cmd = cmd.split("\n")[0].strip().rstrip("`").rstrip("'").rstrip('"')

    return cmd


def recommend_fix(diagnosis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format and validate the fix recommendation from the parsed diagnosis.

    Ensures:
    - Fix text is clean and non-empty
    - kubectl command is valid or null
    - Prevention tip is included if available
    - Output is beginner-friendly

    Args:
        diagnosis: Normalized dict from analyze_root_cause()

    Returns:
        Enriched diagnosis dict with validated fix fields
    """
    logger.info("Processing fix recommendation")

    fix_text = diagnosis.get("fix", "").strip()
    kubectl_cmd = _validate_kubectl_command(diagnosis.get("kubectl_command"))
    prevention = diagnosis.get("prevention", "").strip()

    if not fix_text:
        fix_text = "No specific fix could be determined from the available evidence."
        logger.warning("Fix recommendation is empty — using fallback text")

    # Build enriched output
    enriched = {**diagnosis}
    enriched["fix"] = fix_text
    enriched["kubectl_command"] = kubectl_cmd
    enriched["prevention"] = prevention

    if kubectl_cmd:
        logger.info(f"Validated kubectl command: {kubectl_cmd}")
    else:
        logger.info("No valid kubectl command in diagnosis")

    return enriched

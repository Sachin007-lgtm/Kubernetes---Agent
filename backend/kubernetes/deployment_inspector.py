import json
from typing import Any, Dict, List, Optional
from loguru import logger

from kubernetes.executor import execute_kubectl


def inspect_deployments(
    namespace: str = "--all-namespaces",
    context: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Inspect all deployments and identify rollout failures or unavailable replicas.

    Checks: Available replicas, Unavailable replicas, Rollout failures, Deployment conditions.

    Returns:
        Structured dict with deployment health data
    """
    logger.info(f"Inspecting deployments [namespace={namespace}, context={context}]")

    flag = "-A" if namespace == "--all-namespaces" else f"-n {namespace}"
    result = execute_kubectl(f"get deployments {flag} --no-headers", context=context)

    if not result.success:
        logger.warning(f"Deployment inspection failed: {result.stderr}")
        return {
            "error": result.stderr,
            "unhealthy_deployments": [],
            "total_deployments": 0,
        }

    unhealthy_deployments: List[Dict[str, Any]] = []
    total_deployments = 0
    lines = [line for line in result.stdout.strip().splitlines() if line.strip()]

    for line in lines:
        parts = line.split()

        # With -A: NAMESPACE NAME READY UP-TO-DATE AVAILABLE AGE
        # Without -A: NAME READY UP-TO-DATE AVAILABLE AGE
        if namespace == "--all-namespaces":
            if len(parts) < 6:
                continue
            dep_namespace = parts[0]
            dep_name = parts[1]
            ready_raw = parts[2]      # e.g. "2/3"
            up_to_date = parts[3]
            available = parts[4]
        else:
            if len(parts) < 5:
                continue
            dep_namespace = namespace
            dep_name = parts[0]
            ready_raw = parts[1]
            up_to_date = parts[2]
            available = parts[3]

        total_deployments += 1

        # Parse ready ratio (e.g. "2/3" → desired=3, ready=2)
        try:
            ready_parts = ready_raw.split("/")
            ready = int(ready_parts[0])
            desired = int(ready_parts[1])
        except (ValueError, IndexError):
            ready = 0
            desired = 0

        is_unhealthy = ready < desired

        if is_unhealthy:
            logger.warning(
                f"Unhealthy deployment: {dep_namespace}/{dep_name} — ready={ready}/{desired}, available={available}"
            )

            # Fetch describe output for richer condition data
            desc_result = execute_kubectl(
                f"describe deployment {dep_name} -n {dep_namespace}",
                context=context,
            )
            conditions_raw = ""
            if desc_result.success:
                # Extract 'Conditions:' block from the describe output
                in_conditions = False
                condition_lines: List[str] = []
                for desc_line in desc_result.stdout.splitlines():
                    if "Conditions:" in desc_line:
                        in_conditions = True
                    if in_conditions:
                        condition_lines.append(desc_line)
                        if condition_lines and desc_line.strip() == "" and len(condition_lines) > 1:
                            break
                conditions_raw = "\n".join(condition_lines[:10])

            unhealthy_deployments.append(
                {
                    "name": dep_name,
                    "namespace": dep_namespace,
                    "ready": ready,
                    "desired": desired,
                    "up_to_date": up_to_date,
                    "available": available,
                    "conditions": conditions_raw,
                }
            )

    logger.info(
        f"Deployment inspection complete: {total_deployments} deployments, "
        f"{len(unhealthy_deployments)} unhealthy"
    )

    return {
        "total_deployments": total_deployments,
        "unhealthy_count": len(unhealthy_deployments),
        "healthy": len(unhealthy_deployments) == 0,
        "unhealthy_deployments": unhealthy_deployments,
    }
